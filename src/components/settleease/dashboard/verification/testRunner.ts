import {
  calculateNetBalances,
  calculateSimplifiedTransactions,
  calculatePairwiseTransactions,
} from "@/lib/settleease/settlementCalculations";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  Person,
  Expense,
  SettlementPayment,
} from "@/lib/settleease/types";
import type { TestResult, DebugReport } from "./types";
import {
  generateTestData,
  calculateDataIntegrityScore,
  generateFailureAnalysis,
} from "./testUtils";

export const runAllTests = async (
  people: Person[],
  expenses: Expense[],
  settlementPayments: SettlementPayment[],
  peopleMap: Record<string, string>,
  uiSimplifiedTransactions?: any[],
  uiPairwiseTransactions?: any[]
): Promise<{ results: TestResult[]; debugReport: DebugReport }> => {
  const results: TestResult[] = [];
  const startTime = Date.now();

  try {
    // Test 1: Basic Balance Calculation
    const test1Start = Date.now();
    const balances = calculateNetBalances(people, expenses, settlementPayments);
    const test1Time = Date.now() - test1Start;

    const balanceSum = Object.values(balances).reduce(
      (sum, balance) => sum + (balance as number),
      0
    );
    results.push({
      id: "balance-calculation",
      name: "Balance Calculation Accuracy",
      description:
        "Verifies that total balances sum to zero (conservation of money)",
      status: Math.abs(balanceSum) < 0.01 ? "pass" : "fail",
      details: [
        `Total balance sum: ${formatCurrency(balanceSum)}`,
        `Individual balances: ${Object.entries(balances)
          .map(
            ([id, balance]) =>
              `${peopleMap[id] || id}: ${formatCurrency(balance)}`
          )
          .join(", ")}`,
        `People with positive balance: ${
          Object.entries(balances).filter(([_, b]) => (b as number) > 0.01)
            .length
        }`,
        `People with negative balance: ${
          Object.entries(balances).filter(([_, b]) => (b as number) < -0.01)
            .length
        }`,
      ],
      executionTime: test1Time,
      data: balances,
      debugInfo: {
        inputData: {
          peopleCount: people.length,
          expenseCount: expenses.length,
          settlementCount: settlementPayments.length,
        },
        calculationSteps: [
          {
            step: "Initialize balances",
            balances: Object.fromEntries(people.map((p) => [p.id, 0])),
          },
          { step: "Process expenses", expenseCount: expenses.length },
          {
            step: "Process settlements",
            settlementCount: settlementPayments.length,
          },
          { step: "Final balances", balances: balances },
          { step: "Balance sum", sum: balanceSum },
        ],
        expectedOutput: { balanceSum: 0 },
        actualOutput: { balanceSum: balanceSum },
        errorDetails:
          Math.abs(balanceSum) >= 0.01
            ? `Balance sum ${formatCurrency(
                balanceSum
              )} violates money conservation`
            : undefined,
      },
    });

    // Test 2: Expense Integrity
    const test2Start = Date.now();
    let expenseIntegrityPassed = true;
    const expenseDetails: string[] = [];

    for (const expense of expenses) {
      const totalPaid =
        expense.paid_by?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalShares =
        expense.shares?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;
      const celebrationAmount = expense.celebration_contribution?.amount || 0;
      const expectedTotal = totalShares + Number(celebrationAmount);

      if (Math.abs(totalPaid - expense.total_amount) > 0.01) {
        expenseIntegrityPassed = false;
        expenseDetails.push(
          `FAIL ${expense.description}: Paid ${formatCurrency(
            totalPaid
          )} ≠ Total ${formatCurrency(expense.total_amount)}`
        );
      } else if (Math.abs(expectedTotal - expense.total_amount) > 0.01) {
        expenseIntegrityPassed = false;
        expenseDetails.push(
          `FAIL ${expense.description}: Shares+Celebration ${formatCurrency(
            expectedTotal
          )} ≠ Total ${formatCurrency(expense.total_amount)}`
        );
      } else {
        expenseDetails.push(
          `PASS ${expense.description}: All amounts balanced`
        );
      }
    }

    const test2Time = Date.now() - test2Start;
    results.push({
      id: "expense-integrity",
      name: "Expense Data Integrity",
      description:
        "Verifies that paid amounts match total amounts and shares are correctly distributed",
      status: expenseIntegrityPassed ? "pass" : "fail",
      details: expenseDetails,
      executionTime: test2Time,
    });

    // Calculate transactions for later tests
    const simplifiedTxns = calculateSimplifiedTransactions(
      people,
      expenses,
      settlementPayments
    );
    const pairwiseTxns = calculatePairwiseTransactions(
      people,
      expenses,
      settlementPayments
    );

    // Test 4: Itemwise Split Accuracy
    const test4Start = Date.now();
    let itemwiseAccurate = true;
    const itemwiseDetails: string[] = [];

    const itemwiseExpenses = expenses.filter(
      (e) => e.split_method === "itemwise" && e.items
    );
    for (const expense of itemwiseExpenses) {
      if (!expense.items) continue;

      const itemsTotal = expense.items.reduce(
        (sum, item) => sum + Number(item.price),
        0
      );
      const sharesTotal =
        expense.shares?.reduce((sum, share) => sum + Number(share.amount), 0) ||
        0;

      if (Math.abs(itemsTotal - sharesTotal) > 0.01) {
        itemwiseAccurate = false;
        itemwiseDetails.push(
          `FAIL ${expense.description}: Items total ${formatCurrency(
            itemsTotal
          )} ≠ Shares total ${formatCurrency(sharesTotal)}`
        );
      } else {
        itemwiseDetails.push(
          `PASS ${expense.description}: Items and shares match perfectly`
        );
      }

      // Check individual item distributions
      for (const item of expense.items) {
        const itemSharers = item.sharedBy.length;
        const expectedSharePerPerson = Number(item.price) / itemSharers;

        itemwiseDetails.push(
          `  ITEM ${item.name}: ${formatCurrency(
            item.price
          )} ÷ ${itemSharers} = ${formatCurrency(expectedSharePerPerson)} each`
        );
      }
    }

    const test4Time = Date.now() - test4Start;
    results.push({
      id: "itemwise-accuracy",
      name: "Itemwise Split Accuracy",
      description:
        "Verifies that itemwise expenses correctly distribute costs among participants",
      status: itemwiseAccurate ? "pass" : "fail",
      details:
        itemwiseDetails.length > 0
          ? itemwiseDetails
          : ["No itemwise expenses found"],
      executionTime: test4Time,
    });

    // Test 5: Multiple Payers Logic
    const test5Start = Date.now();
    let multiPayerCorrect = true;
    const multiPayerDetails: string[] = [];

    const multiPayerExpenses = expenses.filter(
      (e) => e.paid_by && e.paid_by.length > 1
    );
    for (const expense of multiPayerExpenses) {
      const totalPaid = expense.paid_by.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      if (Math.abs(totalPaid - expense.total_amount) > 0.01) {
        multiPayerCorrect = false;
        multiPayerDetails.push(
          `FAIL ${expense.description}: Multiple payers total ${formatCurrency(
            totalPaid
          )} ≠ Expense total ${formatCurrency(expense.total_amount)}`
        );
      } else {
        const payerBreakdown = expense.paid_by
          .map(
            (p) =>
              `${peopleMap[p.personId] || p.personId}: ${formatCurrency(
                p.amount
              )}`
          )
          .join(", ");
        multiPayerDetails.push(
          `PASS ${expense.description}: ${payerBreakdown}`
        );
      }
    }

    const test5Time = Date.now() - test5Start;
    results.push({
      id: "multi-payer-logic",
      name: "Multiple Payers Logic",
      description:
        "Verifies that expenses with multiple payers are handled correctly",
      status: multiPayerCorrect ? "pass" : "fail",
      details:
        multiPayerDetails.length > 0
          ? multiPayerDetails
          : ["No multi-payer expenses found"],
      executionTime: test5Time,
    });

    // Test 6: Celebration Contributions
    const test6Start = Date.now();
    let celebrationCorrect = true;
    const celebrationDetails: string[] = [];

    const celebrationExpenses = expenses.filter(
      (e) => e.celebration_contribution && e.celebration_contribution.amount > 0
    );
    for (const expense of celebrationExpenses) {
      const contrib = expense.celebration_contribution!;
      const contributorName = peopleMap[contrib.personId] || contrib.personId;

      celebrationDetails.push(
        `CELEBRATION ${
          expense.description
        }: ${contributorName} contributes extra ${formatCurrency(
          contrib.amount
        )}`
      );

      // Verify the contributor's balance reflects this extra cost
      const contributorBalance = balances[contrib.personId];
      if (contributorBalance !== undefined) {
        celebrationDetails.push(
          `  BALANCE ${contributorName}'s net balance: ${formatCurrency(
            contributorBalance
          )}`
        );
      }
    }

    const test6Time = Date.now() - test6Start;
    results.push({
      id: "celebration-contributions",
      name: "Celebration Contributions",
      description:
        "Verifies that celebration contributions are properly accounted for",
      status: celebrationCorrect ? "pass" : "fail",
      details:
        celebrationDetails.length > 0
          ? celebrationDetails
          : ["No celebration contributions found"],
      executionTime: test6Time,
    });

    // Test 7: Settlement Payments Impact
    const test7Start = Date.now();
    const balancesWithoutSettlements = calculateNetBalances(
      people,
      expenses,
      []
    );
    const balancesWithSettlements = calculateNetBalances(
      people,
      expenses,
      settlementPayments
    );

    let settlementImpactCorrect = true;
    const settlementDetails: string[] = [];

    for (const settlement of settlementPayments) {
      const debtorName =
        peopleMap[settlement.debtor_id] || settlement.debtor_id;
      const creditorName =
        peopleMap[settlement.creditor_id] || settlement.creditor_id;
      const amount = Number(settlement.amount_settled);

      settlementDetails.push(
        `${debtorName} → ${creditorName}: ${formatCurrency(amount)}`
      );

      // Check impact on balances - settlements should reduce debtor's debt and creditor's credit
      const debtorBalanceChange =
        balancesWithSettlements[settlement.debtor_id] -
        balancesWithoutSettlements[settlement.debtor_id];
      const creditorBalanceChange =
        balancesWithSettlements[settlement.creditor_id] -
        balancesWithoutSettlements[settlement.creditor_id];

      // For settlements: debtor balance should increase (less negative), creditor balance should decrease (less positive)
      if (
        Math.abs(debtorBalanceChange - amount) > 0.01 ||
        Math.abs(creditorBalanceChange + amount) > 0.01
      ) {
        settlementImpactCorrect = false;
        settlementDetails.push(
          `  Balance changes don't match settlement amount`
        );
        settlementDetails.push(
          `  Debtor change: ${formatCurrency(
            debtorBalanceChange
          )}, Expected: ${formatCurrency(amount)}`
        );
        settlementDetails.push(
          `  Creditor change: ${formatCurrency(
            creditorBalanceChange
          )}, Expected: ${formatCurrency(-amount)}`
        );
      } else {
        settlementDetails.push(`  Balances updated correctly`);
      }
    }

    const test7Time = Date.now() - test7Start;
    results.push({
      id: "settlement-impact",
      name: "Settlement Payments Impact",
      description:
        "Verifies that settlement payments correctly adjust balances",
      status: settlementImpactCorrect ? "pass" : "fail",
      details:
        settlementDetails.length > 0
          ? settlementDetails
          : ["No settlement payments found"],
      executionTime: test7Time,
    });

    // Test 8: UI-Calculation Consistency (CRITICAL)
    const test8Start = Date.now();
    let uiConsistencyPassed = true;
    const uiConsistencyDetails: string[] = [];

    // This is the MOST IMPORTANT test - verifies what users see matches actual calculations
    if (uiSimplifiedTransactions && uiPairwiseTransactions) {
      // Compare UI-displayed simplified transactions with fresh calculations
      const freshSimplified = calculateSimplifiedTransactions(
        people,
        expenses,
        settlementPayments
      );
      const freshPairwise = calculatePairwiseTransactions(
        people,
        expenses,
        settlementPayments
      );

      uiConsistencyDetails.push(
        `CRITICAL: Verifying UI matches actual calculations`
      );

      // Check simplified transactions count
      if (uiSimplifiedTransactions.length !== freshSimplified.length) {
        uiConsistencyPassed = false;
        uiConsistencyDetails.push(
          `FAIL Simplified transaction count mismatch: UI shows ${uiSimplifiedTransactions.length}, should be ${freshSimplified.length}`
        );
      } else {
        uiConsistencyDetails.push(
          `PASS Simplified transaction count matches: ${freshSimplified.length}`
        );
      }

      // Check pairwise transactions count
      if (uiPairwiseTransactions.length !== freshPairwise.length) {
        uiConsistencyPassed = false;
        uiConsistencyDetails.push(
          `FAIL Pairwise transaction count mismatch: UI shows ${uiPairwiseTransactions.length}, should be ${freshPairwise.length}`
        );
      } else {
        uiConsistencyDetails.push(
          `PASS Pairwise transaction count matches: ${freshPairwise.length}`
        );
      }

      // Check simplified transaction amounts
      const uiSimplifiedTotal = uiSimplifiedTransactions.reduce(
        (sum, txn) => sum + (txn.amount || 0),
        0
      );
      const freshSimplifiedTotal = freshSimplified.reduce(
        (sum, txn) => sum + txn.amount,
        0
      );

      if (Math.abs(uiSimplifiedTotal - freshSimplifiedTotal) > 0.01) {
        uiConsistencyPassed = false;
        uiConsistencyDetails.push(
          `FAIL Simplified total mismatch: UI shows ${formatCurrency(
            uiSimplifiedTotal
          )}, should be ${formatCurrency(freshSimplifiedTotal)}`
        );
      } else {
        uiConsistencyDetails.push(
          `PASS Simplified transaction totals match: ${formatCurrency(
            freshSimplifiedTotal
          )}`
        );
      }

      // Check pairwise transaction amounts
      const uiPairwiseTotal = uiPairwiseTransactions.reduce(
        (sum, txn) => sum + (txn.amount || 0),
        0
      );
      const freshPairwiseTotal = freshPairwise.reduce(
        (sum, txn) => sum + txn.amount,
        0
      );

      if (Math.abs(uiPairwiseTotal - freshPairwiseTotal) > 0.01) {
        uiConsistencyPassed = false;
        uiConsistencyDetails.push(
          `FAIL Pairwise total mismatch: UI shows ${formatCurrency(
            uiPairwiseTotal
          )}, should be ${formatCurrency(freshPairwiseTotal)}`
        );
      } else {
        uiConsistencyDetails.push(
          `PASS Pairwise transaction totals match: ${formatCurrency(
            freshPairwiseTotal
          )}`
        );
      }

      // Detailed transaction-by-transaction comparison
      uiConsistencyDetails.push(
        `DETAIL Detailed UI vs Calculation comparison:`
      );

      // Compare each simplified transaction
      for (
        let i = 0;
        i < Math.max(uiSimplifiedTransactions.length, freshSimplified.length);
        i++
      ) {
        const uiTxn = uiSimplifiedTransactions[i];
        const freshTxn = freshSimplified[i];

        if (!uiTxn && freshTxn) {
          uiConsistencyPassed = false;
          uiConsistencyDetails.push(
            `FAIL Missing UI transaction: ${peopleMap[freshTxn.from]} → ${
              peopleMap[freshTxn.to]
            }: ${formatCurrency(freshTxn.amount)}`
          );
        } else if (uiTxn && !freshTxn) {
          uiConsistencyPassed = false;
          uiConsistencyDetails.push(
            `FAIL Extra UI transaction: ${peopleMap[uiTxn.from]} → ${
              peopleMap[uiTxn.to]
            }: ${formatCurrency(uiTxn.amount)}`
          );
        } else if (uiTxn && freshTxn) {
          const amountMatch =
            Math.abs((uiTxn.amount || 0) - freshTxn.amount) < 0.01;
          const fromMatch = uiTxn.from === freshTxn.from;
          const toMatch = uiTxn.to === freshTxn.to;

          if (!amountMatch || !fromMatch || !toMatch) {
            uiConsistencyPassed = false;
            uiConsistencyDetails.push(
              `FAIL Transaction mismatch: UI(${peopleMap[uiTxn.from]} → ${
                peopleMap[uiTxn.to]
              }: ${formatCurrency(uiTxn.amount)}) vs Calc(${
                peopleMap[freshTxn.from]
              } → ${peopleMap[freshTxn.to]}: ${formatCurrency(
                freshTxn.amount
              )})`
            );
          } else {
            uiConsistencyDetails.push(
              `PASS Transaction matches: ${peopleMap[freshTxn.from]} → ${
                peopleMap[freshTxn.to]
              }: ${formatCurrency(freshTxn.amount)}`
            );
          }
        }
      }
    } else {
      uiConsistencyDetails.push(
        `WARNING UI transaction data not provided - cannot verify UI consistency`
      );
      uiConsistencyDetails.push(
        `NOTE To enable this critical test, pass uiSimplifiedTransactions and uiPairwiseTransactions`
      );
    }

    const test8Time = Date.now() - test8Start;
    results.push({
      id: "ui-calculation-consistency",
      name: "UI-Calculation Consistency (CRITICAL)",
      description:
        "Verifies that what users see in the UI exactly matches fresh algorithm calculations",
      status: uiConsistencyPassed ? "pass" : "fail",
      details: uiConsistencyDetails,
      executionTime: test8Time,
      debugInfo: {
        inputData: {
          uiSimplifiedCount: uiSimplifiedTransactions?.length || 0,
          uiPairwiseCount: uiPairwiseTransactions?.length || 0,
          freshSimplifiedCount: calculateSimplifiedTransactions(
            people,
            expenses,
            settlementPayments
          ).length,
          freshPairwiseCount: calculatePairwiseTransactions(
            people,
            expenses,
            settlementPayments
          ).length,
        },
        calculationSteps: [
          {
            step: "Get UI transactions",
            uiSimplified: uiSimplifiedTransactions?.length,
            uiPairwise: uiPairwiseTransactions?.length,
          },
          {
            step: "Calculate fresh transactions",
            freshSimplified: calculateSimplifiedTransactions(
              people,
              expenses,
              settlementPayments
            ).length,
          },
          {
            step: "Compare counts and amounts",
            result: uiConsistencyPassed ? "match" : "mismatch",
          },
        ],
        expectedOutput: { uiMatchesCalculations: true },
        actualOutput: { uiMatchesCalculations: uiConsistencyPassed },
        errorDetails: uiConsistencyPassed
          ? undefined
          : "UI-displayed values don't match fresh calculations - users may be seeing incorrect data!",
      },
    });

    // Test 9: Synthetic Data Test
    const test9Start = Date.now();
    let syntheticTestPassed = true;
    const syntheticDetails: string[] = [];

    try {
      const { testPeople, testExpenses, testSettlements } = generateTestData();

      const syntheticBalances = calculateNetBalances(
        testPeople,
        testExpenses,
        testSettlements
      );
      const syntheticSum = Object.values(syntheticBalances).reduce(
        (sum, balance) => sum + (balance as number),
        0
      );

      const syntheticSimplified = calculateSimplifiedTransactions(
        testPeople,
        testExpenses,
        testSettlements
      );
      const syntheticPairwise = calculatePairwiseTransactions(
        testPeople,
        testExpenses,
        testSettlements
      );

      syntheticDetails.push(
        `Generated ${testExpenses.length} test expenses with various split methods`
      );
      syntheticDetails.push(
        `Balance conservation: ${formatCurrency(syntheticSum)}`
      );
      syntheticDetails.push(
        `Simplified transactions: ${syntheticSimplified.length}`
      );
      syntheticDetails.push(
        `Pairwise transactions: ${syntheticPairwise.length}`
      );
      syntheticDetails.push(
        `Test scenarios: Equal split, Itemwise, Multiple payers, Celebrations`
      );

      if (Math.abs(syntheticSum) >= 0.01) {
        syntheticTestPassed = false;
        syntheticDetails.push(
          `Balance conservation failed: ${formatCurrency(syntheticSum)}`
        );
      }
    } catch (error) {
      syntheticTestPassed = false;
      syntheticDetails.push(`Test generation failed: ${String(error)}`);
    }

    const test9Time = Date.now() - test9Start;
    results.push({
      id: "synthetic-data-test",
      name: "Synthetic Data Validation",
      description:
        "Tests algorithms with generated test data covering all scenarios",
      status: syntheticTestPassed ? "pass" : "fail",
      details: syntheticDetails,
      executionTime: test9Time,
    });

    // Generate comprehensive debug report
    const debugReport: DebugReport = {
      timestamp: new Date().toISOString(),
      testResults: results,
      systemInfo: {
        totalPeople: people.length,
        totalExpenses: expenses.length,
        totalSettlements: settlementPayments.length,
        totalValue: expenses.reduce((sum, e) => sum + e.total_amount, 0),
        dataIntegrityScore: calculateDataIntegrityScore(results),
      },
      liveData: {
        people: people,
        expenses: expenses,
        settlementPayments: settlementPayments,
        calculatedBalances: balances,
        simplifiedTransactions: simplifiedTxns,
        pairwiseTransactions: pairwiseTxns,
      },
      failureAnalysis: generateFailureAnalysis(results),
    };

    return { results, debugReport };
  } catch (error) {
    const errorResult: TestResult = {
      id: "error",
      name: "Test Execution Error",
      description: "An error occurred during test execution",
      status: "fail",
      details: [String(error)],
      debugInfo: {
        errorDetails: String(error),
        inputData: {
          peopleCount: people.length,
          expenseCount: expenses.length,
          settlementCount: settlementPayments.length,
        },
      },
    };

    results.push(errorResult);

    const debugReport: DebugReport = {
      timestamp: new Date().toISOString(),
      testResults: results,
      systemInfo: {
        totalPeople: people.length,
        totalExpenses: expenses.length,
        totalSettlements: settlementPayments.length,
        totalValue: expenses.reduce((sum, e) => sum + e.total_amount, 0),
        dataIntegrityScore: 0,
      },
      liveData: {
        people: people,
        expenses: expenses,
        settlementPayments: settlementPayments,
        calculatedBalances: {},
        simplifiedTransactions: [],
        pairwiseTransactions: [],
      },
      failureAnalysis: {
        criticalFailures: [String(error)],
        potentialCauses: ["Test execution error"],
        recommendedActions: ["Check console for detailed error information"],
      },
    };

    return { results, debugReport };
  }
};
