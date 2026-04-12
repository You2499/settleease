import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as LucideIcons from "lucide-react";

import { formatCurrency } from "@/lib/settleease/utils";
import type {
  AuditActivityGroup,
  AuditBalanceRow,
  AuditCalculationLine,
  AuditCategoryRow,
  AuditCounterpartyBalance,
  AuditDataQuality,
  AuditExpenseProof,
  AuditManualOverrideProof,
  AuditPairwiseExpenseContribution,
  AuditPersonalExpenseProof,
  AuditReportMetric,
  AuditSettlementLedgerRow,
  AuditTransactionProof,
  ExportReportModel,
} from "../types";
import { escapeHtml, roundReportAmount } from "./reportModels";

interface RenderReportHtmlOptions {
  interFontCss?: string;
}

const BAR_COLORS = ["#16a34a", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

function h(value: unknown): string {
  return escapeHtml(value);
}

function money(value: number): string {
  return h(formatCurrency(roundReportAmount(value)));
}

function signedMoney(value: number): string {
  const amount = roundReportAmount(value);
  return `${amount >= 0 ? "" : "-"}${money(Math.abs(amount))}`;
}

function toneClass(tone?: string): string {
  if (tone === "positive") return "positive";
  if (tone === "warning") return "warning";
  return "neutral";
}

function getLucideComponent(iconName: string | null | undefined): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  const fallback = LucideIcons.FileText as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  if (!iconName) return fallback;
  return ((LucideIcons as Record<string, unknown>)[iconName] as React.ComponentType<React.SVGProps<SVGSVGElement>>) || fallback;
}

export function renderLucideSvg(iconName: string | null | undefined, className = "report-icon"): string {
  const Icon = getLucideComponent(iconName);
  return renderToStaticMarkup(
    <Icon className={className} aria-hidden="true" focusable="false" />
  );
}

