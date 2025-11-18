"use client";

import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, Route, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { MANUAL_SETTLEMENT_OVERRIDES_TABLE } from '@/lib/settleease';
import type { Person, ManualSettlementOverride } from '@/lib/settleease';
import { formatCurrency } from '@/lib/settleease/utils';

interface ManualSettlementOverrideFormProps {
    people: Person[];
    peopleMap: Record<string, string>;
    db: SupabaseClient | undefined;
    currentUserId: string;
    onActionComplete: () => void;
    netBalances: Record<string, number>;
}

export default function ManualSettlementOverrideForm({
    people,
    peopleMap,
    db,
    currentUserId,
    onActionComplete,
    netBalances,
}: ManualSettlementOverrideFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        debtorId: '',
        creditorId: '',
        amount: '',
        notes: '',
    });

    const resetForm = () => {
        setFormData({
            debtorId: '',
            creditorId: '',
            amount: '',
            notes: '',
        });
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!db || !currentUserId) {
            toast({
                title: "Error",
                description: "Database connection not available. Please try again.",
                variant: "destructive"
            });
            return;
        }

        // Validation
        if (!formData.debtorId || !formData.creditorId || !formData.amount) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields.",
                variant: "destructive"
            });
            return;
        }

        if (formData.debtorId === formData.creditorId) {
            toast({
                title: "Invalid Selection",
                description: "Debtor and creditor cannot be the same person.",
                variant: "destructive"
            });
            return;
        }

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            toast({
                title: "Invalid Amount",
                description: "Please enter a valid positive amount.",
                variant: "destructive"
            });
            return;
        }

        // Check if debtor actually owes money
        const debtorBalance = netBalances[formData.debtorId] || 0;
        if (debtorBalance >= -0.01) {
            toast({
                title: "Invalid Override",
                description: `${peopleMap[formData.debtorId]} doesn't owe any money currently.`,
                variant: "destructive"
            });
            return;
        }

        // Check if creditor is actually owed money
        const creditorBalance = netBalances[formData.creditorId] || 0;
        if (creditorBalance <= 0.01) {
            toast({
                title: "Invalid Override",
                description: `${peopleMap[formData.creditorId]} isn't owed any money currently.`,
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await db.from(MANUAL_SETTLEMENT_OVERRIDES_TABLE).insert([
                {
                    debtor_id: formData.debtorId,
                    creditor_id: formData.creditorId,
                    amount: amount,
                    created_by_user_id: currentUserId,
                    notes: formData.notes.trim() || null,
                    is_active: true,
                },
            ]);

            if (error) throw error;

            toast({
                title: "Manual Override Created",
                description: `Settlement path from ${peopleMap[formData.debtorId]} to ${peopleMap[formData.creditorId]} has been set.`,
            });

            resetForm();
            setIsOpen(false);
            onActionComplete();
        } catch (error: any) {
            console.error("Error creating manual override:", error);
            toast({
                title: "Error Creating Override",
                description: error.message || "Could not create the override. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        resetForm();
        setIsOpen(false);
    };

    // Filter people for dropdowns
    const debtors = people.filter(p => {
        const balance = netBalances[p.id] || 0;
        return balance < -0.01 && p.id !== formData.creditorId;
    });

    const creditors = people.filter(p => {
        const balance = netBalances[p.id] || 0;
        return balance > 0.01 && p.id !== formData.debtorId;
    });

    const selectedDebtorBalance = formData.debtorId ? Math.abs(netBalances[formData.debtorId] || 0) : 0;
    const selectedCreditorBalance = formData.creditorId ? (netBalances[formData.creditorId] || 0) : 0;
    const maxAmount = Math.min(selectedDebtorBalance, selectedCreditorBalance);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={debtors.length === 0 || creditors.length === 0}
                >
                    <Route className="mr-2 h-4 w-4" />
                    Set Manual Path
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar" hideCloseButton={true}>
                <div className="bg-white dark:bg-gray-900 border border-border shadow-lg relative rounded-lg -m-6 p-6">
                    <div>
                        <DialogHeader className="pb-4">
                            <DialogTitle className="flex items-center justify-center text-lg font-semibold">
                                Set Manual Settlement Path
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3">
                            {/* Override Details Section */}
                            <div className="bg-white/95 dark:bg-gray-800/95 border border-[#4285F4]/30 dark:border-[#4285F4]/20 rounded-lg overflow-hidden">
                                <div className="px-4 py-3 bg-[#4285F4]/10 dark:bg-[#4285F4]/5">
                                    <div className="flex items-center space-x-2">
                                        <Route className="h-4 w-4 text-[#4285F4]" />
                                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                                            Override Details
                                        </span>
                                    </div>
                                </div>
                                <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                        Force a specific settlement path instead of the optimized one
                                    </p>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Debtor Selection */}
                                        <div className="space-y-2">
                                            <Label htmlFor="debtor" className="text-sm font-medium">
                                                Who owes money? *
                                            </Label>
                                            <Select
                                                value={formData.debtorId}
                                                onValueChange={(value) => setFormData(prev => ({ ...prev, debtorId: value }))}
                                                disabled={isLoading}
                                            >
                                                <SelectTrigger id="debtor" className="h-10 text-sm">
                                                    <SelectValue placeholder="Select debtor..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {debtors.map(person => (
                                                        <SelectItem key={person.id} value={person.id}>
                                                            {person.name} (owes {formatCurrency(Math.abs(netBalances[person.id]))})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Visual Arrow */}
                                        {formData.debtorId && formData.creditorId && (
                                            <div className="flex items-center justify-center py-2">
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <span className="font-medium">{peopleMap[formData.debtorId]}</span>
                                                    <ArrowRight className="h-4 w-4 text-primary" />
                                                    <span className="font-medium">{peopleMap[formData.creditorId]}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Creditor Selection */}
                                        <div className="space-y-2">
                                            <Label htmlFor="creditor" className="text-sm font-medium">
                                                Who should receive payment? *
                                            </Label>
                                            <Select
                                                value={formData.creditorId}
                                                onValueChange={(value) => setFormData(prev => ({ ...prev, creditorId: value }))}
                                                disabled={isLoading}
                                            >
                                                <SelectTrigger id="creditor" className="h-10 text-sm">
                                                    <SelectValue placeholder="Select creditor..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {creditors.map(person => (
                                                        <SelectItem key={person.id} value={person.id}>
                                                            {person.name} (owed {formatCurrency(netBalances[person.id])})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Amount Input */}
                                        <div className="space-y-2">
                                            <Label htmlFor="amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Amount * {maxAmount > 0 && `(max: ${formatCurrency(maxAmount)})`}
                                            </Label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    inputMode="decimal"
                                                    pattern="[0-9]*\.?[0-9]*"
                                                    step="0.01"
                                                    min="0.01"
                                                    max={maxAmount || undefined}
                                                    placeholder="0.00"
                                                    value={formData.amount}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                                    disabled={isLoading}
                                                    className="pl-10 h-10 text-sm text-right font-mono"
                                                />
                                            </div>
                                        </div>

                                        {/* Notes Input */}
                                        <div className="space-y-2">
                                            <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Reason (Optional)
                                            </Label>
                                            <Textarea
                                                id="notes"
                                                placeholder="E.g., Train tickets to Goa should be paid directly..."
                                                value={formData.notes}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                disabled={isLoading}
                                                rows={3}
                                                className="resize-none text-sm"
                                            />
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {/* Help Information Section */}
                            <div className="bg-white/95 dark:bg-gray-800/95 border border-[#34A853]/30 dark:border-[#34A853]/20 rounded-lg overflow-hidden">
                                <div className="px-4 py-3 bg-[#34A853]/10 dark:bg-[#34A853]/5">
                                    <div className="flex items-center space-x-2">
                                        <TrendingUp className="h-4 w-4 text-[#34A853]" />
                                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                                            How it works
                                        </span>
                                    </div>
                                </div>
                                <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        This overrides the optimized settlement calculation. The manual path will be applied first, then remaining balances are optimized. Active until cleared or debt is settled.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 pt-4">
                            <Button
                                className="w-full h-10 text-sm sm:h-11 sm:text-base bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600"
                                onClick={handleSubmit}
                                disabled={isLoading || !formData.debtorId || !formData.creditorId || !formData.amount}
                            >
                                {isLoading ? "Creating Override..." : "Create Override"}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full h-10 text-sm sm:h-11 sm:text-base"
                                onClick={handleCancel}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
