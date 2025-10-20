"use client";

import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChartBig, Users, Eye, UserSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';


import type {
  Expense, Person, Category as DynamicCategory, SettlementPayment,
  CategoryAnalyticsData, ParticipantAnalyticsData, ExpenseAmountDistributionData,
  SpendingByDayOfWeekData, SplitMethodDistributionData, TopExpenseData, MonthlyExpenseData,
  ShareVsPaidDataPoint, EnhancedOverallStats, CategorySpendingPieChartDataPoint
} from '@/lib/settleease/types';

import OverallAnalyticsSnapshot from './analytics/OverallAnalyticsSnapshot';
import MonthlySpendingChart from './analytics/MonthlySpendingChart';
import ShareVsPaidComparisonChart from './analytics/ShareVsPaidComparisonChart';
import SpendingByDayChart from './analytics/SpendingByDayChart';
import SplitMethodChart from './analytics/SplitMethodChart';
import TopExpensesTable from './analytics/TopExpensesTable';
import CategoryAnalyticsTable from './analytics/CategoryAnalyticsTable';
import ParticipantSummaryTable from './analytics/ParticipantSummaryTable';
import CategorySpendingPieChart from './analytics/CategorySpendingPieChart';
import ExpenseDistributionChart from './analytics/ExpenseDistributionChart';
import TransactionHeatmapCalendar from './analytics/TransactionHeatmapCalendar';
import { crashTestManager } from '@/lib/settleease/crashTestContext';


interface AnalyticsTabProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: DynamicCategory[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  settlementPayments: SettlementPayment[];
}

const UNCATEGORIZED = "Uncategorized";

// Utility: Get adjusted paid amount for a person for an expense (net of celebration)
function getAdjustedPaidAmountForPerson(exp: any, personId: string): number {
  if (!Array.isArray(exp.paid_by)) return 0;
  const paymentRecord = exp.paid_by.find((p: any) => p.personId === personId);
  let paid = paymentRecord ? Number(paymentRecord.amount) : 0;
  const isCelebrationContributor = exp.celebration_contribution?.personId === personId;
  if (!isCelebrationContributor && exp.celebration_contribution && Number(exp.celebration_contribution.amount) > 0.001) {
    const totalPaid = exp.paid_by.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    if (totalPaid > 0.001) {
      const proportionalReduction = (paid / totalPaid) * Number(exp.celebration_contribution.amount);
      paid = Math.max(0, paid - proportionalReduction);
    }
  }
  return paid;
}

