import Testing
@testable import SettleEaseCore

@Suite("Settlement calculator")
struct SettlementCalculatorTests {
    private let people = [
        Person(id: "alice", name: "Alice"),
        Person(id: "bob", name: "Bob"),
        Person(id: "charlie", name: "Charlie")
    ]

    @Test
    func netBalancesExcludeExpensesMarkedOutOfSettlement() {
        let expenses = [
            Expense(
                id: "included",
                description: "Dinner",
                totalAmount: 300,
                category: "Food",
                paidBy: [PayerShare(personId: "alice", amount: 300)],
                splitMethod: .equal,
                shares: [
                    PayerShare(personId: "alice", amount: 100),
                    PayerShare(personId: "bob", amount: 100),
                    PayerShare(personId: "charlie", amount: 100)
                ]
            ),
            Expense(
                id: "excluded",
                description: "Gift",
                totalAmount: 999,
                category: "Fun",
                paidBy: [PayerShare(personId: "bob", amount: 999)],
                splitMethod: .equal,
                shares: [PayerShare(personId: "alice", amount: 999)],
                excludeFromSettlement: true
            )
        ]

        let balances = SettlementCalculator.netBalances(
            people: people,
            expenses: expenses,
            settlementPayments: []
        )

        #expect(abs(balances["alice"]! - 200) < 0.001)
        #expect(abs(balances["bob"]! - -100) < 0.001)
        #expect(abs(balances["charlie"]! - -100) < 0.001)
    }

    @Test
    func settlementPaymentsAdjustDebtorAndCreditorBalances() {
        let expenses = [
            Expense(
                id: "dinner",
                description: "Dinner",
                totalAmount: 300,
                category: "Food",
                paidBy: [PayerShare(personId: "alice", amount: 300)],
                splitMethod: .equal,
                shares: [
                    PayerShare(personId: "alice", amount: 100),
                    PayerShare(personId: "bob", amount: 100),
                    PayerShare(personId: "charlie", amount: 100)
                ]
            )
        ]
        let payments = [
            SettlementPayment(
                id: "payment",
                debtorId: "bob",
                creditorId: "alice",
                amountSettled: 40,
                settledAt: "2026-04-11T12:00:00.000Z",
                markedByUserId: "user"
            )
        ]

        let balances = SettlementCalculator.netBalances(
            people: people,
            expenses: expenses,
            settlementPayments: payments
        )

        #expect(abs(balances["alice"]! - 160) < 0.001)
        #expect(abs(balances["bob"]! - -60) < 0.001)
        #expect(abs(balances["charlie"]! - -100) < 0.001)
    }

    @Test
    func manualOverridesTakePrecedenceThenOptimizesRemainingDebt() {
        let expenses = [
            Expense(
                id: "trip",
                description: "Trip",
                totalAmount: 600,
                category: "Travel",
                paidBy: [PayerShare(personId: "alice", amount: 600)],
                splitMethod: .equal,
                shares: [
                    PayerShare(personId: "alice", amount: 200),
                    PayerShare(personId: "bob", amount: 200),
                    PayerShare(personId: "charlie", amount: 200)
                ]
            )
        ]
        let overrides = [
            ManualSettlementOverride(
                id: "manual",
                debtorId: "bob",
                creditorId: "alice",
                amount: 150,
                createdAt: "2026-04-11T12:00:00.000Z",
                updatedAt: "2026-04-11T12:00:00.000Z",
                isActive: true
            )
        ]

        let transactions = SettlementCalculator.simplifiedTransactions(
            people: people,
            expenses: expenses,
            settlementPayments: [],
            manualOverrides: overrides
        )

        #expect(transactions.count == 3)
        #expect(transactions[0].from == "bob")
        #expect(transactions[0].to == "alice")
        #expect(abs(transactions[0].amount - 150) < 0.001)
        #expect(abs(transactions.map(\.amount).reduce(0, +) - 400) < 0.001)
    }

    @Test
    func celebrationContributionDebitsContributorInAdditionToShare() {
        let expenses = [
            Expense(
                id: "birthday",
                description: "Birthday dinner",
                totalAmount: 900,
                category: "Food",
                paidBy: [PayerShare(personId: "alice", amount: 900)],
                splitMethod: .equal,
                shares: [
                    PayerShare(personId: "alice", amount: 250),
                    PayerShare(personId: "bob", amount: 250),
                    PayerShare(personId: "charlie", amount: 250)
                ],
                celebrationContribution: CelebrationContribution(personId: "bob", amount: 150)
            )
        ]

        let balances = SettlementCalculator.netBalances(
            people: people,
            expenses: expenses,
            settlementPayments: []
        )

        #expect(abs(balances["alice"]! - 650) < 0.001)
        #expect(abs(balances["bob"]! - -400) < 0.001)
        #expect(abs(balances["charlie"]! - -250) < 0.001)
    }

    @Test
    func pairwiseTransactionsTrackContributingExpenseIds() {
        let expenses = [
            Expense(
                id: "receipt",
                description: "Cafe",
                totalAmount: 300,
                category: "Food",
                paidBy: [
                    PayerShare(personId: "alice", amount: 200),
                    PayerShare(personId: "bob", amount: 100)
                ],
                splitMethod: .equal,
                shares: [
                    PayerShare(personId: "alice", amount: 100),
                    PayerShare(personId: "bob", amount: 100),
                    PayerShare(personId: "charlie", amount: 100)
                ]
            )
        ]

        let transactions = SettlementCalculator.pairwiseTransactions(
            people: people,
            expenses: expenses,
            settlementPayments: []
        )

        let charlieToAlice = transactions.first { $0.from == "charlie" && $0.to == "alice" }
        #expect(charlieToAlice != nil)
        #expect(abs((charlieToAlice?.amount ?? 0) - 66.666) < 0.01)
        #expect(charlieToAlice?.contributingExpenseIds == ["receipt"])
    }

    @Test
    func dashboardMetricsSummarizeCurrentState() {
        let metrics = SettlementCalculator.dashboardMetrics(
            people: SettleEaseSampleData.people,
            expenses: SettleEaseSampleData.expenses,
            settlementPayments: SettleEaseSampleData.settlementPayments,
            manualOverrides: SettleEaseSampleData.manualOverrides
        )

        #expect(metrics.expenseCount == 3)
        #expect(abs(metrics.totalSpend - 6080) < 0.001)
        #expect(metrics.activeOverrideCount == 1)
        #expect(metrics.outstanding > 0)
        #expect(metrics.settlementProgress >= 0)
        #expect(metrics.settlementProgress <= 1)
    }
}
