"use client";

import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, DollarSign, ArrowRight, Users } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { Person } from '@/lib/settleease';
import SettleEaseDialog, {
    SettleEaseModalBody,
    SettleEaseModalFooter,
    SettleEaseModalHeader,
    SettleEaseModalNotice,
    SettleEaseModalSection,
} from './SettleEaseDialog';

interface CustomSettlementFormProps {
    people: Person[];
    peopleMap: Record<string, string>;
    currentUserId: string;
    onActionComplete: () => void;
}

export default function CustomSettlementForm({
    people,
    peopleMap,
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
    const addSettlementPayment = useMutation(api.app.addSettlementPayment);

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

        if (!currentUserId) {
            toast({
                title: "Error",
                description: "User information is not available. Please try again.",
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
            await addSettlementPayment({
                debtorId: formData.debtorId,
                creditorId: formData.creditorId,
                amountSettled: amount,
                markedByUserId: currentUserId,
                notes: formData.notes.trim() || null,
            });

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
        <SettleEaseDialog
            open={isOpen}
            onOpenChange={setIsOpen}
            hideCloseButton
            className="sm:max-w-md"
            trigger={(
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
            )}
        >
            <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
                <SettleEaseModalHeader
                    icon={DollarSign}
                    title="Record Custom Payment"
                    description="Record a direct payment between two people."
                />

                <SettleEaseModalBody className="space-y-3">
                    <SettleEaseModalSection>
                        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                            <DollarSign className="h-4 w-4" />
                            Payment Details
                        </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Payer Selection */}
                                        <div className="space-y-2">
                                            <Label htmlFor="debtor" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                From (Payer) *
                                            </Label>
                                            <Select
                                                value={formData.debtorId}
                                                onValueChange={(value) => setFormData(prev => ({ ...prev, debtorId: value }))}
                                                disabled={isLoading}
                                            >
                                                <SelectTrigger id="debtor" className="h-10 text-sm">
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
                                            <Label htmlFor="creditor" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                To (Receiver) *
                                            </Label>
                                            <Select
                                                value={formData.creditorId}
                                                onValueChange={(value) => setFormData(prev => ({ ...prev, creditorId: value }))}
                                                disabled={isLoading}
                                            >
                                                <SelectTrigger id="creditor" className="h-10 text-sm">
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
                                            <Label htmlFor="amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                                                    className="pl-10 h-10 rounded-full text-sm text-right font-mono"
                                                />
                                            </div>
                                        </div>

                                        {/* Notes Input */}
                                        <div className="space-y-2">
                                            <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Notes (Optional)
                                            </Label>
                                            <Textarea
                                                id="notes"
                                                placeholder="Add any additional notes about this payment..."
                                                value={formData.notes}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                disabled={isLoading}
                                                rows={3}
                                                className="resize-none rounded-xl text-sm"
                                            />
                                        </div>
                                    </form>
                    </SettleEaseModalSection>

                    <SettleEaseModalNotice className="flex items-start gap-3">
                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                        <span>This payment will be included in settlement calculations and affect outstanding balances.</span>
                    </SettleEaseModalNotice>
                </SettleEaseModalBody>

                <SettleEaseModalFooter className="sm:justify-end">
                    <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                        <Button
                            variant="outline"
                            className="h-10 rounded-full"
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                            <Button
                                className="h-10 rounded-full bg-foreground text-background hover:bg-foreground/90"
                                onClick={handleSubmit}
                                disabled={isLoading || !formData.debtorId || !formData.creditorId || !formData.amount}
                            >
                                {isLoading ? "Recording Payment..." : "Record Payment"}
                            </Button>
                    </div>
                </SettleEaseModalFooter>
            </div>
        </SettleEaseDialog>
    );
}
