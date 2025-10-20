# Analytics Design Verification Checklist

Use this checklist to verify all design fixes are working correctly in the browser.

---

## 🎯 Quick Visual Check

### All Components Should Have:
- [ ] Consistent card shadows and rounded corners
- [ ] Consistent header padding and icon sizes
- [ ] No empty whitespace below titles
- [ ] Proper spacing between elements

---

## 📊 Chart Components (11 total)

### MonthlySpendingChart
- [ ] Chart margins look consistent
- [ ] Toggle button (calendar icon) works
- [ ] Axis labels are readable (fontSize 9)
- [ ] Tooltip displays correctly
- [ ] Bar size is 20px

### ShareVsPaidComparisonChart
- [ ] Chart margins look consistent
- [ ] Bar size is 20px
- [ ] Two bars per person visible
- [ ] Colors use chart-1 and chart-2

### SpendingByDayChart
- [ ] Chart margins look consistent
- [ ] Bar size is 20px
- [ ] All 7 days visible
- [ ] Axis labels readable

### SplitMethodChart (Pie)
- [ ] Zero margins (pie chart)
- [ ] Labels show percentages
- [ ] Legend displays correctly
- [ ] Colors from CHART_COLORS

### CategorySpendingPieChart
- [ ] Zero margins (pie chart)
- [ ] Labels show percentages
- [ ] Legend displays correctly
- [ ] Top 5 categories shown

### ExpenseDistributionChart
- [ ] Compact margins used
- [ ] Horizontal bars visible
- [ ] Bar size is 15px (compact)
- [ ] Small axis labels (fontSize 8)

### MonthlyCategoryTrendsChart
- [ ] Standard margins
- [ ] No empty subtitle space
- [ ] Area chart stacked correctly
- [ ] Top 5 categories shown

### ExpenseFrequencyTimeline
- [ ] Standard margins
- [ ] No empty subtitle space
- [ ] Line chart displays correctly
- [ ] Last 30 days shown

### ExpenseSizeDistribution
- [ ] Standard margins
- [ ] No empty subtitle space
- [ ] Rotated axis labels readable
- [ ] Small axis labels (fontSize 8)

### AverageExpenseByCategory
- [ ] Compact margins
- [ ] No empty subtitle space
- [ ] Horizontal bars
- [ ] Small axis labels (fontSize 8)

### ExpenseVelocity
- [ ] Standard margins
- [ ] No empty subtitle space
- [ ] Two lines (velocity + average)
- [ ] Last 12 weeks shown

### DebtCreditBalanceOverTime
- [ ] Standard margins
- [ ] No empty subtitle space
- [ ] Icon changes based on balance (up/down)
- [ ] Green for positive, red for negative
- [ ] Zero line visible

---

## 📋 Table Components (3 total)

### TopExpensesTable
- [ ] Consistent cell padding (py-1.5 px-2)
- [ ] Description truncated at 120px (mobile) / 200px (tablet+)
- [ ] Category truncated at 100px with title tooltip
- [ ] Paid By truncated at 150px with title tooltip
- [ ] Date hidden on mobile, visible on tablet+
- [ ] Paid By hidden on mobile, visible on tablet+

### CategoryAnalyticsTable
- [ ] Consistent cell padding
- [ ] Category name truncated at 120px with icon
- [ ] Icon doesn't squish (flex-shrink-0)
- [ ] Largest Item truncated at 200px (desktop only)
- [ ] Top Payer truncated at 150px (desktop only)
- [ ] Expense count hidden on mobile

### ParticipantSummaryTable
- [ ] Consistent cell padding
- [ ] Name truncated at 120px with title tooltip
- [ ] Net balance shows green (positive) or red (negative)
- [ ] Net balance hidden on mobile
- [ ] Counts hidden on mobile
- [ ] Average hidden on tablet
- [ ] Top Category hidden on tablet

---

## 📸 Special Components (3 total)

### OverallAnalyticsSnapshot
- [ ] Grid spacing is consistent (gap-3)
- [ ] Cards use snapshotCard styling
- [ ] 2 columns on mobile, 3 on desktop
- [ ] All stats visible and formatted
- [ ] Date range spans full width

