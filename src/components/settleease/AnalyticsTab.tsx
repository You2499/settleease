"use client";

import React, { useMemo, useState } from 'react';
import {
  BarChart3, Users, Eye, UserSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

import { AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants';
import type {
  Expense, Person, Category as DynamicCategory,
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


interface AnalyticsTabProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: DynamicCategory[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
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
}: AnalyticsTabProps) {
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

  const monthlyExpenseData: MonthlyExpenseData[] = useMemo(() => {
    const data: Record<string, number> = {};
    displayedExpenses.forEach(exp => {
      if (exp.created_at) {
        const monthYear = new Date(exp.created_at).toLocaleDateString('default', { year: 'numeric', month: 'short' });
        let amountToLog = 0;
        if (analyticsViewMode === 'group') {
          amountToLog = Number(exp.total_amount);
        } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
          const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
          amountToLog = Number(personShare?.amount || 0);
        }
        if (amountToLog > 0.001) {
            data[monthYear] = (data[monthYear] || 0) + amountToLog;
        }
      }
    });
    return Object.entries(data)
      .map(([month, totalAmount]) => ({ month, totalAmount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
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
            Icon: getCategoryIconFromName(name),
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


  const expenseAmountDistributionData: ExpenseAmountDistributionData[] = useMemo(() => {
    const ranges = [
      { label: `₹0 - ₹500`, min: 0, max: 500 },
      { label: `₹501 - ₹1k`, min: 501, max: 1000 },
      { label: `₹1k - ₹2.5k`, min: 1001, max: 2500 },
      { label: `₹2.5k - ₹5k`, min: 2501, max: 5000 },
      { label: `₹5k - ₹10k`, min: 5001, max: 10000 },
      { label: `₹10k+`, min: 10001, max: Infinity },
    ];
    const distribution: Record<string, number> = ranges.reduce((acc, range) => {
      acc[range.label] = 0;
      return acc;
    }, {} as Record<string, number>);

    displayedExpenses.forEach(exp => {
      let amount = 0;
      if (analyticsViewMode === 'group') {
        amount = Number(exp.total_amount);
      } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
        const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
        amount = Number(personShare?.amount || 0);
      }
      if (amount > 0) {
          for (const range of ranges) {
            if (amount >= range.min && amount <= range.max) {
              distribution[range.label]++;
              break;
            }
          }
      }
    });
    return Object.entries(distribution).map(([range, count]) => ({ range, count })).filter(d => d.count > 0);
  }, [displayedExpenses, analyticsViewMode, selectedPersonIdForAnalytics]);

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

  const spendingByDayOfWeekData: SpendingByDayOfWeekData[] = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const spending: Record<string, number> = days.reduce((acc, day) => { acc[day] = 0; return acc; }, {} as Record<string, number>);
    displayedExpenses.forEach(exp => {
      if (exp.created_at) {
        const dayOfWeek = days[new Date(exp.created_at).getDay()];
        let amountToLog = 0;
        if (analyticsViewMode === 'group') {
            amountToLog = Number(exp.total_amount);
        } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
            const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
            amountToLog = Number(personShare?.amount || 0);
        }
        if (amountToLog > 0.001) {
            spending[dayOfWeek] = (spending[dayOfWeek] || 0) + amountToLog;
        }
      }
    });
    return days.map(day => ({ day, totalAmount: spending[day] })).filter(d => d.totalAmount > 0);
  }, [displayedExpenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const splitMethodDistributionData: SplitMethodDistributionData[] = useMemo(() => {
    const counts: Record<string, number> = { 'equal': 0, 'unequal': 0, 'itemwise': 0 };
    displayedExpenses.forEach(exp => {
        if (analyticsViewMode === 'group' || (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics && exp.shares.some(s => s.personId === selectedPersonIdForAnalytics && Number(s.amount) > 0.001))) {
            counts[exp.split_method] = (counts[exp.split_method] || 0) + 1;
        }
    });
    return Object.entries(counts)
      .map(([method, count]) => ({ method: method.charAt(0).toUpperCase() + method.slice(1), count }))
      .filter(d => d.count > 0);
  }, [displayedExpenses, analyticsViewMode, selectedPersonIdForAnalytics]);

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


  if (allExpenses.length === 0) {
    return (
      <Card className="h-full flex flex-col items-center justify-center text-center p-6 shadow-lg rounded-lg">
        <CardHeader className="p-0">
          <BarChart3 className="h-20 w-20 mb-4 text-primary/30" />
          <CardTitle className="text-2xl font-bold text-primary">Analytics</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <p className="text-lg text-muted-foreground">No data to analyze.</p>
          <p className="text-sm mt-1">Add some expenses to get started with analytics!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg h-full flex flex-col">
      <CardHeader className="p-4 sm:p-6 pb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <CardTitle className="flex items-center text-lg sm:text-xl">
              <BarChart3 className="mr-2 h-5 w-5 text-primary" /> Analytics Dashboard
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1.5">
              An overview of spending habits and financial distributions.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Label htmlFor="analyticsViewMode" className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">View:</Label>
              <Select value={analyticsViewMode} onValueChange={(val: 'group' | 'personal') => { setAnalyticsViewMode(val); setSelectedPersonIdForAnalytics(null); }}>
                <SelectTrigger id="analyticsViewMode" className="h-9 w-full sm:w-[120px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group"><Users className="mr-2 h-4 w-4"/> Group</SelectItem>
                  <SelectItem value="personal"><UserSquare className="mr-2 h-4 w-4"/> Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {analyticsViewMode === 'personal' && (
              <div className="flex items-center gap-2">
                <Label htmlFor="personSelect" className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Person:</Label>
                <Select
                  value={selectedPersonIdForAnalytics || ""}
                  onValueChange={(val) => setSelectedPersonIdForAnalytics(val || null)}
                >
                  <SelectTrigger id="personSelect" className="h-9 w-full sm:w-[180px]">
                    <SelectValue placeholder="Select a person..." />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-0 p-4 sm:p-6 pt-0">
        <Tabs defaultValue="overview" className="flex flex-col h-full">
          <TabsList className="mb-4 shrink-0 grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 min-h-0 overflow-y-auto">
              <TabsContent value="overview" className="mt-0">
                <ScrollArea className="h-full pr-4 -mr-4">
                    <div className="space-y-4">
                        <OverallAnalyticsSnapshot
                           enhancedOverallStats={enhancedOverallStats}
                           analyticsViewMode={analyticsViewMode}
                           selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
                           peopleMap={peopleMap}
                        />
                        <Card>
                            <CardHeader><CardTitle>Spending Trends</CardTitle></CardHeader>
                            <CardContent>
                                <MonthlySpendingChart
                                   monthlyExpenseData={monthlyExpenseData}
                                   analyticsViewMode={analyticsViewMode}
                                />
                            </CardContent>
                        </Card>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle>Spending by Day</CardTitle></CardHeader>
                                <CardContent><SpendingByDayChart
                                   spendingByDayOfWeekData={spendingByDayOfWeekData}
                                   analyticsViewMode={analyticsViewMode}
                                /></CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Split Methods</CardTitle></CardHeader>
                                <CardContent><SplitMethodChart
                                   splitMethodDistributionData={splitMethodDistributionData}
                                   analyticsViewMode={analyticsViewMode}
                                /></CardContent>
                            </Card>
                        </div>
                        <Card>
                            <CardHeader><CardTitle>Expense Distribution</CardTitle></CardHeader>
                            <CardContent><ExpenseDistributionChart
                               expenseAmountDistributionData={expenseAmountDistributionData}
                               analyticsViewMode={analyticsViewMode}
                            /></CardContent>
                        </Card>
                        <TopExpensesTable
                           topExpensesData={topExpensesData}
                           analyticsViewMode={analyticsViewMode}
                           peopleMap={peopleMap}
                        />
                    </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="categories" className="mt-0 h-full">
                  <ScrollArea className="h-full pr-4 -mr-4">
                      <div className="space-y-4">
                          <Card>
                            <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
                            <CardContent><CategorySpendingPieChart
                               pieChartData={pieChartData}
                               analyticsViewMode={analyticsViewMode}
                            /></CardContent>
                          </Card>
                          <CategoryAnalyticsTable
                             detailedCategoryAnalytics={detailedCategoryAnalytics}
                             analyticsViewMode={analyticsViewMode}
                          />
                      </div>
                  </ScrollArea>
              </TabsContent>

              <TabsContent value="participants" className="mt-0 h-full">
                  <ScrollArea className="h-full pr-4 -mr-4">
                      <div className="space-y-4">
                        <Card>
                            <CardHeader><CardTitle>Net Contribution (Paid vs. Share)</CardTitle></CardHeader>
                            <CardContent>
                                <ShareVsPaidComparisonChart
                                   shareVsPaidData={shareVsPaidData}
                                   analyticsViewMode={analyticsViewMode}
                                   selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
                                   peopleMap={peopleMap}
                                />
                            </CardContent>
                        </Card>
                        <ParticipantSummaryTable
                           detailedParticipantAnalytics={detailedParticipantAnalytics}
                           analyticsViewMode={analyticsViewMode}
                           selectedPersonIdForAnalytics={selectedPersonIdForAnalytics}
                           peopleMap={peopleMap}
                        />
                      </div>
                  </ScrollArea>
              </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
