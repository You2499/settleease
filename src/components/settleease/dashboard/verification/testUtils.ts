import type { Person, Expense, SettlementPayment } from "@/lib/settleease/types";
import type { TestResult, DebugReport } from "./types";
import { formatCurrency } from "@/lib/settleease/utils";

// Generate test data for comprehensive testing
export const generateTestData = () => {
  const testPeople: Person[] = [
    { id: "test-1", name: "Alice" },
    { id: "test-2", name: "Bob" },
    { id: "test-3", name: "Charlie" },
    { id: "test-4", name: "Diana" },
  ];

  const testExpenses: Expense[] = [
    // Equal split expense
    {
      id: "exp-1",
      description: "Restaurant Bill",
      total_amount: 1000,
      category: "Food",
      paid_by: [{ personId: "test-1", amount: 1000 }],
      split_method: "equal",
      shares: [
        { personId: "test-1", amount: 250 },
        { personId: "test-2", amount: 250 },
        { personId: "test-3", amount: 250 },
        { personId: "test-4", amount: 250 },
      ],
    },
    // Itemwise split expense
    {
      id: "exp-2",
      description: "Grocery Shopping",
      total_amount: 800,
      category: "Food",
      paid_by: [{ personId: "test-2", amount: 800 }],
      split_method: "itemwise",
      shares: [
        { personId: "test-1", amount: 200 },
        { personId: "test-2", amount: 300 },
        { personId: "test-3", amount: 300 },
      ],
      items: [
        {
          id: "item-1",
          name: "Vegetables",
          price: 200,
          sharedBy: ["test-1"],
        },
        {
          id: "item-2",
          name: "Meat",
          price: 300,
          sharedBy: ["test-2"],
        },
        {
          id: "item-3",
          name: "Dairy",
          price: 300,
          sharedBy: ["test-3"],
        },
      ],
    },
    // Multiple payers expense
    {
      id: "exp-3",
      description: "Hotel Bill",
      total_amount: 2000,
      category: "Hotel",
      paid_by: [
        { personId: "test-1", amount: 1200 },
        { personId: "test-3", amount: 800 },
      ],
      split_method: "equal",
      shares: [
        { personId: "test-1", amount: 500 },
        { personId: "test-2", amount: 500 },
        { personId: "test-3", amount: 500 },
        { personId: "test-4", amount: 500 },
      ],
    },
    // Celebration contribution expense
    {
      id: "exp-4",
      description: "Birthday Party",
      total_amount: 1500,
      category: "Food",
      paid_by: [{ personId: "test-4", amount: 1500 }],
      split_method: "equal",
      shares: [
        { personId: "test-1", amount: 375 },
        { personId: "test-2", amount: 375 },
        { personId: "test-3", amount: 375 },
        { personId: "test-4", amount: 375 },
      ],
      celebration_contribution: {
        personId: "test-2",
        amount: 200,
      },
    },
  ];

  const testSettlements: SettlementPayment[] = [
    {
      id: "settle-1",
      debtor_id: "test-2",
      creditor_id: "test-1",
      amount_settled: 100,
      settled_at: new Date().toISOString(),
      marked_by_user_id: "admin",
      status: "pending",
    },
  ];

  return { testPeople, testExpenses, testSettlements };
};

// Calculate data integrity score based on test results
export const calculateDataIntegrityScore = (results: TestResult[]): number => {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.status === "pass").length;
  const warningTests = results.filter(r => r.status === "warning").length;
  
  // Pass = 1 point, Warning = 0.5 points, Fail = 0 points
  const score = (passedTests + (warningTests * 0.5)) / totalTests * 100;
  return Math.round(score * 100) / 100;
};

