
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
    } catch (error: any)
 {
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
      <Card className="shadow-xl rounded-lg h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-6">
          <p>Could not connect to the database. Managing categories is currently unavailable.</p>
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
            <ListChecks className="mr-3 h-6 w-6 text-primary" /> Manage Categories
          </CardTitle>
          <CardDescription>Add new expense categories, choose icons, or edit existing ones.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-6 space-y-6">
          
          <div className="p-5 border rounded-lg shadow-sm bg-card/50">
            <Label className="text-lg font-semibold block mb-3 text-primary">Add New Category</Label>
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-1">
                <Label htmlFor="newCategoryName" className="text-xs">Category Name</Label>
                <Input
                  id="newCategoryName"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Groceries"
                  className="mt-1 h-11 text-base"
                  disabled={isLoading}
                />
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="newCategoryIcon" className="text-xs">Icon</Label>
                <Select value={newCategoryIconKey} onValueChange={setNewCategoryIconKey} disabled={isLoading}>
                  <SelectTrigger id="newCategoryIcon" className="mt-1 h-11 text-base">
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
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim() || !newCategoryIconKey || isLoading} className="h-11 text-base md:self-end">
                <PlusCircle className="mr-2 h-5 w-5" /> {isLoading && !editingCategory ? 'Adding...' : 'Add Category'}
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-lg font-semibold mb-3 text-primary">Current Categories</h4>
            {categories.length > 0 ? (
              <ScrollArea className="flex-1 min-h-0 rounded-md border bg-background -mx-1">
                <ul className="space-y-2 p-2">
                  {categories.map(category => {
                    const IconComponent = getIconComponent(category.icon_name);
                    return (
                      <li key={category.id} className="flex items-center justify-between p-3 bg-card/70 rounded-md shadow-sm hover:bg-card/90 transition-colors group">
                        {editingCategory?.id === category.id ? (
                          <>
                            <Input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-grow mr-2 h-9 text-sm"
                              autoFocus
                              disabled={isLoading}
                            />
                            <Select value={editingIconKey} onValueChange={setEditingIconKey} disabled={isLoading}>
                                <SelectTrigger className="w-[180px] sm:w-[220px] h-9 text-sm mr-2">
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
                            <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="h-8 w-8 text-green-600 hover:text-green-700" title="Save" disabled={isLoading}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Cancel" disabled={isLoading}>
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center flex-grow truncate mr-2">
                                <IconComponent className="mr-2.5 h-5 w-5 text-primary flex-shrink-0" />
                                <span className="truncate text-sm font-medium" title={category.name}>{category.name}</span>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <Button variant="ghost" size="icon" onClick={() => handleStartEdit(category)} className="h-8 w-8 text-blue-600 hover:text-blue-700" title="Edit category" disabled={isLoading || !!editingCategory}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleConfirmDelete(category)} className="h-8 w-8 text-red-600 hover:text-red-700" title="Delete category" disabled={isLoading || !!editingCategory}>
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
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6 border rounded-md bg-card/30">
                  <ListChecks className="h-16 w-16 mb-4 text-primary/30" />
                  <p className="text-lg font-medium">No Categories Yet</p>
                  <p className="text-sm">Add some categories using the form above to organize your expenses.</p>
              </div>
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
                This action cannot be undone. Expenses using this category will not be automatically reassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCategoryToDelete(null)} disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isLoading}>
                {isLoading ? 'Deleting...' : `Yes, delete ${categoryToDelete.name}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
