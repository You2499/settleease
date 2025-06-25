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
import * as LucideIcons from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ManageCategoriesTabProps {
  categories: Category[];
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  onCategoriesUpdate: () => void;
}

function LucideIconPicker({ value, onChange, disabled }: { value: string, onChange: (iconKey: string) => void, disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const iconKeys = (LucideIcons && typeof LucideIcons === 'object')
    ? Object.keys(LucideIcons).filter(key => key[0] === key[0].toUpperCase())
    : [];
  const filtered = Array.isArray(iconKeys)
    ? (search.trim() ? iconKeys.filter(key => key.toLowerCase().includes(search.toLowerCase())) : iconKeys)
    : [];
  const SelectedIcon = (LucideIcons && value && (value in LucideIcons))
    ? (LucideIcons[value as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>)
    : Settings2;
  return (
    <>
      <Button type="button" variant="outline" className="flex items-center gap-2 w-full" onClick={() => setOpen(true)} disabled={disabled}>
        <SelectedIcon className="h-5 w-5" />
        <span className="truncate">{value || 'Pick an icon'}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <div className="mb-2">
            <Input autoFocus placeholder="Search icons..." value={search} onChange={e => setSearch(e.target.value)} className="mb-2" />
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-96 overflow-y-auto">
            {Array.isArray(filtered) && filtered.length > 0 ? filtered.map(key => {
              const Icon = (LucideIcons && (key in LucideIcons))
                ? (LucideIcons[key as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>)
                : Settings2;
              return (
                <button
                  key={key}
                  type="button"
                  className={`flex flex-col items-center p-2 rounded border hover:bg-accent focus:bg-accent ${value === key ? 'border-primary' : 'border-transparent'}`}
                  onClick={() => { onChange(key); setOpen(false); }}
                  title={key}
                >
                  <Icon className="h-6 w-6 mb-1" />
                  <span className="text-[10px] truncate w-12">{key}</span>
                </button>
              );
            }) : <div className="col-span-full text-center text-muted-foreground py-8">No icons found.</div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
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
    if (iconKey && (iconKey in LucideIcons)) return LucideIcons[iconKey as keyof typeof LucideIcons] as React.FC<React.SVGProps<SVGSVGElement>>;
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl text-destructive flex items-center">
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
                <LucideIconPicker value={newCategoryIconKey} onChange={setNewCategoryIconKey} disabled={isLoading} />
              </div>
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim() || !newCategoryIconKey || isLoading} className="h-10 sm:h-11 text-sm sm:text-base w-full md:w-auto md:self-end">
                <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> {isLoading && !editingCategory ? 'Adding...' : 'Add Category'}
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-md sm:text-lg font-semibold mb-2 sm:mb-3 text-primary">Current Categories</h4>
            {categories.length > 0 ? (
              <ScrollArea className="flex-1 min-h-0 rounded-md border bg-background -mx-1 sm:-mx-1">
                <ul className="space-y-1.5 sm:space-y-2 p-1 sm:p-2">
                  {categories.map(category => {
                    const IconComponent = getIconComponent(category.icon_name);
                    return (
                      <li key={category.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-card/70 rounded-md shadow-sm hover:bg-card/90 transition-colors group">
                        {editingCategory?.id === category.id ? (
                          <>
                            <Input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-grow mr-2 h-8 sm:h-9 text-xs sm:text-sm"
                              autoFocus
                              disabled={isLoading}
                            />
                            <LucideIconPicker value={editingIconKey} onChange={setEditingIconKey} disabled={isLoading} />
                            <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="h-7 w-7 sm:h-8 sm:w-8 text-green-600 hover:text-green-700" title="Save" disabled={isLoading}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground" title="Cancel" disabled={isLoading}>
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
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