export default function AnalyticsTab({
  expenses: allExpenses,
  people,
  peopleMap,
  dynamicCategories,
  getCategoryIconFromName,
  settlementPayments,
}: AnalyticsTabProps) {
  // Check for crash test
  useEffect(() => {
    crashTestManager.checkAndCrash('analytics', 'Analytics Tab crashed: Chart rendering failed with invalid data processing');
  });

  const [analyticsViewMode, setAnalyticsViewMode] = useState<'group' | 'personal'>('group');
  const [selectedPersonIdForAnalytics, setSelectedPersonIdForAnalytics] = useState<string | null>(null);

  const displayedExpenses = useMemo(() => {
    if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
      return allExpenses.filter(exp => {
        const personPaid = exp.paid_by.some(p => p.personId === selectedPersonIdForAnalytics);
        const personShared = exp.shares.some(s => s.personId === selectedPersonIdForAnalytics && Number(s.amount) > 0.001);
        return personPaid || personShared;
      });
    }
    return allExpenses;
  }, [allExpenses, analyticsViewMode, selectedPersonIdForAnalytics]);


  const enhancedOverallStats: EnhancedOverallStats = useMemo(() => {
    const expenseCount = displayedExpenses.length;
    let firstDate: Date | null = null;
    let lastDate: Date | null = null;

    if (expenseCount > 0) {
      const sortedExpensesByDate = [...displayedExpenses].sort((a, b) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      firstDate = new Date(sortedExpensesByDate[0].created_at || Date.now());
      lastDate = new Date(sortedExpensesByDate[expenseCount - 1].created_at || Date.now());
    }
    
    const distinctParticipants = new Set<string>();
    displayedExpenses.forEach(exp => {
      exp.paid_by.forEach(p => distinctParticipants.add(p.personId));
      exp.shares.forEach(s => distinctParticipants.add(s.personId));
    });

    let totalAmount = 0;
    let mostExpensiveCatData: { name: string; totalAmount: number; } = { name: 'N/A', totalAmount: 0 };
    let largestSingleExpData: { description: string; amount: number; date: string } = { description: 'N/A', amount: 0, date: '' };
    const categorySpending: Record<string, number> = {};


    if (analyticsViewMode === 'group') {
      totalAmount = displayedExpenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0);
      
      displayedExpenses.forEach(exp => {
        if (exp.split_method === 'itemwise' && exp.items) {
          exp.items.forEach(item => {
            const cat = item.categoryName || exp.category || UNCATEGORIZED;
            categorySpending[cat] = (categorySpending[cat] || 0) + Number(item.price);
          });
        } else {
          const cat = exp.category || UNCATEGORIZED;
          categorySpending[cat] = (categorySpending[cat] || 0) + Number(exp.total_amount);
        }
      });

      if (expenseCount > 0) {
        const sortedByAmount = [...displayedExpenses].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
        largestSingleExpData = {
          description: sortedByAmount[0].description,
          amount: Number(sortedByAmount[0].total_amount),
          date: new Date(sortedByAmount[0].created_at || Date.now()).toLocaleDateString()
        };
      }
    } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
      let maxPersonalShareOverall = 0;

      displayedExpenses.forEach(exp => {
        const personShareForEntireExpense = Number(exp.shares.find(s => s.personId === selectedPersonIdForAnalytics)?.amount || 0);
        totalAmount += personShareForEntireExpense;

        if (personShareForEntireExpense > 0.001) {
            if (personShareForEntireExpense > maxPersonalShareOverall) {
                maxPersonalShareOverall = personShareForEntireExpense;
                largestSingleExpData = {
                    description: exp.description,
                    amount: personShareForEntireExpense,
                    date: new Date(exp.created_at || Date.now()).toLocaleDateString()
                };
            }

            if (exp.split_method === 'itemwise' && Array.isArray(exp.items) && exp.items.length > 0) {
                const originalTotalBillForThisExpense = Number(exp.total_amount) || 0;
                const celebrationContributionForExpense = exp.celebration_contribution ? Number(exp.celebration_contribution.amount) : 0;
                const amountEffectivelySplitForExpense = Math.max(0, originalTotalBillForThisExpense - celebrationContributionForExpense);
                const sumOfOriginalItemPricesForExpense = exp.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
                
                const reductionFactor = (sumOfOriginalItemPricesForExpense > 0.001 && amountEffectivelySplitForExpense >= 0)
                    ? (amountEffectivelySplitForExpense / sumOfOriginalItemPricesForExpense)
                    : (sumOfOriginalItemPricesForExpense === 0 && amountEffectivelySplitForExpense === 0 ? 1 : 0);

                exp.items.forEach(item => {
                    if (item.sharedBy.includes(selectedPersonIdForAnalytics!)) {
                        const originalItemPrice = Number(item.price) || 0;
                        const adjustedItemPriceForSplitting = originalItemPrice * reductionFactor;
                        const personShareOfThisItem = (item.sharedBy.length > 0) ? adjustedItemPriceForSplitting / item.sharedBy.length : 0;
                        
                        if (personShareOfThisItem > 0.001) {
                            const cat = item.categoryName || exp.category || UNCATEGORIZED;
                            categorySpending[cat] = (categorySpending[cat] || 0) + personShareOfThisItem;
                        }
                    }
                });
            } else { 
                const cat = exp.category || UNCATEGORIZED;
                categorySpending[cat] = (categorySpending[cat] || 0) + personShareForEntireExpense;
            }
        }
      });
    }
    
    const sortedCategories = Object.entries(categorySpending).sort(([,a],[,b]) => b-a);
    if (sortedCategories.length > 0) {
      mostExpensiveCatData = { name: sortedCategories[0][0], totalAmount: sortedCategories[0][1] };
    }
    const averageAmount = expenseCount > 0 ? totalAmount / expenseCount : 0;

    return {
      totalAmount, expenseCount, averageAmount, firstDate, lastDate,
      distinctParticipantCount: distinctParticipants.size,
      mostExpensiveCategory: mostExpensiveCatData,
      largestSingleExpense: largestSingleExpData,
    };
  }, [displayedExpenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const detailedCategoryAnalytics: CategoryAnalyticsData[] = useMemo(() => {
    const categoryDataMap: Record<string, {
        totalAmount: number; 
        expenseIds: Set<string>; 
        potentialMostExpensive: Array<{ type: 'expense' | 'item', id: string, description: string, amount: number, date: string, mainExpenseDescription?: string }>; 
        personalPaymentsForCategory: number; 
    }> = {};

    dynamicCategories.forEach(cat => {
        categoryDataMap[cat.name] = { totalAmount: 0, expenseIds: new Set(), potentialMostExpensive: [], personalPaymentsForCategory: 0 };
    });
    if (!categoryDataMap[UNCATEGORIZED]) {
        categoryDataMap[UNCATEGORIZED] = { totalAmount: 0, expenseIds: new Set(), potentialMostExpensive: [], personalPaymentsForCategory: 0 };
    }

    displayedExpenses.forEach(exp => {
        const expDate = new Date(exp.created_at || Date.now()).toLocaleDateString();
        const originalTotalBillForExpense = Number(exp.total_amount) || 0;
        
        const selectedPersonPaymentForThisWholeExpense = (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics)
            ? exp.paid_by
                .filter(p => p.personId === selectedPersonIdForAnalytics)
                .reduce((sum, p) => sum + Number(p.amount), 0)
            : 0;

        if (exp.split_method === 'itemwise' && Array.isArray(exp.items) && exp.items.length > 0) {
            const celebrationContributionForExpense = exp.celebration_contribution ? Number(exp.celebration_contribution.amount) : 0;
            const amountEffectivelySplitForExpense = Math.max(0, originalTotalBillForExpense - celebrationContributionForExpense);
            const sumOfOriginalItemPricesForExpense = exp.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
            
            const reductionFactor = (sumOfOriginalItemPricesForExpense > 0.001 && amountEffectivelySplitForExpense >= 0)
                ? (amountEffectivelySplitForExpense / sumOfOriginalItemPricesForExpense)
                : (sumOfOriginalItemPricesForExpense === 0 && amountEffectivelySplitForExpense === 0 ? 1 : 0);

            exp.items.forEach(item => {
                const originalItemPrice = Number(item.price) || 0;
                if (originalItemPrice <= 0.001) return;

                const targetCategory = item.categoryName || exp.category || UNCATEGORIZED;
                if (!categoryDataMap[targetCategory]) {
                    categoryDataMap[targetCategory] = { totalAmount: 0, expenseIds: new Set(), potentialMostExpensive: [], personalPaymentsForCategory: 0 };
                }

                let amountToCreditToCategory = 0;
                let paymentContributionToCategoryForItem = 0;

                if (analyticsViewMode === 'group') {
                    amountToCreditToCategory = originalItemPrice; 
                } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics && item.sharedBy.includes(selectedPersonIdForAnalytics!)) {
                    const adjustedItemPriceForSplitting = originalItemPrice * reductionFactor;
                    const personShareOfThisItem = (item.sharedBy.length > 0) ? adjustedItemPriceForSplitting / item.sharedBy.length : 0;
                    amountToCreditToCategory = personShareOfThisItem;

                    if (selectedPersonPaymentForThisWholeExpense > 0.001 && originalTotalBillForExpense > 0.001) {
                        const itemProportionOfOriginalBill = originalItemPrice / originalTotalBillForExpense;
                        paymentContributionToCategoryForItem = itemProportionOfOriginalBill * selectedPersonPaymentForThisWholeExpense;
                    }
                }
                
                if (amountToCreditToCategory > 0.001) {
                    categoryDataMap[targetCategory].totalAmount += amountToCreditToCategory;
                    categoryDataMap[targetCategory].expenseIds.add(exp.id);
                    categoryDataMap[targetCategory].potentialMostExpensive.push({
                        type: 'item',
                        id: item.id || `item-${exp.id}-${item.name}`,
                        description: item.name,
                        amount: amountToCreditToCategory, 
                        date: expDate,
                        mainExpenseDescription: exp.description
                    });
                    if (analyticsViewMode === 'personal' && paymentContributionToCategoryForItem > 0.001) {
                        categoryDataMap[targetCategory].personalPaymentsForCategory += paymentContributionToCategoryForItem;
                    }
                }
            });
        } else { 
            const personShareForEntireExpense = (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics)
                ? Number(exp.shares.find(s => s.personId === selectedPersonIdForAnalytics)?.amount || 0)
                : originalTotalBillForExpense;
            
            const amountForCategory = (analyticsViewMode === 'group') ? originalTotalBillForExpense : personShareForEntireExpense;
            if (amountForCategory <= 0.001) return;

            const targetCategory = exp.category || UNCATEGORIZED;
            if (!categoryDataMap[targetCategory]) {
                categoryDataMap[targetCategory] = { totalAmount: 0, expenseIds: new Set(), potentialMostExpensive: [], personalPaymentsForCategory: 0 };
            }
            
            categoryDataMap[targetCategory].totalAmount += amountForCategory;
            categoryDataMap[targetCategory].expenseIds.add(exp.id);
            categoryDataMap[targetCategory].potentialMostExpensive.push({
                type: 'expense',
                id: exp.id,
                description: exp.description,
                amount: amountForCategory, 
                date: expDate
            });
            if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics && selectedPersonPaymentForThisWholeExpense > 0.001) {
                 // Corrected: attribute the payment *proportionally* to the person's share of this expense.
                 // However, this specific logic might be better handled when calculating largestPayer below, as 'personalPaymentsForCategory'
                 // is more about 'how much I paid for things that fell into this category *for me*'.
                 // For now, let's sum the share amount if the person paid anything for this expense.
                 // This implies that if they paid (even partially), their share for this category contributes to "their payments for this category".
                 // A more precise "personalPaymentsForCategory" would track how much of their *actual payment* on an expense contributed to *their share* of items in a category.
                 // Given the current data structure, this is a reasonable approximation if we assume 'personalPaymentsForCategory' means 'my share in this category that I also contributed payment towards'.
                 categoryDataMap[targetCategory].personalPaymentsForCategory += personShareForEntireExpense; 
            }
        }
    });

    return Object.entries(categoryDataMap).map(([name, data]) => {
        const { totalAmount, expenseIds, potentialMostExpensive, personalPaymentsForCategory } = data;
        const expenseCount = expenseIds.size;

        let mostExpensiveItemData: { description: string; amount: number; date: string; } | null = null;
        if (potentialMostExpensive.length > 0) {
            const sortedItems = [...potentialMostExpensive].sort((a, b) => b.amount - a.amount);
            const topItem = sortedItems[0];
            mostExpensiveItemData = {
                description: topItem.type === 'item' ? `${topItem.description} (from "${topItem.mainExpenseDescription}")` : topItem.description,
                amount: topItem.amount,
                date: topItem.date
            };
        }
        
        let largestPayerData: { name: string; amount: number; } | null = null;
        if (analyticsViewMode === 'group') {
            const categoryExpenses = displayedExpenses.filter(exp => expenseIds.has(exp.id));
            const payerTotals: Record<string, number> = {};
            categoryExpenses.forEach(catExp => {
                const currentExpenseTotalBill = Number(catExp.total_amount) || 0;
                if (catExp.split_method === 'itemwise' && catExp.items) {
                    catExp.items.forEach(item => {
                        const itemCat = item.categoryName || catExp.category || UNCATEGORIZED;
                        if (itemCat === name) { // Only consider items belonging to the current category 'name'
                            catExp.paid_by.forEach(p => {
                                // Approximate: attribute payment based on item's proportion of total bill
                                if (currentExpenseTotalBill > 0.001) {
                                     const itemProportion = Number(item.price) / currentExpenseTotalBill;
                                     payerTotals[p.personId] = (payerTotals[p.personId] || 0) + (Number(p.amount) * itemProportion);
                                }
                            });
                        }
                    });
                } else { // For non-itemwise expenses, if the expense category matches
                    if ((catExp.category || UNCATEGORIZED) === name) {
                        catExp.paid_by.forEach(p => {
                             payerTotals[p.personId] = (payerTotals[p.personId] || 0) + Number(p.amount); // Full payment amount for this expense
                        });
                    }
                }
            });
            const sortedPayers = Object.entries(payerTotals).sort(([,a], [,b]) => b-a);
            if(sortedPayers.length > 0 && sortedPayers[0][1] > 0.001) {
                largestPayerData = { name: peopleMap[sortedPayers[0][0]] || 'Unknown', amount: sortedPayers[0][1] };
            }
        } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
             // For personal view, "largestPayer" means "how much I paid towards my share of this category"
            if (personalPaymentsForCategory > 0.001) { // This uses the refined personalPaymentsForCategory
                 largestPayerData = { name: peopleMap[selectedPersonIdForAnalytics] || "You", amount: personalPaymentsForCategory };
            }
        }

        return {
            name,
            totalAmount,
            expenseCount,
            averageAmount: expenseCount > 0 && totalAmount > 0.001 ? totalAmount / expenseCount : 0,
            Icon: getCategoryIconFromName((dynamicCategories.find(c => c.name === name)?.icon_name) || ""),
            mostExpensiveItem: mostExpensiveItemData,
            largestPayer: largestPayerData,
        };
    }).filter(cat => cat.totalAmount > 0.001 || dynamicCategories.some(dc => dc.name === cat.name))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [displayedExpenses, dynamicCategories, getCategoryIconFromName, peopleMap, analyticsViewMode, selectedPersonIdForAnalytics]);


  const detailedParticipantAnalytics: ParticipantAnalyticsData[] = useMemo(() => {
    const peopleToAnalyze = analyticsViewMode === 'personal' && selectedPersonIdForAnalytics
      ? people.filter(p => p.id === selectedPersonIdForAnalytics)
      : people;

    return peopleToAnalyze.map(person => {
      let totalPaid = 0;
      let totalShared = 0; // This is now Total Obligation (share + celebration)
      let expensesPaidCount = 0;
      let expensesSharedCount = 0;
      const categoryShares: Record<string, number> = {};

      displayedExpenses.forEach(exp => {
        let personPaidThisExpense = false;
        const paidAmount = exp.paid_by.find(p => p.personId === person.id)?.amount || 0;
        if (paidAmount > 0.001) {
            totalPaid += Number(paidAmount);
            personPaidThisExpense = true;
        }
        if (personPaidThisExpense) expensesPaidCount++;

        const personShareAmountForThisExpense = Number(exp.shares.find(s => s.personId === person.id)?.amount || 0);
        let personCelebrationAmount = 0;
        if (exp.celebration_contribution?.personId === person.id) {
          personCelebrationAmount = Number(exp.celebration_contribution.amount);
        }

        totalShared += personShareAmountForThisExpense + personCelebrationAmount;

        if (personShareAmountForThisExpense > 0.001) {
          expensesSharedCount++;

          if (exp.split_method === 'itemwise' && Array.isArray(exp.items) && exp.items.length > 0) {
            const originalTotalBillForThisExpense = Number(exp.total_amount) || 0;
            const celebrationContributionForExpense = exp.celebration_contribution ? Number(exp.celebration_contribution.amount) : 0;
            const amountEffectivelySplitForExpense = Math.max(0, originalTotalBillForThisExpense - celebrationContributionForExpense);
            const sumOfOriginalItemPricesForExpense = exp.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
            
            const reductionFactor = (sumOfOriginalItemPricesForExpense > 0.001 && amountEffectivelySplitForExpense >= 0)
                ? (amountEffectivelySplitForExpense / sumOfOriginalItemPricesForExpense)
                : (sumOfOriginalItemPricesForExpense === 0 && amountEffectivelySplitForExpense === 0 ? 1 : 0);

            exp.items.forEach(item => {
              if (item.sharedBy.includes(person.id)) {
                const originalItemPrice = Number(item.price) || 0;
                const adjustedItemPriceForSplitting = originalItemPrice * reductionFactor;
                const personShareOfThisItem = (item.sharedBy.length > 0) ? adjustedItemPriceForSplitting / item.sharedBy.length : 0;
                
                if (personShareOfThisItem > 0.001) {
                    const cat = item.categoryName || exp.category || UNCATEGORIZED;
                    categoryShares[cat] = (categoryShares[cat] || 0) + personShareOfThisItem;
                }
              }
            });
          } else { 
            const targetCategory = exp.category || UNCATEGORIZED;
            categoryShares[targetCategory] = (categoryShares[targetCategory] || 0) + personShareAmountForThisExpense;
          }
        }
      });

      const sortedCategoryShares = Object.entries(categoryShares)
                                     .filter(([,amount]) => amount > 0.001)
                                     .sort(([, a], [, b]) => b - a);
      const mostFreqCatShared = sortedCategoryShares.length > 0 ? { name: sortedCategoryShares[0][0], amount: sortedCategoryShares[0][1] } : null;

      return {
        name: person.name,
        totalPaid,
        totalShared,
        netBalance: totalPaid - totalShared,
        expensesPaidCount,
        expensesSharedCount,
        mostFrequentCategoryShared: mostFreqCatShared,
        averageShareAmount: expensesSharedCount > 0 ? totalShared / expensesSharedCount : 0,
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [displayedExpenses, people, analyticsViewMode, selectedPersonIdForAnalytics]);


  const pieChartData: CategorySpendingPieChartDataPoint[] = useMemo(() => {
    const top5Categories = detailedCategoryAnalytics.slice(0, 5);
    if (top5Categories.length === 0) {
      return [];
    }

    const sumOfTop5Amounts = top5Categories.reduce((acc, curr) => acc + curr.totalAmount, 0);

    if (sumOfTop5Amounts < 0.001) { 
      return [];
    }

    return top5Categories.filter(entry => {
      if (entry.totalAmount < 0.001) return false; 
      const percentage = (entry.totalAmount / sumOfTop5Amounts) * 100;
      
      return percentage >= 0.5 || (top5Categories.length === 1 && entry.totalAmount > 0.001);
    }).map(cat => ({ name: cat.name, totalAmount: cat.totalAmount })); // Ensure correct type for CategorySpendingPieChart
  }, [detailedCategoryAnalytics]);

  const shareVsPaidData: ShareVsPaidDataPoint[] = useMemo(() => {
    const peopleToAnalyze = analyticsViewMode === 'personal' && selectedPersonIdForAnalytics
      ? people.filter(p => p.id === selectedPersonIdForAnalytics)
      : people;
    if (!peopleToAnalyze.length) return [];

    return peopleToAnalyze.map(person => {
      let totalPaidByPerson = 0;
      let totalObligationForPerson = 0;
      displayedExpenses.forEach(expense => {
        const paidAmount = expense.paid_by.find(p => p.personId === person.id)?.amount || 0;
        if (paidAmount > 0.001) totalPaidByPerson += Number(paidAmount);

        const shareAmount = expense.shares.find(s => s.personId === person.id)?.amount || 0;
        let celebrationAmount = 0;
        if (expense.celebration_contribution?.personId === person.id) {
          celebrationAmount = Number(expense.celebration_contribution.amount);
        }
        totalObligationForPerson += Number(shareAmount) + celebrationAmount;
      });
      return { name: peopleMap[person.id] || person.name, paid: totalPaidByPerson, share: totalObligationForPerson };
    }).filter(d => d.paid > 0.01 || d.share > 0.01);
  }, [displayedExpenses, people, peopleMap, analyticsViewMode, selectedPersonIdForAnalytics]);

  const topExpensesData: TopExpenseData[] = useMemo(() => {
    if (analyticsViewMode === 'group') {
        return [...displayedExpenses]
        .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))
        .slice(0, 10);
    } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
        return displayedExpenses.map(exp => {
            const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
            return { ...exp, personalShareAmount: Number(personShare?.amount || 0) };
        })
        .filter(exp => exp.personalShareAmount > 0.001)
        .sort((a,b) => b.personalShareAmount - a.personalShareAmount)
        .slice(0,10)
        .map(({personalShareAmount, ...rest}) => ({...rest, total_amount: personalShareAmount })); 
    }
    return [];
  }, [displayedExpenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  if (allExpenses.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg text-center py-6 sm:py-10">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center justify-center text-xl sm:text-2xl font-bold text-primary">
            <BarChartBig className="mr-2 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7" /> Expense Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            <BarChartBig className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary/30" />
            <p className="font-medium text-base sm:text-lg mb-2">No Data to Analyze</p>
            <p className="text-sm sm:text-base max-w-md">
              Add some expenses to see detailed analytics and insights here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-full p-0.5">
      <div className="space-y-4 md:space-y-6">
        <Tabs value={analyticsViewMode} onValueChange={(value) => {
          setAnalyticsViewMode(value as 'group' | 'personal');
          if (value === 'group') setSelectedPersonIdForAnalytics(null);
          else if (people.length > 0 && !selectedPersonIdForAnalytics) setSelectedPersonIdForAnalytics(people[0].id);
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sticky top-0 z-10 bg-muted text-muted-foreground p-1 rounded-md text-xs sm:text-sm">
            <TabsTrigger value="group" className="flex items-center gap-1.5 sm:gap-2">
              <Eye className="h-4 w-4"/> Group Overview
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex items-center gap-1.5 sm:gap-2">
              <UserSquare className="h-4 w-4"/> Personal Insights
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="group" className="mt-0"> {/* Ensure mt-0 for TabsContent */}
          </TabsContent>
          <TabsContent value="personal" className="mt-0"> {/* Ensure mt-0 for TabsContent */}
            <Card className="mb-4 sm:mb-6 px-3 py-2 sm:px-4 sm:py-3 shadow-md"> {/* Adjusted padding */}
              <Label htmlFor="person-analytics-select" className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-primary">
                Select Person for Detailed Insights:
              </Label>
              <Select
                value={selectedPersonIdForAnalytics || ''}
                onValueChange={setSelectedPersonIdForAnalytics}
                disabled={people.length === 0}
              >
                <SelectTrigger id="person-analytics-select" className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Select a person..." />
                </SelectTrigger>
                <SelectContent>
                  {people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Card>
             {analyticsViewMode === 'personal' && !selectedPersonIdForAnalytics && (
              <Card className="shadow-md rounded-lg text-center py-6">
                <CardContent className="pt-0">
                  <p className="text-sm sm:text-md text-muted-foreground">Please select a person to view their personal analytics.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {(analyticsViewMode === 'group' || (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics)) && displayedExpenses.length === 0 && (
            <Card className="shadow-md rounded-lg text-center py-6">
                <CardContent className="pt-0"> 
                <p className="text-sm sm:text-md text-muted-foreground">
                    {analyticsViewMode === 'personal' && selectedPersonIdForAnalytics ? 
                    `${peopleMap[selectedPersonIdForAnalytics] || 'The selected person'} is not involved in any expenses with a share.` :
                    "No expenses match the current filter."}
                </p>
                </CardContent>
            </Card>
        )}

        {(analyticsViewMode === 'group' || (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics && displayedExpenses.length > 0)) && (
          <>
            <OverallAnalyticsSnapshot
              enhancedOverallStats={enhancedOverallStats}
              analyticsViewMode={analyticsViewMode}
              selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
              peopleMap={peopleMap}
            />
            
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <MonthlySpendingChart
                expenses={displayedExpenses}
                analyticsViewMode={analyticsViewMode}
                selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
              />
              <ShareVsPaidComparisonChart
                shareVsPaidData={shareVsPaidData}
                analyticsViewMode={analyticsViewMode}
                selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
                peopleMap={peopleMap}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <SpendingByDayChart
                expenses={displayedExpenses}
                analyticsViewMode={analyticsViewMode}
                selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
              />
              <SplitMethodChart
                expenses={displayedExpenses}
                analyticsViewMode={analyticsViewMode}
                selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
              />
            </div>

            <TransactionHeatmapCalendar
              expenses={displayedExpenses}
              analyticsViewMode={analyticsViewMode}
              selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
              peopleMap={peopleMap}
            />
            
            {topExpensesData.length > 0 && (
              <TopExpensesTable
                topExpensesData={topExpensesData}
                analyticsViewMode={analyticsViewMode}
                peopleMap={peopleMap}
              />
            )}

            <CategoryAnalyticsTable
              detailedCategoryAnalytics={detailedCategoryAnalytics}
              analyticsViewMode={analyticsViewMode}
            />
            
            <ParticipantSummaryTable
              detailedParticipantAnalytics={detailedParticipantAnalytics}
              analyticsViewMode={analyticsViewMode}
              selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
              peopleMap={peopleMap}
            />

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <CategorySpendingPieChart
                pieChartData={pieChartData}
                analyticsViewMode={analyticsViewMode}
              />
              <ExpenseDistributionChart
                expenses={displayedExpenses}
                analyticsViewMode={analyticsViewMode}
                selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
              />
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
