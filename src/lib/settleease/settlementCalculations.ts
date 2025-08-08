import type {
  Person,
  Expense,
  SettlementPayment,
  CalculatedTransaction,
} from "./types";

/**
 * Calculate net balances for each person based on expenses and settlement payments
 */
export function calculateNetBalances(
  people: Person[],
  expenses: Expense[],
  settlementPayments: SettlementPayment[]
): Record<string, number> {
  const balances: Record<string, number> = {};

  // Initialize balances
  people.forEach((p) => (balances[p.id] = 0));

  // Process expenses
  expenses.forEach((expense) => {
    // Credit payers
    if (Array.isArray(expense.paid_by)) {
      expense.paid_by.forEach((payment) => {
        balances[payment.personId] =
          (balances[payment.personId] || 0) + Number(payment.amount);
      });
    }

    // Debit for consumption shares
    if (Array.isArray(expense.shares)) {
      expense.shares.forEach((share) => {
        balances[share.personId] =
          (balances[share.personId] || 0) - Number(share.amount);
      });
    }

    // Debit for celebration contribution
    if (
      expense.celebration_contribution &&
      expense.celebration_contribution.amount > 0
    ) {
      const contributorId = expense.celebration_contribution.personId;
      const contributionAmount = Number(
        expense.celebration_contribution.amount
      );
      balances[contributorId] =
        (balances[contributorId] || 0) - contributionAmount;
    }
  });

  // Adjust for settlement payments
  settlementPayments.forEach((payment) => {
    if (balances[payment.debtor_id] !== undefined) {
      balances[payment.debtor_id] += Number(payment.amount_settled);
    }
    if (balances[payment.creditor_id] !== undefined) {
      balances[payment.creditor_id] -= Number(payment.amount_settled);
    }
  });

  return balances;
}

/**
 * Calculate simplified transactions to settle all debts optimally
 */
export function calculateSimplifiedTransactions(
  people: Person[],
  expenses: Expense[],
  settlementPayments: SettlementPayment[]
): CalculatedTransaction[] {
  const netBalances = calculateNetBalances(
    people,
    expenses,
    settlementPayments
  );

  // Separate debtors and creditors based on net balances
  const debtors = Object.entries(netBalances)
    .filter(([_, balance]) => balance < -0.01)
    .map(([id, balance]) => ({ id, amount: Math.abs(balance) }))
    .sort((a, b) => b.amount - a.amount); // Sort by amount descending

  const creditors = Object.entries(netBalances)
    .filter(([_, balance]) => balance > 0.01)
    .map(([id, balance]) => ({ id, amount: balance }))
    .sort((a, b) => b.amount - a.amount); // Sort by amount descending

  const transactions: CalculatedTransaction[] = [];

  // Use a greedy approach to minimize number of transactions
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const settlementAmount = Math.min(debtor.amount, creditor.amount);

    if (settlementAmount > 0.01) {
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: settlementAmount,
      });

      debtor.amount -= settlementAmount;
      creditor.amount -= settlementAmount;
    }

    // Move to next debtor/creditor if current one is settled
    if (debtor.amount < 0.01) debtorIndex++;
    if (creditor.amount < 0.01) creditorIndex++;
  }

  return transactions;
}

/**
 * Calculate pairwise transactions (direct debts between specific people)
 */
