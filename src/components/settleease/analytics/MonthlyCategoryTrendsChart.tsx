"use client";

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { CHART_COLORS } from '@/lib/settleease/constants';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import { createEmptyState } from '@/lib/settleease/analytics-helpers';
import type { Expense } from '@/lib/settleease/types';

interface MonthlyCategoryTrendsChartProps {
    expenses: Expense[];
    analyticsViewMode: 'group' | 'personal';
    selectedPersonIdForAnalytics?: string | null;
}

const UNCATEGORIZED = "Uncategorized";

export default function MonthlyCategoryTrendsChart({
    expenses,
    analyticsViewMode,
    selectedPersonIdForAnalytics
}: MonthlyCategoryTrendsChartProps) {

    const chartData = useMemo(() => {
        // Group expenses by month and category
        const monthlyData: Record<string, Record<string, number>> = {};
        const allCategories = new Set<string>();

        expenses.forEach(exp => {
            if (!exp.created_at) return;

            const monthYear = new Date(exp.created_at).toLocaleDateString('default', {
                year: 'numeric',
                month: 'short'
            });

            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = {};
            }

            let amountToLog = 0;
            if (analyticsViewMode === 'group') {
                amountToLog = Number(exp.total_amount);
            } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
                const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
                amountToLog = Number(personShare?.amount || 0);
            }

            if (amountToLog > 0.001) {
                // Handle itemwise expenses
                if (exp.split_method === 'itemwise' && Array.isArray(exp.items) && exp.items.length > 0) {
                    const originalTotalBill = Number(exp.total_amount) || 0;
                    const celebrationContribution = exp.celebration_contribution ? Number(exp.celebration_contribution.amount) : 0;
                    const amountEffectivelySplit = Math.max(0, originalTotalBill - celebrationContribution);
                    const sumOfOriginalItemPrices = exp.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

                    const reductionFactor = (sumOfOriginalItemPrices > 0.001 && amountEffectivelySplit >= 0)
                        ? (amountEffectivelySplit / sumOfOriginalItemPrices)
                        : (sumOfOriginalItemPrices === 0 && amountEffectivelySplit === 0 ? 1 : 0);

                    exp.items.forEach(item => {
                        const originalItemPrice = Number(item.price) || 0;
                        if (originalItemPrice <= 0.001) return;

                        const category = item.categoryName || exp.category || UNCATEGORIZED;
                        allCategories.add(category);

                        let categoryAmount = 0;
                        if (analyticsViewMode === 'group') {
                            categoryAmount = originalItemPrice;
                        } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics && item.sharedBy.includes(selectedPersonIdForAnalytics)) {
                            const adjustedItemPrice = originalItemPrice * reductionFactor;
                            categoryAmount = item.sharedBy.length > 0 ? adjustedItemPrice / item.sharedBy.length : 0;
                        }

                        if (categoryAmount > 0.001) {
                            monthlyData[monthYear][category] = (monthlyData[monthYear][category] || 0) + categoryAmount;
                        }
                    });
                } else {
                    // Handle regular expenses
                    const category = exp.category || UNCATEGORIZED;
                    allCategories.add(category);
                    monthlyData[monthYear][category] = (monthlyData[monthYear][category] || 0) + amountToLog;
                }
            }
        });

        // Convert to array format for recharts and fill missing months with 0
        const sortedMonths = Object.keys(monthlyData).sort((a, b) =>
            new Date(a).getTime() - new Date(b).getTime()
        );

        return sortedMonths.map(month => {
            const monthData: any = { month };
            Array.from(allCategories).forEach(category => {
                monthData[category] = monthlyData[month][category] || 0;
            });
            return monthData;
        });
    }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

    // Get top 5 categories by total spending for better visualization
    const topCategories = useMemo(() => {
        const categoryTotals: Record<string, number> = {};

        chartData.forEach(monthData => {
            Object.keys(monthData).forEach(key => {
                if (key !== 'month') {
                    categoryTotals[key] = (categoryTotals[key] || 0) + monthData[key];
                }
            });
        });

        return Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([category]) => category);
    }, [chartData]);

    const chartTitle = analyticsViewMode === 'personal'
        ? 'Your Category Spending Trends'
        : 'Group Category Spending Trends';

    if (chartData.length === 0 || topCategories.length === 0) {
        return (
            <Card className={ANALYTICS_STYLES.card}>
                <CardHeader className={ANALYTICS_STYLES.header}>
                    <CardTitle className={ANALYTICS_STYLES.title}>
                        <TrendingUp className={ANALYTICS_STYLES.icon} />
                        {chartTitle}
                    </CardTitle>
                </CardHeader>
                <CardContent className={ANALYTICS_STYLES.chartContent}>
                    {createEmptyState(chartTitle, TrendingUp, "No category trend data available for this view.")}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={ANALYTICS_STYLES.card}>
            <CardHeader className={ANALYTICS_STYLES.header}>
                <CardTitle className={ANALYTICS_STYLES.title}>
                    <TrendingUp className={ANALYTICS_STYLES.icon} />
                    {chartTitle}
                </CardTitle>
            </CardHeader>
            <CardContent className={ANALYTICS_STYLES.chartContent}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={ANALYTICS_STYLES.chartMargins}>
                        <CartesianGrid {...ANALYTICS_STYLES.grid} />
                        <XAxis
                            dataKey="month"
                            tick={ANALYTICS_STYLES.axisTick}
                        />
                        <YAxis
                            tickFormatter={(value) => formatCurrencyForAxis(value, '₹')}
                            tick={ANALYTICS_STYLES.axisTick}
                        />
                        <Tooltip
                            {...ANALYTICS_STYLES.tooltip}
                            formatter={(value: number, name: string) => [
                                formatCurrency(value),
                                name
                            ]}
                        />
                        <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
                        {topCategories.map((category, index) => (
                            <Area
                                key={category}
                                type="monotone"
                                dataKey={category}
                                stackId="1"
                                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                                fillOpacity={0.6}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}