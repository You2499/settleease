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
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Route, X, AlertTriangle, Trash2, Eye, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { MANUAL_SETTLEMENT_OVERRIDES_TABLE } from '@/lib/settleease';
import type { ManualSettlementOverride } from '@/lib/settleease';
import { formatCurrency } from '@/lib/settleease/utils';

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
                <Route className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
                <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-sm sm:text-base">Manual Settlement Paths Active</span>
                        <Badge variant="secondary" className="self-start sm:self-auto">
                            {activeOverrides.length} {activeOverrides.length === 1 ? 'override' : 'overrides'}
                        </Badge>
                    </div>
                </AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-200 mt-2">
                    <p className="mb-3 text-xs sm:text-sm">
                        Custom settlement paths are being used instead of the optimized calculation. 
                        These will remain active until cleared or the debts are settled.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowDetails(true)}
                            className="text-xs w-full sm:w-auto"
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
                                className="text-xs w-full sm:w-auto"
                            >
                                <X className="mr-1 h-3 w-3" />
                                Clear All
                            </Button>
                        )}
                    </div>
                </AlertDescription>
            </Alert>

            {/* Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar" hideCloseButton={false}>
                    <div className="space-y-4 w-full min-w-0">
                        {/* Header Section */}
                        <div className="bg-white/95 dark:bg-gray-800/95 border border-[#FBBC05]/30 dark:border-[#FBBC05]/20 rounded-lg overflow-hidden w-full">
                            <div className="px-3 sm:px-4 py-3 bg-[#FBBC05]/10 dark:bg-[#FBBC05]/5">
                                <div className="flex items-center space-x-2 min-w-0">
                                    <Route className="h-4 w-4 text-[#EA4335] flex-shrink-0" />
                                    <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                                        Active Manual Settlement Paths
                                    </span>
                                </div>
                            </div>
                            <div className="px-3 sm:px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    These custom settlement paths override the optimized calculation. They remain active until cleared or debts are settled.
                                </p>
                            </div>
                        </div>

                        {/* Summary Section */}
                        <div className="bg-white/95 dark:bg-gray-800/95 border border-[#34A853]/30 dark:border-[#34A853]/20 rounded-lg overflow-hidden w-full">
                            <div className="px-3 sm:px-4 py-3 bg-[#34A853]/10 dark:bg-[#34A853]/5">
                                <div className="flex items-center space-x-2 min-w-0">
                                    <AlertCircle className="h-4 w-4 text-[#34A853] flex-shrink-0" />
                                    <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                                        Summary
                                    </span>
                                </div>
                            </div>
                            <div className="px-3 sm:px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                                <div className="text-sm space-y-2 w-full min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                                        <span className="text-gray-700 dark:text-gray-300">Active Overrides:</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-100">{activeOverrides.length}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                                        <span className="text-gray-700 dark:text-gray-300">Total Amount:</span>
                                        <span className="font-bold text-lg text-primary">
                                            {formatCurrency(activeOverrides.reduce((sum, o) => sum + Number(o.amount), 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Overrides List Section */}
                        <div className="bg-white/95 dark:bg-gray-800/95 border border-[#4285F4]/30 dark:border-[#4285F4]/20 rounded-lg overflow-hidden w-full">
                            <div className="px-3 sm:px-4 py-3 bg-[#4285F4]/10 dark:bg-[#4285F4]/5">
                                <div className="flex items-center space-x-2 min-w-0">
                                    <Route className="h-4 w-4 text-[#4285F4] flex-shrink-0" />
                                    <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                                        Override Details
                                    </span>
                                </div>
                            </div>
                            <div className="px-3 sm:px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                                <div className="space-y-3 w-full min-w-0">
                                    {activeOverrides.map((override) => (
                                        <Card 
                                            key={override.id}
                                            className="bg-secondary/20 shadow-sm border w-full min-w-0"
                                        >
                                            <CardContent className="p-3 sm:p-4">
                                                <div className="space-y-3 w-full min-w-0">
                                                    {/* Header with path and amount */}
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 w-full min-w-0">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="font-semibold text-base truncate">
                                                                    {peopleMap[override.debtor_id] || 'Unknown'}
                                                                </span>
                                                                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                                                                <span className="font-semibold text-base truncate">
                                                                    {peopleMap[override.creditor_id] || 'Unknown'}
                                                                </span>
                                                            </div>
                                                            {override.notes && (
                                                                <p className="text-xs text-muted-foreground italic mt-1 break-words">
                                                                    {override.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="text-xl font-bold text-primary">
                                                                {formatCurrency(override.amount)}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Manual Path
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-xs w-full min-w-0">
                                                        <div className="text-muted-foreground">
                                                            Created: {new Date(override.created_at).toLocaleDateString('default', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                        {userRole === 'admin' && (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleDeactivate(override)}
                                                                    disabled={isLoading}
                                                                    className="text-xs h-7"
                                                                >
                                                                    <X className="mr-1 h-3 w-3" />
                                                                    Deactivate
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => setOverrideToDelete(override)}
                                                                    disabled={isLoading}
                                                                    className="text-xs h-7"
                                                                >
                                                                    <Trash2 className="mr-1 h-3 w-3" />
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

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
