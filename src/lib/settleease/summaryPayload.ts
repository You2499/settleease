import {
  calculateNetBalances,
} from "./settlementCalculations";
import {
  getItemLineTotal,
  getItemParticipantIds,
} from "./itemwiseCalculations";
import type {
  CalculatedTransaction,
  Expense,
  ManualSettlementOverride,
  Person,
  SettlementPayment,
} from "./types";

const EPSILON = 0.01;
const UNCATEGORIZED = "Uncategorized";

interface CategoryLike {
  name: string;
  icon_name?: string | null;
}

export interface PersonBalanceSnapshot {
  totalPaid: number;
  totalOwed: number;
  settledAsDebtor: number;
  settledAsCreditor: number;
  netBalance: number;
}

export interface SummaryPayloadInput {
  people: Person[];
  peopleMap: Record<string, string>;
  allExpenses: Expense[];
  categories: CategoryLike[];
  pairwiseTransactions: CalculatedTransaction[];
  simplifiedTransactions: CalculatedTransaction[];
  settlementPayments: SettlementPayment[];
  manualOverrides: ManualSettlementOverride[];
  personBalances: Record<string, PersonBalanceSnapshot>;
}

export function buildPersonBalanceSnapshots(
  people: Person[],
  allExpenses: Expense[],
  settlementPayments: SettlementPayment[]
): Record<string, PersonBalanceSnapshot> {
  const balances: Record<string, PersonBalanceSnapshot> = {};
  people.forEach((person) => {
    balances[person.id] = {
      totalPaid: 0,
      totalOwed: 0,
      settledAsDebtor: 0,
      settledAsCreditor: 0,
      netBalance: 0,
    };
  });

  allExpenses.forEach((expense) => {
    if (expense.exclude_from_settlement) return;

    (Array.isArray(expense.paid_by) ? expense.paid_by : []).forEach((payment) => {
      balances[payment.personId] ||= {
        totalPaid: 0,
        totalOwed: 0,
        settledAsDebtor: 0,
        settledAsCreditor: 0,
        netBalance: 0,
      };
      balances[payment.personId].totalPaid += toAmount(payment.amount);
    });

    (Array.isArray(expense.shares) ? expense.shares : []).forEach((share) => {
      balances[share.personId] ||= {
        totalPaid: 0,
        totalOwed: 0,
        settledAsDebtor: 0,
        settledAsCreditor: 0,
        netBalance: 0,
      };
      balances[share.personId].totalOwed += toAmount(share.amount);
    });

    if (expense.celebration_contribution && toAmount(expense.celebration_contribution.amount) > 0) {
      const contributorId = expense.celebration_contribution.personId;
      balances[contributorId] ||= {
        totalPaid: 0,
        totalOwed: 0,
        settledAsDebtor: 0,
        settledAsCreditor: 0,
        netBalance: 0,
      };
      balances[contributorId].totalOwed += toAmount(expense.celebration_contribution.amount);
    }
  });

  settlementPayments.forEach((payment) => {
    balances[payment.debtor_id] ||= {
      totalPaid: 0,
      totalOwed: 0,
      settledAsDebtor: 0,
      settledAsCreditor: 0,
      netBalance: 0,
    };
    balances[payment.creditor_id] ||= {
      totalPaid: 0,
      totalOwed: 0,
      settledAsDebtor: 0,
      settledAsCreditor: 0,
      netBalance: 0,
    };
    balances[payment.debtor_id].settledAsDebtor += toAmount(payment.amount_settled);
    balances[payment.creditor_id].settledAsCreditor += toAmount(payment.amount_settled);
  });

  const netBalances = calculateNetBalances(people, allExpenses, settlementPayments);
  people.forEach((person) => {
    balances[person.id] ||= {
      totalPaid: 0,
      totalOwed: 0,
      settledAsDebtor: 0,
      settledAsCreditor: 0,
      netBalance: 0,
    };
    balances[person.id].netBalance = toAmount(netBalances[person.id]);
  });

  Object.keys(balances).forEach((personId) => {
    const balance = balances[personId];
    balance.totalPaid = roundAmount(balance.totalPaid);
    balance.totalOwed = roundAmount(balance.totalOwed);
    balance.settledAsDebtor = roundAmount(balance.settledAsDebtor);
    balance.settledAsCreditor = roundAmount(balance.settledAsCreditor);
    balance.netBalance = roundAmount(balance.netBalance);
  });

  return balances;
}