function renderMetricStrip(metrics: AuditReportMetric[]): string {
  return `
    <section class="metric-strip">
      ${metrics.map((metric) => `
        <article class="metric-card ${toneClass(metric.tone)}">
          <div class="metric-label">${h(metric.label)}</div>
          <div class="metric-value">${h(metric.value)}</div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderSectionHeader(iconName: string, title: string, kicker?: string): string {
  return `
    <div class="section-heading">
      <div class="section-title">
        ${renderLucideSvg(iconName)}
        <h2>${h(title)}</h2>
      </div>
      ${kicker ? `<p>${h(kicker)}</p>` : ""}
    </div>
  `;
}

function renderEmpty(message: string): string {
  return `<div class="empty-state">${h(message)}</div>`;
}

function renderAmountRows(title: string, rows: { person: string; amount: number }[], empty: string): string {
  return `
    <div class="proof-subsection">
      <h4>${h(title)}</h4>
      ${rows.length === 0 ? renderEmpty(empty) : `
        <table class="ledger-table compact">
          <thead><tr><th>Person</th><th class="amount-col">Amount</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr><td>${h(row.person)}</td><td class="amount-col money">${money(row.amount)}</td></tr>
            `).join("")}
          </tbody>
        </table>
      `}
    </div>
  `;
}

function renderParticipantEffects(expense: AuditExpenseProof): string {
  return `
    <div class="proof-subsection wide">
      <h4>Net Effect</h4>
      <table class="ledger-table compact">
        <thead>
          <tr>
            <th>Participant</th>
            <th class="amount-col">Paid</th>
            <th class="amount-col">Share</th>
            <th class="amount-col">Celebration</th>
            <th class="amount-col">Net Effect</th>
          </tr>
        </thead>
        <tbody>
          ${expense.participantEffects.map((effect) => `
            <tr>
              <td>${h(effect.person)}</td>
              <td class="amount-col money">${money(effect.paid)}</td>
              <td class="amount-col money">${money(effect.share)}</td>
              <td class="amount-col money">${money(effect.celebrationContribution)}</td>
              <td class="amount-col money ${effect.netEffect >= 0 ? "positive-text" : "warning-text"}">${signedMoney(effect.netEffect)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderItemwiseDetails(expense: AuditExpenseProof): string {
  if (expense.items.length === 0) return "";

  return `
    <div class="proof-subsection wide">
      <h4>Itemwise Split Details</h4>
      <table class="ledger-table compact">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>Shared By</th>
            <th class="amount-col">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${expense.items.map((item) => `
            <tr>
              <td>${h(item.name)}</td>
              <td>${h(item.category)}</td>
              <td>${h(item.sharedBy.join(", ") || "Not available")}</td>
              <td class="amount-col money">${money(item.amount)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderExpenseProof(expense: AuditExpenseProof, options: { personal?: AuditPersonalExpenseProof; personName?: string } = {}): string {
  const personal = options.personal;

  return `
    <article class="proof-card ${expense.excluded ? "excluded" : ""}">
      <div class="proof-card-header">
        <div class="title-cluster">
          <div class="icon-box">${renderLucideSvg(expense.categoryIconName || "ReceiptText")}</div>
          <div>
            <h3>${h(expense.description)}</h3>
            <p>${h(expense.category)} • ${h(expense.date)} • ${h(expense.splitMethod)}${expense.excluded ? " • Excluded from settlement" : ""}</p>
          </div>
        </div>
        <div class="proof-amount">${money(expense.amount)}</div>
      </div>

      ${personal ? `
        <div class="mini-metrics three">
          <div><span>${h(options.personName || "Participant")} paid</span><strong>${money(personal.paidByPerson)}</strong></div>
          <div><span>${h(options.personName || "Participant")} share</span><strong>${money(personal.shareForPerson)}</strong></div>
          <div><span>Net effect</span><strong class="${personal.netEffectForPerson >= 0 ? "positive-text" : "warning-text"}">${signedMoney(personal.netEffectForPerson)}</strong></div>
        </div>
      ` : ""}

      <div class="proof-grid">
        ${renderAmountRows(personal ? "Who Paid" : "Payment Details", expense.paidBy, "No payer rows available.")}
        ${renderAmountRows(personal ? "Split Breakdown" : "Split Details", expense.shares, "No share rows available.")}
        ${expense.celebrationContribution ? `
          <div class="proof-subsection">
            <h4>Celebration Contribution</h4>
            <div class="callout warning">
              <span>${h(expense.celebrationContribution.person)}</span>
              <strong>${money(expense.celebrationContribution.amount)}</strong>
            </div>
          </div>
        ` : ""}
        ${renderItemwiseDetails(expense)}
        ${renderParticipantEffects(expense)}
      </div>

      ${personal && personal.counterpartyEffects.length > 0 ? `
        <div class="proof-subsection wide">
          <h4>Your Counterparty Impact</h4>
          <div class="balance-list">
            ${personal.counterpartyEffects.map((row) => `
              <div class="balance-row">
                <span>${h(row.name)}</span>
                <strong class="${row.direction === "Owes you" ? "positive-text" : "warning-text"}">${h(row.direction)} ${money(row.amount)}</strong>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    </article>
  `;
}

function renderSettlementLedger(settlements: AuditSettlementLedgerRow[]): string {
  if (settlements.length === 0) return renderEmpty("No settlement payments recorded for this report.");

  return `
    <table class="ledger-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Payer</th>
          <th>Receiver</th>
          <th>Notes</th>
          <th class="amount-col">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${settlements.map((settlement) => `
          <tr>
            <td>${h(settlement.date)}</td>
            <td>${h(settlement.debtor)}</td>
            <td>${h(settlement.creditor)}</td>
            <td>${h(settlement.notes || "None")}</td>
            <td class="amount-col money positive-text">${money(settlement.amount)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderActivityFeed(groups: AuditActivityGroup[]): string {
  if (groups.length === 0) return renderEmpty("No activity found for this report.");

  return `
    <div class="activity-feed">
      ${groups.map((group) => `
        <div class="activity-day">
          <div class="activity-date">${h(group.date)}</div>
          <div class="activity-items">
            ${group.items.map((item) => `
              <div class="activity-item ${item.tone}">
                <div>
                  <div class="activity-title">${h(item.title)}</div>
                  <div class="activity-subtitle">${h(item.subtitle)}</div>
                </div>
                <div class="activity-meta">
                  <span>${h(item.badge)}</span>
                  <strong>${money(item.amount)}</strong>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderPairwiseTable(title: string, rows: AuditPairwiseExpenseContribution[], empty: string): string {
  return `
    <div class="proof-subsection wide">
      <h4>${h(title)}</h4>
      ${rows.length === 0 ? renderEmpty(empty) : `
        <table class="ledger-table compact">
          <thead>
            <tr><th>Expense</th><th>Category</th><th>Date</th><th class="amount-col">Share Amount</th></tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${h(row.description)}</td>
                <td>${h(row.category)}</td>
                <td>${h(row.date)}</td>
                <td class="amount-col money">${money(row.amount)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `}
    </div>
  `;
}

function renderCalculationLines(lines: AuditCalculationLine[]): string {
  return `
    <div class="calculation-lines">
      ${lines.map((line) => `
        <div class="${line.emphasis ? "emphasis" : ""}">
          <span>${h(line.label)}</span>
          <strong class="${line.amount >= 0 ? "positive-text" : "warning-text"}">${signedMoney(line.amount)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderHistoricalSettlements(rows: AuditTransactionProof["historicalSettlements"]): string {
  if (rows.length === 0) return "";

  return `
    <div class="proof-subsection wide">
      <h4>Historical Settlement Adjustments</h4>
      <table class="ledger-table compact">
        <thead><tr><th>Date</th><th>Direction</th><th class="amount-col">Payment</th><th class="amount-col">Prior Balance Effect</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${h(row.date)}</td>
              <td>${h(row.direction)}</td>
              <td class="amount-col money">${money(row.amount)}</td>
              <td class="amount-col money ${row.effect >= 0 ? "positive-text" : "warning-text"}">${signedMoney(row.effect)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTransactionProof(proof: AuditTransactionProof): string {
  return `
    <article class="transaction-card">
      <div class="transaction-header">
        <div>
          <div class="transaction-route">
            <strong>${h(proof.debtor)}</strong>
            ${renderLucideSvg("ArrowRight", "route-icon")}
            <strong>${h(proof.creditor)}</strong>
          </div>
          <p>${h(proof.status)}</p>
        </div>
        <div class="transaction-amount">${money(proof.amount)}</div>
      </div>

      ${proof.manualOverride ? `
        <div class="callout warning">
          <span>Manual override: ${h(proof.manualOverride.debtor)} pays ${h(proof.manualOverride.creditor)} (${h(proof.manualOverride.status)})</span>
          <strong>${money(proof.manualOverride.amount)}</strong>
        </div>
      ` : ""}

      ${renderPairwiseTable(
        `Expenses where ${proof.creditor} paid for ${proof.debtor}`,
        proof.contributingExpenses,
        "No direct current-period expenses for this pair."
      )}
      ${renderPairwiseTable(
        `Expenses where ${proof.debtor} paid for ${proof.creditor} (offsets)`,
        proof.offsetExpenses,
        "No direct current-period offsets for this pair."
      )}
      ${Math.abs(proof.priorBalance) > 0.01 ? `
        <div class="callout prior">
          <span>Prior Unsettled Balance</span>
          <strong class="${proof.priorBalance >= 0 ? "warning-text" : "positive-text"}">${signedMoney(proof.priorBalance)}</strong>
        </div>
      ` : ""}
      ${renderHistoricalSettlements(proof.historicalSettlements)}
      <div class="proof-subsection wide">
        <h4>Net Settlement Calculation</h4>
        ${renderCalculationLines(proof.calculationLines)}
      </div>
    </article>
  `;
}

function renderTransactionProofs(proofs: AuditTransactionProof[]): string {
  if (proofs.length === 0) return renderEmpty("All balances are settled. No simplified settlement transactions are required.");
  return `<div class="transaction-list">${proofs.map(renderTransactionProof).join("")}</div>`;
}

function renderBalances(rows: AuditBalanceRow[]): string {
  if (rows.length === 0) return renderEmpty("No participants available.");
  const maxAmount = Math.max(...rows.map((row) => row.amount), 0);

  return `
    <div class="bar-list">
      ${rows.map((row) => {
        const width = maxAmount > 0 ? Math.max(6, Math.round((row.amount / maxAmount) * 100)) : 0;
        return `
          <div class="bar-row">
            <div class="bar-label">
              <strong>${h(row.name)}</strong>
              <span>${h(row.direction)}${row.direction !== "Settled" ? ` ${money(row.amount)}` : ""}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill ${row.direction === "Receives" ? "positive-fill" : row.direction === "Pays" ? "warning-fill" : "neutral-fill"}" style="width: ${width}%"></div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderCategories(rows: AuditCategoryRow[]): string {
  if (rows.length === 0) return renderEmpty("No category spending available.");

  return `
    <div class="bar-list">
      ${rows.slice(0, 10).map((row, index) => `
        <div class="bar-row">
          <div class="bar-label">
            <strong>${renderLucideSvg(row.iconName || "Tags", "inline-icon")} ${h(row.name)}</strong>
            <span>${money(row.amount)} (${h(row.share)}%)</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${Math.max(4, Math.min(100, row.share))}%; background: ${BAR_COLORS[index % BAR_COLORS.length]}"></div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderManualOverrides(rows: AuditManualOverrideProof[]): string {
  if (rows.length === 0) return renderEmpty("No manual overrides or exceptions are active.");

  return `
    <table class="ledger-table">
      <thead>
        <tr><th>Payer</th><th>Receiver</th><th>Status</th><th>Notes</th><th class="amount-col">Amount</th></tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${h(row.debtor)}</td>
            <td>${h(row.creditor)}</td>
            <td>${h(row.status)}</td>
            <td>${h(row.notes || "None")}</td>
            <td class="amount-col money">${money(row.amount)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderDataQuality(dataQuality: AuditDataQuality): string {
  return `
    <section class="section data-quality ${dataQuality.passes ? "passed" : "warning"}">
      ${renderSectionHeader(dataQuality.passes ? "CheckCircle2" : "AlertTriangle", "Data Quality", `${dataQuality.checkedExpenses} expenses checked`)}
      ${dataQuality.passes ? `
        <div class="quality-banner passed">
          ${renderLucideSvg("CheckCircle2")}
          <span>Passed. No material data-quality issues detected.</span>
        </div>
      ` : `
        <div class="quality-banner warning">
          ${renderLucideSvg("AlertTriangle")}
          <span>${h(dataQuality.warnings.length)} warning${dataQuality.warnings.length === 1 ? "" : "s"} found. Review before sharing this report.</span>
        </div>
        <ul class="warning-list">
          ${dataQuality.warnings.map((warning) => `<li>${h(warning)}</li>`).join("")}
        </ul>
      `}
    </section>
  `;
}

function renderCounterpartyBalances(rows: AuditCounterpartyBalance[], empty: string): string {
  if (rows.length === 0) return renderEmpty(empty);

  return `
    <div class="balance-list">
      ${rows.map((row) => `
        <div class="balance-row">
          <span>${h(row.name)}</span>
          <strong class="${row.direction === "Owes you" ? "positive-text" : "warning-text"}">${h(row.direction)} ${money(row.amount)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderGroupReport(model: Extract<ExportReportModel, { kind: "group" }>): string {
  return `
    ${renderMetricStrip(model.metrics)}

    <section class="section">
      ${renderSectionHeader("ArrowRightLeft", "Simplified Settlement Transactions", "Actionable payments with audit proof")}
      ${renderTransactionProofs(model.transactionProofs)}
    </section>

    <section class="section two-column">
      <div>
        ${renderSectionHeader("Scale", "Balance Overview", `${model.participantCount} participants`)}
        ${renderBalances(model.balances)}
      </div>
      <div>
        ${renderSectionHeader("ChartBarBig", "Spending Mix", "Included spend by category")}
        ${renderCategories(model.categories)}
      </div>
    </section>

    <section class="section page-break-before">
      ${renderSectionHeader("ClipboardList", "Activity Feed", "Expenses and settlement payments grouped by date")}
      ${renderActivityFeed(model.activityGroups)}
    </section>

    <section class="section page-break-before">
      ${renderSectionHeader("ReceiptText", "Detailed Expense Breakdown", `${model.includedExpenses.length} included expense${model.includedExpenses.length === 1 ? "" : "s"}`)}
      <div class="proof-list">
        ${model.includedExpenses.length === 0 ? renderEmpty("No included expenses found for this report.") : model.includedExpenses.map((expense) => renderExpenseProof(expense)).join("")}
      </div>
    </section>

    ${model.excludedExpenses.length > 0 ? `
      <section class="section">
        ${renderSectionHeader("Ban", "Excluded Expenses", "Visible for audit context, excluded from settlement totals")}
        <div class="proof-list">${model.excludedExpenses.map((expense) => renderExpenseProof(expense)).join("")}</div>
      </section>
    ` : ""}

    <section class="section page-break-before">
      ${renderSectionHeader("Handshake", "Settlement Payments Ledger", "Recorded payments in the selected report range")}
      ${renderSettlementLedger(model.settlements)}
    </section>

    <section class="section">
      ${renderSectionHeader("Route", "Manual Overrides and Exceptions", "Manual paths used by settlement calculations")}
      ${renderManualOverrides(model.manualOverrides)}
    </section>

    ${renderDataQuality(model.dataQuality)}
  `;
}

function renderPersonalReport(model: Extract<ExportReportModel, { kind: "personal" }>): string {
  return `
    ${renderMetricStrip(model.metrics)}

    <section class="section two-column">
      <div>
        ${renderSectionHeader("Users", "Counterparty Balances", "Who owes the participant and who the participant owes")}
        ${renderCounterpartyBalances(model.counterparties, "No active counterparty balances for this participant.")}
      </div>
      <div>
        ${renderSectionHeader("ShieldCheck", "Statement Settings", "Personal report controls")}
        <div class="setting-list">
          <div><span>Participant</span><strong>${h(model.personName)}</strong></div>
          <div><span>Redaction</span><strong>${model.redacted ? "On" : "Off"}</strong></div>
          <div><span>Date Range</span><strong>${h(model.dateRangeLabel)}</strong></div>
        </div>
      </div>
    </section>

    <section class="section page-break-before">
      ${renderSectionHeader("ReceiptText", "Expense Details", `${model.expenses.length} personal expense${model.expenses.length === 1 ? "" : "s"}`)}
      <div class="proof-list">
        ${model.expenses.length === 0 ? renderEmpty("No included expenses found for this participant.") : model.expenses.map((expense) => renderExpenseProof(expense, { personal: expense, personName: model.personName })).join("")}
      </div>
    </section>

    ${model.excludedExpenses.length > 0 ? `
      <section class="section">
        ${renderSectionHeader("Ban", "Excluded Personal Expenses", "Visible for audit context, excluded from settlement totals")}
        <div class="proof-list">${model.excludedExpenses.map((expense) => renderExpenseProof(expense, { personal: expense, personName: model.personName })).join("")}</div>
      </section>
    ` : ""}

    <section class="section page-break-before">
      ${renderSectionHeader("Handshake", "Settlement Payments", "Payments involving this participant")}
      ${renderSettlementLedger(model.settlements)}
    </section>

    <section class="section">
      ${renderSectionHeader("Scale", "Final Settlement Summary", "Net counterparty position after expenses and payments")}
      ${renderCounterpartyBalances(model.finalBalances, "This participant is fully settled for the selected range.")}
    </section>

    ${renderDataQuality(model.dataQuality)}
  `;
}

function renderDocumentShell(model: ExportReportModel, body: string, options: RenderReportHtmlOptions): string {
  const reportType = model.kind === "group" ? "Group Summary" : "Personal Statement";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${h(model.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    ${options.interFontCss || ""}

    :root {
      --font-inter: 'Inter';
      --background: #f8faf8;
      --paper: #ffffff;
      --foreground: #111827;
      --muted: #64748b;
      --border: #dfe7df;
      --soft: #f1f5f1;
      --primary: #16813f;
      --primary-strong: #0f6b33;
      --positive: #16813f;
      --warning: #b45309;
      --danger: #dc2626;
      --blue: #0ea5e9;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--background); color: var(--foreground); }
    body {
      font-family: var(--font-inter), 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      font-variant-numeric: tabular-nums;
    }
    @page { size: A4; margin: 14mm; }
    @media print {
      html, body { background: #fff !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page-break-before { break-before: page; page-break-before: always; }
      .proof-card, .transaction-card, .activity-day, .section { break-inside: avoid; page-break-inside: avoid; }
    }

    .report-page { max-width: 980px; margin: 0 auto; padding: 28px; }
    .cover {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: linear-gradient(135deg, #ffffff 0%, #f2f8f3 100%);
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
    }
    .cover-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      padding: 24px;
      border-bottom: 1px solid var(--border);
    }
    .brand-row { display: flex; align-items: center; gap: 10px; color: var(--primary); font-weight: 800; letter-spacing: .01em; }
    .brand-mark {
      display: grid;
      width: 36px;
      height: 36px;
      place-items: center;
      border-radius: 8px;
      background: #e8f6ec;
      color: var(--primary);
    }
    h1 { margin: 14px 0 6px; font-size: 30px; line-height: 1.05; letter-spacing: -0.03em; }
    .subtitle { margin: 0; color: var(--muted); font-size: 12px; }
    .report-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #b8dcc3;
      border-radius: 999px;
      background: #eef9f1;
      padding: 7px 10px;
      color: var(--primary-strong);
      font-weight: 700;
      white-space: nowrap;
    }
    .meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--border); }
    .meta-cell { background: #fff; padding: 12px 16px; }
    .meta-cell span, .metric-label, .setting-list span { display: block; color: var(--muted); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
    .meta-cell strong { display: block; margin-top: 4px; font-size: 12px; }

    .metric-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
    .metric-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--paper);
      padding: 13px;
    }
    .metric-card.positive { border-color: #b8dcc3; background: #f0fbf3; }
    .metric-card.warning { border-color: #f7d59a; background: #fffbeb; }
    .metric-value { margin-top: 5px; font-size: 18px; font-weight: 800; letter-spacing: -0.03em; color: var(--foreground); }

    .section {
      margin-top: 18px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--paper);
      padding: 16px;
    }
    .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .section-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .section-title h2 { margin: 0; font-size: 15px; line-height: 1.2; }
    .section-heading p { margin: 1px 0 0; max-width: 320px; color: var(--muted); text-align: right; }
    .report-icon, .inline-icon, .route-icon { width: 16px; height: 16px; flex: 0 0 auto; stroke-width: 2.2; }
    .inline-icon { width: 13px; height: 13px; vertical-align: -2px; }
    .route-icon { width: 18px; height: 18px; color: var(--muted); }

    .proof-list, .transaction-list { display: grid; gap: 14px; }
    .proof-card, .transaction-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #fff;
      padding: 14px;
    }
    .proof-card.excluded { background: #fffbeb; border-color: #f6d89d; }
    .proof-card-header, .transaction-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .title-cluster, .transaction-route { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .icon-box { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 8px; background: #eef9f1; color: var(--primary); flex: 0 0 auto; }
    .proof-card h3 { margin: 0; font-size: 14px; line-height: 1.25; }
    .proof-card p, .transaction-header p { margin: 3px 0 0; color: var(--muted); }
    .proof-amount, .transaction-amount { color: var(--primary); font-size: 19px; font-weight: 800; white-space: nowrap; }
    .proof-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .proof-subsection { min-width: 0; }
    .proof-subsection.wide { grid-column: 1 / -1; }
    .proof-subsection h4 { margin: 0 0 7px; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: .07em; }
    .mini-metrics { display: grid; gap: 8px; margin-bottom: 12px; }
    .mini-metrics.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .mini-metrics div, .setting-list div {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--soft);
      padding: 9px;
    }
    .mini-metrics span { display: block; color: var(--muted); font-size: 10px; }
    .mini-metrics strong, .setting-list strong { display: block; margin-top: 3px; font-size: 13px; }
    .setting-list { display: grid; gap: 8px; }

    .ledger-table { width: 100%; border-collapse: collapse; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .ledger-table th, .ledger-table td { padding: 8px 9px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
    .ledger-table th { background: #f3f7f3; color: #475569; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; }
    .ledger-table.compact th, .ledger-table.compact td { padding: 6px 7px; }
    .ledger-table tr:last-child td { border-bottom: 0; }
    .amount-col { text-align: right !important; white-space: nowrap; }
    .money { font-variant-numeric: tabular-nums; }
    .positive-text { color: var(--positive); }
    .warning-text { color: var(--danger); }

    .activity-feed { display: grid; gap: 12px; }
    .activity-day { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .activity-date { background: #eef9f1; color: var(--primary-strong); padding: 8px 10px; font-weight: 800; }
    .activity-items { display: grid; }
    .activity-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px;
      border-top: 1px solid var(--border);
      background: #fff;
    }
    .activity-title { font-weight: 700; }
    .activity-subtitle, .activity-meta span { color: var(--muted); font-size: 10px; }
    .activity-meta { text-align: right; white-space: nowrap; }
    .activity-meta strong { display: block; margin-top: 3px; font-size: 12px; }

    .bar-list, .balance-list { display: grid; gap: 9px; }
    .bar-label, .balance-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 4px;
    }
    .bar-label span { color: var(--muted); white-space: nowrap; }
    .bar-track { height: 8px; overflow: hidden; border-radius: 999px; background: #e5ebe5; }
    .bar-fill { height: 100%; border-radius: inherit; background: var(--primary); }
    .positive-fill { background: var(--positive); }
    .warning-fill { background: var(--danger); }
    .neutral-fill { background: #94a3b8; }
    .balance-row {
      margin: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--soft);
      padding: 9px;
    }

    .callout {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border: 1px solid #b8dcc3;
      border-radius: 8px;
      background: #f0fbf3;
      padding: 10px;
      margin-bottom: 10px;
    }
    .callout.warning, .callout.prior { border-color: #f6d89d; background: #fffbeb; }
    .calculation-lines { display: grid; gap: 1px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .calculation-lines div { display: flex; justify-content: space-between; gap: 12px; background: #fff; padding: 8px 10px; }
    .calculation-lines .emphasis { background: #eef9f1; font-size: 12px; }
    .empty-state { border: 1px dashed var(--border); border-radius: 8px; background: #f8faf8; padding: 14px; color: var(--muted); text-align: center; }
    .quality-banner { display: flex; align-items: center; gap: 8px; border-radius: 8px; padding: 11px; font-weight: 700; }
    .quality-banner.passed { border: 1px solid #b8dcc3; background: #f0fbf3; color: var(--primary-strong); }
    .quality-banner.warning { border: 1px solid #f6d89d; background: #fffbeb; color: var(--warning); }
    .warning-list { margin: 12px 0 0; padding-left: 18px; color: #78350f; }
    .footer { margin-top: 18px; color: var(--muted); text-align: center; font-size: 10px; }

    @media screen and (max-width: 760px) {
      .report-page { padding: 12px; }
      .cover-top, .proof-card-header, .transaction-header, .activity-item { flex-direction: column; }
      .meta-grid, .metric-strip, .two-column, .proof-grid, .mini-metrics.three { grid-template-columns: 1fr; }
      .section-heading { flex-direction: column; }
      .section-heading p { text-align: left; }
      .proof-amount, .transaction-amount { white-space: normal; }
    }
  </style>
</head>
<body>
  <main class="report-page">
    <header class="cover">
      <div class="cover-top">
        <div>
          <div class="brand-row">
            <span class="brand-mark">${renderLucideSvg("HandCoins")}</span>
            <span>SettleEase</span>
          </div>
          <h1>${h(model.title)}</h1>
          <p class="subtitle">Audit-grade settlement statement with traceable expense, share, payment, and balance calculations.</p>
        </div>
        <div class="report-pill">${renderLucideSvg(model.kind === "group" ? "Users" : "FileUser")} ${h(reportType)}</div>
      </div>
      <div class="meta-grid">
        <div class="meta-cell"><span>Date Range</span><strong>${h(model.dateRangeLabel)}</strong></div>
        <div class="meta-cell"><span>Generated</span><strong>${h(model.generatedAt)}</strong></div>
        <div class="meta-cell"><span>Report Mode</span><strong>${h(reportType)}</strong></div>
      </div>
    </header>

    ${body}

    <footer class="footer">
      Generated by SettleEase. This report contains user-provided settlement data and deterministic calculations only.
    </footer>
  </main>
</body>
</html>`;
}

export function renderExportReportHtml(model: ExportReportModel, options: RenderReportHtmlOptions = {}): string {
  const body = model.kind === "group" ? renderGroupReport(model) : renderPersonalReport(model);
  return renderDocumentShell(model, body, options);
}
