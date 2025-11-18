import type {
  Person,
  Expense,
  SettlementPayment,
  CalculatedTransaction,
  ManualSettlementOverride,
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
 * Supports manual overrides that take precedence over optimized calculations
 */
export function calculateSimplifiedTransactions(
  people: Person[],
  expenses: Expense[],
  settlementPayments: SettlementPayment[],
  manualOverrides?: ManualSettlementOverride[]
): CalculatedTransaction[] {
  const netBalances = calculateNetBalances(
    people,
    expenses,
    settlementPayments
  );

  // If there are active manual overrides, apply them first
  const activeOverrides = (manualOverrides || []).filter(o => o.is_active);
  const transactions: CalculatedTransaction[] = [];
  
  if (activeOverrides.length > 0) {
    // Create a copy of net balances to track remaining amounts
    const remainingBalances = { ...netBalances };
    
    // Apply manual overrides first
    activeOverrides.forEach(override => {
      const debtorBalance = remainingBalances[override.debtor_id] || 0;
      const creditorBalance = remainingBalances[override.creditor_id] || 0;
      
      // Only apply override if debtor owes and creditor is owed
      if (debtorBalance < -0.01 && creditorBalance > 0.01) {
        // Calculate the actual amount that can be settled
        const maxSettleable = Math.min(
          Math.abs(debtorBalance),
          creditorBalance,
          override.amount
        );
        
        if (maxSettleable > 0.01) {
          transactions.push({
            from: override.debtor_id,
            to: override.creditor_id,
            amount: maxSettleable,
          });
          
          // Update remaining balances
          remainingBalances[override.debtor_id] += maxSettleable;
          remainingBalances[override.creditor_id] -= maxSettleable;
        }
      }
    });
    
    // Now calculate optimized transactions for remaining balances
    const remainingDebtors = Object.entries(remainingBalances)
      .filter(([_, balance]) => balance < -0.01)
      .map(([id, balance]) => ({ id, amount: Math.abs(balance) }))
      .sort((a, b) => b.amount - a.amount);

    const remainingCreditors = Object.entries(remainingBalances)
      .filter(([_, balance]) => balance > 0.01)
      .map(([id, balance]) => ({ id, amount: balance }))
      .sort((a, b) => b.amount - a.amount);

    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < remainingDebtors.length && creditorIndex < remainingCreditors.length) {
      const debtor = remainingDebtors[debtorIndex];
      const creditor = remainingCreditors[creditorIndex];

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

      if (debtor.amount < 0.01) debtorIndex++;
      if (creditor.amount < 0.01) creditorIndex++;
    }
    
    return transactions;
  }

  // No manual overrides - use standard optimized calculation
  const debtors = Object.entries(netBalances)
    .filter(([_, balance]) => balance < -0.01)
    .map(([id, balance]) => ({ id, amount: Math.abs(balance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = Object.entries(netBalances)
    .filter(([_, balance]) => balance > 0.01)
    .map(([id, balance]) => ({ id, amount: balance }))
    .sort((a, b) => b.amount - a.amount);

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

  const transactions: CalculatedTransaction[] = [];

  for (const debtorId in rawPairwiseDebts) {
    for (const creditorId in rawPairwiseDebts[debtorId]) {
      const transaction = rawPairwiseDebts[debtorId][creditorId];
      if (transaction.amount > 0.01) {
        transactions.push({
          from: debtorId,
          to: creditorId,
          amount: transaction.amount,
          contributingExpenseIds: Array.from(transaction.expenseIds),
        });
      }
    }
  }

  return transactions;
}
