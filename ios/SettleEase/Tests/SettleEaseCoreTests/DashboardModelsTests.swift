import Foundation
import Testing
@testable import SettleEaseCore

@Suite("Dashboard helpers")
struct DashboardModelsTests {
    private let people = [
        Person(id: "alice", name: "Alice"),
        Person(id: "bob", name: "Bob"),
        Person(id: "charlie", name: "Charlie")
    ]

    private let categories = [
        Category(id: "rent", name: "Rent", iconName: "Home", rank: 0),
        Category(id: "food", name: "Food", iconName: "Utensils", rank: 1)
    ]

    @Test
    func activityFeedFiltersSearchPersonCategoryAndExcludesIgnoredExpenses() {
        let activities = DashboardActivityBuilder.activities(
            expenses: [
                Expense(
                    id: "rent",
                    description: "April rent",
                    totalAmount: 3000,
                    category: "Rent",
                    paidBy: [PayerShare(personId: "alice", amount: 3000)],
                    splitMethod: .equal,
                    shares: [
                        PayerShare(personId: "alice", amount: 1000),
                        PayerShare(personId: "bob", amount: 1000),
                        PayerShare(personId: "charlie", amount: 1000)
                    ],
                    createdAt: "2026-04-12T10:00:00.000Z"
                ),
                Expense(
                    id: "ignored",
                    description: "Ignored gift",
                    totalAmount: 100,
                    category: "Food",
                    paidBy: [PayerShare(personId: "bob", amount: 100)],
                    splitMethod: .equal,
                    shares: [PayerShare(personId: "alice", amount: 100)],
                    excludeFromSettlement: true,
                    createdAt: "2026-04-12T11:00:00.000Z"
                )
            ],
            settlementPayments: [
                SettlementPayment(
                    id: "settled",
                    debtorId: "bob",
                    creditorId: "alice",
                    amountSettled: 50,
                    settledAt: "2026-04-12T12:00:00.000Z",
                    markedByUserId: "user",
                    notes: "April rent partial"
                )
            ],
            peopleMap: ["alice": "Alice", "bob": "Bob", "charlie": "Charlie"],
            categories: categories,
            filters: DashboardFilters(searchQuery: "rent", personId: "bob", categoryName: "Rent")
        )

        #expect(activities.count == 1)
        #expect(activities.first?.id == "expense-rent")
    }

    @Test
    func activityFeedSortsExpensesBeforeSettlementsWithinDateThenByCategoryRank() {
        let activities = DashboardActivityBuilder.activities(
            expenses: [
                Expense(
                    id: "food",
                    description: "Dinner",
                    totalAmount: 90,
                    category: "Food",
                    paidBy: [PayerShare(personId: "alice", amount: 90)],
                    splitMethod: .equal,
                    shares: [PayerShare(personId: "bob", amount: 45), PayerShare(personId: "alice", amount: 45)],
                    createdAt: "2026-04-12T05:00:00.000Z"
                ),
                Expense(
                    id: "rent",
                    description: "Rent",
                    totalAmount: 3000,
                    category: "Rent",
                    paidBy: [PayerShare(personId: "alice", amount: 3000)],
                    splitMethod: .equal,
                    shares: [PayerShare(personId: "bob", amount: 1500), PayerShare(personId: "alice", amount: 1500)],
                    createdAt: "2026-04-12T04:00:00.000Z"
                )
            ],
            settlementPayments: [
                SettlementPayment(
                    id: "settled",
                    debtorId: "bob",
                    creditorId: "alice",
                    amountSettled: 50,
                    settledAt: "2026-04-12T06:00:00.000Z",
                    markedByUserId: "user"
                )
            ],
            peopleMap: ["alice": "Alice", "bob": "Bob"],
            categories: categories,
            filters: DashboardFilters()
        )

        #expect(activities.map(\.id) == ["expense-rent", "expense-food", "settlement-settled"])
    }

    @Test
    func summaryHashIsStableForObjectKeyOrder() throws {
        let first: SettleJSONValue = .object([
            "b": .array([.int(2), .int(1)]),
            "a": .object(["y": .string("yes"), "x": .number(1.25)])
        ])
        let second: SettleJSONValue = .object([
            "a": .object(["x": .number(1.25), "y": .string("yes")]),
            "b": .array([.int(2), .int(1)])
        ])

        #expect(try SummaryPayloadBuilder.hash(first) == SummaryPayloadBuilder.hash(second))
    }

    @Test
    func aiConfigDecodesWebSnakeCaseFields() throws {
        let data = """
        {
          "key": "settlement-summary",
          "model_code": "gpt-5.4",
          "fallback_model_codes": ["gpt-5.4-mini"],
          "updated_at": "2026-04-13T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        let config = try JSONDecoder().decode(AiConfig.self, from: data)

        #expect(config.modelCode == "gpt-5.4")
        #expect(config.fallbackModelCodes == ["gpt-5.4-mini"])
        #expect(config.updatedAt == "2026-04-13T00:00:00.000Z")
    }

    @Test
    func aiConfigDecodesConvexCamelCaseFields() throws {
        let data = """
        {
          "key": "settlement-summary",
          "modelCode": "gpt-5.4",
          "fallbackModelCodes": ["gpt-5.4-mini"],
          "updatedAt": "2026-04-13T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        let config = try JSONDecoder().decode(AiConfig.self, from: data)

        #expect(config.modelCode == "gpt-5.4")
        #expect(config.fallbackModelCodes == ["gpt-5.4-mini"])
        #expect(config.updatedAt == "2026-04-13T00:00:00.000Z")
    }
}
