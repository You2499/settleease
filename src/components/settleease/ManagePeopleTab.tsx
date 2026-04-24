"use client";

import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PlusCircle, Trash2, Pencil, Save, Ban, Users, AlertTriangle, HandCoins } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { Person } from '@/lib/settleease';
import {
  LoadingRegion,
  PersonRowSkeleton,
  SkeletonCardHeader,
  SkeletonFormField,
  SkeletonSectionHeader,
} from './SkeletonLayouts';

interface ManagePeopleTabProps {
  people: Person[];
  isLoadingPeople?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

export default function ManagePeopleTab({ 
  people, 
  isLoadingPeople = false,
  isDataFetchedAtLeastOnce = true,
}: ManagePeopleTabProps) {
  const isLoadingData = isLoadingPeople || !isDataFetchedAtLeastOnce;

  const [newPersonName, setNewPersonName] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonNewName, setEditingPersonNewName] = useState('');
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addPerson = useMutation(api.app.addPerson);
  const updatePerson = useMutation(api.app.updatePerson);
  const removePerson = useMutation(api.app.removePerson);

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) {
      toast({ title: "Validation Error", description: "Person's name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await addPerson({ name: newPersonName.trim() });
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
    setIsLoading(true);
    try {
      await updatePerson({ id: editingPersonId, name: editingPersonNewName.trim() });
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
    if (!personToDelete) {
      toast({ title: "Error", description: "Cannot remove person: system error.", variant: "destructive" });
      if (personToDelete) setPersonToDelete(null);
      return;
    }
    setIsLoading(true);
    try {
      await removePerson({ id: personToDelete.id });

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

  // Show skeleton loaders while data is loading
  if (isLoadingData) {
    return (
      <LoadingRegion label="Loading people management" className="h-full">
        <Card className="shadow-lg rounded-lg h-full flex flex-col bg-background">
          <SkeletonCardHeader titleWidth="w-44" descriptionWidth="w-full max-w-lg" />
          <CardContent className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
            <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50 space-y-3">
              <SkeletonSectionHeader width="w-36" />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <SkeletonFormField className="flex-1" labelWidth="w-24" />
                <Skeleton className="h-10 w-full rounded-lg sm:h-11 sm:w-32" />
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <SkeletonSectionHeader width="w-48" className="mb-3" />
              <div className="space-y-2 sm:space-y-2.5">
                {[0, 1, 2, 3].map((item) => (
                  <PersonRowSkeleton key={item} actions={2} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </LoadingRegion>
    );
  }
  
  return (
    <>
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6 pb-4 border-b">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
            <Users className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Manage People
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Add new participants to your group or edit existing ones.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-6">

          <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
            <Label className="text-md sm:text-lg font-semibold block mb-2 sm:mb-3 text-primary">Add New Person</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:space-x-3 sm:items-end">
              <div className="flex-grow w-full sm:w-auto">
                <Label htmlFor="newPersonName" className="text-xs">Person's Name</Label>
                <Input
                  id="newPersonName"
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="e.g., Jane Doe"
                  className="mt-1 h-10 sm:h-11 text-sm sm:text-base w-full"
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                />
              </div>
              <Button onClick={handleAddPerson} disabled={!newPersonName.trim() || isLoading} size="sm" className="w-full sm:w-auto">
                <PlusCircle className="mr-1 h-4 w-4" /> {isLoading && !editingPersonId ? 'Adding...' : 'Add Person'}
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-md sm:text-lg font-semibold mb-2 sm:mb-3 text-primary">Current People in Group</h4>
            {!isLoadingData && people.length > 0 ? (
              <ScrollArea className="flex-1 min-h-0 rounded-md border bg-background -mx-1 sm:-mx-1">
                <ul className="space-y-1.5 sm:space-y-2 p-1 sm:p-2">
                  {people.map(person => (
                    <li key={person.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-card/70 rounded-md shadow-sm hover:bg-card/90 transition-colors group">
                      {editingPersonId === person.id ? (
                        <>
                          <Input
                            type="text"
                            value={editingPersonNewName}
                            onChange={(e) => setEditingPersonNewName(e.target.value)}
                            className="flex-grow mr-2 h-8 sm:h-9 text-xs sm:text-sm focus:outline-none"
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
                          <div className="flex items-center space-x-0.5 sm:space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
                <Users className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary/30" />
                <p className="text-md sm:text-lg font-medium">No People Yet</p>
                <p className="text-xs sm:text-sm">Add people to your group using the form above.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {personToDelete && (
        <AlertDialog open={personToDelete !== null} onOpenChange={(open) => !open && setPersonToDelete(null)}>
          <AlertDialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar">
            <div className="bg-white dark:bg-gray-900 border border-border shadow-lg relative rounded-lg -m-6 p-6">
              <div>
                <AlertDialogHeader className="pb-4">
                  <AlertDialogTitle className="flex items-center justify-center text-lg font-semibold">
                    Remove Person
                  </AlertDialogTitle>
                </AlertDialogHeader>

                <div className="space-y-3">
                  {/* Warning Section */}
                  <div className="bg-white/95 dark:bg-gray-800/95 border border-[#EA4335]/30 dark:border-[#EA4335]/20 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-[#EA4335]/10 dark:bg-[#EA4335]/5">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-[#EA4335]" />
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                          Remove Person
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        This action will attempt to remove <strong>{personToDelete.name}</strong> from the group.
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        If this person is involved in any expenses or settlements, removal will be blocked. This action cannot be undone if successful.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 pt-4">
                  <button
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleExecuteRemovePerson}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Removing...' : `Remove ${personToDelete.name}`}
                  </button>
                  <button
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setPersonToDelete(null)}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
