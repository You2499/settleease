import Foundation

public enum SettlementCalculator {
    private static let epsilon = 0.01

    public static func netBalances(
        people: [Person],
        expenses: [Expense],
        settlementPayments: [SettlementPayment]
    ) -> [String: Double] {
        var balances = Dictionary(uniqueKeysWithValues: people.map { ($0.id, 0.0) })

        for expense in expenses where !expense.excludeFromSettlement {
            for payment in expense.paidBy {
                balances[payment.personId, default: 0] += payment.amount
            }

            for share in expense.shares {
                balances[share.personId, default: 0] -= share.amount
            }

            if let celebration = expense.celebrationContribution, celebration.amount > 0 {
                balances[celebration.personId, default: 0] -= celebration.amount
            }
        }

        for payment in settlementPayments {
            if balances[payment.debtorId] != nil {
                balances[payment.debtorId, default: 0] += payment.amountSettled
            }
            if balances[payment.creditorId] != nil {
                balances[payment.creditorId, default: 0] -= payment.amountSettled
            }
        }

        return balances
    }

    public static func simplifiedTransactions(
        people: [Person],
        expenses: [Expense],
        settlementPayments: [SettlementPayment],
        manualOverrides: [ManualSettlementOverride] = []
    ) -> [CalculatedTransaction] {
        let balances = netBalances(
            people: people,
            expenses: expenses,
            settlementPayments: settlementPayments
        )

        let activeOverrides = manualOverrides.filter(\.isActive)
        guard !activeOverrides.isEmpty else {
            return optimizedTransactions(from: balances)
        }

        var remainingBalances = balances
        var transactions: [CalculatedTransaction] = []

        for override in activeOverrides {
            let debtorBalance = remainingBalances[override.debtorId, default: 0]
            let creditorBalance = remainingBalances[override.creditorId, default: 0]

            guard debtorBalance < -epsilon, creditorBalance > epsilon else {
                continue
            }

            let maxSettleable = min(abs(debtorBalance), creditorBalance, override.amount)
            guard maxSettleable > epsilon else { continue }

            transactions.append(
                CalculatedTransaction(
                    from: override.debtorId,
                    to: override.creditorId,
                    amount: maxSettleable
                )
            )
            remainingBalances[override.debtorId, default: 0] += maxSettleable
            remainingBalances[override.creditorId, default: 0] -= maxSettleable
        }

        transactions.append(contentsOf: optimizedTransactions(from: remainingBalances))
        return transactions
    }

    public static func pairwiseTransactions(
        people: [Person],
        expenses: [Expense],
        settlementPayments: [SettlementPayment]
    ) -> [CalculatedTransaction] {
        var rawPairwiseDebts: [String: [String: (amount: Double, expenseIds: Set<String>)]] = [:]

        for expense in expenses {
            guard expense.totalAmount > 0.001, !expense.paidBy.isEmpty else { continue }

            var obligations: [String: Double] = [:]
            for share in expense.shares {
                obligations[share.personId, default: 0] += share.amount
            }

            if let celebration = expense.celebrationContribution, celebration.amount > 0.001 {
                obligations[celebration.personId, default: 0] += celebration.amount
            }

            let totalPaidInExpense = expense.paidBy.reduce(0) { $0 + $1.amount }
            guard totalPaidInExpense > 0.001 else { continue }

            for (debtorId, totalOwedByDebtor) in obligations where totalOwedByDebtor > 0.001 {
                for payment in expense.paidBy {
                    let payerId = payment.personId
                    guard debtorId != payerId else { continue }

                    let proportionPaidByThisPayer = payment.amount / totalPaidInExpense
                    let amountOwedToThisPayer = totalOwedByDebtor * proportionPaidByThisPayer
                    guard amountOwedToThisPayer > 0.001 else { continue }

                    var creditorDebts = rawPairwiseDebts[debtorId, default: [:]]
                    var existing = creditorDebts[payerId] ?? (amount: 0, expenseIds: Set<String>())
                    existing.amount += amountOwedToThisPayer
                    existing.expenseIds.insert(expense.id)
                    creditorDebts[payerId] = existing
                    rawPairwiseDebts[debtorId] = creditorDebts
                }
            }
        }

        var transactions: [CalculatedTransaction] = []
        for (debtorId, creditorMap) in rawPairwiseDebts {
            for (creditorId, transaction) in creditorMap where transaction.amount > epsilon {
                transactions.append(
                    CalculatedTransaction(
                        from: debtorId,
                        to: creditorId,
                        amount: transaction.amount,
                        contributingExpenseIds: Array(transaction.expenseIds).sorted()
                    )
                )
            }
        }

        return transactions.sorted {
            if $0.from != $1.from { return $0.from < $1.from }
            if $0.to != $1.to { return $0.to < $1.to }
            return $0.amount > $1.amount
        }
    }

