"use client";

import React, { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crashTestManager } from '@/lib/settleease/crashTestContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PlusCircle, Trash2, Pencil, Save, Ban, ListChecks, AlertTriangle, Settings2, ArrowUp, ArrowDown, Check, X, ArrowUpDown, HandCoins } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { Category } from '@/lib/settleease/types';
import { CATEGORIES_TABLE, EXPENSES_TABLE } from '@/lib/settleease/constants';
import IconPickerModal from './IconPickerModal';
import * as LucideIcons from 'lucide-react';

interface ManageCategoriesTabProps {
  categories: Category[];
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  onCategoriesUpdate: () => void;
  isAdmin?: boolean;
  isLoadingCategories?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

export default function ManageCategoriesTab({ 
  categories, 
  db, 
  supabaseInitializationError, 
  onCategoriesUpdate, 
  isAdmin,
  isLoadingCategories = false,
  isDataFetchedAtLeastOnce = true,
}: ManageCategoriesTabProps) {
  // Check for crash test
  useEffect(() => {
    crashTestManager.checkAndCrash('manageCategories', 'Manage Categories Tab crashed: Category validation failed with corrupted data');
  });
  
  const isLoadingData = isLoadingCategories || !isDataFetchedAtLeastOnce;

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIconKey, setNewCategoryIconKey] = useState<string>('Utensils');
  const [showAddIconModal, setShowAddIconModal] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIconKey, setEditingIconKey] = useState('');
  const [showEditIconModal, setShowEditIconModal] = useState(false);

  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [rankingMode, setRankingMode] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([...categories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)));
  useEffect(() => {
    setOrderedCategories([...categories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)));
  }, [categories]);

  // Dynamic icon rendering
  const DynamicIcon = React.useMemo(() => {
    if (!newCategoryIconKey) return null;
    return React.lazy(() => import('lucide-react').then(mod => ({ default: (mod as any)[newCategoryIconKey] }))) as unknown as React.FC<React.SVGProps<SVGSVGElement>>;
  }, [newCategoryIconKey]);

  const DynamicEditIcon = React.useMemo(() => {
    if (!editingIconKey) return null;
    return React.lazy(() => import('lucide-react').then(mod => ({ default: (mod as any)[editingIconKey] }))) as unknown as React.FC<React.SVGProps<SVGSVGElement>>;
  }, [editingIconKey]);

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
      setNewCategoryIconKey('Utensils');
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
        className="h-8 w-8 p-0 mb-1 text-muted-foreground hover:text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary"
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
        className="h-8 w-8 p-0 mt-1 text-muted-foreground hover:text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary"
        onClick={onDown}
        disabled={disabledDown || isLoading}
        tabIndex={0}
        aria-label="Move Down"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  );

  // Show skeleton loaders while data is loading
  if (isLoadingData) {
    return (
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6 pb-4 border-b">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 space-y-6">
          {/* Add New Category Section Skeleton */}
          <div className="p-5 border rounded-lg space-y-3">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          
          {/* Categories List Skeleton */}
          <div className="flex-1 min-h-0">
            <Skeleton className="h-6 w-56 mb-3" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (supabaseInitializationError && !db) {
    return (
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
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
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
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
                <Button
                  type="button"
                  variant="outline"
                  className="mt-1 h-10 sm:h-11 text-sm sm:text-base flex items-center gap-2"
                  onClick={() => setShowAddIconModal(true)}
                  disabled={isLoading}
                >
                  <React.Suspense fallback={<span className="w-5 h-5" />}>
                    {DynamicIcon && <DynamicIcon className="h-5 w-5" />}
                  </React.Suspense>
                  {newCategoryIconKey || 'Choose Icon'}
                </Button>
                <IconPickerModal
                  open={showAddIconModal}
                  onClose={() => setShowAddIconModal(false)}
                  onSelect={(iconName) => {
                    setNewCategoryIconKey(iconName);
                    setShowAddIconModal(false);
                  }}
                />
              </div>
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim() || !newCategoryIconKey || isLoading} size="sm" className="w-full md:w-auto md:self-end">
                <PlusCircle className="mr-1 h-4 w-4" /> {isLoading && !editingCategory ? 'Adding...' : 'Add Category'}
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h4 className="text-md sm:text-lg font-semibold text-primary">Current Categories</h4>
              {!rankingMode && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setRankingMode(true)}>
                  <ArrowUpDown className="mr-1 h-4 w-4" /> Edit Rank
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
                    const IconComponent = (LucideIcons as any)[category.icon_name] || Settings2;
                    return (
                      <li key={category.id} className={`flex items-center justify-between bg-card/70 rounded-md shadow-sm hover:bg-card/90 transition-colors group ${rankingMode ? 'min-h-[60px] sm:min-h-[68px] py-2 sm:py-3' : 'p-2.5 sm:p-3'}`}>
                        {editingCategory?.id === category.id ? (
                          <>
                            <div className="flex-grow flex items-center gap-2 mr-2 min-w-0">
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 min-w-0 h-8 sm:h-9 text-xs sm:text-sm focus:outline-none"
                                autoFocus
                                disabled={isLoading}
                              />
                              <Button type="button" variant="outline" onClick={() => setShowEditIconModal(true)} disabled={isLoading} className="w-[220px] h-8 sm:h-9 text-xs sm:text-sm flex-shrink-0 flex items-center gap-2 mt-1">
                                <React.Suspense fallback={<span className="w-5 h-5" />}>
                                  {DynamicEditIcon && <DynamicEditIcon className="h-5 w-5" />}
                                </React.Suspense>
                                {editingIconKey || 'Choose Icon'}
                              </Button>
                              <IconPickerModal
                                open={showEditIconModal}
                                onClose={() => setShowEditIconModal(false)}
                                onSelect={(iconName) => {
                                  setEditingIconKey(iconName);
                                  setShowEditIconModal(false);
                                }}
                              />
                            </div>
                            <div className="flex items-center flex-shrink-0">
                              <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="h-8 w-8 text-green-600 hover:text-green-700" title="Save" disabled={isLoading}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Cancel" disabled={isLoading}>
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
          <AlertDialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar">
            <div className="bg-white dark:bg-gray-900 border border-border shadow-lg relative rounded-lg -m-6 p-6">
              <div>
                <AlertDialogHeader className="pb-4">
                  <AlertDialogTitle className="flex items-center justify-center text-lg font-semibold">
                    Delete Category
                  </AlertDialogTitle>
                </AlertDialogHeader>

                <div className="space-y-3">
                  {/* Warning Section */}
                  <div className="bg-white/95 dark:bg-gray-800/95 border border-[#EA4335]/30 dark:border-[#EA4335]/20 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-[#EA4335]/10 dark:bg-[#EA4335]/5">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-[#EA4335]" />
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                          Delete Category
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        This action will permanently delete the category: <strong>{categoryToDelete.name}</strong>
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        This action cannot be undone. Expenses using this category will not be automatically reassigned.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 pt-4">
                  <button
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={executeDeleteCategory}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : `Delete ${categoryToDelete.name}`}
                  </button>
                  <button
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setCategoryToDelete(null)}
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
