
"use client";

import React, { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { PlusCircle, Trash2, Pencil, Save, Ban, ListChecks, AlertTriangle, Settings2 } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { Category } from '@/lib/settleease/types';
import { CATEGORIES_TABLE, EXPENSES_TABLE, AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants';

interface ManageCategoriesTabProps {
  categories: Category[];
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  onCategoriesUpdate: () => void;
}

export default function ManageCategoriesTab({ categories, db, supabaseInitializationError, onCategoriesUpdate }: ManageCategoriesTabProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIconKey, setNewCategoryIconKey] = useState<string>(AVAILABLE_CATEGORY_ICONS[0]?.iconKey || '');

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIconKey, setEditingIconKey] = useState('');

  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getIconComponent = (iconKey: string): React.FC<React.SVGProps<SVGSVGElement>> => {
    const found = AVAILABLE_CATEGORY_ICONS.find(icon => icon.iconKey === iconKey);
    return found ? found.IconComponent : Settings2;
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: "Validation Error", description: "Category name cannot be empty.", variant: "destructive" });
      return;
    }
    if (!newCategoryIconKey) {
      toast({ title: "Validation Error", description: "Please select an icon.", variant: "destructive" });
      return;
    }
    if (!db || supabaseInitializationError) {
      toast({ title: "Database Error", description: `Supabase client not available. ${supabaseInitializationError || ''}`, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await db.from(CATEGORIES_TABLE).insert([{ name: newCategoryName.trim(), icon_name: newCategoryIconKey, created_at: new Date().toISOString() }]).select();
      if (error) throw error;
      toast({ title: "Category Added", description: `${newCategoryName.trim()} has been added.` });
      setNewCategoryName('');
      setNewCategoryIconKey(AVAILABLE_CATEGORY_ICONS[0]?.iconKey || '');
      onCategoriesUpdate();
    } catch (error: any) {
      toast({ title: "Error Adding Category", description: error.message || "Could not add category.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategory(category);
    setEditingName(category.name);
    setEditingIconKey(category.icon_name);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditingName('');
    setEditingIconKey('');
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editingName.trim()) {
      toast({ title: "Validation Error", description: "Category name cannot be empty.", variant: "destructive" });
      return;
    }
    if (!editingIconKey) {
        toast({ title: "Validation Error", description: "Please select an icon for the category.", variant: "destructive" });
        return;
    }
    if (!db || supabaseInitializationError) {
      toast({ title: "Database Error", description: `Supabase client not available. ${supabaseInitializationError || ''}`, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await db.from(CATEGORIES_TABLE).update({ name: editingName.trim(), icon_name: editingIconKey }).eq('id', editingCategory.id);
      if (error) throw error;
      toast({ title: "Category Updated", description: "Category updated successfully." });
      handleCancelEdit();
      onCategoriesUpdate();
    } catch (error: any) {
      toast({ title: "Error Updating Category", description: error.message || "Could not update category.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = (category: Category) => {
    setCategoryToDelete(category);
  };

  const executeDeleteCategory = async () => {
    if (!categoryToDelete || !db || supabaseInitializationError) {
      toast({ title: "Error", description: "Cannot delete category due to system error.", variant: "destructive" });
      if (categoryToDelete) setCategoryToDelete(null); 
      return;
    }

    setIsLoading(true);
    try {
      const { count, error: countError } = await db
        .from(EXPENSES_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('category', categoryToDelete.name);

      if (countError) {
        throw new Error(`Failed to check expense usage: ${countError.message}`);
      }

      if (count !== null && count > 0) {
        toast({
          title: "Deletion Blocked",
          description: `Category "${categoryToDelete.name}" is used by ${count} expense(s). Please re-categorize or delete those expenses first.`,
          variant: "destructive",
          duration: 7000,
        });
        setCategoryToDelete(null);
        setIsLoading(false);
        return;
      }

      const { error: deleteError } = await db.from(CATEGORIES_TABLE).delete().eq('id', categoryToDelete.id);
      if (deleteError) throw deleteError;

      toast({ title: "Category Deleted", description: `${categoryToDelete.name} has been deleted.` });
      if (editingCategory?.id === categoryToDelete.id) handleCancelEdit();
      onCategoriesUpdate();

    } catch (error: any) {
      toast({ title: "Error Deleting Category", description: error.message || "Could not delete category.", variant: "destructive" });
    } finally {
      setCategoryToDelete(null);
      setIsLoading(false);
    }
  };

  if (supabaseInitializationError && !db) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not connect to the database. Managing categories is currently unavailable.</p>
          <p className="text-sm text-muted-foreground mt-1">{supabaseInitializationError}</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <ListChecks className="mr-2 h-5 w-5 text-primary" /> Manage Categories
          </CardTitle>
          <CardDescription>Add, edit, or remove expense categories.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border p-4 rounded-md bg-card/50">
            <Label className="text-md font-medium block mb-2">Add New Category</Label>
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div>
                <Label htmlFor="newCategoryName" className="text-xs">Category Name</Label>
                <Input
                  id="newCategoryName"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Groceries"
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="newCategoryIcon" className="text-xs">Icon</Label>
                <Select value={newCategoryIconKey} onValueChange={setNewCategoryIconKey} disabled={isLoading}>
                  <SelectTrigger id="newCategoryIcon" className="mt-1">
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_CATEGORY_ICONS.map(icon => {
                      const IconComp = icon.IconComponent;
                      return (
                        <SelectItem key={icon.iconKey} value={icon.iconKey}>
                          <div className="flex items-center">
                            <IconComp className="mr-2 h-4 w-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim() || !newCategoryIconKey || isLoading} className="md:self-end h-10">
                <PlusCircle className="mr-2 h-4 w-4" /> {isLoading ? 'Adding...' : 'Add Category'}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-muted-foreground">Current Categories:</h4>
            {categories.length > 0 ? (
              <ScrollArea className="h-72 rounded-md border p-1 bg-background">
                <ul className="space-y-1.5 p-1">
                  {categories.map(category => {
                    const IconComponent = getIconComponent(category.icon_name);
                    return (
                      <li key={category.id} className="flex items-center justify-between p-2.5 bg-card/60 rounded-sm text-sm group">
                        {editingCategory?.id === category.id ? (
                          <>
                            <Input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-grow mr-2 h-8 text-sm"
                              autoFocus
                              disabled={isLoading}
                            />
                            <Select value={editingIconKey} onValueChange={setEditingIconKey} disabled={isLoading}>
                                <SelectTrigger className="w-[200px] h-8 text-sm mr-2">
                                    <SelectValue placeholder="Select icon" />
                                </SelectTrigger>
                                <SelectContent>
                                    {AVAILABLE_CATEGORY_ICONS.map(icon => {
                                      const IconComp = icon.IconComponent;
                                      return (
                                        <SelectItem key={icon.iconKey} value={icon.iconKey}>
                                          <div className="flex items-center">
                                            <IconComp className="mr-2 h-4 w-4" />
                                            {icon.label}
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="h-7 w-7 text-green-600" title="Save" disabled={isLoading}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-7 w-7 text-gray-500" title="Cancel" disabled={isLoading}>
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center flex-grow truncate mr-2">
                                <IconComponent className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                                <span className="truncate" title={category.name}>{category.name}</span>
                            </div>
                            <div className="flex items-center space-x-0.5">
                              <Button variant="ghost" size="icon" onClick={() => handleStartEdit(category)} className="h-7 w-7 text-blue-600" title="Edit category" disabled={isLoading}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleConfirmDelete(category)} className="h-7 w-7 text-red-600" title="Delete category" disabled={isLoading || !!editingCategory}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground p-2">No categories added yet. Add some to get started!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {categoryToDelete && (
        <AlertDialog open={categoryToDelete !== null} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the category: <strong>{categoryToDelete.name}</strong>.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCategoryToDelete(null)} disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeDeleteCategory} className="bg-destructive text-destructive-foreground" disabled={isLoading}>
                {isLoading ? 'Deleting...' : `Yes, delete ${categoryToDelete.name}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
