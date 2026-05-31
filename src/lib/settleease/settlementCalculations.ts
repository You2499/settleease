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

  const excludedExpenseIds = new Set(
    expenses.filter((e) => e.exclude_from_settlement).map((e) => e.id)
  );

  const lahuExcludedExpenses = expenses.filter(
    (e) => e.exclude_from_settlement && e.exclusion_strategy === "lahu_debt_settlement"
  );

  // Process expenses (excluding those marked as exclude_from_settlement)
  expenses.forEach((expense) => {
    // Skip expenses excluded from settlement calculations
    if (expense.exclude_from_settlement) {
      return;
    }
    
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
    if (payment.is_archived) {
      return;
    }
    if (payment.associated_expense_id && excludedExpenseIds.has(payment.associated_expense_id)) {
      return;
    }
    
    // Skip if legacy-general entangled with a Lahu-excluded expense
    const isLegacyGeneralEntangled = lahuExcludedExpenses.some((expense) => {
      const expenseDate = new Date(expense.created_at || 0).getTime();
      const paymentDate = new Date(payment.settled_at).getTime();
      
      const expenseParticipantIds = new Set([
        ...(expense.paid_by ?? []).map((p) => p.personId),
        ...(expense.shares ?? []).map((s) => s.personId),
      ]);

      return (
        !payment.associated_expense_id &&
        expenseParticipantIds.has(payment.debtor_id) &&
        expenseParticipantIds.has(payment.creditor_id) &&
        paymentDate >= expenseDate - 60000
      );
    });

    if (isLegacyGeneralEntangled) {
      return;
    }
    if (balances[payment.debtor_id] !== undefined) {
      balances[payment.debtor_id] += Number(payment.amount_settled);
    }
    if (balances[payment.creditor_id] !== undefined) {
      balances[payment.creditor_id] -= Number(payment.amount_settled);
    }
  });

  // Round balances to 2 decimal places to avoid floating point issues
  Object.keys(balances).forEach((id) => {
    balances[id] = Math.round(balances[id] * 100) / 100;
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
      if (debtorBalance <= -0.01 && creditorBalance >= 0.01) {
        // Calculate the actual amount that can be settled
        const maxSettleable = Math.round(
          Math.min(
            Math.abs(debtorBalance),
            creditorBalance,
            override.amount
          ) * 100
        ) / 100;
        
        if (maxSettleable >= 0.01) {
          transactions.push({
            from: override.debtor_id,
            to: override.creditor_id,
            amount: maxSettleable,
          });
          
          // Update remaining balances
          remainingBalances[override.debtor_id] = Math.round((remainingBalances[override.debtor_id] + maxSettleable) * 100) / 100;
          remainingBalances[override.creditor_id] = Math.round((remainingBalances[override.creditor_id] - maxSettleable) * 100) / 100;
        }
      }
    });
    
    // Now calculate optimized transactions for remaining balances
    const remainingDebtors = Object.entries(remainingBalances)
      .filter(([_, balance]) => balance <= -0.01)
      .map(([id, balance]) => ({ id, amount: Math.abs(balance) }))
      .sort((a, b) => b.amount - a.amount);

    const remainingCreditors = Object.entries(remainingBalances)
      .filter(([_, balance]) => balance >= 0.01)
      .map(([id, balance]) => ({ id, amount: balance }))
      .sort((a, b) => b.amount - a.amount);

    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < remainingDebtors.length && creditorIndex < remainingCreditors.length) {
      const debtor = remainingDebtors[debtorIndex];
      const creditor = remainingCreditors[creditorIndex];

      const settlementAmount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

      if (settlementAmount >= 0.01) {
        transactions.push({
          from: debtor.id,
          to: creditor.id,
          amount: settlementAmount,
        });

        debtor.amount = Math.round((debtor.amount - settlementAmount) * 100) / 100;
        creditor.amount = Math.round((creditor.amount - settlementAmount) * 100) / 100;
      }

      if (debtor.amount < 0.01 || settlementAmount < 0.01) debtorIndex++;
      if (creditor.amount < 0.01 || settlementAmount < 0.01) creditorIndex++;
    }
    
    const lahuTransactions = calculateLahuDirectTransactions(people, expenses, settlementPayments);
    return [...transactions, ...lahuTransactions];
  }

  // No manual overrides - use standard optimized calculation
  const debtors = Object.entries(netBalances)
    .filter(([_, balance]) => balance <= -0.01)
    .map(([id, balance]) => ({ id, amount: Math.abs(balance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = Object.entries(netBalances)
    .filter(([_, balance]) => balance >= 0.01)
    .map(([id, balance]) => ({ id, amount: balance }))
    .sort((a, b) => b.amount - a.amount);

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const settlementAmount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

    if (settlementAmount >= 0.01) {
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: settlementAmount,
      });

      debtor.amount = Math.round((debtor.amount - settlementAmount) * 100) / 100;
      creditor.amount = Math.round((creditor.amount - settlementAmount) * 100) / 100;
    }

    if (debtor.amount < 0.01 || settlementAmount < 0.01) debtorIndex++;
    if (creditor.amount < 0.01 || settlementAmount < 0.01) creditorIndex++;
  }

  const lahuTransactions = calculateLahuDirectTransactions(people, expenses, settlementPayments);
  return [...transactions, ...lahuTransactions];
}

