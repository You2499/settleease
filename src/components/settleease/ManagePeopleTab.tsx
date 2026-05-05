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
import AppEmptyState from './AppEmptyState';
import {
  SettleEaseAlertDialog,
  SettleEaseModalBody,
  SettleEaseModalFooter,
  SettleEaseModalHeader,
  SettleEaseModalNotice,
} from './SettleEaseDialog';

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
              <AppEmptyState
                icon={Users}
                title="No People Yet"
                description="Add people to your group using the form above."
                size="panel"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {personToDelete && (
        <SettleEaseAlertDialog open={personToDelete !== null} onOpenChange={(open) => !open && setPersonToDelete(null)}>
          <SettleEaseModalHeader
            kind="alert"
            icon={AlertTriangle}
            tone="danger"
            title="Remove Person"
            description="SettleEase will block removal if this person is referenced by expenses or settlements."
          />
          <SettleEaseModalBody>
            <SettleEaseModalNotice tone="danger">
              <p>
                This action will attempt to remove <strong>{personToDelete.name}</strong> from the group.
              </p>
              <p className="mt-2">
                If successful, this action cannot be undone.
              </p>
            </SettleEaseModalNotice>
          </SettleEaseModalBody>
          <SettleEaseModalFooter className="sm:justify-end">
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setPersonToDelete(null)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="h-10 rounded-full"
                onClick={handleExecuteRemovePerson}
                disabled={isLoading}
              >
                {isLoading ? 'Removing...' : `Remove ${personToDelete.name}`}
              </Button>
            </div>
          </SettleEaseModalFooter>
        </SettleEaseAlertDialog>
      )}
    </>
  );
}
