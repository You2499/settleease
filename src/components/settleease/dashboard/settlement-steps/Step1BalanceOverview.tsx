"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { Person } from "@/lib/settleease/types";

interface PersonBalance {
  totalPaid: number;
  totalOwed: number;
  settledAsDebtor: number;
  settledAsCreditor: number;
  netBalance: number;
}

interface Step1BalanceOverviewProps {
  personBalances: Record<string, PersonBalance>;
  people: Person[];
}

export default function Step1BalanceOverview({
  personBalances,
  people,
}: Step1BalanceOverviewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <Users className="mr-2 h-5 w-5 text-green-600" />
          Step 1: Everyone's Net Balance
        </CardTitle>
        <CardDescription className="text-sm">
          Based on all expenses and what each person paid vs. their share
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(personBalances)
            .map(([personId, balance]) => {
              const person = people.find((p) => p.id === personId);
              if (!person) return null;

              const isCreditor = balance.netBalance > 0.01;
              const isDebtor = balance.netBalance < -0.01;
              const isBalanced = Math.abs(balance.netBalance) <= 0.01;

              return {
                person,
                balance,
                isCreditor,
                isDebtor,
                isBalanced,
                sortOrder: isCreditor ? 0 : isDebtor ? 1 : 2, // Receives, Pays, Balanced
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => {
              // First sort by category (Receives, Pays, Balanced)
              if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
              }
              // Then sort alphabetically within each category
              return a.person.name.localeCompare(b.person.name);
            })
            .map(({ person, balance, isCreditor, isDebtor, isBalanced }) => {
              return (
                <div
                  key={person.id}
                  className={`relative p-4 rounded-xl border-2 shadow-sm transition-all ${
                    isCreditor
                      ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-300 dark:border-green-700"
                      : isDebtor
                      ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-300 dark:border-red-700"
                      : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-300 dark:border-gray-700"
                  }`}
                >
                  {/* Status Badge */}
                  <div
                    className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                      isCreditor
                        ? "bg-green-500 text-white"
                        : isDebtor
                        ? "bg-red-500 text-white"
                        : "bg-gray-500 text-white"
                    }`}
                  >
                    {isCreditor
                      ? "RECEIVES"
                      : isDebtor
                      ? "PAYS"
                      : "BALANCED"}
                  </div>

                  {/* Person Name and Amount */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCreditor
                            ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                            : isDebtor
                            ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                            : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {person.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-bold ${
                          isCreditor
                            ? "text-green-700 dark:text-green-300"
                            : isDebtor
                            ? "text-red-700 dark:text-red-300"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {isCreditor ? "+" : isDebtor ? "-" : ""}
                        {formatCurrency(Math.abs(balance.netBalance))}
                      </div>
                    </div>
                  </div>

                  {/* Breakdown Details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Paid:
                      </span>
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        {formatCurrency(balance.totalPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Owed:
                      </span>
                      <span className="font-semibold text-red-700 dark:text-red-400">
                        {formatCurrency(balance.totalOwed)}
                      </span>
                    </div>
                    {(balance.settledAsDebtor > 0 ||
                      balance.settledAsCreditor > 0) && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          Already Settled:
                        </span>
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {formatCurrency(
                            Math.abs(
                              balance.settledAsCreditor - balance.settledAsDebtor
                            )
                          )}
                        </span>
                      </div>
                    )}

                    {/* Final Status - More Prominent */}
                    <div
                      className={`mt-3 pt-3 border-t-2 ${
                        isCreditor
                          ? "border-green-200 dark:border-green-800"
                          : isDebtor
                          ? "border-red-200 dark:border-red-800"
                          : "border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <div
                          className={`px-4 py-2 rounded-lg font-bold text-sm text-center ${
                            isCreditor
                              ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                              : isDebtor
                              ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                              : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {isCreditor ? (
                            `Should Receive ${formatCurrency(
                              Math.abs(balance.netBalance)
                            )}`
                          ) : isDebtor ? (
                            `Should Pay ${formatCurrency(
                              Math.abs(balance.netBalance)
                            )}`
                          ) : (
                            <div className="flex items-center gap-2">
                              All Balanced{" "}
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}