import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  ExportBalanceRow,
  ExportCategoryRow,
  ExportDataQuality,
  ExportExpenseLedgerRow,
  ExportPaymentAction,
  ExportReportMetric,
  ExportReportModel,
  ExportSettlementLedgerRow,
  GroupSummaryReportModel,
  PersonalExpenseLedgerRow,
  PersonalStatementReportModel,
} from "../types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingRight: 30,
    paddingBottom: 32,
    paddingLeft: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.35,
    color: "#15211b",
    backgroundColor: "#fbfcfa",
  },
  topRule: {
    height: 4,
    backgroundColor: "#2f7d5b",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  brandBlock: {
    width: "62%",
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#5f7167",
    marginBottom: 5,
  },
  title: {
    fontSize: 22,
    lineHeight: 1.08,
    fontWeight: 700,
    color: "#102019",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 10,
    color: "#52635a",
  },
  metaBox: {
    width: "34%",
    borderWidth: 1,
    borderColor: "#dce5de",
    backgroundColor: "#ffffff",
    padding: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  metaLabel: {
    color: "#6c7a71",
  },
  metaValue: {
    color: "#17231d",
    fontWeight: 700,
    textAlign: "right",
  },
  metricGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dbe5df",
    backgroundColor: "#ffffff",
    padding: 10,
    minHeight: 54,
  },
  metricLabel: {
    color: "#65756c",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 700,
    color: "#13241c",
  },
  metricPositive: {
    color: "#23724f",
  },
  metricWarning: {
    color: "#a65d1f",
  },
  section: {
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#ccd8d0",
    paddingBottom: 5,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#183226",
  },
  sectionNote: {
    fontSize: 8,
    color: "#697a70",
  },
  twoCol: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: "#d8e3dc",
    backgroundColor: "#ffffff",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eef4f0",
    borderBottomWidth: 1,
    borderBottomColor: "#d8e3dc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#edf2ef",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    paddingTop: 6,
    paddingRight: 6,
    paddingBottom: 6,
    paddingLeft: 6,
    color: "#24352d",
  },
  headCell: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#52645a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountCell: {
    textAlign: "right",
    fontWeight: 700,
  },
  muted: {
    color: "#6b7d73",
  },
  empty: {
    borderWidth: 1,
    borderColor: "#dce5de",
    backgroundColor: "#ffffff",
    padding: 12,
    color: "#64766c",
    fontSize: 9,
  },
  barRow: {
    marginBottom: 8,
  },
  barMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  barTrack: {
    height: 6,
    backgroundColor: "#edf3ef",
  },
  barFill: {
    height: 6,
    backgroundColor: "#2f7d5b",
  },
  barFillWarning: {
    backgroundColor: "#b66a29",
  },
  qualityPass: {
    borderWidth: 1,
    borderColor: "#cce2d4",
    backgroundColor: "#f1f8f3",
    padding: 10,
  },
  qualityWarn: {
    borderWidth: 1,
    borderColor: "#ead0b4",
    backgroundColor: "#fff8ef",
    padding: 10,
  },
  warningText: {
    marginBottom: 4,
    color: "#7b4b20",
  },
  appendixExpense: {
    borderWidth: 1,
    borderColor: "#dce5de",
    backgroundColor: "#ffffff",
    padding: 9,
    marginBottom: 8,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  expenseTitle: {
    fontWeight: 700,
    fontSize: 10,
    color: "#13241d",
  },
  pill: {
    borderWidth: 1,
    borderColor: "#d7e2dc",
    backgroundColor: "#f6f9f7",
    paddingTop: 3,
    paddingRight: 5,
    paddingBottom: 3,
    paddingLeft: 5,
    fontSize: 7.5,
    color: "#506358",
  },
  miniGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  miniCol: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    left: 30,
    right: 30,
    bottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#e1e9e4",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#7a887f",
    fontSize: 7.5,
  },
});

