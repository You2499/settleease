'use client';

import { Expense, Person, SettlementPayment } from '@/lib/settleease/types';

interface GeneratePersonalReportPDFParams {
  selectedPersonId: string;
  people: Person[];
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  formatDate: (date: string | Date | null | undefined) => string;
  formatCurrency: (amount: number) => string;
  reportName: string;
}

/**
 * Generates a personal expense report PDF for a specific person.
 * Design matches the Summary Report styling.
 */
export function generatePersonalReportPDF({
  selectedPersonId,
  people,
  expenses,
  settlementPayments,
  formatDate,
  formatCurrency,
  reportName,
}: GeneratePersonalReportPDFParams): string {
  if (!selectedPersonId) return '';

  const selectedPerson = people.find(p => p.id === selectedPersonId);
  if (!selectedPerson) return '';

  const personName = selectedPerson.name;

  // Filter all expenses this person participated in
  const allNonExcludedExpenses = expenses.filter(e => !e.exclude_from_settlement);
  const personExpenses = allNonExcludedExpenses.filter(expense => {
    const didPay = expense.paid_by?.some(p => p.personId === selectedPersonId && Number(p.amount) > 0);
    const hasShare = expense.shares?.some(s => s.personId === selectedPersonId && Number(s.amount) > 0);
    const hasCelebration = expense.celebration_contribution?.personId === selectedPersonId;
    return didPay || hasShare || hasCelebration;
  }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const reportDate = new Date().toLocaleDateString('default', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Calculate totals
  let totalPaid = 0;
  let totalShare = 0;
  let totalOwedToMe = 0;
  let totalIOwe = 0;
  const runningBalances: Record<string, number> = {};
  people.forEach(p => { if (p.id !== selectedPersonId) runningBalances[p.id] = 0; });

  // Generate expense cards HTML
  const expenseCards = personExpenses.map((expense) => {
    const myPaidAmount = expense.paid_by?.find(p => p.personId === selectedPersonId)?.amount || 0;
    const myShare = expense.shares?.find(s => s.personId === selectedPersonId)?.amount || 0;
    const myCelebration = expense.celebration_contribution?.personId === selectedPersonId
      ? expense.celebration_contribution.amount : 0;
    const myTotalShare = Number(myShare) + Number(myCelebration);

    totalPaid += Number(myPaidAmount);
    totalShare += myTotalShare;

    // Calculate net effect with each other person
    const netEffects: { personId: string; name: string; amount: number; direction: 'owes_me' | 'i_owe' }[] = [];
    const expenseTotal = Number(expense.total_amount) || 1; // Avoid division by zero

    people.forEach(otherPerson => {
      if (otherPerson.id === selectedPersonId) return;
      const otherPaidAmount = Number(expense.paid_by?.find(p => p.personId === otherPerson.id)?.amount || 0);
      const otherShare = expense.shares?.find(s => s.personId === otherPerson.id)?.amount || 0;
      const otherCelebration = expense.celebration_contribution?.personId === otherPerson.id
        ? expense.celebration_contribution.amount : 0;
      const otherTotalShare = Number(otherShare) + Number(otherCelebration);

      let netEffect = 0;

      // I owe Other: My share * (Other's contribution to pot)
      if (otherPaidAmount > 0 && myTotalShare > 0) {
        const pctFundedByOther = otherPaidAmount / expenseTotal;
        netEffect -= (myTotalShare * pctFundedByOther);
      }

      // Other owes Me: Other's share * (My contribution to pot)
      if (Number(myPaidAmount) > 0 && otherTotalShare > 0) {
        const pctFundedByMe = Number(myPaidAmount) / expenseTotal;
        netEffect += (otherTotalShare * pctFundedByMe);
      }

      if (Math.abs(netEffect) > 0.01) {
        runningBalances[otherPerson.id] = (runningBalances[otherPerson.id] || 0) + netEffect;
        if (netEffect > 0) {
          totalOwedToMe += netEffect;
          netEffects.push({ personId: otherPerson.id, name: otherPerson.name, amount: netEffect, direction: 'owes_me' });
        } else {
          totalIOwe += Math.abs(netEffect);
          netEffects.push({ personId: otherPerson.id, name: otherPerson.name, amount: Math.abs(netEffect), direction: 'i_owe' });
        }
      }
    });

    // Paid by rows
    const paidByRows = expense.paid_by?.filter(p => Number(p.amount) > 0).map(p => {
      const payer = people.find(person => person.id === p.personId);
      const isMe = p.personId === selectedPersonId;
      return `<tr${isMe ? ' class="highlight-you"' : ''}>
        <td>${payer?.name || 'Unknown'}${isMe ? ' <span class="you-badge">(You)</span>' : ''}</td>
        <td class="amount-col">${formatCurrency(Number(p.amount))}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="2" class="no-data">No payers</td></tr>';

    // Split breakdown rows
    const splitRows = expense.shares?.filter(s => Number(s.amount) > 0).map(s => {
      const person = people.find(p => p.id === s.personId);
      const isMe = s.personId === selectedPersonId;
      return `<tr${isMe ? ' class="highlight-you"' : ''}>
        <td>${person?.name || 'Unknown'}${isMe ? ' <span class="you-badge">(You)</span>' : ''}</td>
        <td class="amount-col">${formatCurrency(Number(s.amount))}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="2" class="no-data">No shares</td></tr>';

    // Net effect items
    const netEffectItems = netEffects.length > 0 ? netEffects.map(e => `
      <div class="net-effect-item">
        <div class="name">${e.name}</div>
        <div class="amount ${e.direction === 'owes_me' ? 'positive' : 'negative'}">
          ${e.direction === 'owes_me' ? '+' : '-'}${formatCurrency(e.amount)}
        </div>
        <div class="label">${e.direction === 'owes_me' ? 'Owes you' : 'You owe'}</div>
      </div>
    `).join('') : '<div class="no-effect">No balance change</div>';

    return `
    <div class="expense-detail no-break">
      <div class="expense-detail-header">
        <div>
          <div class="expense-detail-title">${expense.description}</div>
          <div class="expense-detail-meta">${expense.category} • ${formatDate(expense.created_at)}</div>
        </div>
        <div class="expense-detail-amount">${formatCurrency(Number(expense.total_amount))}</div>
      </div>
      
      <div class="expense-columns">
        <div class="expense-subsection">
          <div class="expense-subsection-title">Who Paid</div>
          <table class="split-table">
            <thead><tr><th>Person</th><th class="amount-col">Amount</th></tr></thead>
            <tbody>${paidByRows}</tbody>
          </table>
        </div>
        
        <div class="expense-subsection">
          <div class="expense-subsection-title">Split Breakdown</div>
          <table class="split-table">
            <thead><tr><th>Person</th><th class="amount-col">Share</th></tr></thead>
            <tbody>${splitRows}</tbody>
          </table>
        </div>
      </div>
      
      <div class="expense-subsection">
        <div class="expense-subsection-title">Your Net Effect</div>
        <div class="your-summary">
          <div class="your-summary-item">
            <span class="label">You Paid:</span>
            <span class="value money ${Number(myPaidAmount) > 0 ? 'positive' : ''}">${formatCurrency(Number(myPaidAmount))}</span>
          </div>
          <div class="your-summary-item">
            <span class="label">Your Share:</span>
            <span class="value money negative">${formatCurrency(myTotalShare)}</span>
          </div>
        </div>
        <div class="net-effect-grid">${netEffectItems}</div>
      </div>
    </div>`;
  }).join('');

  // Get settlements
  const personSettlements = settlementPayments.filter(s =>
    s.debtor_id === selectedPersonId || s.creditor_id === selectedPersonId
  );

  const settlementCards = personSettlements.length > 0 ? personSettlements.map(s => {
    const debtor = people.find(p => p.id === s.debtor_id);
    const creditor = people.find(p => p.id === s.creditor_id);
    const isPayer = s.debtor_id === selectedPersonId;
    return `
    <div class="settlement-card ${isPayer ? 'outgoing' : 'incoming'}">
      <div class="settlement-parties">
        <span class="settlement-name">${isPayer ? 'You' : debtor?.name}</span>
        <span class="settlement-arrow">→</span>
        <span class="settlement-name">${isPayer ? creditor?.name : 'You'}</span>
      </div>
      <div>
        <div class="settlement-amount ${isPayer ? 'negative' : 'positive'}">${isPayer ? '-' : '+'}${formatCurrency(Number(s.amount_settled))}</div>
        <div class="settlement-meta">${formatDate(s.settled_at)}</div>
      </div>
    </div>`;
  }).join('') : '<div class="no-data-box">No settlement payments recorded</div>';

  // Final balances with CORRECTED logic
  const finalBalances = Object.entries(runningBalances)
    .filter(([, amount]) => Math.abs(amount) > 0.01)
    .map(([personId, amount]) => {
      const person = people.find(p => p.id === personId);
      const settlementsWithPerson = settlementPayments.filter(s =>
        (s.debtor_id === selectedPersonId && s.creditor_id === personId) ||
        (s.debtor_id === personId && s.creditor_id === selectedPersonId)
      );

      let settledAmount = 0;
      settlementsWithPerson.forEach(s => {
        // If I paid, it's a positive contribution to the balance (reduces what I owe / increases what I'm owed)
        if (s.debtor_id === selectedPersonId) settledAmount += Number(s.amount_settled);
        // If I received, it's a negative contribution (reduces what they owe me / increases what I owe)
        else settledAmount -= Number(s.amount_settled);
      });

      return { personId, name: person?.name || 'Unknown', amount: amount + settledAmount };
    })
    .filter(b => Math.abs(b.amount) > 0.01);

  const finalBalanceCards = finalBalances.length > 0 ? finalBalances.map(b => `
    <div class="balance-card ${b.amount > 0 ? 'positive' : 'negative'}">
      <div class="balance-name">${b.name}</div>
      <div class="balance-amount">${b.amount > 0 ? '+' : ''}${formatCurrency(b.amount)}</div>
      <div class="balance-label">${b.amount > 0 ? 'Owes you' : 'You owe'}</div>
    </div>
  `).join('') : '<div class="all-settled">✓ All balances are settled!</div>';

  // Net position = sum of all final balances
  const netPosition = finalBalances.reduce((sum, b) => sum + b.amount, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${reportName || `${personName}'s Personal Report`}</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; line-height: 1.5; color: #1a1a2e; background: #fff; padding: 40px; }
@page { margin: 0.4in; size: A4; }
@media print {
  html, body { margin: 0!important; padding: 0!important; -webkit-print-color-adjust: exact!important; print-color-adjust: exact!important; }
  body { padding: 0!important; }
  .no-break { page-break-inside: avoid; }
  .section-header { background: #388E3C!important; color: white!important; }
  .section-header.teal { background: #00796b!important; }
  .summary-card { background: #f8fdf8!important; }
  .summary-card.accent { background: #e0f7fa!important; }
  .settlement-card { background: #e8f5e9!important; }
  .logo-icon { background: #388E3C!important; }
}
/* Header */
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #388E3C; padding-bottom: 20px; margin-bottom: 30px; }
.logo-section { display: flex; align-items: center; gap: 12px; }
.logo-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #388E3C, #008080); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }
.logo-text h1 { font-size: 28px; font-weight: 700; color: #388E3C; letter-spacing: -0.5px; }
.logo-text p { font-size: 12px; color: #666; margin-top: 2px; }
.report-meta { text-align: right; color: #666; }
.report-meta p { margin-bottom: 4px; }
.report-meta strong { color: #1a1a2e; }
/* Summary Cards */
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
.summary-card { background: linear-gradient(135deg, #f8fdf8, #e8f5e9); border: 1px solid #c8e6c9; border-radius: 12px; padding: 16px; text-align: center; }
.summary-card.accent { background: linear-gradient(135deg, #e0f7fa, #b2ebf2); border-color: #80deea; }
.summary-card .icon { margin-bottom: 8px; color: #388E3C; }
.summary-card.accent .icon { color: #00796b; }
.summary-card .value { font-size: 22px; font-weight: 700; color: #388E3C; letter-spacing: -0.5px; font-family: 'Geist Mono', monospace; }
.summary-card.accent .value { color: #00796b; }
.summary-card .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
/* Section Headers */
.section { margin-bottom: 32px; }
.section-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: linear-gradient(135deg, #388E3C, #2e7d32); color: white; border-radius: 8px; margin-bottom: 16px; }
.section-header h2 { font-size: 16px; font-weight: 600; letter-spacing: -0.3px; }
.section-header.teal { background: linear-gradient(135deg, #00796b, #00695c); }
.section-header.purple { background: linear-gradient(135deg, #7c3aed, #6d28d9); }
/* Expense Detail Cards */
.expense-detail { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
.expense-detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e0e0e0; }
.expense-detail-title { font-size: 16px; font-weight: 600; color: #1a1a2e; }
.expense-detail-meta { font-size: 11px; color: #666; margin-top: 4px; }
.expense-detail-amount { font-size: 20px; font-weight: 700; color: #388E3C; font-family: 'Geist Mono', monospace; }
.expense-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
.expense-subsection { margin-bottom: 14px; }
.expense-subsection-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #666; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.expense-subsection-title::before { content: ''; display: inline-block; width: 3px; height: 12px; background: #388E3C; border-radius: 2px; }
.split-table { width: 100%; border-collapse: collapse; }
.split-table th, .split-table td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e0e0e0; }
.split-table th { background: #f5f5f5; font-weight: 600; font-size: 10px; text-transform: uppercase; color: #666; }
.split-table .amount-col { text-align: right; font-family: 'Geist Mono', monospace; }
.split-table .highlight-you { background: #e8f5e9; }
.you-badge { font-size: 9px; color: #388E3C; font-weight: 600; }
.no-data { color: #999; font-style: italic; text-align: center; }
.your-summary { display: flex; gap: 24px; margin-bottom: 12px; }
.your-summary-item { display: flex; flex-direction: column; }
.your-summary-item .label { font-size: 10px; color: #666; margin-bottom: 2px; }
.your-summary-item .value { font-size: 14px; font-weight: 600; font-family: 'Geist Mono', monospace; }
.your-summary-item .value.positive { color: #388E3C; }
.your-summary-item .value.negative { color: #d32f2f; }
.net-effect-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.net-effect-item { display: flex; flex-direction: column; padding: 8px 12px; background: white; border: 1px solid #e0e0e0; border-radius: 6px; min-width: 100px; }
.net-effect-item .name { font-size: 11px; font-weight: 600; margin-bottom: 2px; }
.net-effect-item .amount { font-size: 13px; font-weight: 700; font-family: 'Geist Mono', monospace; }
.net-effect-item .amount.positive { color: #388E3C; }
.net-effect-item .amount.negative { color: #d32f2f; }
.net-effect-item .label { font-size: 9px; color: #888; margin-top: 1px; }
.no-effect { font-size: 11px; color: #999; font-style: italic; }
/* Settlement Cards */
.settlement-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-radius: 8px; border: 1px solid #c8e6c9; margin-bottom: 10px; background: #f1f8e9; }
.settlement-card.outgoing { border-color: #ffcdd2; background: #ffebee; }
.settlement-card.incoming { border-color: #c8e6c9; background: #e8f5e9; }
.settlement-parties { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 12px; }
.settlement-arrow { color: #888; font-size: 14px; }
.settlement-amount { font-size: 15px; font-weight: 700; font-family: 'Geist Mono', monospace; text-align: right; }
.settlement-amount.positive { color: #388E3C; }
.settlement-amount.negative { color: #d32f2f; }
.settlement-meta { font-size: 10px; color: #666; text-align: right; margin-top: 2px; }
/* Balance Grid */
.balance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.balance-card { padding: 16px; border-radius: 10px; text-align: center; border: 1px solid #e0e0e0; background: white; }
.balance-card.positive { border-color: #c8e6c9; background: #f1f8e9; }
.balance-card.negative { border-color: #ffcdd2; background: #ffebee; }
.balance-name { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
.balance-amount { font-size: 18px; font-weight: 700; font-family: 'Geist Mono', monospace; margin-bottom: 4px; }
.balance-card.positive .balance-amount { color: #388E3C; }
.balance-card.negative .balance-amount { color: #d32f2f; }
.balance-label { font-size: 10px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
.all-settled { grid-column: 1 / -1; padding: 30px; text-align: center; background: #f5f5f5; border-radius: 8px; color: #666; font-style: italic; }
.footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 10px; }
.no-data-box { padding: 30px; text-align: center; background: #fafafa; border: 1px dashed #ddd; border-radius: 8px; color: #888; font-style: italic; }
</style>
</head>
<body>
<!-- Header -->
<div class="header">
  <div class="logo-section">
    <div class="logo-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
    </div>
    <div class="logo-text">
      <h1>${personName}</h1>
      <p>${reportName || 'Personal Expense Report'}</p>
    </div>
  </div>
  <div class="report-meta">
    <p><strong>Generated: </strong>${reportDate}</p>
    <p><strong>Total Expenses: </strong>${personExpenses.length}</p>
    <p><strong>Total Participants: </strong>${people.length}</p>
  </div>
</div>

<!-- Summary Statistics -->
<div class="summary-grid">
  <div class="summary-card">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
    <div class="value">${personExpenses.length}</div>
    <div class="label">Expenses</div>
  </div>
  <div class="summary-card">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg></div>
    <div class="value">${formatCurrency(totalPaid)}</div>
    <div class="label">Total Paid</div>
  </div>
  <div class="summary-card">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg></div>
    <div class="value">${formatCurrency(totalShare)}</div>
    <div class="label">Your Share</div>
  </div>
  <div class="summary-card accent">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
    <div class="value">${netPosition >= 0 ? '+' : ''}${formatCurrency(netPosition)}</div>
    <div class="label">Net Position</div>
  </div>
</div>

<!-- Expense Details Section -->
<div class="section">
  <div class="section-header">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    <h2>Expense Details (${personExpenses.length})</h2>
  </div>
  ${expenseCards || '<div class="no-data-box">No expenses found for this person.</div>'}
</div>

<!-- Settlement Payments Section -->
<div class="section">
  <div class="section-header teal">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    <h2>Settlement Payments (${personSettlements.length})</h2>
  </div>
  ${settlementCards}
</div>

<!-- Final Balances Section -->
<div class="section">
  <div class="section-header purple">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
    <h2>Final Settlement Summary</h2>
  </div>
  <div class="balance-grid">
    ${finalBalanceCards}
  </div>
</div>

<!-- Footer -->
<div class="footer">
  <p>Generated by SettleEase • Personal Expense Report for ${personName}</p>
  <p>This report includes ${personExpenses.length} expenses and ${personSettlements.length} settlement payments.</p>
</div>
</body>
</html>`;
}