    public static func dashboardMetrics(
        people: [Person],
        expenses: [Expense],
        settlementPayments: [SettlementPayment],
        manualOverrides: [ManualSettlementOverride]
    ) -> DashboardMetrics {
        let includedExpenses = expenses.filter { !$0.excludeFromSettlement }
        let totalSpend = includedExpenses.reduce(0) { $0 + $1.totalAmount }
        let transactions = simplifiedTransactions(
            people: people,
            expenses: expenses,
            settlementPayments: settlementPayments,
            manualOverrides: manualOverrides
        )
        let outstanding = transactions.reduce(0) { $0 + $1.amount }
        let settled = settlementPayments.reduce(0) { $0 + $1.amountSettled }
        let activeOverrides = manualOverrides.filter(\.isActive).count
        let progress = totalSpend <= epsilon ? 1 : min(1, settled / max(settled + outstanding, epsilon))

        return DashboardMetrics(
            totalSpend: totalSpend,
            outstanding: outstanding,
            settled: settled,
            settlementProgress: progress,
            activeOverrideCount: activeOverrides,
            expenseCount: includedExpenses.count
        )
    }

    private static func optimizedTransactions(from balances: [String: Double]) -> [CalculatedTransaction] {
        var debtors = balances
            .filter { $0.value < -epsilon }
            .map { (id: $0.key, amount: abs($0.value)) }
            .sorted { $0.amount > $1.amount }

        var creditors = balances
            .filter { $0.value > epsilon }
            .map { (id: $0.key, amount: $0.value) }
            .sorted { $0.amount > $1.amount }

        var transactions: [CalculatedTransaction] = []
        var debtorIndex = 0
        var creditorIndex = 0

        while debtorIndex < debtors.count, creditorIndex < creditors.count {
            var debtor = debtors[debtorIndex]
            var creditor = creditors[creditorIndex]
            let settlementAmount = min(debtor.amount, creditor.amount)

            if settlementAmount > epsilon {
                transactions.append(
                    CalculatedTransaction(from: debtor.id, to: creditor.id, amount: settlementAmount)
                )
                debtor.amount -= settlementAmount
                creditor.amount -= settlementAmount
                debtors[debtorIndex] = debtor
                creditors[creditorIndex] = creditor
            }

            if debtor.amount < epsilon { debtorIndex += 1 }
            if creditor.amount < epsilon { creditorIndex += 1 }
        }

        return transactions
    }
}

public struct DashboardMetrics: Codable, Equatable, Sendable {
    public var totalSpend: Double
    public var outstanding: Double
    public var settled: Double
    public var settlementProgress: Double
    public var activeOverrideCount: Int
    public var expenseCount: Int

    public init(
        totalSpend: Double,
        outstanding: Double,
        settled: Double,
        settlementProgress: Double,
        activeOverrideCount: Int,
        expenseCount: Int
    ) {
        self.totalSpend = totalSpend
        self.outstanding = outstanding
        self.settled = settled
        self.settlementProgress = settlementProgress
        self.activeOverrideCount = activeOverrideCount
        self.expenseCount = expenseCount
    }
}