/**
 * Calculate pairwise transactions (direct debts between specific people)
 */
export function calculatePairwiseTransactions(
  people: Person[],
  expenses: Expense[],
  settlementPayments: SettlementPayment[]
): CalculatedTransaction[] {
  // 1. Calculate raw pairwise debts from non-excluded expenses
  const rawPairwiseDebts: Record<
    string,
    Record<string, { amount: number; expenseIds: Set<string> }>
  > = {};

  const getOrCreateRelation = (from: string, to: string) => {
    if (!rawPairwiseDebts[from]) {
      rawPairwiseDebts[from] = {};
    }
    if (!rawPairwiseDebts[from][to]) {
      rawPairwiseDebts[from][to] = {
        amount: 0,
        expenseIds: new Set(),
      };
    }
    return rawPairwiseDebts[from][to];
  };

  expenses.forEach((expense) => {
    // Skip expenses excluded from settlement calculations
    if (expense.exclude_from_settlement) {
      return;
    }

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
          const relation = getOrCreateRelation(debtorId, payerId);
          relation.amount += amountOwedToThisPayer;
          relation.expenseIds.add(expense.id);
        }
      });
    }
  });

  // 2. Adjust for settlement payments
  if (Array.isArray(settlementPayments)) {
    const excludedExpenseIds = new Set(
      expenses.filter((e) => e.exclude_from_settlement).map((e) => e.id)
    );

    settlementPayments.forEach((payment) => {
      if (payment.is_archived) return;
      if (payment.associated_expense_id && excludedExpenseIds.has(payment.associated_expense_id)) {
        return;
      }
      const debtorId = payment.debtor_id;
      const creditorId = payment.creditor_id;
      const amountSettled = Number(payment.amount_settled);
      if (amountSettled <= 0.001) return;

      const relation = getOrCreateRelation(debtorId, creditorId);
      relation.amount -= amountSettled;
    });
  }

  // 3. Perform reciprocal netting between every pair of individuals
  const transactions: CalculatedTransaction[] = [];
  const peopleIds = people.map((p) => p.id);

  for (let i = 0; i < peopleIds.length; i++) {
    for (let j = i + 1; j < peopleIds.length; j++) {
      const u = peopleIds[i];
      const v = peopleIds[j];

      const uToV = rawPairwiseDebts[u]?.[v];
      const vToU = rawPairwiseDebts[v]?.[u];

      const uToVAmount = uToV ? uToV.amount : 0;
      const vToUAmount = vToU ? vToU.amount : 0;

      const netAmount = Math.round((uToVAmount - vToUAmount) * 100) / 100;

      if (Math.abs(netAmount) >= 0.01) {
        const mergedExpenseIds = new Set<string>();
        if (uToV) {
          uToV.expenseIds.forEach((id) => mergedExpenseIds.add(id));
        }
        if (vToU) {
          vToU.expenseIds.forEach((id) => mergedExpenseIds.add(id));
        }
        const contributingExpenseIds = Array.from(mergedExpenseIds);

        if (netAmount >= 0.01) {
          transactions.push({
            from: u,
            to: v,
            amount: netAmount,
            contributingExpenseIds,
          });
        } else if (netAmount <= -0.01) {
          transactions.push({
            from: v,
            to: u,
            amount: Math.abs(netAmount),
            contributingExpenseIds,
          });
        }
      }
    }
  }

  const lahuTransactions = calculateLahuDirectTransactions(people, expenses, settlementPayments);
  return [...transactions, ...lahuTransactions];
}

