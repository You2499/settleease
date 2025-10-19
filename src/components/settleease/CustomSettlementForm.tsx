"use client";

import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "../ui/textarea";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, DollarSign, ArrowRight, Users } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { SETTLEMENT_PAYMENTS_TABLE } from '@/lib/settleease';
import type { Person } from '@/lib/settleease';

interface CustomSettlementFormProps {
    people: Person[];
    peopleMap: Record<string, string>;
    db: SupabaseClient | undefined;
    currentUserId: string;
    onActionComplete: () => void;
}

export default function CustomSettlementForm({
    people,
    peopleMap,
    db,
    currentUserId,
    onActionComplete,
}: CustomSettlementFormProps) {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
                description: "Payer and receiver cannot be the same person.",
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

        setIsLoading(true);

        try {
            const { error } = await db.from(SETTLEMENT_PAYMENTS_TABLE).insert([
                {
                    debtor_id: formData.debtorId,
                    creditor_id: formData.creditorId,
                    amount_settled: amount,
                    marked_by_user_id: currentUserId,
                    settled_at: new Date().toISOString(),
                    notes: formData.notes.trim() || null,
                },
            ]);

            if (error) throw error;

            toast({
                title: "Payment Recorded",
                description: `Custom payment from ${peopleMap[formData.debtorId]} to ${peopleMap[formData.creditorId]} has been recorded successfully.`,
            });

            resetForm();
            setIsOpen(false);
            onActionComplete();
        } catch (error: any) {
            console.error("Error recording custom settlement:", error);
            toast({
                title: "Error Recording Payment",
                description: error.message || "Could not record the payment. Please try again.",
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

    // Filter people for dropdowns (exclude the selected person from the other dropdown)
    const availableDebtors = people.filter(p => p.id !== formData.creditorId);
    const availableCreditors = people.filter(p => p.id !== formData.debtorId);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={people.length < 2}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Payment
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-lg font-semibold">
                        <DollarSign className="mr-2 h-5 w-5 text-primary" />
                        Record Custom Payment
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Payer Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="debtor" className="text-sm font-medium">
                            From (Payer) *
                        </Label>
                        <Select
                            value={formData.debtorId}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, debtorId: value }))}
                            disabled={isLoading}
                        >
                            <SelectTrigger id="debtor">
                                <SelectValue placeholder="Select who is paying..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDebtors.map(person => (
                                    <SelectItem key={person.id} value={person.id}>
                                        {person.name}
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

                    {/* Receiver Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="creditor" className="text-sm font-medium">
                            To (Receiver) *
                        </Label>
                        <Select
                            value={formData.creditorId}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, creditorId: value }))}
                            disabled={isLoading}
                        >
                            <SelectTrigger id="creditor">
                                <SelectValue placeholder="Select who is receiving..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCreditors.map(person => (
                                    <SelectItem key={person.id} value={person.id}>
                                        {person.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label htmlFor="amount" className="text-sm font-medium">
                            Amount *
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
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                disabled={isLoading}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Notes Input */}
                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-sm font-medium">
                            Notes (Optional)
                        </Label>
                        <Textarea
                            id="notes"
                            placeholder="Add any additional notes about this payment..."
                            value={formData.notes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            disabled={isLoading}
                            rows={3}
                            className="resize-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !formData.debtorId || !formData.creditorId || !formData.amount}
                            className="flex-1"
                        >
                            {isLoading ? "Recording..." : "Record Payment"}
                        </Button>
                    </div>
                </form>

                {/* Help Text */}
                <div className="mt-4 p-3 bg-muted/50 rounded-md">
                    <div className="flex items-start space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="text-xs text-muted-foreground">
                            <p className="font-medium mb-1">Custom Payment Info:</p>
                            <p>This records a direct payment between two people. It will be included in all settlement calculations and affect outstanding balances.</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}