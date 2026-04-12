import Foundation

public enum SettleEaseSampleData {
    public static let people: [Person] = [
        Person(id: "alice", name: "Alice", createdAt: "2026-04-10T10:00:00.000Z"),
        Person(id: "bob", name: "Bob", createdAt: "2026-04-10T10:00:00.000Z"),
        Person(id: "charlie", name: "Charlie", createdAt: "2026-04-10T10:00:00.000Z")
    ]

    public static let categories: [Category] = [
        Category(id: "food", name: "Food", iconName: "fork.knife", rank: 1),
        Category(id: "travel", name: "Travel", iconName: "car.fill", rank: 2),
        Category(id: "stay", name: "Stay", iconName: "house.fill", rank: 3),
        Category(id: "fun", name: "Fun", iconName: "party.popper.fill", rank: 4)
    ]

    public static let expenses: [Expense] = [
        Expense(
            id: "dinner",
            description: "Friday dinner",
            totalAmount: 3600,
            category: "Food",
            paidBy: [PayerShare(personId: "alice", amount: 3600)],
            splitMethod: .equal,
            shares: [
                PayerShare(personId: "alice", amount: 1200),
                PayerShare(personId: "bob", amount: 1200),
                PayerShare(personId: "charlie", amount: 1200)
            ],
            createdAt: "2026-04-10T19:30:00.000Z"
        ),
        Expense(
            id: "cab",
            description: "Airport cab",
            totalAmount: 1500,
            category: "Travel",
            paidBy: [PayerShare(personId: "bob", amount: 1500)],
            splitMethod: .unequal,
            shares: [
                PayerShare(personId: "alice", amount: 500),
                PayerShare(personId: "bob", amount: 500),
                PayerShare(personId: "charlie", amount: 500)
            ],
            createdAt: "2026-04-11T06:45:00.000Z"
        ),
        Expense(
            id: "receipt",
            description: "Cafe receipt",
            totalAmount: 980,
            category: "Food",
            paidBy: [PayerShare(personId: "charlie", amount: 980)],
            splitMethod: .itemwise,
            shares: [
                PayerShare(personId: "alice", amount: 330),
                PayerShare(personId: "bob", amount: 210),
                PayerShare(personId: "charlie", amount: 440)
            ],
            items: [
                ExpenseItem(id: "latte", name: "Latte", price: 420, sharedBy: ["alice", "charlie"], categoryName: "Food"),
                ExpenseItem(id: "sandwich", name: "Sandwich", price: 560, sharedBy: ["alice", "bob", "charlie"], categoryName: "Food")
            ],
            createdAt: "2026-04-11T11:20:00.000Z"
        )
    ]

    public static let settlementPayments: [SettlementPayment] = [
        SettlementPayment(
            id: "paid-1",
            debtorId: "bob",
            creditorId: "alice",
            amountSettled: 300,
            settledAt: "2026-04-11T12:00:00.000Z",
            markedByUserId: "sample-user"
        )
    ]

    public static let manualOverrides: [ManualSettlementOverride] = [
        ManualSettlementOverride(
            id: "override-1",
            debtorId: "charlie",
            creditorId: "alice",
            amount: 500,
            notes: "Charlie prefers paying Alice directly.",
            createdAt: "2026-04-11T12:30:00.000Z",
            updatedAt: "2026-04-11T12:30:00.000Z",
            isActive: true
        )
    ]

    public static let profile = UserProfile(
        id: "profile",
        userId: "sample-user",
        role: .admin,
        firstName: "Gaurav",
        lastName: nil,
        themePreference: "system",
        lastActiveView: .dashboard
    )
}
