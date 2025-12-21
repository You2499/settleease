"use client";

import React, { useMemo, useRef, useCallback, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, Printer, FileText, Calendar, CalendarRange, CalendarDays, CalendarClock, Infinity, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import { FixedCalendar } from "@/components/ui/fixed-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, subMonths, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import type { Expense, SettlementPayment, Person, Category, ExpenseItemDetail } from "@/lib/settleease/types";

interface ExportExpenseTabProps {
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  people: Person[];
  categories: Category[];
  peopleMap: Record<string, string>;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

type ActivityItem =
  | { type: 'expense'; id: string; date: string; data: Expense }
  | { type: 'settlement'; id: string; date: string; data: SettlementPayment };

type DatePreset = 'last7days' | 'last30days' | 'last3months' | 'thisYear' | 'allTime' | 'custom';

const DATE_PRESETS: { id: DatePreset; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; getRange: () => { start: Date; end: Date } }[] = [
  {
    id: 'last7days',
    label: 'Last 7 Days',
    icon: CalendarDays,
    getRange: () => ({ start: subDays(new Date(), 7), end: new Date() })
  },
  {
    id: 'last30days',
    label: 'Last 30 Days',
    icon: Calendar,
    getRange: () => ({ start: subDays(new Date(), 30), end: new Date() })
  },
  {
    id: 'last3months',
    label: 'Last 3 Months',
    icon: CalendarRange,
    getRange: () => ({ start: subMonths(new Date(), 3), end: new Date() })
  },
  {
    id: 'thisYear',
    label: 'This Year',
    icon: CalendarClock,
    getRange: () => ({ start: startOfYear(new Date()), end: new Date() })
  },
  {
    id: 'allTime',
    label: 'All Time',
    icon: Infinity as any,
    getRange: () => ({ start: new Date(2020, 0, 1), end: new Date() })
  },
];

export default function ExportExpenseTab({
  expenses,
  settlementPayments,
  people,
  categories,
  peopleMap,
}: ExportExpenseTabProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Date range selection state
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [reportName, setReportName] = useState<string>("");

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: DatePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const presetConfig = DATE_PRESETS.find(p => p.id === preset);
      if (presetConfig) {
        const range = presetConfig.getRange();
        setStartDate(range.start);
        setEndDate(range.end);
      }
    }
  }, []);

  // Check if date range is selected
  const isDateRangeSelected = selectedPreset !== null && startDate && endDate;

  // Filter non-excluded expenses for the report within date range
  const reportExpenses = useMemo(() => {
    if (!isDateRangeSelected) return [];
    return expenses.filter(expense => {
      if (expense.exclude_from_settlement) return false;
      const expenseDate = new Date(expense.created_at || 0);
      return expenseDate >= startDate! && expenseDate <= endDate!;
    });
  }, [expenses, isDateRangeSelected, startDate, endDate]);

  // Filter settlements within date range
  const filteredSettlements = useMemo(() => {
    if (!isDateRangeSelected) return [];
    return settlementPayments.filter(settlement => {
      const settlementDate = new Date(settlement.settled_at);
      return settlementDate >= startDate! && settlementDate <= endDate!;
    });
  }, [settlementPayments, isDateRangeSelected, startDate, endDate]);

  // Combine and sort all activities
  const allActivities: ActivityItem[] = useMemo(() => [
    ...reportExpenses.map(expense => ({
      type: 'expense' as const,
      id: expense.id,
      date: expense.created_at || new Date().toISOString(),
      data: expense,
    })),
    ...filteredSettlements.map(settlement => ({
      type: 'settlement' as const,
      id: settlement.id,
      date: settlement.settled_at,
      data: settlement,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [reportExpenses, filteredSettlements]);

  // Create a category rank lookup map
  const categoryRankMap = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach(cat => {
      map[cat.name] = cat.rank ?? 999; // Default high rank for categories without rank
    });
    return map;
  }, [categories]);

  // Group activities by date and sort by category rank within each date
  const groupedActivities = useMemo(() => {
    const grouped = allActivities.reduce((acc, activity) => {
      const date = new Date(activity.date).toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!acc[date]) acc[date] = [];
      acc[date].push(activity);
      return acc;
    }, {} as Record<string, ActivityItem[]>);

    // Sort activities within each date by category rank
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        // Expenses come before settlements
        if (a.type === 'expense' && b.type === 'settlement') return -1;
        if (a.type === 'settlement' && b.type === 'expense') return 1;

        // If both are expenses, sort by category rank
        if (a.type === 'expense' && b.type === 'expense') {
          const rankA = categoryRankMap[a.data.category] ?? 999;
          const rankB = categoryRankMap[b.data.category] ?? 999;
          return rankA - rankB;
        }

        return 0; // Both are settlements, keep order
      });
    });

    return grouped;
  }, [allActivities, categoryRankMap]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalExpenseAmount = reportExpenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0);
    const totalSettlementAmount = filteredSettlements.reduce((sum, set) => sum + Number(set.amount_settled), 0);

    return {
      expenseCount: reportExpenses.length,
      totalExpenseAmount,
      settlementCount: filteredSettlements.length,
      totalSettlementAmount,
    };
  }, [reportExpenses, filteredSettlements]);

  // Helper function to format date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Helper to calculate expense payment details
  const getExpenseDetails = (expense: Expense) => {
    const totalOriginalBill = Number(expense.total_amount);
    const celebrationAmount = expense.celebration_contribution ? Number(expense.celebration_contribution.amount) : 0;
    const amountEffectivelySplit = Math.max(0, totalOriginalBill - celebrationAmount);
    return { totalOriginalBill, celebrationAmount, amountEffectivelySplit };
  };

  // Generate PDF HTML content
  const generatePDFContent = useCallback(() => {
    const reportDate = new Date().toLocaleDateString('default', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportName || 'SettleEase Expense Report'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1a1a2e;
      background: #fff;
      padding: 40px;
    }
    
    @page {
      margin: 0.4in;
      size: A4;
    }
    
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body {
        padding: 0 !important;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .page-break { 
        page-break-before: always; 
        padding-top: 50px;
      }
      .no-break { page-break-inside: avoid; }
      
      /* Force SVGs to render */
      svg {
        display: inline-block !important;
        visibility: visible !important;
        overflow: visible !important;
      }
      .logo-icon svg {
        stroke: white !important;
      }
      
      /* Force section headers to print with backgrounds */
      .section-header {
        background: #388E3C !important;
        background-color: #388E3C !important;
        color: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .section-header.teal {
        background: #00796b !important;
        background-color: #00796b !important;
      }
      .section-header svg {
        stroke: white !important;
      }
      .section-header h2 {
        color: white !important;
      }
      
      /* Force summary cards backgrounds */
      .summary-card {
        background: #f8fdf8 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .summary-card.accent {
        background: #e0f7fa !important;
      }
      
      /* Force logo icon background */
      .logo-icon {
        background: #388E3C !important;
        background-color: #388E3C !important;
      }
      
      /* Force settlement cards */
      .settlement-card {
        background: #e8f5e9 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Force celebration box */
      .celebration-box {
        background: #fff8e1 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Force date header */
      .activity-table .date-header {
        background: #e8f5e9 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #388E3C;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #388E3C, #008080);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: 700;
    }
    
    .logo-text h1 {
      font-size: 28px;
      font-weight: 700;
      color: #388E3C;
      letter-spacing: -0.5px;
    }
    
    .logo-text p {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }
    
    .report-meta {
      text-align: right;
      color: #666;
    }
    
    .report-meta p {
      margin-bottom: 4px;
    }
    
    .report-meta strong {
      color: #1a1a2e;
    }
    
    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    
    .summary-card {
      background: linear-gradient(135deg, #f8fdf8, #e8f5e9);
      border: 1px solid #c8e6c9;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    
    .summary-card.accent {
      background: linear-gradient(135deg, #e0f7fa, #b2ebf2);
      border-color: #80deea;
    }
    
    .summary-card .icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .summary-card .value {
      font-size: 22px;
      font-weight: 700;
      color: #388E3C;
      letter-spacing: -0.5px;
    }
    
    .summary-card.accent .value {
      color: #00796b;
    }
    
    .summary-card .label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    
    /* Section Headers */
    .section {
      margin-bottom: 32px;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #388E3C, #2e7d32);
      color: white;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    
    .section-header h2 {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.3px;
    }
    
    .section-header.teal {
      background: linear-gradient(135deg, #00796b, #00695c);
    }
    
    /* Activity Table */
    .activity-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    
    .activity-table th {
      background: #f5f5f5;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .activity-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    
    .activity-table tr:nth-child(even) {
      background: #fafafa;
    }
    
    .activity-table .date-header {
      background: #e8f5e9;
      font-weight: 600;
      color: #388E3C;
    }
    
    .activity-table .date-header td {
      padding: 8px 12px;
      border-bottom: none;
    }
    
    .activity-table .amount {
      font-weight: 600;
      color: #388E3C;
      text-align: right;
      font-family: 'Geist Mono', monospace;
    }
    
    .activity-table .settlement-amount {
      color: #00796b;
    }
    
    .activity-table .type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 500;
      text-transform: uppercase;
    }
    
    .type-badge.expense {
      background: #e3f2fd;
      color: #1565c0;
    }
    
    .type-badge.settlement {
      background: #e8f5e9;
      color: #2e7d32;
    }
    
    /* Expense Detail Cards */
    .expense-detail {
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 16px;
    }
    
    .expense-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .expense-detail-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
    }
    
    .expense-detail-meta {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }
    
    .expense-detail-amount {
      font-size: 20px;
      font-weight: 700;
      color: #388E3C;
      font-family: 'Geist Mono', monospace;
    }
    
    .expense-subsection {
      margin-bottom: 14px;
    }
    
    .expense-subsection-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .expense-subsection-title::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 12px;
      background: #388E3C;
      border-radius: 2px;
    }
    
    .data-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed #e0e0e0;
    }
    
    .data-row:last-child {
      border-bottom: none;
    }
    
    .data-label {
      color: #666;
    }
    
    .data-value {
      font-weight: 500;
      color: #1a1a2e;
    }
    
    .data-value.money {
      font-family: 'Geist Mono', monospace;
      color: #388E3C;
    }
    
    .celebration-box {
      background: linear-gradient(135deg, #fff8e1, #ffecb3);
      border: 1px solid #ffd54f;
      border-radius: 8px;
      padding: 12px;
      margin-top: 8px;
    }
    
    .celebration-box .title {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #f57c00;
      font-weight: 600;
      margin-bottom: 6px;
    }
    
    .split-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    
    .split-table th, .split-table td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .split-table th {
      background: #f5f5f5;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
    }
    
    .split-table .amount-col {
      text-align: right;
      font-family: 'Geist Mono', monospace;
    }
    
    .net-effect-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    
    .net-effect-item {
      background: #f5f5f5;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    
    .net-effect-item .name {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .net-effect-item .amount {
      font-family: 'Geist Mono', monospace;
      font-size: 13px;
    }
    
    .net-effect-item .amount.positive {
      color: #2e7d32;
    }
    
    .net-effect-item .amount.negative {
      color: #c62828;
    }
    
    /* Settlement Cards */
    .settlement-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
      border: 1px solid #a5d6a7;
      border-left: 4px solid #388E3C;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 10px;
    }
    
    .settlement-parties {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .settlement-arrow {
      color: #388E3C;
      font-size: 18px;
    }
    
    .settlement-name {
      font-weight: 600;
      color: #1a1a2e;
    }
    
    .settlement-amount {
      font-size: 18px;
      font-weight: 700;
      color: #388E3C;
      font-family: 'Geist Mono', monospace;
    }
    
    .settlement-meta {
      font-size: 10px;
      color: #666;
      margin-top: 4px;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #999;
      font-size: 10px;
    }
    
    .footer p {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo-section">
      <div class="logo-icon"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/></svg></div>
      <div class="logo-text">
        <h1>${reportName || 'SettleEase'}</h1>
        <p>${reportName ? 'Expense Report' : 'Expense Management Report'}</p>
      </div>
    </div>
    <div class="report-meta">
      <p><strong>Generated:</strong> ${reportDate}</p>
      ${startDate && endDate ? `
        <p><strong>Period:</strong> ${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())}</p>
      ` : ''}
      <p><strong>Total Participants:</strong> ${people.length}</p>
    </div>
  </div>

  <!-- Summary Statistics -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg></div>
      <div class="value">${stats.expenseCount}</div>
      <div class="label">Total Expenses</div>
    </div>
    <div class="summary-card">
      <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg></div>
      <div class="value">${formatCurrency(stats.totalExpenseAmount)}</div>
      <div class="label">Total Amount</div>
    </div>
    <div class="summary-card accent">
      <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg></div>
      <div class="value">${stats.settlementCount}</div>
      <div class="label">Settlements</div>
    </div>
    <div class="summary-card accent">
      <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
      <div class="value">${formatCurrency(stats.totalSettlementAmount)}</div>
      <div class="label">Amount Settled</div>
    </div>
  </div>

  <!-- Activity Feed -->
  <div class="section">
    <div class="section-header">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
      <h2>Activity Feed</h2>
    </div>
    <table class="activity-table">
      <thead>
        <tr>
          <th style="width: 80px;">Type</th>
          <th>Description</th>
          <th style="width: 100px;">Category</th>
          <th style="width: 120px;">Paid By / From</th>
          <th style="width: 100px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(groupedActivities).map(([date, activities]) => `
          <tr class="date-header">
            <td colspan="5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>${date}</td>
          </tr>
          ${activities.map(activity => {
      if (activity.type === 'expense') {
        const paidByText = activity.data.paid_by.length > 1
          ? 'Multiple'
          : (peopleMap[activity.data.paid_by[0]?.personId] || 'Unknown');
        return `
                <tr>
                  <td><span class="type-badge expense">Expense</span></td>
                  <td>${activity.data.description}</td>
                  <td>${activity.data.category}</td>
                  <td>${paidByText}</td>
                  <td class="amount">${formatCurrency(activity.data.total_amount)}</td>
                </tr>
              `;
      } else {
        const debtor = peopleMap[activity.data.debtor_id] || 'Unknown';
        const creditor = peopleMap[activity.data.creditor_id] || 'Unknown';
        return `
                <tr>
                  <td><span class="type-badge settlement">Settlement</span></td>
                  <td>Payment from ${debtor} to ${creditor}</td>
                  <td>—</td>
                  <td>${debtor}</td>
                  <td class="amount settlement-amount">${formatCurrency(activity.data.amount_settled)}</td>
                </tr>
              `;
      }
    }).join('')}
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- Detailed Expense Breakdown -->
  <div class="section">
    <div class="section-header">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
      <h2>Detailed Expense Breakdown</h2>
    </div>
    
    
    ${[...reportExpenses].sort((a, b) => {
      // Sort by category rank
      const rankA = categoryRankMap[a.category] ?? 999;
      const rankB = categoryRankMap[b.category] ?? 999;
      return rankA - rankB;
    }).map((expense, idx) => {
      const { totalOriginalBill, celebrationAmount, amountEffectivelySplit } = getExpenseDetails(expense);
      const sortedPaidBy = [...expense.paid_by].sort((a, b) =>
        (peopleMap[a.personId] || '').localeCompare(peopleMap[b.personId] || '')
      );
      const sortedShares = [...expense.shares].sort((a, b) =>
        (peopleMap[a.personId] || '').localeCompare(peopleMap[b.personId] || '')
      );

      // Calculate net effect for each person
      const netEffects: Record<string, number> = {};
      expense.paid_by.forEach(p => {
        netEffects[p.personId] = (netEffects[p.personId] || 0) + Number(p.amount);
      });
      expense.shares.forEach(s => {
        netEffects[s.personId] = (netEffects[s.personId] || 0) - Number(s.amount);
      });
      if (expense.celebration_contribution) {
        netEffects[expense.celebration_contribution.personId] = (netEffects[expense.celebration_contribution.personId] || 0) - celebrationAmount;
      }
      const sortedNetEffects = Object.entries(netEffects).sort((a, b) =>
        (peopleMap[a[0]] || '').localeCompare(peopleMap[b[0]] || '')
      );

      return `
        <div class="expense-detail no-break" ${idx > 0 && idx % 3 === 0 ? 'style="page-break-before: always;"' : ''}>
          <div class="expense-detail-header">
            <div>
              <div class="expense-detail-title">${expense.description}</div>
              <div class="expense-detail-meta">
                ${expense.category} • ${formatDate(expense.created_at)} • ${expense.split_method.charAt(0).toUpperCase() + expense.split_method.slice(1)} Split
              </div>
            </div>
            <div class="expense-detail-amount">${formatCurrency(totalOriginalBill)}</div>
          </div>
          
          <div class="expense-subsection">
            <div class="expense-subsection-title">Payment Details</div>
            ${sortedPaidBy.map(p => `
              <div class="data-row">
                <span class="data-label">${peopleMap[p.personId] || 'Unknown'}</span>
                <span class="data-value money">${formatCurrency(p.amount)}</span>
              </div>
            `).join('')}
            ${expense.celebration_contribution ? `
              <div class="celebration-box">
                <div class="title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg>Celebration Contribution</div>
                <div class="data-row">
                  <span class="data-label">${peopleMap[expense.celebration_contribution.personId]} contributed</span>
                  <span class="data-value money">${formatCurrency(expense.celebration_contribution.amount)}</span>
                </div>
              </div>
            ` : ''}
            <div class="data-row" style="margin-top: 8px; border-top: 1px solid #ccc; padding-top: 8px;">
              <span class="data-label" style="font-weight: 600;">Net Amount Split</span>
              <span class="data-value money" style="font-weight: 700;">${formatCurrency(amountEffectivelySplit)}</span>
            </div>
          </div>
          
          <div class="expense-subsection">
            <div class="expense-subsection-title">Split Details (${expense.split_method})</div>
            ${expense.split_method === 'itemwise' && expense.items ? `
              <table class="split-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Shared By</th>
                    <th class="amount-col">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${expense.items.map((item: ExpenseItemDetail) => `
                    <tr>
                      <td>${item.name}</td>
                      <td>${item.categoryName || '—'}</td>
                      <td>${item.sharedBy.map(id => peopleMap[id] || 'Unknown').join(', ')}</td>
                      <td class="amount-col">${formatCurrency(Number(item.price))}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <table class="split-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th class="amount-col">Share Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedShares.map(s => `
                    <tr>
                      <td>${peopleMap[s.personId] || 'Unknown'}</td>
                      <td class="amount-col">${formatCurrency(s.amount)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
          
          <div class="expense-subsection">
            <div class="expense-subsection-title">Net Effect</div>
            <div class="net-effect-grid">
              ${sortedNetEffects.map(([personId, amount]) => `
                <div class="net-effect-item">
                  <div class="name">${peopleMap[personId] || 'Unknown'}</div>
                  <div class="amount ${amount >= 0 ? 'positive' : 'negative'}">
                    ${amount >= 0 ? '+' : ''}${formatCurrency(amount)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('')}
  </div>

  ${filteredSettlements.length > 0 ? `
    <div class="page-break"></div>
    
    <!-- Settlement Payments -->
    <div class="section">
      <div class="section-header teal">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>
        <h2>Settlement Payments</h2>
      </div>
      
      ${filteredSettlements.map(settlement => `
        <div class="settlement-card no-break">
          <div>
            <div class="settlement-parties">
              <span class="settlement-name">${peopleMap[settlement.debtor_id] || 'Unknown'}</span>
              <span class="settlement-arrow">→</span>
              <span class="settlement-name">${peopleMap[settlement.creditor_id] || 'Unknown'}</span>
            </div>
            <div class="settlement-meta">
              ${formatDate(settlement.settled_at)}${settlement.notes ? ` • ${settlement.notes}` : ''}
            </div>
          </div>
          <div class="settlement-amount">${formatCurrency(settlement.amount_settled)}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <p>Generated by SettleEase • Expense Management Made Simple</p>
    <p>Report contains ${stats.expenseCount} expenses and ${stats.settlementCount} settlement payments</p>
  </div>
</body>
</html>
    `;
  }, [groupedActivities, reportExpenses, settlementPayments, stats, peopleMap, people, formatDate, reportName, startDate, endDate]);

  // Handle print/download
  const handleDownloadPDF = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      // Set the document title for the PDF filename
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      if (iframeDoc) {
        iframeDoc.title = reportName || 'SettleEase Expense Report';
      }
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  }, [reportName]);

  // Update iframe content when data changes
  const pdfContent = useMemo(() => generatePDFContent(), [generatePDFContent]);

  return (
    <Card className="shadow-xl rounded-lg">
      {/* Header */}
      <CardHeader className="p-4 sm:p-6 pb-4 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex-1">
            <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
              <FileDown className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Export Report
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Select a date range to generate a detailed PDF report of expenses and settlements
            </CardDescription>
          </div>
          {isDateRangeSelected && (
            <Button
              onClick={handleDownloadPDF}
              size="sm"
              className="w-full sm:w-auto gap-2"
            >
              <Printer className="h-4 w-4" />
              Download PDF
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Date Range Selection */}
        <div className="px-4 sm:px-6 py-4 border-b bg-muted/20">
          <div className="mb-3">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Select Date Range
            </p>

            {/* Preset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DATE_PRESETS.map((preset) => {
                const IconComponent = preset.icon;
                return (
                  <Button
                    key={preset.id}
                    variant={selectedPreset === preset.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={cn(
                      "h-auto py-2 px-3 flex flex-col items-center gap-1 text-xs",
                      selectedPreset === preset.id && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="font-medium">{preset.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Custom Date Range Pickers - Always visible */}
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-muted-foreground w-12">From:</span>
                <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 sm:w-[140px] justify-start text-left font-normal text-xs",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <FixedCalendar
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        setSelectedPreset('custom');
                        setStartCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <ChevronRight className="hidden sm:block h-4 w-4 text-muted-foreground" />

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-muted-foreground w-12">To:</span>
                <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 sm:w-[140px] justify-start text-left font-normal text-xs",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <FixedCalendar
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        setSelectedPreset('custom');
                        setEndCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Report Name Input (shown when date range selected) */}
            {isDateRangeSelected && (
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Report Name:</span>
                <Input
                  type="text"
                  placeholder="e.g., Goa Trip Expenses (optional)"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="flex-1 h-8 text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {isDateRangeSelected ? (
          <div>
            {/* Stats Grid */}
            <div className="px-4 sm:px-6 py-3 border-b bg-card/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-card/70 border rounded-lg p-2 sm:p-3 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-primary">{stats.expenseCount}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Expenses</div>
                </div>
                <div className="bg-card/70 border rounded-lg p-2 sm:p-3 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-primary truncate">{formatCurrency(stats.totalExpenseAmount)}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Total Amount</div>
                </div>
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-2 sm:p-3 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-accent">{stats.settlementCount}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Settlements</div>
                </div>
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-2 sm:p-3 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-accent truncate">{formatCurrency(stats.totalSettlementAmount)}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Settled</div>
                </div>
              </div>
            </div>

            {/* PDF Preview */}
            <div className="px-4 sm:px-6 py-2 border-b bg-muted/30">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                PDF Preview
              </p>
            </div>
            <div>
              <iframe
                ref={iframeRef}
                srcDoc={pdfContent}
                className="w-full border-0"
                style={{ height: '800px' }}
                title="PDF Preview"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Select a Date Range</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Choose a preset option above or select custom dates to generate your expense report.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
