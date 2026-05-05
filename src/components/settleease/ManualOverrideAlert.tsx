"use client";

import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Route, X, AlertTriangle, Trash2, Eye, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { ManualSettlementOverride } from '@/lib/settleease';
import { formatCurrency } from '@/lib/settleease/utils';
import SettleEaseDialog, {
    SettleEaseAlertDialog,
    SettleEaseModalBody,
    SettleEaseModalFooter,
    SettleEaseModalHeader,
    SettleEaseModalNotice,
} from './SettleEaseDialog';

interface ManualOverrideAlertProps {
    overrides: ManualSettlementOverride[];
    peopleMap: Record<string, string>;
    onActionComplete: () => void;
    userRole: 'admin' | 'user' | null;
}

export default function ManualOverrideAlert({
    overrides,
    peopleMap,
    onActionComplete,
    userRole,
}: ManualOverrideAlertProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [overrideToDelete, setOverrideToDelete] = useState<ManualSettlementOverride | null>(null);
    const deactivateManualSettlementOverride = useMutation(api.app.deactivateManualSettlementOverride);
    const deleteManualSettlementOverride = useMutation(api.app.deleteManualSettlementOverride);
    const clearActiveManualSettlementOverrides = useMutation(api.app.clearActiveManualSettlementOverrides);

    const activeOverrides = overrides.filter(o => o.is_active);

    if (activeOverrides.length === 0) {
        return null;
    }

    const handleDeactivate = async (override: ManualSettlementOverride) => {
        setIsLoading(true);
        try {
            await deactivateManualSettlementOverride({ id: override.id });

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
        if (!overrideToDelete) {
            return;
        }

        setIsLoading(true);
        try {
            await deleteManualSettlementOverride({ id: overrideToDelete.id });

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
            <div className="border border-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 flex items-start gap-3">
                <Route className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-semibold text-amber-900 dark:text-amber-100">
                            Manual Settlement Paths Active
                        </h3>
                        <Badge variant="secondary" className="flex-shrink-0">
                            {activeOverrides.length} {activeOverrides.length === 1 ? 'override' : 'overrides'}
                        </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
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
                                    setIsLoading(true);
                                    try {
                                        await clearActiveManualSettlementOverrides();

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
                </div>
            </div>

            {/* Details Dialog */}
            <SettleEaseDialog open={showDetails} onOpenChange={setShowDetails} className="sm:max-w-2xl">
                <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
                    <SettleEaseModalHeader
                        icon={Route}
                        tone="warning"
                        title="Active Manual Settlement Paths"
                        description="These custom settlement paths override the optimized calculation until cleared or settled."
                    />
                    <SettleEaseModalBody className="space-y-4">

                        {/* Summary Section */}
                        <div className="overflow-hidden rounded-xl border bg-background shadow-sm w-full">
                            <div className="px-3 sm:px-4 py-3 bg-muted/30">
                                <div className="flex items-center space-x-2 min-w-0">
                                    <AlertCircle className="h-4 w-4 text-[#34A853] flex-shrink-0" />
                                    <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                                        Summary
                                    </span>
                                </div>
                            </div>
                            <div className="px-3 sm:px-4 py-3">
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
                        <div className="overflow-hidden rounded-xl border bg-background shadow-sm w-full">
                            <div className="px-3 sm:px-4 py-3 bg-muted/30">
                                <div className="flex items-center space-x-2 min-w-0">
                                    <Route className="h-4 w-4 text-[#4285F4] flex-shrink-0" />
                                    <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                                        Override Details
                                    </span>
                                </div>
                            </div>
                            <div className="px-3 sm:px-4 py-3">
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
                    </SettleEaseModalBody>
                </div>
            </SettleEaseDialog>

            {/* Delete Confirmation Dialog */}
            {overrideToDelete && (
                <SettleEaseAlertDialog open={!!overrideToDelete} onOpenChange={(open) => !open && setOverrideToDelete(null)}>
                    <SettleEaseModalHeader
                        kind="alert"
                        icon={AlertTriangle}
                        tone="danger"
                        title="Delete Manual Override?"
                        description="This permanently removes the selected manual settlement path."
                    />
                    <SettleEaseModalBody className="space-y-4">
                            <div className="rounded-xl border bg-muted/30 p-3">
                                <p className="text-sm font-medium">
                                    {peopleMap[overrideToDelete.debtor_id]} → {peopleMap[overrideToDelete.creditor_id]}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Amount: {formatCurrency(overrideToDelete.amount)}
                                </p>
                            </div>
                            <SettleEaseModalNotice tone="danger">
                                This action cannot be undone.
                            </SettleEaseModalNotice>
                    </SettleEaseModalBody>

                    <SettleEaseModalFooter className="sm:justify-end">
                        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                            <Button
                                variant="outline"
                                className="h-10 rounded-full"
                                onClick={() => setOverrideToDelete(null)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="h-10 rounded-full"
                                onClick={handleDelete}
                                disabled={isLoading}
                            >
                                {isLoading ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </SettleEaseModalFooter>
                </SettleEaseAlertDialog>
            )}
        </>
    );
}