type PersonAmount = {
  name: string;
  amount: number;
};

type RecommendedPayment = {
  from: string;
  to: string;
  original_amount: number;
  already_settled_amount: number;
  outstanding_amount: number;
};

function toAmount(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareExpenseDeterministically(a: Expense, b: Expense): number {
  const dateComparison = (a.created_at || "").localeCompare(b.created_at || "");
  if (dateComparison !== 0) return dateComparison;

  const descriptionComparison = compareStrings(a.description || "", b.description || "");
  if (descriptionComparison !== 0) return descriptionComparison;

  const amountDelta = toAmount(a.total_amount) - toAmount(b.total_amount);
  if (Math.abs(amountDelta) > EPSILON) return amountDelta;

  return compareStrings(a.id || "", b.id || "");
}

function compareAmountDescThenName(a: PersonAmount, b: PersonAmount): number {
  const amountDelta = b.amount - a.amount;
  if (Math.abs(amountDelta) > EPSILON) return amountDelta;
  return compareStrings(a.name, b.name);
}

function compareTxForDeterminism(
  a: { from: string; to: string; amount: number },
  b: { from: string; to: string; amount: number }
): number {
  const amountDelta = b.amount - a.amount;
  if (Math.abs(amountDelta) > EPSILON) return amountDelta;

  const fromComparison = compareStrings(a.from, b.from);
  if (fromComparison !== 0) return fromComparison;

  return compareStrings(a.to, b.to);
}

export function buildSettlementSummaryPayload({
  people,
  peopleMap,
  allExpenses,
  categories,
  pairwiseTransactions,
  simplifiedTransactions,
  settlementPayments,
  manualOverrides,
  personBalances,
}: SummaryPayloadInput) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const knownPersonIds = new Set(people.map((person) => person.id));

  const idToName = (id: string): string =>
    peopleMap[id] || peopleById.get(id)?.name || "Unknown";

  const orderedExpenses = [...allExpenses].sort(compareExpenseDeterministically);
  const includedExpenses = orderedExpenses.filter((expense) => !expense.exclude_from_settlement);
  const excludedExpenses = orderedExpenses.filter((expense) => expense.exclude_from_settlement);
  const activeManualOverrides = manualOverrides.filter((override) => override.is_active);

  const categoryTotals: Record<string, number> = {};
  includedExpenses.forEach((expense) => {
    if (expense.split_method === "itemwise" && expense.items && expense.items.length > 0) {
      expense.items.forEach((item) => {
        const categoryName = item.categoryName || expense.category || UNCATEGORIZED;
        categoryTotals[categoryName] = roundAmount(
          (categoryTotals[categoryName] || 0) + toAmount(getItemLineTotal(item))
        );
      });
      return;
    }

    const categoryName = expense.category || UNCATEGORIZED;
    categoryTotals[categoryName] = roundAmount(
      (categoryTotals[categoryName] || 0) + toAmount(expense.total_amount)
    );
  });

  const categoryIconMap = new Map<string, string>();
  categories.forEach((category) => {
    if (category?.name) {
      categoryIconMap.set(category.name, category.icon_name || "HelpCircle");
    }
  });

  const allCategoryNames = Array.from(
    new Set([...categories.map((category) => category.name), ...Object.keys(categoryTotals)])
  );

  const categoriesWithTotals = allCategoryNames
    .map((name) => ({
      name,
      icon_name: categoryIconMap.get(name) || "HelpCircle",
      total_spent: roundAmount(categoryTotals[name] || 0),
    }))
    .sort((a, b) => {
      const amountDelta = b.total_spent - a.total_spent;
      if (Math.abs(amountDelta) > EPSILON) return amountDelta;
      return compareStrings(a.name, b.name);
    });

  const personBalancesList = people
    .map((person) => {
      const balance = personBalances[person.id] || {
        totalPaid: 0,
        totalOwed: 0,
        settledAsDebtor: 0,
        settledAsCreditor: 0,
        netBalance: 0,
      };

      return {
        name: idToName(person.id),
        totalPaid: roundAmount(toAmount(balance.totalPaid)),
        totalOwed: roundAmount(toAmount(balance.totalOwed)),
        settledAsDebtor: roundAmount(toAmount(balance.settledAsDebtor)),
        settledAsCreditor: roundAmount(toAmount(balance.settledAsCreditor)),
        netBalance: roundAmount(toAmount(balance.netBalance)),
      };
    })
    .sort((a, b) => compareStrings(a.name, b.name));

  const personBalancesByName: Record<string, PersonBalanceSnapshot> = {};
  personBalancesList.forEach((balance) => {
    personBalancesByName[balance.name] = {
      totalPaid: balance.totalPaid,
      totalOwed: balance.totalOwed,
      settledAsDebtor: balance.settledAsDebtor,
      settledAsCreditor: balance.settledAsCreditor,
      netBalance: balance.netBalance,
    };
  });

  const pairwiseWithNames = pairwiseTransactions
    .map((transaction) => ({
      from: idToName(transaction.from),
      to: idToName(transaction.to),
      amount: roundAmount(toAmount(transaction.amount)),
    }))
    .sort(compareTxForDeterminism);

  const simplifiedWithNames = simplifiedTransactions
    .map((transaction) => ({
      from: idToName(transaction.from),
      to: idToName(transaction.to),
      amount: roundAmount(toAmount(transaction.amount)),
    }))
    .sort(compareTxForDeterminism);

  const settlementLookup = new Map<string, number>();
  settlementPayments.forEach((payment) => {
    const key = `${payment.debtor_id}::${payment.creditor_id}`;
    settlementLookup.set(key, roundAmount((settlementLookup.get(key) || 0) + toAmount(payment.amount_settled)));
  });

  const recommendedPaymentOrder = simplifiedTransactions
    .map((transaction) => {
      const key = `${transaction.from}::${transaction.to}`;
      const alreadySettledAmount = settlementLookup.get(key) || 0;
      const outstandingAmount = Math.max(0, toAmount(transaction.amount) - alreadySettledAmount);

      return {
        from: idToName(transaction.from),
        to: idToName(transaction.to),
        original_amount: roundAmount(toAmount(transaction.amount)),
        already_settled_amount: roundAmount(alreadySettledAmount),
        outstanding_amount: roundAmount(outstandingAmount),
      };
    })
    .filter((transaction) => transaction.outstanding_amount > EPSILON)
    .sort((a, b) => {
      const amountDelta = b.outstanding_amount - a.outstanding_amount;
      if (Math.abs(amountDelta) > EPSILON) return amountDelta;
      const fromComparison = compareStrings(a.from, b.from);
      if (fromComparison !== 0) return fromComparison;
      return compareStrings(a.to, b.to);
    });

  const settlementPaymentsWithNames = settlementPayments
    .map((payment) => ({
      debtor: idToName(payment.debtor_id),
      creditor: idToName(payment.creditor_id),
      amount_settled: roundAmount(toAmount(payment.amount_settled)),
      settled_at: payment.settled_at || null,
      notes: payment.notes || null,
    }))
    .sort((a, b) => {
      const dateComparison = (b.settled_at || "").localeCompare(a.settled_at || "");
      if (dateComparison !== 0) return dateComparison;
      const debtorComparison = compareStrings(a.debtor, b.debtor);
      if (debtorComparison !== 0) return debtorComparison;
      return compareStrings(a.creditor, b.creditor);
    });

  const overridesWithNames = activeManualOverrides
    .map((override) => ({
      debtor: idToName(override.debtor_id),
      creditor: idToName(override.creditor_id),
      amount: roundAmount(toAmount(override.amount)),
      notes: override.notes || null,
      is_active: true,
    }))
    .sort((a, b) => {
      const amountDelta = b.amount - a.amount;
      if (Math.abs(amountDelta) > EPSILON) return amountDelta;
      const debtorComparison = compareStrings(a.debtor, b.debtor);
      if (debtorComparison !== 0) return debtorComparison;
      return compareStrings(a.creditor, b.creditor);
    });

  const expensesWithNames = includedExpenses
    .map((expense) => ({
      description: expense.description,
      total_amount: roundAmount(toAmount(expense.total_amount)),
      category: expense.category || UNCATEGORIZED,
      split_method: expense.split_method,
      created_at: expense.created_at || null,
      paid_by: (Array.isArray(expense.paid_by) ? expense.paid_by : [])
        .map((payment) => ({
          person: idToName(payment.personId),
          amount: roundAmount(toAmount(payment.amount)),
        }))
        .sort((a, b) => compareStrings(a.person, b.person)),
      shares: (Array.isArray(expense.shares) ? expense.shares : [])
        .map((share) => ({
          person: idToName(share.personId),
          amount: roundAmount(toAmount(share.amount)),
        }))
        .sort((a, b) => compareStrings(a.person, b.person)),
      celebration_contribution: expense.celebration_contribution
        ? {
            person: idToName(expense.celebration_contribution.personId),
            amount: roundAmount(toAmount(expense.celebration_contribution.amount)),
          }
        : null,
      items:
        expense.split_method === "itemwise" && Array.isArray(expense.items)
          ? [...expense.items]
              .map((item) => ({
                name: item.name,
                price: roundAmount(toAmount(getItemLineTotal(item))),
                category_name: item.categoryName || expense.category || UNCATEGORIZED,
                shared_by: getItemParticipantIds(item)
                  .map((personId) => idToName(personId))
                  .sort(compareStrings),
              }))
              .sort((a, b) => {
                const amountDelta = b.price - a.price;
                if (Math.abs(amountDelta) > EPSILON) return amountDelta;
                return compareStrings(a.name, b.name);
              })
          : [],
    }))
    .sort((a, b) => {
      const dateComparison = (b.created_at || "").localeCompare(a.created_at || "");
      if (dateComparison !== 0) return dateComparison;
      const amountDelta = b.total_amount - a.total_amount;
      if (Math.abs(amountDelta) > EPSILON) return amountDelta;
      return compareStrings(a.description, b.description);
    });

  const netBalances = calculateNetBalances(people, allExpenses, settlementPayments);
  const rankedCreditors = Object.entries(netBalances)
    .filter(([_, balance]) => balance > EPSILON)
    .map(([personId, balance]) => ({
      name: idToName(personId),
      amount: roundAmount(balance),
    }))
    .sort(compareAmountDescThenName);

  const rankedDebtors = Object.entries(netBalances)
    .filter(([_, balance]) => balance < -EPSILON)
    .map(([personId, balance]) => ({
      name: idToName(personId),
      amount: roundAmount(Math.abs(balance)),
    }))
    .sort(compareAmountDescThenName);

  const balanceSum = roundAmount(
    Object.values(netBalances).reduce((sum, balance) => sum + toAmount(balance), 0)
  );

  const includedSpend = roundAmount(
    includedExpenses.reduce((sum, expense) => sum + toAmount(expense.total_amount), 0)
  );
  const excludedSpend = roundAmount(
    excludedExpenses.reduce((sum, expense) => sum + toAmount(expense.total_amount), 0)
  );
  const amountAlreadySettled = roundAmount(
    settlementPayments.reduce((sum, payment) => sum + toAmount(payment.amount_settled), 0)
  );
  const remainingSimplifiedSettlementAmount = roundAmount(
    recommendedPaymentOrder.reduce((sum, transaction) => sum + transaction.outstanding_amount, 0)
  );

  const splitMethodCounts = includedExpenses.reduce(
    (counts, expense) => {
      counts[expense.split_method] += 1;
      return counts;
    },
    { equal: 0, unequal: 0, itemwise: 0 }
  );

  const splitMethodDistribution = (["equal", "unequal", "itemwise"] as const)
    .map((method) => ({
      method,
      count: splitMethodCounts[method],
      percentage:
        includedExpenses.length > 0
          ? roundAmount((splitMethodCounts[method] / includedExpenses.length) * 100)
          : 0,
    }))
    .sort((a, b) => {
      const countDelta = b.count - a.count;
      if (countDelta !== 0) return countDelta;
      return compareStrings(a.method, b.method);
    });

  const celebrationExpenses = includedExpenses.filter(
    (expense) => toAmount(expense.celebration_contribution?.amount) > EPSILON
  );
  const celebrationUsage = {
    expense_count: celebrationExpenses.length,
    contribution_total: roundAmount(
      celebrationExpenses.reduce(
        (sum, expense) => sum + toAmount(expense.celebration_contribution?.amount),
        0
      )
    ),
    spend_in_celebration_expenses: roundAmount(
      celebrationExpenses.reduce((sum, expense) => sum + toAmount(expense.total_amount), 0)
    ),
  };

  const topCategories = categoriesWithTotals
    .filter((category) => category.total_spent > EPSILON)
    .slice(0, 5)
    .map((category) => ({
      name: category.name,
      total_spent: category.total_spent,
      share_of_included_spend:
        includedSpend > EPSILON ? roundAmount((category.total_spent / includedSpend) * 100) : 0,
    }));

  const topExpenses = expensesWithNames.slice(0, 5).map((expense) => ({
    description: expense.description,
    total_amount: expense.total_amount,
    category: expense.category,
    split_method: expense.split_method,
  }));

  const integrityWarnings: string[] = [];
  orderedExpenses.forEach((expense) => {
    const paidTotal = (Array.isArray(expense.paid_by) ? expense.paid_by : []).reduce(
      (sum, payment) => sum + toAmount(payment.amount),
      0
    );
    const sharesTotal = (Array.isArray(expense.shares) ? expense.shares : []).reduce(
      (sum, share) => sum + toAmount(share.amount),
      0
    );
    const celebrationAmount = toAmount(expense.celebration_contribution?.amount);
    const totalAmount = toAmount(expense.total_amount);
    const label = expense.description || "Unnamed expense";

    if (Math.abs(paidTotal - totalAmount) > EPSILON) {
      integrityWarnings.push(
        `Expense "${label}" has paid_by total ${roundAmount(paidTotal)} but total_amount ${roundAmount(totalAmount)}.`
      );
    }

    if (Math.abs(sharesTotal + celebrationAmount - totalAmount) > EPSILON) {
      integrityWarnings.push(
        `Expense "${label}" has shares+celebration ${roundAmount(sharesTotal + celebrationAmount)} but total_amount ${roundAmount(totalAmount)}.`
      );
    }

    (Array.isArray(expense.paid_by) ? expense.paid_by : []).forEach((payment) => {
      if (!knownPersonIds.has(payment.personId)) {
        integrityWarnings.push(
          `Expense "${label}" references an unknown payer.`
        );
      }
    });

    (Array.isArray(expense.shares) ? expense.shares : []).forEach((share) => {
      if (!knownPersonIds.has(share.personId)) {
        integrityWarnings.push(
          `Expense "${label}" references an unknown sharer.`
        );
      }
    });

    if (
      expense.celebration_contribution &&
      !knownPersonIds.has(expense.celebration_contribution.personId)
    ) {
      integrityWarnings.push(
        `Expense "${label}" references an unknown celebration contributor.`
      );
    }

    (Array.isArray(expense.items) ? expense.items : []).forEach((item) => {
      getItemParticipantIds(item).forEach((personId) => {
        if (!knownPersonIds.has(personId)) {
          integrityWarnings.push(
            `Expense "${label}" item "${item.name}" references an unknown participant.`
          );
        }
      });
    });
  });

  settlementPayments.forEach((payment) => {
    if (!knownPersonIds.has(payment.debtor_id)) {
      integrityWarnings.push(
        `Settlement payment references an unknown debtor.`
      );
    }
    if (!knownPersonIds.has(payment.creditor_id)) {
      integrityWarnings.push(
        `Settlement payment references an unknown creditor.`
      );
    }
  });

  const uniqueIntegrityWarnings = [...new Set(integrityWarnings)].sort(compareStrings);
  const largestPayment: RecommendedPayment | null = recommendedPaymentOrder[0] || null;

  const manualOverrideImpact = {
    active_count: activeManualOverrides.length,
    total_override_amount: roundAmount(
      activeManualOverrides.reduce((sum, override) => sum + toAmount(override.amount), 0)
    ),
    affected_pairs: overridesWithNames.map((override) => ({
      debtor: override.debtor,
      creditor: override.creditor,
      amount: override.amount,
    })),
  };

  return {
    schemaVersion: 2,
    counts: {
      people: people.length,
      expenses: includedExpenses.length,
      excludedExpenses: excludedExpenses.length,
      settlementPayments: settlementPayments.length,
      pairwiseTransactions: pairwiseWithNames.length,
      simplifiedTransactions: simplifiedWithNames.length,
      activeManualOverrides: activeManualOverrides.length,
    },
    overviewDescriptions: {
      simplifyOn: "Minimum transactions required to settle all debts.",
      simplifyOff:
        "Detailed pairwise debts reflecting direct expense involvements and payments.",
    },
    personBalances: personBalancesByName,
    personBalancesList,
    transactions: {
      pairwise: pairwiseWithNames,
      simplified: simplifiedWithNames,
      recommendedPaymentOrder,
    },
    categories: categoriesWithTotals,
    settlementPayments: settlementPaymentsWithNames,
    manualOverrides: overridesWithNames,
    expenses: expensesWithNames,
    people: [...people]
      .map((person) => ({ name: person.name }))
      .sort((a, b) => compareStrings(a.name, b.name)),
    analysis: {
      totals: {
        includedSpend,
        excludedSpend,
        amountAlreadySettled,
        remainingSimplifiedSettlementAmount,
        activeManualOverrides: activeManualOverrides.length,
      },
      balances: {
        rankedCreditors,
        rankedDebtors,
        balancedPeopleCount: people.filter(
          (person) => Math.abs(toAmount(netBalances[person.id])) <= EPSILON
        ).length,
      },
      spending: {
        topCategories,
        topExpenses,
        splitMethodDistribution: splitMethodDistribution.map((item) => ({
          method: item.method,
          count: item.count,
          percentage: item.percentage,
        })),
        celebrationUsage,
      },
      settlement: {
        recommendedPaymentOrder,
        largestPayment,
        manualOverrideImpact,
      },
      integrity: {
        conservationCheck: {
          passes: Math.abs(balanceSum) <= EPSILON,
          balanceSum,
          threshold: EPSILON,
        },
        expenseConsistency: {
          checkedExpenses: allExpenses.length,
          warningsCount: uniqueIntegrityWarnings.length,
          passes: uniqueIntegrityWarnings.length === 0,
        },
        warningList: uniqueIntegrityWarnings,
      },
    },
  };
}
