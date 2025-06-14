
"use client";

import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PlusCircle, Trash2, Pencil, Save, Ban, Users, AlertTriangle } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) {
      toast({ title: "Validation Error", description: "Person's name cannot be empty.", variant: "destructive" });
      return;
    }
    if (!db || supabaseInitializationError) {
      toast({ title: "Database Error", description: `Cannot add person: ${supabaseInitializationError || 'Supabase client not available.'}`, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await db.from(PEOPLE_TABLE).insert([{ name: newPersonName.trim(), created_at: new Date().toISOString() }]).select();
      if (error) throw error;
      toast({ title: "Person Added", description: `${newPersonName.trim()} has been added.` });
      setNewPersonName('');
    } catch (error: any) {
      toast({ title: "Error Adding Person", description: error.message || "Could not add person.", variant: "destructive" });
    } finally {
      setIsLoading(false);
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
      toast({ title: "Database Error", description: `Cannot update person: ${supabaseInitializationError || 'Supabase client not available.'}`, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await db.from(PEOPLE_TABLE).update({ name: editingPersonNewName.trim() }).eq('id', editingPersonId);
      if (error) throw error;
      toast({ title: "Person Updated", description: "Name updated successfully." });
      handleCancelEditPerson();
    } catch (error: any) {
      toast({ title: "Error Updating Person", description: error.message || "Could not update person.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRemovePerson = (person: Person) => {
    setPersonToDelete(person);
  };

  const handleExecuteRemovePerson = async () => {
    if (!personToDelete || !db || supabaseInitializationError) {
        toast({ title: "Error", description: `Cannot remove person: ${supabaseInitializationError || 'System error.'}`, variant: "destructive" });
        if (personToDelete) setPersonToDelete(null);
        return;
    }
    setIsLoading(true);
    try {
        let involvedInTransactions = false;
        let involvementReason = "";

        const { count: settlementDebtorCount, error: settlementDebtorError } = await db
            .from(SETTLEMENT_PAYMENTS_TABLE)
            .select('id', { count: 'exact', head: true })
            .eq('debtor_id', personToDelete.id);

        if (settlementDebtorError) throw new Error(`Checking debtor settlements: ${settlementDebtorError.message}`);
        if (settlementDebtorCount && settlementDebtorCount > 0) {
            involvedInTransactions = true;
            involvementReason = `${personToDelete.name} is a debtor in ${settlementDebtorCount} recorded settlement(s).`;
        }

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

        if (!involvedInTransactions) {
            const { data: allExpenses, error: fetchExpensesError } = await db
                .from(EXPENSES_TABLE)
                .select('paid_by, shares'); 

            if (fetchExpensesError) {
                throw new Error(`Fetching expenses for check: ${fetchExpensesError.message}`);
            }

            if (allExpenses) {
                for (const expense of allExpenses) {
                    const isPayer = Array.isArray(expense.paid_by) && expense.paid_by.some(p => p.personId === personToDelete.id);
                    const isSharer = Array.isArray(expense.shares) && expense.shares.some(s => s.personId === personToDelete.id);

                    if (isPayer || isSharer) {
                        involvedInTransactions = true;
                        involvementReason = `${personToDelete.name} is involved in one or more expenses.`;
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

        const { error: deleteError } = await db.from(PEOPLE_TABLE).delete().eq('id', personToDelete.id);
        if (deleteError) throw deleteError;

        toast({ title: "Person Removed", description: `${personToDelete.name} has been removed.` });
        if (editingPersonId === personToDelete.id) handleCancelEditPerson();

    } catch (error: any) {
        console.error("Error during person deletion process:", error);
        toast({ title: "Error Removing Person", description: `Could not remove ${personToDelete?.name || 'person'}: ${error.message}`, variant: "destructive" });
    } finally {
        setIsLoading(false);
        setPersonToDelete(null);
    }
  };

  if (supabaseInitializationError && !db) {
    return (
      <Card className="shadow-xl rounded-lg h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-6">
          <p>Could not connect to the database. Managing people is currently unavailable.</p>
          <p className="text-sm text-muted-foreground mt-1">{supabaseInitializationError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-xl rounded-lg h-full flex flex-col">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="flex items-center text-2xl font-bold">
            <Users className="mr-3 h-6 w-6 text-primary" /> Manage People
          </CardTitle>
          <CardDescription>Add new participants to your group or edit existing ones.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-6 space-y-6">
          
          <div className="p-5 border rounded-lg shadow-sm bg-card/50">
            <Label className="text-lg font-semibold block mb-3 text-primary">Add New Person</Label>
            <div className="flex space-x-3 items-end">
              <div className="flex-grow">
                <Label htmlFor="newPersonName" className="text-xs">Person's Name</Label>
                <Input
                  id="newPersonName"
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="e.g., Jane Doe"
                  className="mt-1 h-11 text-base"
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                />
              </div>
              <Button onClick={handleAddPerson} disabled={!newPersonName.trim() || isLoading} className="h-11">
                <PlusCircle className="mr-2 h-5 w-5" /> {isLoading && !editingPersonId ? 'Adding...' : 'Add Person'}
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-lg font-semibold mb-3 text-primary">Current People in Group</h4>
            {people.length > 0 ? (
              <ScrollArea className="flex-1 min-h-0 rounded-md border bg-background -mx-1">
                <ul className="space-y-2 p-2">
                  {people.map(person => (
                    <li key={person.id} className="flex items-center justify-between p-3 bg-card/70 rounded-md shadow-sm hover:bg-card/90 transition-colors group">
                      {editingPersonId === person.id ? (
                        <>
                          <Input
                            type="text"
                            value={editingPersonNewName}
                            onChange={(e) => setEditingPersonNewName(e.target.value)}
                            className="flex-grow mr-2 h-9 text-sm"
                            autoFocus
                            disabled={isLoading}
                            onKeyDown={(e) => e.key === 'Enter' && handleSavePersonName()}
                          />
                          <Button variant="ghost" size="icon" onClick={handleSavePersonName} className="h-8 w-8 text-green-600 hover:text-green-700" title="Save" disabled={isLoading}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEditPerson} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Cancel" disabled={isLoading}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="truncate flex-grow text-sm font-medium" title={person.name}>{person.name}</span>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <Button variant="ghost" size="icon" onClick={() => handleStartEditPerson(person)} className="h-8 w-8 text-blue-600 hover:text-blue-700" title="Edit name" disabled={isLoading || !!editingPersonId}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleConfirmRemovePerson(person)} className="h-8 w-8 text-red-600 hover:text-red-700" title="Remove person" disabled={isLoading || !!editingPersonId}>
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
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6 border rounded-md bg-card/30">
                  <Users className="h-16 w-16 mb-4 text-primary/30" />
                  <p className="text-lg font-medium">No People Yet</p>
                  <p className="text-sm">Add people to your group using the form above.</p>
              </div>
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
              <AlertDialogCancel onClick={() => setPersonToDelete(null)} disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleExecuteRemovePerson} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isLoading}>
                {isLoading ? 'Removing...' : `Attempt to Remove ${personToDelete.name}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
