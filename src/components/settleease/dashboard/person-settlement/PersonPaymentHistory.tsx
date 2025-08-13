"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  Undo2,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  Person,
  SettlementPayment,
  UserRole,
} from "@/lib/settleease/types";

interface PersonPaymentHistoryProps {
  selectedPerson: Person;
  personRecordedPayments: SettlementPayment[];
  peopleMap: Record<string, string>;
  userRole: UserRole;
  isLoadingParent: boolean;
  onUnmarkPayment: (payment: SettlementPayment) => Promise<void>;
}

export default function PersonPaymentHistory({
  selectedPerson,
  personRecordedPayments,
  peopleMap,
  userRole,
  isLoadingParent,
  onUnmarkPayment,
}: PersonPaymentHistoryProps) {
  if (personRecordedPayments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <Receipt className="mr-2 h-5 w-5 text-green-600" />
          Payment History
        </CardTitle>
        <CardDescription className="text-sm">
          Recorded settlement payments involving {selectedPerson.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-auto max-h-60">
          <div className="space-y-2">
            {personRecordedPayments.map((payment) => (
              <Card key={payment.id} className="bg-card/50 p-3 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex-grow text-sm">
                    <div className="flex items-center space-x-2">
                      {payment.debtor_id === selectedPerson.id ? (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                      <span>
                        {payment.debtor_id === selectedPerson.id ? (
                          <>
                            Paid{" "}
                            <strong>
                              {peopleMap[payment.creditor_id]}
                            </strong>
                          </>
                        ) : (
                          <>
                            <strong>{peopleMap[payment.debtor_id]}</strong>{" "}
                            paid you
                          </>
                        )}
                      </span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(payment.amount_settled)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(payment.settled_at).toLocaleDateString()}
                    </p>
                  </div>
                  {userRole === "admin" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onUnmarkPayment(payment)}
                      disabled={isLoadingParent}
                      className="text-xs"
                    >
                      <Undo2 className="mr-1 h-4 w-4" />
                      Unmark
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}