function methodLabel(method: string): string {
  if (method === "itemwise") return "Item-wise";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

function MetricStrip({ metrics }: { metrics: ExportReportMetric[] }) {
  return (
    <View style={styles.metricGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricCard}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text
            style={[
              styles.metricValue,
              metric.tone === "positive" ? styles.metricPositive : {},
              metric.tone === "warning" ? styles.metricWarning : {},
            ]}
          >
            {metric.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ReportHeader({
  title,
  eyebrow,
  dateRangeLabel,
  generatedAt,
  meta,
}: {
  title: string;
  eyebrow: string;
  dateRangeLabel: string;
  generatedAt: string;
  meta: Array<{ label: string; value: string }>;
}) {
  return (
    <>
      <View style={styles.topRule} />
      <View style={styles.header}>
        <View style={styles.brandBlock}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>SettleEase financial settlement statement</Text>
        </View>
        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Period</Text>
            <Text style={styles.metaValue}>{dateRangeLabel}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Generated</Text>
            <Text style={styles.metaValue}>{generatedAt}</Text>
          </View>
          {meta.map((item) => (
            <View key={item.label} style={styles.metaRow}>
              <Text style={styles.metaLabel}>{item.label}</Text>
              <Text style={styles.metaValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <Text style={styles.empty}>{children}</Text>;
}

function PaymentActionsTable({ actions }: { actions: ExportPaymentAction[] }) {
  if (actions.length === 0) return <EmptyState>No outstanding settlement actions.</EmptyState>;

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.cell, styles.headCell, { flex: 1.1 }]}>Payer</Text>
        <Text style={[styles.cell, styles.headCell, { flex: 1.1 }]}>Receiver</Text>
        <Text style={[styles.cell, styles.headCell, styles.amountCell, { flex: 0.9 }]}>Amount</Text>
        <Text style={[styles.cell, styles.headCell, { flex: 0.9 }]}>Status</Text>
      </View>
      {actions.map((action, index) => (
        <View key={`${action.from}-${action.to}-${index}`} style={[styles.tableRow, index === actions.length - 1 ? styles.tableRowLast : {}]} wrap={false}>
          <Text style={[styles.cell, { flex: 1.1 }]}>{action.from}</Text>
          <Text style={[styles.cell, { flex: 1.1 }]}>{action.to}</Text>
          <Text style={[styles.cell, styles.amountCell, { flex: 0.9 }]}>{formatCurrency(action.amount)}</Text>
          <Text style={[styles.cell, { flex: 0.9 }]}>{action.status}</Text>
        </View>
      ))}
    </View>
  );
}

function BalanceBars({ rows }: { rows: ExportBalanceRow[] }) {
  if (rows.length === 0) return <EmptyState>All participants are balanced for this report.</EmptyState>;

  return (
    <View>
      {rows.slice(0, 8).map((row) => (
        <View key={`${row.name}-${row.direction}`} style={styles.barRow} wrap={false}>
          <View style={styles.barMeta}>
            <Text>{row.name}</Text>
            <Text style={row.direction === "Receives" ? styles.metricPositive : styles.metricWarning}>
              {row.direction} {formatCurrency(row.amount)}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, row.direction === "Pays" ? styles.barFillWarning : {}, { width: `${Math.max(row.share, 4)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function CategoryBars({ rows }: { rows: ExportCategoryRow[] }) {
  if (rows.length === 0) return <EmptyState>No spending categories in this report period.</EmptyState>;

  return (
    <View>
      {rows.slice(0, 6).map((row) => (
        <View key={row.name} style={styles.barRow} wrap={false}>
          <View style={styles.barMeta}>
            <Text>{row.name}</Text>
            <Text>{formatCurrency(row.amount)} • {row.share}%</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max(row.share, 4)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function DataQualityPanel({ dataQuality }: { dataQuality: ExportDataQuality }) {
  return (
    <View style={dataQuality.passes ? styles.qualityPass : styles.qualityWarn}>
      {dataQuality.passes ? (
        <Text>No material data-quality issues detected across {dataQuality.checkedExpenses} checked expenses.</Text>
      ) : (
        dataQuality.warnings.map((warning, index) => (
          <Text key={`${warning}-${index}`} style={styles.warningText}>- {warning}</Text>
        ))
      )}
    </View>
  );
}

function SimpleRows({
  rows,
}: {
  rows: Array<{ label: string; value: string; note?: string }>;
}) {
  if (rows.length === 0) return <EmptyState>No rows available.</EmptyState>;

  return (
    <View style={styles.table}>
      {rows.map((row, index) => (
        <View key={`${row.label}-${index}`} style={[styles.tableRow, index === rows.length - 1 ? styles.tableRowLast : {}]} wrap={false}>
          <Text style={[styles.cell, { flex: 1.4 }]}>{row.label}</Text>
          <Text style={[styles.cell, styles.amountCell, { flex: 0.8 }]}>{row.value}</Text>
          {row.note ? <Text style={[styles.cell, styles.muted, { flex: 1 }]}>{row.note}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function SettlementsTable({ settlements }: { settlements: ExportSettlementLedgerRow[] }) {
  if (settlements.length === 0) return <EmptyState>No settlement payments recorded in this period.</EmptyState>;

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.cell, styles.headCell, { flex: 1 }]}>Payer</Text>
        <Text style={[styles.cell, styles.headCell, { flex: 1 }]}>Receiver</Text>
        <Text style={[styles.cell, styles.headCell, styles.amountCell, { flex: 0.75 }]}>Amount</Text>
        <Text style={[styles.cell, styles.headCell, { flex: 0.8 }]}>Date</Text>
      </View>
      {settlements.map((settlement, index) => (
        <View key={`${settlement.debtor}-${settlement.creditor}-${index}`} style={[styles.tableRow, index === settlements.length - 1 ? styles.tableRowLast : {}]} wrap={false}>
          <Text style={[styles.cell, { flex: 1 }]}>{settlement.debtor}</Text>
          <Text style={[styles.cell, { flex: 1 }]}>{settlement.creditor}</Text>
          <Text style={[styles.cell, styles.amountCell, { flex: 0.75 }]}>{formatCurrency(settlement.amount)}</Text>
          <Text style={[styles.cell, { flex: 0.8 }]}>{settlement.date}</Text>
        </View>
      ))}
    </View>
  );
}

function ExpenseAppendix({ expenses }: { expenses: ExportExpenseLedgerRow[] }) {
  if (expenses.length === 0) return <EmptyState>No expenses in this report period.</EmptyState>;

  return (
    <View>
      {expenses.map((expense, index) => (
        <View key={`${expense.description}-${index}`} style={styles.appendixExpense} wrap={false}>
          <View style={styles.expenseHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expenseTitle}>{expense.description}</Text>
              <Text style={styles.muted}>{expense.category} • {expense.date} • {methodLabel(expense.splitMethod)}</Text>
            </View>
            <Text style={[styles.metricValue, { fontSize: 11 }]}>{formatCurrency(expense.amount)}</Text>
          </View>
          <View style={styles.miniGrid}>
            <View style={styles.miniCol}>
              <Text style={styles.metricLabel}>Paid By</Text>
              {expense.paidBy.slice(0, 4).map((row) => (
                <Text key={`${row.person}-paid`}>{row.person}: {formatCurrency(row.amount)}</Text>
              ))}
            </View>
            <View style={styles.miniCol}>
              <Text style={styles.metricLabel}>Shares</Text>
              {expense.shares.slice(0, 5).map((row) => (
                <Text key={`${row.person}-share`}>{row.person}: {formatCurrency(row.amount)}</Text>
              ))}
            </View>
          </View>
          {expense.items.length > 0 ? (
            <Text style={[styles.muted, { marginTop: 6 }]}>
              Items: {expense.items.slice(0, 5).map((item) => `${item.name} (${formatCurrency(item.amount)})`).join(", ")}
            </Text>
          ) : null}
          {expense.celebrationContribution ? (
            <Text style={[styles.muted, { marginTop: 4 }]}>
              Celebration contribution: {expense.celebrationContribution.person} • {formatCurrency(expense.celebrationContribution.amount)}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function PersonalExpenseAppendix({ expenses }: { expenses: PersonalExpenseLedgerRow[] }) {
  if (expenses.length === 0) return <EmptyState>No personal expense activity in this period.</EmptyState>;

  return (
    <View>
      {expenses.map((expense, index) => (
        <View key={`${expense.description}-${index}`} style={styles.appendixExpense} wrap={false}>
          <View style={styles.expenseHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expenseTitle}>{expense.description}</Text>
              <Text style={styles.muted}>{expense.category} • {expense.date} • {methodLabel(expense.splitMethod)}</Text>
            </View>
            <Text style={[styles.metricValue, { fontSize: 11 }]}>{formatCurrency(expense.amount)}</Text>
          </View>
          <View style={styles.miniGrid}>
            <View style={styles.miniCol}>
              <Text style={styles.metricLabel}>Personal Effect</Text>
              <Text>Paid: {formatCurrency(expense.paidByPerson)}</Text>
              <Text>Share: {formatCurrency(expense.shareForPerson)}</Text>
              <Text>Net: {expense.netEffect >= 0 ? "+" : ""}{formatCurrency(expense.netEffect)}</Text>
            </View>
            <View style={styles.miniCol}>
              <Text style={styles.metricLabel}>Participants</Text>
              {expense.shares.slice(0, 5).map((row) => (
                <Text key={`${row.person}-personal-share`}>{row.person}: {formatCurrency(row.amount)}</Text>
              ))}
            </View>
          </View>
          {expense.items.length > 0 ? (
            <Text style={[styles.muted, { marginTop: 6 }]}>
              Items: {expense.items.slice(0, 5).map((item) => `${item.name} (${formatCurrency(item.amount)})`).join(", ")}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>Generated by SettleEase</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function GroupSummaryPages({ model }: { model: GroupSummaryReportModel }) {
  return (
    <Page size="A4" style={styles.page}>
      <ReportHeader
        title={model.title}
        eyebrow="Group Summary"
        dateRangeLabel={model.dateRangeLabel}
        generatedAt={model.generatedAt}
        meta={[
          { label: "Participants", value: String(model.participantCount) },
          { label: "Balanced", value: String(model.settledParticipantCount) },
        ]}
      />
      <MetricStrip metrics={model.metrics} />
      <Section title="Recommended Settlement Actions" note={`${model.paymentActions.length} open actions`}>
        <PaymentActionsTable actions={model.paymentActions} />
      </Section>
      <View style={styles.twoCol}>
        <View style={styles.col}>
          <Section title="Balance Overview">
            <BalanceBars rows={model.balances} />
          </Section>
        </View>
        <View style={styles.col}>
          <Section title="Spending Drivers">
            <CategoryBars rows={model.categories} />
          </Section>
        </View>
      </View>
      <View style={styles.twoCol}>
        <View style={styles.col}>
          <Section title="Top Expenses">
            <SimpleRows
              rows={model.topExpenses.map((expense) => ({
                label: expense.description,
                value: formatCurrency(expense.amount),
                note: `${expense.category} • ${methodLabel(expense.splitMethod)}`,
              }))}
            />
          </Section>
        </View>
        <View style={styles.col}>
          <Section title="Split Methods">
            <SimpleRows
              rows={model.splitMethods.map((method) => ({
                label: methodLabel(method.method),
                value: String(method.count),
                note: `${method.share}% of expenses`,
              }))}
            />
          </Section>
        </View>
      </View>
      <View style={styles.twoCol}>
        <View style={styles.col}>
          <Section title="Manual Overrides">
            {model.manualOverrides.length > 0 ? (
              <SimpleRows
                rows={model.manualOverrides.map((override) => ({
                  label: `${override.debtor} pays ${override.creditor}`,
                  value: formatCurrency(override.amount),
                  note: override.notes || "Active manual path",
                }))}
              />
            ) : (
              <EmptyState>No active manual overrides.</EmptyState>
            )}
          </Section>
        </View>
        <View style={styles.col}>
          <Section title="Data Quality">
            <DataQualityPanel dataQuality={model.dataQuality} />
          </Section>
        </View>
      </View>
      <Section title="Expense Appendix" note={`${model.expenses.length} included expenses`}>
        <ExpenseAppendix expenses={model.expenses} />
      </Section>
      <Section title="Settlement Payment Ledger" note={`${model.settlements.length} recorded payments`}>
        <SettlementsTable settlements={model.settlements} />
      </Section>
      <Footer />
    </Page>
  );
}

function PersonalStatementPages({ model }: { model: PersonalStatementReportModel }) {
  return (
    <Page size="A4" style={styles.page}>
      <ReportHeader
        title={model.title}
        eyebrow="Personal Statement"
        dateRangeLabel={model.dateRangeLabel}
        generatedAt={model.generatedAt}
        meta={[
          { label: "Participant", value: model.personName },
          { label: "Redaction", value: model.redacted ? "On" : "Off" },
        ]}
      />
      <MetricStrip metrics={model.metrics} />
      <View style={styles.twoCol}>
        <View style={styles.col}>
          <Section title="Counterparty Balances">
            {model.counterparties.length > 0 ? (
              <SimpleRows
                rows={model.counterparties.map((row) => ({
                  label: row.name,
                  value: formatCurrency(row.amount),
                  note: row.direction,
                }))}
              />
            ) : (
              <EmptyState>No outstanding counterparty balance for this participant.</EmptyState>
            )}
          </Section>
        </View>
        <View style={styles.col}>
          <Section title="Data Quality">
            <DataQualityPanel dataQuality={model.dataQuality} />
          </Section>
        </View>
      </View>
      <Section title="Personal Expense Ledger" note={`${model.expenses.length} expenses`}>
        <PersonalExpenseAppendix expenses={model.expenses} />
      </Section>
      <Section title="Settlement History" note={`${model.settlements.length} payments`}>
        <SettlementsTable settlements={model.settlements} />
      </Section>
      <Footer />
    </Page>
  );
}

export default function ExportPdfDocument({ model }: { model: ExportReportModel }) {
  return (
    <Document
      title={model.title}
      author="SettleEase"
      subject={model.kind === "group" ? "Group settlement summary" : "Personal settlement statement"}
      creator="SettleEase"
      producer="SettleEase"
    >
      {model.kind === "group" ? (
        <GroupSummaryPages model={model} />
      ) : (
        <PersonalStatementPages model={model} />
      )}
    </Document>
  );
}
