"use client";

import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Scale, SlidersHorizontal, ClipboardList, ReceiptText, ShoppingBag, ListTree, Settings2 } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { 
  Expense, 
  ExpenseItemDetail, 
  PersonAggregatedItemShares,
  Category 
} from "@/lib/settleease/types";

interface ExpenseSplitDetailsProps {
  expense: Expense;
  amountEffectivelySplit: number;
  sortedShares: Array<{ personId: string; amount: number }>;
  itemwiseBreakdownForDisplay: PersonAggregatedItemShares | null;
  sortedItemwiseBreakdownEntries: Array<[string, any]>;
  peopleMap: Record<string, string>;
  categories: Category[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

export default function ExpenseSplitDetails({
  expense,
  amountEffectivelySplit,
  sortedShares,
  itemwiseBreakdownForDisplay,
  sortedItemwiseBreakdownEntries,
  peopleMap,
  categories,
  getCategoryIconFromName,
}: ExpenseSplitDetailsProps) {
  const SplitIcon = useMemo(() => {
    if (expense.split_method === "equal") return Scale;
    if (expense.split_method === "unequal") return SlidersHorizontal;
    if (expense.split_method === "itemwise") return ClipboardList;
    return ReceiptText;
  }, [expense.split_method]);

  const getItemCategoryIcon = (categoryName?: string) => {
    if (!categoryName) return Settings2;
    const cat = categories.find((c: Category) => c.name === categoryName);
    return getCategoryIconFromName(cat?.icon_name || "");
  };

  const getCategoryRank = (catName?: string) => {
    if (!catName) return 9999;
    const cat = categories.find((c: Category) => c.name === catName);
    return cat?.rank ?? 9999;
  };

  const sortPersonIdsByName = (ids: string[]) =>
    ids.slice().sort((a, b) => (peopleMap[a] || "").localeCompare(peopleMap[b] || ""));

  return (
    <Card>
      <CardHeader className="pt-3 sm:pt-4 pb-2">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <SplitIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          Split Method:{" "}
          <span className="ml-1.5 capitalize font-normal text-foreground/90">
            {expense.split_method}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs sm:text-sm space-y-2 sm:space-y-3 pt-0">
        {expense.split_method === "equal" &&
          Array.isArray(expense.shares) &&
          expense.shares.length > 0 && (
            <div>
              <CardDescription className="mb-1 sm:mb-1.5 text-xs">
                Split equally among {expense.shares.length}{" "}
                {expense.shares.length === 1 ? "person" : "people"} based on the amount of{" "}
                <strong className="text-accent">
                  {formatCurrency(amountEffectivelySplit)}
                </strong>
                .
              </CardDescription>
              <ul className="list-disc list-inside pl-4 text-muted-foreground space-y-0.5">
                {sortedShares.map((share) => (
                  <li key={share.personId}>
                    {peopleMap[share.personId] || "Unknown Person"}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 sm:mt-2 font-medium">
                Share per person:{" "}
                <span className="text-primary">
                  {formatCurrency(expense.shares[0]?.amount || 0)}
                </span>
              </p>
            </div>
          )}

        {expense.split_method === "unequal" &&
          Array.isArray(expense.shares) &&
          expense.shares.length > 0 && (
            <div>
              <CardDescription className="mb-1 sm:mb-1.5 text-xs">
                Specific shares assigned based on the amount of{" "}
                <strong className="text-accent">
                  {formatCurrency(amountEffectivelySplit)}
                </strong>
                .
              </CardDescription>
              <ul className="space-y-1">
                {sortedShares.map((share) => (
                  <li
                    key={share.personId}
                    className="flex justify-between p-1.5 bg-secondary/20 rounded-sm"
                  >
                    <span>{peopleMap[share.personId] || "Unknown Person"}</span>
                    <span className="font-medium text-primary">
                      {formatCurrency(Number(share.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {expense.split_method === "itemwise" &&
          Array.isArray(expense.items) &&
          expense.items.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h4 className="font-medium text-muted-foreground mb-1 sm:mb-1.5 flex items-center">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Original Items & Prices:
                </h4>
                <ul className="space-y-1 text-xs">
                  {expense.items && (
                    <>
                      {(() => {
                        const itemsByCategory: Record<string, ExpenseItemDetail[]> = {};
                        expense.items!.forEach((item) => {
                          const cat = item.categoryName || "";
                          if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
                          itemsByCategory[cat].push(item);
                        });
                        const sortedCategoryNames = Object.keys(itemsByCategory).sort(
                          (a, b) => getCategoryRank(a) - getCategoryRank(b)
                        );
                        return sortedCategoryNames.flatMap((catName) => [
                          catName ? (
                            <li
                              key={catName}
                              className="font-semibold text-primary/80 text-xs mt-2 mb-1 flex items-center"
                            >
                              {getItemCategoryIcon(catName) &&
                                React.createElement(getItemCategoryIcon(catName), {
                                  className: "mr-1.5 h-3 w-3 text-muted-foreground flex-shrink-0",
                                })}
                              {catName}
                            </li>
                          ) : null,
                          ...itemsByCategory[catName].map((item) => {
                            return (
                              <li key={item.id} className="p-1.5 bg-secondary/20 rounded-sm">
                                <div className="flex justify-between items-center">
                                  <span
                                    className="font-medium truncate flex items-center mr-2"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </span>
                                  <span className="font-semibold text-primary whitespace-nowrap">
                                    {formatCurrency(Number(item.price))}
                                  </span>
                                </div>
                                {(() => {
                                  const sortedSharedBy = sortPersonIdsByName(item.sharedBy);
                                  return (
                                    <div
                                      className="text-muted-foreground/80 pl-1.5 text-[10px] sm:text-xs truncate"
                                      title={`Shared by: ${sortedSharedBy
                                        .map((pid) => peopleMap[pid] || "Unknown")
                                        .join(", ")}`}
                                    >
                                      Shared by:{" "}
                                      {sortedSharedBy
                                        .map((pid) => peopleMap[pid] || "Unknown")
                                        .join(", ")}
                                    </div>
                                  );
                                })()}
                              </li>
                            );
                          }),
                        ]);
                      })()}
                    </>
                  )}
                </ul>
                <p className="text-xs text-muted-foreground mt-1 sm:mt-1.5">
                  Total of original items:{" "}
                  {formatCurrency(
                    expense.items.reduce((sum, item) => sum + Number(item.price), 0)
                  )}
                </p>
              </div>

              {itemwiseBreakdownForDisplay && amountEffectivelySplit > 0.001 && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1 sm:mb-1.5 flex items-center">
                    <ListTree className="mr-2 h-4 w-4" />
                    Individual Item Shares (Adjusted):
                  </h4>
                  <CardDescription className="text-xs mb-1.5 sm:mb-2">
                    Based on splitting {formatCurrency(amountEffectivelySplit)}. Original item
                    prices are proportionally reduced before calculating individual shares.
                  </CardDescription>
                  <div className="space-y-3 sm:space-y-4">
                    {sortedItemwiseBreakdownEntries
                      .filter(([_, details]) => details.totalShareOfAdjustedItems > 0.001)
                      .map(([personId, details]) => (
                        <div
                          key={personId}
                          className="relative p-3 sm:p-4 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20 dark:to-transparent rounded-lg border border-green-200/50 dark:border-green-800/30"
                        >
                          {/* Vertical green line */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-green-600 rounded-l-lg"></div>
                          
                          {/* Person header */}
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-base text-green-800 dark:text-green-200">
                              {peopleMap[personId] || "Unknown Person"}
                            </span>
                            <span className="font-bold text-lg text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-md">
                              {formatCurrency(details.totalShareOfAdjustedItems)}
                            </span>
                          </div>
                          
                          {/* Items list with category grouping and indentation */}
                          <div className="ml-4 space-y-2">
                            {(() => {
                              // Group items by category
                              const itemsByCategory: Record<string, any[]> = {};
                              details.items.forEach((itemDetail: any) => {
                                const cat = itemDetail.itemCategoryName || "Other";
                                if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
                                itemsByCategory[cat].push(itemDetail);
                              });
                              
                              // Sort categories by rank
                              const sortedCategoryNames = Object.keys(itemsByCategory).sort(
                                (a, b) => getCategoryRank(a) - getCategoryRank(b)
                              );
                              
                              return sortedCategoryNames.map((catName) => (
                                <div key={catName} className="space-y-1">
                                  {/* Category header */}
                                  <div className="flex items-center text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                    {getItemCategoryIcon(catName) &&
                                      React.createElement(getItemCategoryIcon(catName), {
                                        className: "mr-2 h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0",
                                      })}
                                    <span className="uppercase tracking-wide">{catName}</span>
                                  </div>
                                  
                                  {/* Items in this category */}
                                  <div className="ml-5 space-y-1">
                                    {itemsByCategory[catName].map((itemDetail: any) => (
                                      <div 
                                        key={itemDetail.itemId} 
                                        className="flex justify-between items-center py-1 px-2 bg-white/60 dark:bg-gray-800/40 rounded border-l-2 border-green-300 dark:border-green-700"
                                      >
                                        <div className="flex items-center min-w-0 flex-1">
                                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
                                          <span 
                                            className="text-xs text-gray-700 dark:text-gray-300 truncate" 
                                            title={itemDetail.itemName}
                                          >
                                            {itemDetail.itemName}
                                          </span>
                                          {itemDetail.sharedByCount > 1 && (
                                            <span className="ml-2 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded flex-shrink-0">
                                              ÷{itemDetail.sharedByCount}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-xs font-medium text-green-700 dark:text-green-300 ml-2 flex-shrink-0">
                                          {formatCurrency(itemDetail.shareForPerson)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </CardContent>
    </Card>
  );
}