export function calculatePairwiseTransactions(
  people: Person[],
  expenses: Expense[],
  settlementPayments: SettlementPayment[]
): CalculatedTransaction[] {
  // Calculate raw pairwise debts from expenses
  const rawPairwiseDebts: Record<
    string,
    Record<string, { amount: number; expenseIds: Set<string> }>
  > = {};

  expenses.forEach((expense) => {
    if (
      expense.total_amount <= 0.001 ||
      !Array.isArray(expense.paid_by) ||
      expense.paid_by.length === 0
    )
      return;

    const obligations: Record<string, number> = {};

    // Aggregate all obligations (shares + celebrations)
    if (Array.isArray(expense.shares)) {
      expense.shares.forEach((share) => {
        obligations[share.personId] =
          (obligations[share.personId] || 0) + Number(share.amount);
      });
    }
    if (
      expense.celebration_contribution &&
      expense.celebration_contribution.amount > 0.001
    ) {
      const contributorId = expense.celebration_contribution.personId;
      const contributionAmount = Number(
        expense.celebration_contribution.amount
      );
      obligations[contributorId] =
        (obligations[contributorId] || 0) + contributionAmount;
    }

    const totalPaidInExpense = expense.paid_by.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    if (totalPaidInExpense <= 0.001) return;

    // Distribute obligations as debts to payers
    for (const debtorId in obligations) {
      const totalOwedByDebtor = obligations[debtorId];
      if (totalOwedByDebtor <= 0.001) continue;

      expense.paid_by.forEach((payment) => {
        const payerId = payment.personId;
        if (debtorId === payerId) return;

        const proportionPaidByThisPayer =
          Number(payment.amount) / totalPaidInExpense;
        const amountOwedToThisPayer =
          totalOwedByDebtor * proportionPaidByThisPayer;

        if (amountOwedToThisPayer > 0.001) {
          if (!rawPairwiseDebts[debtorId]) rawPairwiseDebts[debtorId] = {};
          if (!rawPairwiseDebts[debtorId][payerId]) {
            rawPairwiseDebts[debtorId][payerId] = {
              amount: 0,
              expenseIds: new Set(),
            };
          }

          rawPairwiseDebts[debtorId][payerId].amount += amountOwedToThisPayer;
          rawPairwiseDebts[debtorId][payerId].expenseIds.add(expense.id);
        }
      });
    }
  });

  // Calculate net settlement balance for each person
  const netSettlementBalances: Record<string, number> = {};
  people.forEach((p) => (netSettlementBalances[p.id] = 0));

  settlementPayments.forEach((sp) => {
    const amount = Number(sp.amount_settled);
    netSettlementBalances[sp.debtor_id] =
      (netSettlementBalances[sp.debtor_id] || 0) + amount;
    netSettlementBalances[sp.creditor_id] =
      (netSettlementBalances[sp.creditor_id] || 0) - amount;
  });

  // Calculate total debt obligations for each person
  const totalDebtObligations: Record<string, number> = {};
  people.forEach((p) => (totalDebtObligations[p.id] = 0));

  for (const debtorId in rawPairwiseDebts) {
    for (const creditorId in rawPairwiseDebts[debtorId]) {
      totalDebtObligations[debtorId] +=
        rawPairwiseDebts[debtorId][creditorId].amount;
    }
  }

  // Calculate settled amounts for specific debtor-creditor pairs
  const settledAmountsMap: Record<string, Record<string, number>> = {};
  settlementPayments.forEach((sp) => {
    if (!settledAmountsMap[sp.debtor_id]) settledAmountsMap[sp.debtor_id] = {};
    settledAmountsMap[sp.debtor_id][sp.creditor_id] =
      (settledAmountsMap[sp.debtor_id][sp.creditor_id] || 0) +
      Number(sp.amount_settled);
  });

  const transactions: CalculatedTransaction[] = [];

  for (const debtorId in rawPairwiseDebts) {
    // Check if this person has settled all their debts through any payments
    const hasSettledAllDebts =
      netSettlementBalances[debtorId] >= totalDebtObligations[debtorId] - 0.01;

    if (hasSettledAllDebts) {
      continue; // Skip all debts for this person as they've settled everything
    }

    for (const creditorId in rawPairwiseDebts[debtorId]) {
      let netAmount = rawPairwiseDebts[debtorId][creditorId].amount;
      const alreadySettled = settledAmountsMap[debtorId]?.[creditorId] || 0;
      netAmount -= alreadySettled;

      if (netAmount > 0.01) {
        transactions.push({
          from: debtorId,
          to: creditorId,
          amount: netAmount,
          contributingExpenseIds: Array.from(
            rawPairwiseDebts[debtorId][creditorId].expenseIds
          ),
        });
      }
    }
  }

  return transactions;
}
