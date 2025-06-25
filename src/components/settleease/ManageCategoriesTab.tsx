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
import { PlusCircle, Trash2, Pencil, Save, Ban, ListChecks, AlertTriangle, Settings2, ArrowUp, ArrowDown, Check, X } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { Category } from '@/lib/settleease/types';
import { CATEGORIES_TABLE, EXPENSES_TABLE, AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants';

interface ManageCategoriesTabProps {
  categories: Category[];
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  onCategoriesUpdate: () => void;
  isAdmin?: boolean;
}

export default function ManageCategoriesTab({ categories, db, supabaseInitializationError, onCategoriesUpdate, isAdmin }: ManageCategoriesTabProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIconKey, setNewCategoryIconKey] = useState<string>(AVAILABLE_CATEGORY_ICONS[0]?.iconKey || '');

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIconKey, setEditingIconKey] = useState('');

  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [rankingMode, setRankingMode] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([...categories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)));
  useEffect(() => {
    setOrderedCategories([...categories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)));
  }, [categories]);

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
    if (categories.some(cat => cat.name.trim().toLowerCase() === newCategoryName.trim().toLowerCase())) {
      toast({ title: "Duplicate Category", description: `A category named "${newCategoryName.trim()}" already exists.`, variant: "destructive" });
      return;
    }
    if (!db || supabaseInitializationError) {
      toast({ title: "Database Error", description: `Supabase client not available. ${supabaseInitializationError || ''}`, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const maxRank = categories.length > 0 ? Math.max(...categories.map(c => c.rank ?? 0)) : 0;
      const { data, error } = await db.from(CATEGORIES_TABLE).insert([
        { name: newCategoryName.trim(), icon_name: newCategoryIconKey, created_at: new Date().toISOString(), rank: maxRank + 1 }
      ]).select();
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

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderedCategories];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setOrderedCategories(newOrder);
  };

  const saveCategoryOrder = async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      for (let i = 0; i < orderedCategories.length; i++) {
        const cat = orderedCategories[i];
        if (cat.rank !== i + 1) {
          await db.from(CATEGORIES_TABLE).update({ rank: i + 1 }).eq('id', cat.id);
        }
      }
      toast({ title: 'Category Order Saved', description: 'The new category order has been saved.' });
      setRankingMode(false);
      onCategoriesUpdate();
    } catch (error: any) {
      toast({ title: 'Error Saving Order', description: error.message || 'Could not save category order.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Reddit-style up/down button group
  const RedditRankButtons = ({ idx, disabledUp, disabledDown, onUp, onDown, isLoading }: { idx: number, disabledUp: boolean, disabledDown: boolean, onUp: () => void, onDown: () => void, isLoading: boolean }) => (
    <div className="flex flex-col items-center justify-center mr-3 ml-3 rounded-md border border-border bg-background/70 px-1 py-1">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 p-0 mb-1 text-muted-foreground hover:text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary"
        onClick={onUp}
        disabled={disabledUp || isLoading}
        tabIndex={0}
        aria-label="Move Up"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 p-0 mt-1 text-muted-foreground hover:text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary"
        onClick={onDown}
        disabled={disabledDown || isLoading}
        tabIndex={0}
        aria-label="Move Down"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  );

  if (supabaseInitializationError && !db) {
    return (
      <Card className="shadow-xl rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 sm:p-6">
          <p className="text-sm sm:text-base">Could not connect to the database. Managing categories is currently unavailable.</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{supabaseInitializationError}</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <>
      <Card className="shadow-xl rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6 pb-4 border-b">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
            <ListChecks className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Manage Categories
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Add new expense categories, choose icons, or edit existing ones.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-6">
          
          <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
            <Label className="text-md sm:text-lg font-semibold block mb-2 sm:mb-3 text-primary">Add New Category</Label>
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-1 md:grid-cols-3 md:gap-4 md:items-end">
              <div className="md:col-span-1">
                <Label htmlFor="newCategoryName" className="text-xs">Category Name</Label>
                <Input
                  id="newCategoryName"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Groceries"
                  className="mt-1 h-10 sm:h-11 text-sm sm:text-base"
                  disabled={isLoading}
                />
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="newCategoryIcon" className="text-xs">Icon</Label>
                <Select value={newCategoryIconKey} onValueChange={setNewCategoryIconKey} disabled={isLoading}>
                  <SelectTrigger id="newCategoryIcon" className="mt-1 h-10 sm:h-11 text-sm sm:text-base">
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
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim() || !newCategoryIconKey || isLoading} className="h-10 sm:h-11 text-sm sm:text-base w-full md:w-auto md:self-end">
                <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> {isLoading && !editingCategory ? 'Adding...' : 'Add Category'}
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h4 className="text-md sm:text-lg font-semibold text-primary">Current Categories</h4>
              {!rankingMode && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setRankingMode(true)}>
                  Rank
                </Button>
              )}
              {rankingMode && (
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={saveCategoryOrder} disabled={isLoading}>
                    <Check className="h-4 w-4 mr-1" /> Save Order
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setRankingMode(false); setOrderedCategories([...categories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))); }}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              )}
            </div>
            {orderedCategories.length > 0 ? (
              <ScrollArea className="flex-1 min-h-0 rounded-md border bg-background -mx-1 sm:-mx-1">
                <ul className="space-y-1.5 sm:space-y-2 p-1 sm:p-2">
                  {orderedCategories.map((category, idx) => {
                    const IconComponent = getIconComponent(category.icon_name);
                    return (
                      <li key={category.id} className={`flex items-center justify-between bg-card/70 rounded-md shadow-sm hover:bg-card/90 transition-colors group ${rankingMode ? 'min-h-[60px] sm:min-h-[68px] py-2 sm:py-3' : 'p-2.5 sm:p-3'}`}>
                        {editingCategory?.id === category.id ? (
                          <>
                            <div className="flex-grow flex items-center gap-2 mr-2 min-w-0">
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 min-w-0 h-8 sm:h-9 text-xs sm:text-sm"
                                autoFocus
                                disabled={isLoading}
                              />
                              <Select value={editingIconKey} onValueChange={setEditingIconKey} disabled={isLoading}>
                                  <SelectTrigger className="w-[220px] h-8 sm:h-9 text-xs sm:text-sm flex-shrink-0">
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
                            <div className="flex items-center flex-shrink-0">
                              <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="h-7 w-7 sm:h-8 sm:w-8 text-green-600 hover:text-green-700" title="Save" disabled={isLoading}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground" title="Cancel" disabled={isLoading}>
                                <Ban className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            {rankingMode && (
                              <RedditRankButtons
                                idx={idx}
                                disabledUp={idx === 0}
                                disabledDown={idx === orderedCategories.length - 1}
                                onUp={() => moveCategory(idx, 'up')}
                                onDown={() => moveCategory(idx, 'down')}
                                isLoading={isLoading}
                              />
                            )}
                            <div className="flex items-center flex-grow truncate mr-2">
                                <IconComponent className="mr-2 sm:mr-2.5 h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                                <span className="truncate text-sm font-medium" title={category.name}>{category.name}</span>
                            </div>
                            <div className="flex items-center space-x-0.5 sm:space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <Button variant="ghost" size="icon" onClick={() => handleStartEdit(category)} className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 hover:text-blue-700" title="Edit category" disabled={isLoading || !!editingCategory}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleConfirmDelete(category)} className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:text-red-700" title="Delete category" disabled={isLoading || !!editingCategory}>
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
                  <ListChecks className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary/30" />
                  <p className="text-md sm:text-lg font-medium">No Categories Yet</p>
                  <p className="text-xs sm:text-sm">Add some categories using the form above to organize your expenses.</p>
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