/**
 * Calculate outstanding unpaid direct pairwise transactions for Lahu-excluded expenses.
 * These are appended directly and bypass standard netting calculations.
 */
function calculateLahuDirectTransactions(
  people: Person[],
  expenses: Expense[],
  settlementPayments: SettlementPayment[]
): CalculatedTransaction[] {
  const directTransactions: CalculatedTransaction[] = [];

  // Filter for expenses that are excluded under the Lahu Debt Settlement strategy
  const lahuExpenses = expenses.filter(
    (e) => e.exclude_from_settlement && e.exclusion_strategy === "lahu_debt_settlement"
  );

  if (lahuExpenses.length === 0) {
    return directTransactions;
  }

  lahuExpenses.forEach((expense) => {
    // 1. Calculate net contributions specifically for this Lahu expense
    const rawContributions: Record<string, number> = {};
    people.forEach((p) => {
      const paidObj = expense.paid_by?.find((pb) => pb.personId === p.id);
      const paid = paidObj ? Number(paidObj.amount) : 0;

      const shareObj = expense.shares?.find((s) => s.personId === p.id);
      let share = shareObj ? Number(shareObj.amount) : 0;

      if (
        expense.celebration_contribution &&
        expense.celebration_contribution.personId === p.id
      ) {
        share += Number(expense.celebration_contribution.amount);
      }

      rawContributions[p.id] = paid - share;
    });

    // 2. Identify surplus (creditors) and deficit (debtors) contributors
    const creditors = Object.entries(rawContributions).filter(([_, contrib]) => contrib > 0.001);
    const debtors = Object.entries(rawContributions).filter(([_, contrib]) => contrib < -0.001);
    const totalSurplus = creditors.reduce((sum, [_, contrib]) => sum + contrib, 0);

    if (totalSurplus > 0.001) {
      debtors.forEach(([debtorId, debtorContrib]) => {
        const debtorDeficit = Math.abs(debtorContrib);
        creditors.forEach(([creditorId, creditorContrib]) => {
          const proportion = creditorContrib / totalSurplus;
          // grossOwed is debtor's portion of this creditor's surplus
          const grossOwed = Math.round((debtorDeficit * proportion) * 100) / 100;

          // 3. Subtract any active (non-archived) settlement payments explicitly or legacy-general entangled with this expense
          const expenseDate = new Date(expense.created_at || 0).getTime();
          const expenseParticipantIds = new Set([
            ...(expense.paid_by ?? []).map((p) => p.personId),
            ...(expense.shares ?? []).map((s) => s.personId),
          ]);

          const specificSettled = settlementPayments
            .filter((sp) => {
              if (
                sp.is_archived ||
                sp.debtor_id !== debtorId ||
                sp.creditor_id !== creditorId
              ) {
                return false;
              }
              const paymentDate = new Date(sp.settled_at).getTime();
              const isExplicitLink = sp.associated_expense_id === expense.id;
              const isLegacyGeneral =
                !isExplicitLink &&
                expenseParticipantIds.has(sp.debtor_id) &&
                expenseParticipantIds.has(sp.creditor_id) &&
                paymentDate >= expenseDate - 60000;
              return isExplicitLink || isLegacyGeneral;
            })
            .reduce((sum, sp) => {
              const entangledAmount = Math.min(Number(sp.amount_settled), Number(expense.total_amount));
              return sum + entangledAmount;
            }, 0);

          const unpaidShare = Math.max(0, Math.round((grossOwed - specificSettled) * 100) / 100);

          if (unpaidShare >= 0.01) {
            directTransactions.push({
              from: debtorId,
              to: creditorId,
              amount: unpaidShare,
              contributingExpenseIds: [expense.id],
              isDirect: true,
            });
          }
        });
      });
    }
  });

  return directTransactions;
}