### TransactionHeatmapCalendar
- [ ] Stats cards match snapshot styling (bg-card/50)
- [ ] Three stats at top (Expenses, Total, Active Days)
- [ ] Calendar cells are 8x8 (consistent size)
- [ ] Gap spacing is uniform (gap-1)
- [ ] Navigation buttons are 7x7
- [ ] Month/year centered
- [ ] Heatmap colors show intensity
- [ ] Tooltips appear on hover
- [ ] Legend shows gradient

---

## 📱 Responsive Testing

### Mobile (320px - 767px)
- [ ] All charts fit within viewport
- [ ] Table columns hide appropriately
- [ ] Calendar is usable
- [ ] Snapshot cards stack properly
- [ ] No horizontal scroll

### Tablet (768px - 1023px)
- [ ] Charts use larger heights
- [ ] More table columns visible
- [ ] Snapshot shows 3 columns
- [ ] Spacing increases appropriately

### Desktop (1024px+)
- [ ] All columns visible in tables
- [ ] Charts at full size
- [ ] Optimal spacing throughout
- [ ] Two-column grid layouts work

---

## 🎨 Design System Verification

### Colors
- [ ] Positive balances: Green (hsl(142, 76%, 36%))
- [ ] Negative balances: Red (hsl(0, 84%, 60%))
- [ ] Primary color used for main data
- [ ] Chart colors use CSS variables (--chart-1, --chart-2, etc.)

### Typography
- [ ] Headers: text-xl sm:text-2xl
- [ ] Table text: text-xs
- [ ] Snapshot labels: text-xs
- [ ] Snapshot values: text-md sm:text-lg
- [ ] Axis labels: fontSize 9 or 8

### Spacing
- [ ] Card padding: px-4 py-3 (header)
- [ ] Content padding: p-4 pt-0
- [ ] Table cell padding: py-1.5 px-2
- [ ] Snapshot card padding: p-2.5 sm:p-3
- [ ] Grid gaps: gap-3 (standard)

### Borders & Shadows
- [ ] Cards: shadow-lg rounded-lg
- [ ] Snapshot cards: shadow-sm rounded-md
- [ ] Borders use border-border/40

---

## 🧪 Interaction Testing

### Charts
- [ ] Hover shows tooltips
- [ ] Tooltips display correct values
- [ ] Tooltips use popover styling
- [ ] Legends are clickable (if applicable)
- [ ] Toggle buttons work (MonthlySpendingChart)

### Tables
- [ ] Hover shows full text in title attribute
- [ ] Truncated cells have tooltips
- [ ] Scrolling works smoothly
- [ ] No layout shift on hover

### Calendar
- [ ] Click on dates (if interactive)
- [ ] Navigation buttons work
- [ ] Tooltips show transaction details
- [ ] Heatmap colors are distinguishable

---

## 🐛 Edge Cases

### Empty States
- [ ] No data message displays correctly
- [ ] Icon and text centered
- [ ] Consistent styling across all components

### Single Data Point
- [ ] Charts render without errors
- [ ] Tables show single row correctly
- [ ] No division by zero errors

### Large Data Sets
- [ ] Charts don't overflow
- [ ] Tables scroll properly
- [ ] Performance is acceptable
- [ ] Labels don't overlap

### Long Text
- [ ] Names truncate properly
- [ ] Tooltips show full text
- [ ] No layout breaking
- [ ] Icons stay aligned

---

## ✅ Final Verification

- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No layout shifts
- [ ] Smooth animations
- [ ] Consistent loading states
- [ ] All tooltips work
- [ ] All responsive breakpoints work
- [ ] Dark mode works (if applicable)

---

## 📝 Notes

Use this space to document any issues found during verification:

```
Issue: 
Location: 
Severity: 
Status: 

Issue: 
Location: 
Severity: 
Status: 
```

---

## 🎉 Sign-off

- [ ] All visual checks passed
- [ ] All responsive tests passed
- [ ] All interaction tests passed
- [ ] All edge cases handled
- [ ] Ready for production

**Verified by:** _______________
**Date:** _______________
**Browser(s):** _______________
