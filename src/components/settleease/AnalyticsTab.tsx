
"use client";

import React, { useMemo, useState } from 'react';
import {
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIconLucide, Users, TrendingUp, DollarSign, CalendarDays, Sigma, ListFilter,
  CalendarClock, GitFork, Award, SearchCheck, User, FileText as FileTextIcon, Eye, UserSquare
} from 'lucide-react';
import {
  LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { CHART_COLORS, AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants';
import type {
  Expense, Person, Category as DynamicCategory,
  CategoryAnalyticsData, ParticipantAnalyticsData, ExpenseAmountDistributionData,
  SpendingByDayOfWeekData, SplitMethodDistributionData, TopExpenseData
} from '@/lib/settleease/types';
import ShareVsPaidChart from './dashboard/ShareVsPaidChart';

interface AnalyticsTabProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: DynamicCategory[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

interface MonthlyExpenseData {
  month: string;
  totalAmount: number;
}

const UNCATEGORIZED = "Uncategorized";


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


  const enhancedOverallStats = useMemo(() => {
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

    if (analyticsViewMode === 'group') {
      totalAmount = displayedExpenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0);
      
      const tempCategorySpending: Record<string, number> = {};
      displayedExpenses.forEach(exp => {
        if (exp.split_method === 'itemwise' && exp.items) {
          exp.items.forEach(item => {
            const cat = item.categoryName || exp.category || UNCATEGORIZED;
            tempCategorySpending[cat] = (tempCategorySpending[cat] || 0) + Number(item.price);
          });
        } else {
          const cat = exp.category || UNCATEGORIZED;
          tempCategorySpending[cat] = (tempCategorySpending[cat] || 0) + Number(exp.total_amount);
        }
      });
      const sortedTempCategories = Object.entries(tempCategorySpending).sort(([,a],[,b]) => b-a);
      if (sortedTempCategories.length > 0) {
        mostExpensiveCatData = { name: sortedTempCategories[0][0], totalAmount: sortedTempCategories[0][1] };
      }

      if (expenseCount > 0) {
        const sortedByAmount = [...displayedExpenses].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
        largestSingleExpData = {
          description: sortedByAmount[0].description,
          amount: Number(sortedByAmount[0].total_amount),
          date: new Date(sortedByAmount[0].created_at || Date.now()).toLocaleDateString()
        };
      }
    } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
      const personalCategorySpending: Record<string, number> = {};
      let maxPersonalShare = 0;

      displayedExpenses.forEach(exp => {
        const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
        const personShareAmount = Number(personShare?.amount || 0);
        totalAmount += personShareAmount;

        if (personShareAmount > 0.001) {
            if (personShareAmount > maxPersonalShare) {
                maxPersonalShare = personShareAmount;
                largestSingleExpData = {
                    description: exp.description,
                    amount: personShareAmount,
                    date: new Date(exp.created_at || Date.now()).toLocaleDateString()
                };
            }

            if (exp.split_method === 'itemwise' && Array.isArray(exp.items) && exp.items.length > 0) {
                let sumOfOriginalPricesOfItemsSharedByPersonThisExpense = 0;
                const itemsSharedByPersonDetails: Array<{ originalPrice: number; category: string }> = [];

                exp.items.forEach(item => {
                    if (item.sharedBy.includes(selectedPersonIdForAnalytics!)) {
                        const originalItemPrice = Number(item.price) || 0;
                        sumOfOriginalPricesOfItemsSharedByPersonThisExpense += originalItemPrice;
                        itemsSharedByPersonDetails.push({
                            originalPrice: originalItemPrice,
                            category: item.categoryName || exp.category || UNCATEGORIZED,
                        });
                    }
                });
                
                if (sumOfOriginalPricesOfItemsSharedByPersonThisExpense > 0.001) {
                    itemsSharedByPersonDetails.forEach(itemDetail => {
                        const proportionOfShare = itemDetail.originalPrice / sumOfOriginalPricesOfItemsSharedByPersonThisExpense;
                        const amountForThisCategory = proportionOfShare * personShareAmount;
                        personalCategorySpending[itemDetail.category] = (personalCategorySpending[itemDetail.category] || 0) + amountForThisCategory;
                    });
                } else if (itemsSharedByPersonDetails.length > 0) { 
                    const fallbackCat = exp.category || itemsSharedByPersonDetails[0]?.category || UNCATEGORIZED;
                    personalCategorySpending[fallbackCat] = (personalCategorySpending[fallbackCat] || 0) + personShareAmount;
                } else { 
                    const mainCat = exp.category || UNCATEGORIZED;
                    personalCategorySpending[mainCat] = (personalCategorySpending[mainCat] || 0) + personShareAmount;
                }
            } else { 
                const cat = exp.category || UNCATEGORIZED;
                personalCategorySpending[cat] = (personalCategorySpending[cat] || 0) + personShareAmount;
            }
        }
      });

      const sortedPersonalCategories = Object.entries(personalCategorySpending).sort(([,a],[,b]) => b-a);
      if (sortedPersonalCategories.length > 0) {
        mostExpensiveCatData = { name: sortedPersonalCategories[0][0], totalAmount: sortedPersonalCategories[0][1] };
      }
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
        const personShareForExpense = analyticsViewMode === 'personal' && selectedPersonIdForAnalytics
            ? Number(exp.shares.find(s => s.personId === selectedPersonIdForAnalytics)?.amount || 0)
            : Number(exp.total_amount); 
        
        const expenseTotalAmountNum = Number(exp.total_amount) || 0;

        
        let selectedPersonPaymentForThisExpense = 0;
        if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
            selectedPersonPaymentForThisExpense = exp.paid_by
                .filter(p => p.personId === selectedPersonIdForAnalytics)
                .reduce((sum, p) => sum + Number(p.amount), 0);
        }


        if (exp.split_method === 'itemwise' && Array.isArray(exp.items) && exp.items.length > 0) {
            let sumOfOriginalPricesOfItemsSharedByPersonThisExpense = 0;
            if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
                exp.items.forEach(item => {
                    if (item.sharedBy.includes(selectedPersonIdForAnalytics)) {
                        sumOfOriginalPricesOfItemsSharedByPersonThisExpense += (Number(item.price) || 0);
                    }
                });
            }

            exp.items.forEach(item => {
                const originalItemPrice = Number(item.price) || 0;
                if (originalItemPrice <= 0.001 && analyticsViewMode === 'group') return; 

                const targetCategory = item.categoryName || exp.category || UNCATEGORIZED;
                if (!categoryDataMap[targetCategory]) {
                    categoryDataMap[targetCategory] = { totalAmount: 0, expenseIds: new Set(), potentialMostExpensive: [], personalPaymentsForCategory: 0 };
                }

                let amountToCreditToCategory = 0;
                let paymentContributionToCategory = 0;

                if (analyticsViewMode === 'group') {
                    amountToCreditToCategory = originalItemPrice;
                    
                } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics && item.sharedBy.includes(selectedPersonIdForAnalytics)) {
                    const proportionOfShare = (sumOfOriginalPricesOfItemsSharedByPersonThisExpense > 0.001 && personShareForExpense > 0.001)
                        ? (originalItemPrice / sumOfOriginalPricesOfItemsSharedByPersonThisExpense)
                        : (personShareForExpense > 0.001 && exp.items.filter(i => i.sharedBy.includes(selectedPersonIdForAnalytics!)).length === 1 ? 1 : 0); 
                    
                    amountToCreditToCategory = proportionOfShare * personShareForExpense;

                    if (expenseTotalAmountNum > 0.001 && selectedPersonPaymentForThisExpense > 0.001) {
                        const itemProportionOfTotalExpense = originalItemPrice / expenseTotalAmountNum;
                        paymentContributionToCategory = itemProportionOfTotalExpense * selectedPersonPaymentForThisExpense;
                    }
                }
                
                if (amountToCreditToCategory > 0.001) {
                    categoryDataMap[targetCategory].totalAmount += amountToCreditToCategory;
                    categoryDataMap[targetCategory].expenseIds.add(exp.id);
                    categoryDataMap[targetCategory].potentialMostExpensive.push({
                        type: 'item',
                        id: item.id,
                        description: item.name,
                        amount: amountToCreditToCategory, 
                        date: expDate,
                        mainExpenseDescription: exp.description
                    });
                    if (analyticsViewMode === 'personal') {
                        categoryDataMap[targetCategory].personalPaymentsForCategory += paymentContributionToCategory;
                    }
                }
            });
        } else { 
            if (personShareForExpense <= 0.001 && analyticsViewMode === 'personal') return; 
            if (expenseTotalAmountNum <= 0.001 && analyticsViewMode === 'group') return;


            const targetCategory = exp.category || UNCATEGORIZED;
            if (!categoryDataMap[targetCategory]) {
                categoryDataMap[targetCategory] = { totalAmount: 0, expenseIds: new Set(), potentialMostExpensive: [], personalPaymentsForCategory: 0 };
            }
            
            let amountToCreditToCategory = analyticsViewMode === 'group' ? expenseTotalAmountNum : personShareForExpense;

            if (amountToCreditToCategory > 0.001) {
                categoryDataMap[targetCategory].totalAmount += amountToCreditToCategory;
                categoryDataMap[targetCategory].expenseIds.add(exp.id);
                categoryDataMap[targetCategory].potentialMostExpensive.push({
                    type: 'expense',
                    id: exp.id,
                    description: exp.description,
                    amount: amountToCreditToCategory, 
                    date: expDate
                });
                if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
                     categoryDataMap[targetCategory].personalPaymentsForCategory += selectedPersonPaymentForThisExpense;
                }
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
            
             const catFromOverall = enhancedOverallStats.mostExpensiveCategory.name === name ? enhancedOverallStats.mostExpensiveCategory : null;
            
        } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
            if (personalPaymentsForCategory > 0.001) {
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
  }, [displayedExpenses, dynamicCategories, getCategoryIconFromName, peopleMap, analyticsViewMode, selectedPersonIdForAnalytics, enhancedOverallStats.mostExpensiveCategory]);


  const detailedParticipantAnalytics: ParticipantAnalyticsData[] = useMemo(() => {
    const peopleToAnalyze = analyticsViewMode === 'personal' && selectedPersonIdForAnalytics
      ? people.filter(p => p.id === selectedPersonIdForAnalytics)
      : people;

    return peopleToAnalyze.map(person => {
      let totalPaid = 0;
      let totalShared = 0;
      let expensesPaidCount = 0;
      let expensesSharedCount = 0;
      const categoryShares: Record<string, number> = {};

      displayedExpenses.forEach(exp => {
        let personPaidThisExpense = false;
        if (Array.isArray(exp.paid_by)) {
          exp.paid_by.forEach(p => {
            if (p.personId === person.id) {
              totalPaid += Number(p.amount);
              personPaidThisExpense = true;
            }
          });
        }
        if (personPaidThisExpense) expensesPaidCount++;

        const personShareInExpenseRecord = exp.shares.find(s => s.personId === person.id);
        const personShareAmountForThisExpense = Number(personShareInExpenseRecord?.amount || 0);

        if (personShareAmountForThisExpense > 0.001) {
          totalShared += personShareAmountForThisExpense;
          expensesSharedCount++;

          if (exp.split_method === 'itemwise' && Array.isArray(exp.items) && exp.items.length > 0) {
            let sumOfOriginalPricesOfItemsSharedByPersonThisExpense = 0;
            const itemsSharedByPersonDetailsThisExpense: Array<{ originalPrice: number; category: string }> = [];

            exp.items.forEach(item => {
              if (item.sharedBy.includes(person.id)) {
                const originalItemPrice = Number(item.price) || 0;
                sumOfOriginalPricesOfItemsSharedByPersonThisExpense += originalItemPrice;
                itemsSharedByPersonDetailsThisExpense.push({
                  originalPrice: originalItemPrice,
                  category: item.categoryName || exp.category || UNCATEGORIZED,
                });
              }
            });

            if (sumOfOriginalPricesOfItemsSharedByPersonThisExpense > 0.001) {
              itemsSharedByPersonDetailsThisExpense.forEach(itemDetail => {
                const proportionOfShare = itemDetail.originalPrice / sumOfOriginalPricesOfItemsSharedByPersonThisExpense;
                const amountForThisCategory = proportionOfShare * personShareAmountForThisExpense;
                categoryShares[itemDetail.category] = (categoryShares[itemDetail.category] || 0) + amountForThisCategory;
              });
            } else if (itemsSharedByPersonDetailsThisExpense.length > 0) {
              const fallbackCat = exp.category || itemsSharedByPersonDetailsThisExpense[0]?.category || UNCATEGORIZED;
              categoryShares[fallbackCat] = (categoryShares[fallbackCat] || 0) + personShareAmountForThisExpense;
            } else {
                 const mainCat = exp.category || UNCATEGORIZED;
                 categoryShares[mainCat] = (categoryShares[mainCat] || 0) + personShareAmountForThisExpense;
            }
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

  const shareVsPaidData = useMemo(() => {
    const peopleToAnalyze = analyticsViewMode === 'personal' && selectedPersonIdForAnalytics
      ? people.filter(p => p.id === selectedPersonIdForAnalytics)
      : people;
    if (!peopleToAnalyze.length) return [];

    return peopleToAnalyze.map(person => {
      let totalPaidByPerson = 0;
      let totalShareForPerson = 0;
      displayedExpenses.forEach(expense => {
        if (Array.isArray(expense.paid_by)) {
          expense.paid_by.forEach(payment => {
            if (payment.personId === person.id) totalPaidByPerson += Number(payment.amount);
          });
        }
        if (Array.isArray(expense.shares)) {
          expense.shares.forEach(share => {
            if (share.personId === person.id) totalShareForPerson += Number(share.amount);
          });
        }
      });
      return { name: peopleMap[person.id] || person.name, paid: totalPaidByPerson, share: totalShareForPerson };
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


  const actualMostExpensiveCategoryFromAnalytics = useMemo(() => {
    
    if (detailedCategoryAnalytics.length > 0) {
      
      return { name: detailedCategoryAnalytics[0].name, totalAmount: detailedCategoryAnalytics[0].totalAmount };
    }
    return { name: 'N/A', totalAmount: 0 };
  }, [detailedCategoryAnalytics]);

  const pieChartData = useMemo(() => {
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
    });
  }, [detailedCategoryAnalytics]);


  if (allExpenses.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg text-center py-6 sm:py-10">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-semibold text-primary flex items-center justify-center">
            <BarChart3 className="mr-2 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7" /> Expense Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm sm:text-md text-muted-foreground">No expenses recorded yet to analyze.</p>
          <p className="text-xs sm:text-sm">Add some expenses to see detailed analytics here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-full p-0.5">
      <div className="space-y-4 sm:space-y-6">
        <Tabs value={analyticsViewMode} onValueChange={(value) => {
          setAnalyticsViewMode(value as 'group' | 'personal');
          if (value === 'group') setSelectedPersonIdForAnalytics(null);
          else if (people.length > 0 && !selectedPersonIdForAnalytics) setSelectedPersonIdForAnalytics(people[0].id);
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sticky top-0 z-10 bg-background/90 backdrop-blur-sm text-xs sm:text-sm">
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
            <Card className="shadow-md rounded-lg">
              <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                <CardTitle className="text-md sm:text-lg flex items-center"><Sigma className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary"/>
                  {analyticsViewMode === 'personal' && selectedPersonIdForAnalytics ? `${peopleMap[selectedPersonIdForAnalytics]}'s Snapshot` : 'Overall Snapshot'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm px-4 sm:px-5 pb-4 sm:pb-5 pt-2">
                <div className="p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Total Spent {analyticsViewMode === 'personal' ? '(Your Share)' : '(Group Total)'}</p>
                  <p className="text-md sm:text-lg font-bold text-accent">{formatCurrency(enhancedOverallStats.totalAmount)}</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Total Expenses {analyticsViewMode === 'personal' ? '(Involved In)' : ''}</p>
                  <p className="text-md sm:text-lg font-bold">{enhancedOverallStats.expenseCount}</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Avg. Expense {analyticsViewMode === 'personal' ? '(Your Share)' : ''}</p>
                  <p className="text-md sm:text-lg font-bold">{formatCurrency(enhancedOverallStats.averageAmount)}</p>
                </div>
                {analyticsViewMode === 'group' && (
                  <div className="p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Participants</p>
                    <p className="text-md sm:text-lg font-bold">{enhancedOverallStats.distinctParticipantCount}</p>
                  </div>
                )}
                <div className={`p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5 ${analyticsViewMode === 'group' ? 'col-span-2 md:col-span-1' : 'col-span-1'}`}>
                  <p className="text-xs text-muted-foreground">Top Category {analyticsViewMode === 'personal' ? '(Your Share)' : ''}</p>
                  <p className="text-sm sm:text-base font-semibold truncate" title={actualMostExpensiveCategoryFromAnalytics.name}>
                    {actualMostExpensiveCategoryFromAnalytics.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(actualMostExpensiveCategoryFromAnalytics.totalAmount)}</p>
                </div>
                <div className={`p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5 ${analyticsViewMode === 'group' ? 'col-span-2 md:col-span-1' : 'col-span-2'}`}>
                   <p className="text-xs text-muted-foreground">Largest Single Expense {analyticsViewMode === 'personal' ? '(Your Share)' : ''}</p>
                  <p className="text-sm sm:text-base font-semibold truncate" title={enhancedOverallStats.largestSingleExpense.description}>
                    {enhancedOverallStats.largestSingleExpense.description}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(enhancedOverallStats.largestSingleExpense.amount)} on {enhancedOverallStats.largestSingleExpense.date}</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 col-span-2 md:col-span-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Date Range (of these expenses)</p>
                  <p className="text-xs sm:text-sm font-semibold">
                    {enhancedOverallStats.firstDate ? enhancedOverallStats.firstDate.toLocaleDateString() : 'N/A'} - {enhancedOverallStats.lastDate ? enhancedOverallStats.lastDate.toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <Card className="shadow-md rounded-lg">
                <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                    <CardTitle className="text-md sm:text-lg flex items-center">
                        <TrendingUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary"/>
                        {analyticsViewMode === 'personal' ? 'Your Spending Over Time (Monthly)' : 'Group Expenses Over Time (Monthly)'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-4 pt-1"> {/* Adjusted pt */}
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyExpenseData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                        <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px' }} formatter={(value:number) => [formatCurrency(value), analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"]} />
                        <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
                        <Line type="monotone" dataKey="totalAmount" name={analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    </LineChart>
                    </ResponsiveContainer>
                </CardContent>
                </Card>
                <Card className="shadow-md rounded-lg">
                    <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                        <CardTitle className="text-md sm:text-lg flex items-center">
                        <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        Share vs. Paid {analyticsViewMode === 'personal' && selectedPersonIdForAnalytics ? `(For ${peopleMap[selectedPersonIdForAnalytics]})` : ''}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-4 pt-1"> {/* Adjusted pt */}
                        {shareVsPaidData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                            data={shareVsPaidData}
                            margin={{ top: 5, right: 10, left: -5, bottom: (shareVsPaidData.length > 3 && analyticsViewMode === 'group') ? 20 : 0 }}
                            >
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                                dataKey="name" 
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
                                interval={0} 
                                angle={(shareVsPaidData.length > 3 && analyticsViewMode === 'group') ? -25 : 0} 
                                textAnchor={(shareVsPaidData.length > 3 && analyticsViewMode === 'group') ? "end" : "middle"} 
                                height={(shareVsPaidData.length > 3 && analyticsViewMode === 'group') ? 35 : 20} 
                            />
                             <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                            <Tooltip
                                formatter={(value: number) => [formatCurrency(value), "Amount"]}
                                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px' }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
                            <Bar dataKey="paid" name="Total Paid" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} barSize={Math.min(20, (shareVsPaidData.length > 0 ? (150 / shareVsPaidData.length / 2) : 20) * 0.8 )} />
                            <Bar dataKey="share" name="Total Share" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} barSize={Math.min(20, (shareVsPaidData.length > 0 ? (150 / shareVsPaidData.length / 2) : 20) * 0.8 )} />
                            </BarChart>
                        </ResponsiveContainer>
                        ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-xs sm:text-sm">No data for comparison chart.</p>)}
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                {spendingByDayOfWeekData.length > 0 && (
                <Card className="shadow-md rounded-lg">
                    <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                        <CardTitle className="text-md sm:text-lg flex items-center">
                            <CalendarClock className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary"/>
                            {analyticsViewMode === 'personal' ? 'Your Spending by Day' : 'Group Spending by Day'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-4 pt-1"> {/* Adjusted pt */}
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={spendingByDayOfWeekData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                        <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}/>
                        <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}/>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px' }} formatter={(value:number) => [formatCurrency(value), analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"]}/>
                        <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
                        <Bar dataKey="totalAmount" name={analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"} fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} barSize={20}/>
                        </BarChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
                )}
                {splitMethodDistributionData.length > 0 && (
                <Card className="shadow-md rounded-lg">
                    <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                        <CardTitle className="text-md sm:text-lg flex items-center">
                            <GitFork className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary"/>
                            Split Method Distribution {analyticsViewMode === 'personal' ? '(For Your Expenses)' : ''}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-4 pt-1"> {/* Adjusted pt */}
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 10, left: 0 }}>
                        <Pie data={splitMethodDistributionData} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={60} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={9}>
                            {splitMethodDistributionData.map((entry, index) => (
                            <RechartsCell key={`cell-split-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px' }} formatter={(value:number) => [value, "Expenses"]}/>
                        <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
                        </PieChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
                )}
            </div>
            
            {topExpensesData.length > 0 && (
            <Card className="shadow-md rounded-lg">
                <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                <CardTitle className="text-md sm:text-lg flex items-center">
                    <Award className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary"/>
                    Top 10 Largest Expenses {analyticsViewMode === 'personal' ? '(By Your Share)' : ''}
                </CardTitle>
                </CardHeader>
                <CardContent className="px-0 sm:px-2 pb-0 sm:pb-2 pt-1"> {/* Adjusted padding */}
                <ScrollArea className="h-auto max-h-[400px]">
                    <Table>{/* */}<TableHeader>{/* */}<TableRow>{/* */}<TableHead className="py-2 px-2 text-xs">Description</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs text-right">Amount {analyticsViewMode === 'personal' ? '(Share)' : '(Total)'}</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs hidden sm:table-cell">Category</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs hidden md:table-cell">Date</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs hidden sm:table-cell">Paid By</TableHead>{/* */}</TableRow>{/* */}</TableHeader>{/* */}<TableBody>
                        {topExpensesData.map(exp => (
                        <TableRow key={exp.id}>
                            <TableCell className="py-1.5 px-2 text-xs font-medium truncate max-w-[100px] sm:max-w-xs" title={exp.description}>{exp.description}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs text-right font-semibold text-primary">{formatCurrency(exp.total_amount)}</TableCell> 
                            <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell">{exp.category}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs hidden md:table-cell">{new Date(exp.created_at || '').toLocaleDateString()}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs truncate max-w-[80px] sm:max-w-[150px] hidden sm:table-cell" title={exp.paid_by.map(p => peopleMap[p.personId] || 'Unknown').join(', ')}>
                            {exp.paid_by.map(p => peopleMap[p.personId] || 'Unknown').join(', ')}
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>{/* */}</Table>
                </ScrollArea>
                </CardContent>
            </Card>
            )}

            <Card className="shadow-md rounded-lg">
            <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                <CardTitle className="text-md sm:text-lg flex items-center">
                    <SearchCheck className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary"/>
                    Category Deep Dive {analyticsViewMode === 'personal' ? '(Your Spending)' : ''}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-2 pb-0 sm:pb-2 pt-1"> {/* Adjusted padding */}
                <ScrollArea className="h-auto max-h-[400px]">
                <Table>{/* */}<TableHeader>{/* */}<TableRow>{/* */}<TableHead className="py-2 px-2 text-xs">Category</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs text-right">Total {analyticsViewMode === 'personal' ? 'Share' : 'Spent'}</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs text-right hidden sm:table-cell"># Exp.</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs text-right hidden md:table-cell">Avg.</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs hidden sm:table-cell">Largest Item/Exp.</TableHead>{/* */}{analyticsViewMode === 'personal' && <TableHead className="py-2 px-2 text-xs hidden md:table-cell">Your Payments</TableHead>}{/* */}{analyticsViewMode === 'group' && <TableHead className="py-2 px-2 text-xs hidden md:table-cell">Top Payer</TableHead>}{/* */}</TableRow>{/* */}</TableHeader>{/* */}<TableBody>
                    {detailedCategoryAnalytics.map(cat => (
                        <TableRow key={cat.name}>
                        <TableCell className="py-1.5 px-2 text-xs font-medium flex items-center"><cat.Icon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>{cat.name}</TableCell>
                        <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(cat.totalAmount)}</TableCell>
                        <TableCell className="py-1.5 px-2 text-xs text-right hidden sm:table-cell">{cat.expenseCount}</TableCell>
                        <TableCell className="py-1.5 px-2 text-xs text-right hidden md:table-cell">{formatCurrency(cat.averageAmount)}</TableCell>
                        <TableCell className="py-1.5 px-2 text-xs truncate max-w-[100px] sm:max-w-[200px] hidden sm:table-cell" title={cat.mostExpensiveItem ? `${cat.mostExpensiveItem.description} (${formatCurrency(cat.mostExpensiveItem.amount)}) on ${cat.mostExpensiveItem.date}` : 'N/A'}>
                            {cat.mostExpensiveItem ? `${cat.mostExpensiveItem.description.substring(0,20)}... (${formatCurrency(cat.mostExpensiveItem.amount)})` : 'N/A'}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-xs truncate max-w-[80px] sm:max-w-[150px] hidden md:table-cell" title={cat.largestPayer ? `${cat.largestPayer.name} (${formatCurrency(cat.largestPayer.amount)})` : 'N/A'}>
                            {cat.largestPayer ? `${cat.largestPayer.name} (${formatCurrency(cat.largestPayer.amount)})` : 'N/A'}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>{/* */}</Table>
                </ScrollArea>
            </CardContent>
            </Card>
            
            <Card className="shadow-md rounded-lg">
                <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                <CardTitle className="text-md sm:text-lg flex items-center">
                    <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary"/>
                    {analyticsViewMode === 'personal' && selectedPersonIdForAnalytics ? `${peopleMap[selectedPersonIdForAnalytics]}'s Financial Summary` : 'Participant Financial Summary'}
                </CardTitle>
                <CardDescription className="text-xs">Financial details derived from expense records (paid vs. share), not reflecting simplified settlements.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 sm:px-2 pb-0 sm:pb-2 pt-1"> {/* Adjusted padding */}
                    <ScrollArea className="h-auto max-h-[400px]">
                        <Table>{/* */}<TableHeader>{/* */}<TableRow>{/* */}<TableHead className="py-2 px-2 text-xs">Participant</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs text-right">Paid</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs text-right">Shared</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs text-right hidden sm:table-cell">Net</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs text-right hidden md:table-cell"># Paid</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs text-right hidden md:table-cell"># Shared</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs text-right hidden lg:table-cell">Avg. Share</TableHead>{/* */}<TableHead className="py-2 px-2 text-xs hidden sm:table-cell">Top Category (Shared)</TableHead>{/* */}</TableRow>{/* */}</TableHeader>{/* */}<TableBody>
                            {detailedParticipantAnalytics.map(p => (
                                <TableRow key={p.name}>
                                <TableCell className="py-1.5 px-2 text-xs font-medium truncate max-w-[80px] sm:max-w-xs">{p.name}</TableCell>
                                <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(p.totalPaid)}</TableCell>
                                <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(p.totalShared)}</TableCell>
                                <TableCell className={`py-1.5 px-2 text-xs text-right font-semibold hidden sm:table-cell ${p.netBalance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                    {formatCurrency(p.netBalance)}
                                </TableCell>
                                <TableCell className="py-1.5 px-2 text-xs text-right hidden md:table-cell">{p.expensesPaidCount}</TableCell>
                                <TableCell className="py-1.5 px-2 text-xs text-right hidden md:table-cell">{p.expensesSharedCount}</TableCell>
                                <TableCell className="py-1.5 px-2 text-xs text-right hidden lg:table-cell">{formatCurrency(p.averageShareAmount)}</TableCell>
                                <TableCell className="py-1.5 px-2 text-xs truncate max-w-[100px] sm:max-w-[150px] hidden sm:table-cell" title={p.mostFrequentCategoryShared ? `${p.mostFrequentCategoryShared.name} (${formatCurrency(p.mostFrequentCategoryShared.amount)})` : 'N/A'}>
                                    {p.mostFrequentCategoryShared ? `${p.mostFrequentCategoryShared.name}` : 'N/A'}
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>{/* */}</Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <Card className="shadow-md rounded-lg">
                <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                <CardTitle className="text-md sm:text-lg flex items-center">
                    <PieChartIconLucide className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary"/>
                    Spending by Category (Top 5) {analyticsViewMode === 'personal' ? '(Your Shares)' : ''}
                </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-4 pt-1"> {/* Adjusted pt */}
                {pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 10, left: 0 }}>
                        <Pie 
                            data={pieChartData} 
                            dataKey="totalAmount" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={60} 
                            labelLine={false} 
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} 
                            fontSize={9}
                        >
                            {pieChartData.map((entry, index) => (
                            <RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px' }} formatter={(value:number) => [formatCurrency(value), "Amount"]} />
                        <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-muted-foreground h-full flex items-center justify-center text-xs sm:text-sm">No category data to display for this view.</p>
                )}
                </CardContent>
            </Card>
            {expenseAmountDistributionData.length > 0 && (
            <Card className="shadow-md rounded-lg">
                <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                <CardTitle className="text-md sm:text-lg flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary"/>
                    Expense Share Distribution {analyticsViewMode === 'personal' ? '(Your Shares)' : '(Total Amounts)'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-4 pt-1"> {/* Adjusted pt */}
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseAmountDistributionData} layout="vertical" margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis type="number" allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} />
                    <YAxis type="category" dataKey="range" width={65} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px' }} formatter={(value: number) => [value, "Number of Expenses/Shares"]} />
                    <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
                    <Bar dataKey="count" name="Count" fill="hsl(var(--chart-4))" radius={[0, 2, 2, 0]} barSize={15} />
                    </BarChart>
                </ResponsiveContainer>
                </CardContent>
            </Card>
            )}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