// Generate failure analysis for debugging
export const generateFailureAnalysis = (results: TestResult[]) => {
  const failures = results.filter(r => r.status === "fail");
  const warnings = results.filter(r => r.status === "warning");
  
  if (failures.length === 0 && warnings.length === 0) return undefined;

  const criticalFailures = failures.map(f => `${f.name}: ${f.details.find(d => d.includes("❌")) || "Unknown error"}`);
  
  const potentialCauses = [];
  const recommendedActions = [];

  // Analyze specific failure patterns
  if (failures.some(f => f.id === "balance-calculation")) {
    potentialCauses.push("Money conservation violation - total balances don't sum to zero");
    recommendedActions.push("Check for data corruption in expenses or settlement payments");
  }

  if (failures.some(f => f.id === "expense-integrity")) {
    potentialCauses.push("Expense data inconsistency - paid amounts don't match totals");
    recommendedActions.push("Verify expense creation logic and database constraints");
  }

  if (failures.some(f => f.id === "itemwise-accuracy")) {
    potentialCauses.push("Itemwise splitting calculation errors");
    recommendedActions.push("Review itemwise expense calculation algorithms");
  }

  if (warnings.some(w => w.id === "edge-cases-stress-test")) {
    potentialCauses.push("Data integrity issues or edge cases detected");
    recommendedActions.push("Clean up orphaned data and validate all references");
  }

  return {
    criticalFailures,
    potentialCauses: potentialCauses.length > 0 ? potentialCauses : ["Unknown cause - requires detailed analysis"],
    recommendedActions: recommendedActions.length > 0 ? recommendedActions : ["Contact support with debug report"],
  };
};

// Generate comprehensive debug report for sharing
export const generateDebugReportText = (
  debugReport: DebugReport | null,
  peopleMap: Record<string, string>
): string => {
  if (!debugReport) return "No debug report available. Please run tests first.";

  const report = `
# SettleEase Algorithm Verification Debug Report
Generated: ${new Date(debugReport.timestamp).toLocaleString()}

## System Overview
- People: ${debugReport.systemInfo.totalPeople}
- Expenses: ${debugReport.systemInfo.totalExpenses}
- Settlements: ${debugReport.systemInfo.totalSettlements}
- Total Value: ${formatCurrency(debugReport.systemInfo.totalValue)}
- Data Integrity Score: ${debugReport.systemInfo.dataIntegrityScore}%

## Test Results Summary
${debugReport.testResults.map(test => `
### ${test.name} - ${test.status.toUpperCase()}
${test.description}
Execution Time: ${test.executionTime}ms

Details:
${test.details.map(detail => `- ${detail}`).join('\n')}
`).join('\n')}

## Live Data Snapshot
### People (${debugReport.liveData.people.length})
${debugReport.liveData.people.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}

### Calculated Balances
${Object.entries(debugReport.liveData.calculatedBalances).map(([id, balance]) => 
  `- ${peopleMap[id] || id}: ${formatCurrency(balance as number)}`
).join('\n')}

### Current Expenses (${debugReport.liveData.expenses.length})
${debugReport.liveData.expenses.map(e => `
- ${e.description}: ${formatCurrency(e.total_amount)} (${e.split_method})
  Paid by: ${e.paid_by?.map(p => `${peopleMap[p.personId] || p.personId}: ${formatCurrency(p.amount)}`).join(', ')}
  Shares: ${e.shares?.map(s => `${peopleMap[s.personId] || s.personId}: ${formatCurrency(s.amount)}`).join(', ')}
`).join('\n')}

### Settlement Transactions
Simplified (${debugReport.liveData.simplifiedTransactions.length}):
${debugReport.liveData.simplifiedTransactions.map(t => 
  `- ${peopleMap[t.from] || t.from} → ${peopleMap[t.to] || t.to}: ${formatCurrency(t.amount)}`
).join('\n')}

Pairwise (${debugReport.liveData.pairwiseTransactions.length}):
${debugReport.liveData.pairwiseTransactions.map(t => 
  `- ${peopleMap[t.from] || t.from} → ${peopleMap[t.to] || t.to}: ${formatCurrency(t.amount)}`
).join('\n')}

${debugReport.failureAnalysis ? `
## Failure Analysis
### Critical Failures
${debugReport.failureAnalysis.criticalFailures.map(f => `- ${f}`).join('\n')}

### Potential Causes
${debugReport.failureAnalysis.potentialCauses.map(c => `- ${c}`).join('\n')}

### Recommended Actions
${debugReport.failureAnalysis.recommendedActions.map(a => `- ${a}`).join('\n')}
` : '## No Critical Issues Detected'}

## Raw Data (JSON)
\`\`\`json
${JSON.stringify(debugReport.liveData, null, 2)}
\`\`\`

---
This report contains all necessary information for debugging algorithm issues.
Please share this complete report when seeking technical support.
`;

  return report;
};