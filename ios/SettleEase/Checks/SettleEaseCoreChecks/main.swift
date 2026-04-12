import Foundation
import SettleEaseCore

func check(_ condition: @autoclosure () -> Bool, _ message: String) {
    guard condition() else {
        fputs("Check failed: \(message)\n", stderr)
        Foundation.exit(1)
    }
}

func nearlyEqual(_ left: Double, _ right: Double, tolerance: Double = 0.001) -> Bool {
    abs(left - right) < tolerance
}

let people = [
    Person(id: "alice", name: "Alice"),
    Person(id: "bob", name: "Bob"),
    Person(id: "charlie", name: "Charlie")
]

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
check(nearlyEqual(balances["alice"]!, 200), "Alice should be owed 200")
check(nearlyEqual(balances["bob"]!, -100), "Bob should owe 100")
check(nearlyEqual(balances["charlie"]!, -100), "Charlie should owe 100")

let override = ManualSettlementOverride(
    id: "manual",
    debtorId: "bob",
    creditorId: "alice",
    amount: 80,
    createdAt: "2026-04-11T12:00:00.000Z",
    updatedAt: "2026-04-11T12:00:00.000Z",
    isActive: true
)
let transactions = SettlementCalculator.simplifiedTransactions(
    people: people,
    expenses: expenses,
    settlementPayments: [],
    manualOverrides: [override]
)
check(transactions.first?.from == "bob", "Manual override should produce the first transaction")
check(transactions.first?.to == "alice", "Manual override should pay Alice")
check(nearlyEqual(transactions.first?.amount ?? 0, 80), "Manual override amount should be capped to 80")

let metrics = SettlementCalculator.dashboardMetrics(
    people: SettleEaseSampleData.people,
    expenses: SettleEaseSampleData.expenses,
    settlementPayments: SettleEaseSampleData.settlementPayments,
    manualOverrides: SettleEaseSampleData.manualOverrides
)
check(metrics.expenseCount == 3, "Sample metrics should include 3 expenses")
check(nearlyEqual(metrics.totalSpend, 6080), "Sample spend should total 6080")
check(metrics.activeOverrideCount == 1, "Sample data should have one active override")

print("SettleEaseCoreChecks passed")
