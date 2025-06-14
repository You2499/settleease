
"use client";

import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Trash2, Pencil, Save, Ban, Users } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { Person } from '@/lib/settleease';
import { PEOPLE_TABLE, EXPENSES_TABLE, SETTLEMENT_PAYMENTS_TABLE } from '@/lib/settleease';

interface ManagePeopleTabProps {
  people: Person[];
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
}

export default function ManagePeopleTab({ people, db, supabaseInitializationError }: ManagePeopleTabProps) {
  const [newPersonName, setNewPersonName] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonNewName, setEditingPersonNewName] = useState('');
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) {
      toast({ title: "Validation Error", description: "Person's name cannot be empty.", variant: "destructive" });
      return;
    }
    if (!db || supabaseInitializationError) {
      toast({ title: "Error", description: `Cannot add person: Supabase issue. ${supabaseInitializationError || ''}`, variant: "destructive" });
      return;
    }
    try {
      const { error } = await db.from(PEOPLE_TABLE).insert([{ name: newPersonName.trim(), created_at: new Date().toISOString() }]).select();
      if (error) throw error;
      toast({ title: "Person Added", description: `${newPersonName.trim()} has been added.` });
      setNewPersonName('');
    } catch (error: any) {
      toast({ title: "Error", description: `Could not add person: ${error.message}`, variant: "destructive" });
    }
  };

  const handleStartEditPerson = (person: Person) => {
    setEditingPersonId(person.id);
    setEditingPersonNewName(person.name);
  };

  const handleCancelEditPerson = () => {
    setEditingPersonId(null);
    setEditingPersonNewName('');
  };

  const handleSavePersonName = async () => {
    if (!editingPersonId || !editingPersonNewName.trim()) {
      toast({ title: "Validation Error", description: "Person's name cannot be empty for update.", variant: "destructive" });
      return;
    }
    if (!db || supabaseInitializationError) {
      toast({ title: "Error", description: `Cannot update person: Supabase issue. ${supabaseInitializationError || ''}`, variant: "destructive" });
      return;
    }
    try {
      const { error } = await db.from(PEOPLE_TABLE).update({ name: editingPersonNewName.trim() }).eq('id', editingPersonId);
      if (error) throw error;
      toast({ title: "Person Updated", description: "Name updated successfully." });
      handleCancelEditPerson();
    } catch (error: any) {
      toast({ title: "Error", description: `Could not update person: ${error.message}`, variant: "destructive" });
    }
  };

  const handleConfirmRemovePerson = (person: Person) => {
    setPersonToDelete(person);
  };

  const handleExecuteRemovePerson = async () => {
    if (!personToDelete || !db || supabaseInitializationError) {
        toast({ title: "Error", description: `Cannot remove person: System error. ${supabaseInitializationError || ''}`, variant: "destructive" });
        if (personToDelete) setPersonToDelete(null);
        return;
    }

    try {
        let involvedInTransactions = false;
        let involvementReason = "";

        // Check involvement in settlement_payments as debtor
        const { count: settlementDebtorCount, error: settlementDebtorError } = await db
            .from(SETTLEMENT_PAYMENTS_TABLE)
            .select('id', { count: 'exact', head: true })
            .eq('debtor_id', personToDelete.id);

        if (settlementDebtorError) throw new Error(`Checking debtor settlements: ${settlementDebtorError.message}`);
        if (settlementDebtorCount && settlementDebtorCount > 0) {
            involvedInTransactions = true;
            involvementReason = `${personToDelete.name} is a debtor in ${settlementDebtorCount} recorded settlement(s).`;
        }

        // Check involvement in settlement_payments as creditor
        if (!involvedInTransactions) {
            const { count: settlementCreditorCount, error: settlementCreditorError } = await db
                .from(SETTLEMENT_PAYMENTS_TABLE)
                .select('id', { count: 'exact', head: true })
                .eq('creditor_id', personToDelete.id);

            if (settlementCreditorError) throw new Error(`Checking creditor settlements: ${settlementCreditorError.message}`);
            if (settlementCreditorCount && settlementCreditorCount > 0) {
                involvedInTransactions = true;
                involvementReason = `${personToDelete.name} is a creditor in ${settlementCreditorCount} recorded settlement(s).`;
            }
        }

        // Check involvement in expenses
        if (!involvedInTransactions) {
            const { data: allExpenses, error: fetchExpensesError } = await db
                .from(EXPENSES_TABLE)
                .select('paid_by, shares, description'); // Fetch description for better error message

            if (fetchExpensesError) {
                throw new Error(`Fetching expenses for check: ${fetchExpensesError.message}`);
            }

            if (allExpenses) {
                for (const expense of allExpenses) {
                    if (Array.isArray(expense.paid_by) && expense.paid_by.some(p => p.personId === personToDelete.id)) {
                        involvedInTransactions = true;
                        involvementReason = `${personToDelete.name} paid for the expense "${expense.description}".`;
                        break;
                    }
                    if (!involvedInTransactions && Array.isArray(expense.shares) && expense.shares.some(s => s.personId === personToDelete.id)) {
                        involvedInTransactions = true;
                        involvementReason = `${personToDelete.name} shared in the expense "${expense.description}".`;
                        break;
                    }
                }
            }
        }

        if (involvedInTransactions) {
            toast({
                title: "Deletion Blocked",
                description: `${involvementReason} This person cannot be removed while involved in transactions. Please resolve or reassign these transactions first, or delete them.`,
                variant: "destructive",
                duration: 9000,
            });
            setPersonToDelete(null);
            return;
        }

        // If not involved, proceed with deletion
        const { error: deleteError } = await db.from(PEOPLE_TABLE).delete().eq('id', personToDelete.id);
        if (deleteError) throw deleteError;

        toast({ title: "Person Removed", description: `${personToDelete.name} has been removed.` });
        if (editingPersonId === personToDelete.id) handleCancelEditPerson();
        // No onActionComplete needed here, page.tsx realtime listener handles UI update for people list

    } catch (error: any) {
        console.error("Error during person deletion process:", error);
        toast({ title: "Error", description: `Could not remove ${personToDelete.name}: ${error.message}`, variant: "destructive" });
    } finally {
        setPersonToDelete(null);
    }
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Users className="mr-2 h-5 w-5 text-primary" /> Manage People
          </CardTitle>
          <CardDescription>Add, edit, or remove people in your settlement group.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="newPersonName" className="text-sm font-medium">Add New Person</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="newPersonName"
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Enter person's name"
                className="flex-grow"
                onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
              />
              <Button onClick={handleAddPerson} disabled={!newPersonName.trim() || !!supabaseInitializationError}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-muted-foreground text-sm">Current People:</h4>
            {people.length > 0 ? (
              <ScrollArea className="h-60 rounded-md border p-2 bg-background">
                <ul className="space-y-1.5">
                  {people.map(person => (
                    <li key={person.id} className="flex items-center justify-between p-2.5 bg-card/60 rounded-sm text-sm group">
                      {editingPersonId === person.id ? (
                        <>
                          <Input
                            type="text"
                            value={editingPersonNewName}
                            onChange={(e) => setEditingPersonNewName(e.target.value)}
                            className="flex-grow mr-2 h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSavePersonName()}
                          />
                          <Button variant="ghost" size="icon" onClick={handleSavePersonName} className="h-7 w-7 text-green-600" title="Save">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEditPerson} className="h-7 w-7 text-gray-500" title="Cancel">
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="truncate flex-grow" title={person.name}>{person.name}</span>
                          <div className="flex items-center space-x-0.5 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => handleStartEditPerson(person)} className="h-7 w-7 text-blue-600" title="Edit name">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleConfirmRemovePerson(person)} className="h-7 w-7 text-red-600" title="Remove person">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground p-2">No people added yet. Add some to get started!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {personToDelete && (
        <AlertDialog open={personToDelete !== null} onOpenChange={(open) => !open && setPersonToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will attempt to remove <strong>{personToDelete.name}</strong> from the group.
                If this person is involved in any expenses or settlements, removal will be blocked.
                This action cannot be undone if successful.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPersonToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleExecuteRemovePerson} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Attempt to Remove {personToDelete.name}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
