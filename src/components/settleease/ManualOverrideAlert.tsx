"use client";

import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Route, X, AlertTriangle, Trash2, Eye } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { MANUAL_SETTLEMENT_OVERRIDES_TABLE } from '@/lib/settleease';
import type { ManualSettlementOverride } from '@/lib/settleease';
import { formatCurrency } from '@/lib/settleease/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManualOverrideAlertProps {
    overrides: ManualSettlementOverride[];
    peopleMap: Record<string, string>;
    db: SupabaseClient | undefined;
    onActionComplete: () => void;
    userRole: 'admin' | 'user' | null;
}

export default function ManualOverrideAlert({
    overrides,
    peopleMap,
    db,
    onActionComplete,
    userRole,
}: ManualOverrideAlertProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [overrideToDelete, setOverrideToDelete] = useState<ManualSettlementOverride | null>(null);

    const activeOverrides = overrides.filter(o => o.is_active);

    if (activeOverrides.length === 0) {
        return null;
    }

    const handleDeactivate = async (override: ManualSettlementOverride) => {
        if (!db) {
            toast({
                title: "Error",
                description: "Database connection not available.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await db
                .from(MANUAL_SETTLEMENT_OVERRIDES_TABLE)
                .update({ is_active: false })
                .eq('id', override.id);

            if (error) throw error;

            toast({
                title: "Override Deactivated",
                description: `Manual path from ${peopleMap[override.debtor_id]} to ${peopleMap[override.creditor_id]} has been removed.`,
            });

            onActionComplete();
        } catch (error: any) {
            console.error("Error deactivating override:", error);
            toast({
                title: "Error",
                description: error.message || "Could not deactivate override.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!overrideToDelete || !db) {
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await db
                .from(MANUAL_SETTLEMENT_OVERRIDES_TABLE)
                .delete()
                .eq('id', overrideToDelete.id);

            if (error) throw error;

            toast({
                title: "Override Deleted",
                description: `Manual path has been permanently deleted.`,
            });

            setOverrideToDelete(null);
            onActionComplete();
        } catch (error: any) {
            console.error("Error deleting override:", error);
            toast({
                title: "Error",
                description: error.message || "Could not delete override.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 mb-4">
                <Route className="h-5 w-5 text-amber-600" />
                <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold flex items-center justify-between">
                    <span>Manual Settlement Paths Active</span>
                    <Badge variant="secondary" className="ml-2">
                        {activeOverrides.length} {activeOverrides.length === 1 ? 'override' : 'overrides'}
                    </Badge>
                </AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-200 mt-2">
                    <p className="mb-3">
                        Custom settlement paths are being used instead of the optimized calculation. 
                        These will remain active until cleared or the debts are settled.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowDetails(true)}
                            className="text-xs"
                        >
                            <Eye className="mr-1 h-3 w-3" />
                            View Details
                        </Button>
                        {userRole === 'admin' && activeOverrides.length > 0 && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                    if (!db) return;
                                    setIsLoading(true);
                                    try {
                                        const { error } = await db
                                            .from(MANUAL_SETTLEMENT_OVERRIDES_TABLE)
                                            .update({ is_active: false })
                                            .in('id', activeOverrides.map(o => o.id));

                                        if (error) throw error;

                                        toast({
                                            title: "All Overrides Cleared",
                                            description: "All manual settlement paths have been removed.",
                                        });

                                        onActionComplete();
                                    } catch (error: any) {
                                        toast({
                                            title: "Error",
                                            description: error.message || "Could not clear overrides.",
                                            variant: "destructive"
                                        });
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                disabled={isLoading}
                                className="text-xs"
                            >
                                <X className="mr-1 h-3 w-3" />
                                Clear All
                            </Button>
                        )}
                    </div>
                </AlertDescription>
            </Alert>

            {/* Details Dialog */}
            <AlertDialog open={showDetails} onOpenChange={setShowDetails}>
                <AlertDialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center">
                            <Route className="mr-2 h-5 w-5 text-amber-600" />
                            Active Manual Settlement Paths
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-3">
                            {activeOverrides.map((override) => (
                                <div
                                    key={override.id}
                                    className="border rounded-lg p-4 bg-card"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-medium text-base">
                                                    {peopleMap[override.debtor_id] || 'Unknown'}
                                                </span>
                                                <span className="text-muted-foreground">→</span>
                                                <span className="font-medium text-base">
                                                    {peopleMap[override.creditor_id] || 'Unknown'}
                                                </span>
                                                <Badge variant="default" className="ml-auto">
                                                    {formatCurrency(override.amount)}
                                                </Badge>
                                            </div>
                                            {override.notes && (
                                                <p className="text-sm text-muted-foreground italic">
                                                    {override.notes}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Created: {new Date(override.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {userRole === 'admin' && (
                                            <div className="flex gap-2 flex-shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDeactivate(override)}
                                                    disabled={isLoading}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => setOverrideToDelete(override)}
                                                    disabled={isLoading}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowDetails(false)}
                        >
                            Close
                        </Button>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            {overrideToDelete && (
                <AlertDialog open={!!overrideToDelete} onOpenChange={(open) => !open && setOverrideToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center">
                                <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                                Delete Manual Override?
                            </AlertDialogTitle>
                        </AlertDialogHeader>
                        
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to permanently delete this manual settlement path?
                            </p>
                            <div className="bg-muted p-3 rounded-md">
                                <p className="text-sm font-medium">
                                    {peopleMap[overrideToDelete.debtor_id]} → {peopleMap[overrideToDelete.creditor_id]}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Amount: {formatCurrency(overrideToDelete.amount)}
                                </p>
                            </div>
                            <p className="text-sm text-destructive">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setOverrideToDelete(null)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isLoading}
                            >
                                {isLoading ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
