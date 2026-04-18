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
    func iconResolverMapsLucideAndCategoryNamesToSafeSymbols() {
        #expect(SettleIcon.symbol(for: "handshake") == "person.2.fill")
        #expect(SettleIcon.symbol(for: "Utensils") == "fork.knife")
        #expect(SettleIcon.symbol(for: "Beer") == "wineglass.fill")
        #expect(SettleIcon.symbol(for: "Cigarette") == "tag.fill")
        #expect(SettleIcon.symbol(for: "hand.coins.fill") == "creditcard.fill")
        #expect(SettleIcon.symbol(for: "person.2.fill") == "person.2.fill")
        #expect(SettleIcon.symbol(for: "") == "tag.fill")
        #expect(SettleIcon.symbol(for: nil) == "tag.fill")
    }

    @Test
    func dashboardDerivedStateCachesBalancesTransactionsAndGroupedActivities() {
        let snapshot = dashboardSnapshot()
        let derived = DashboardDerivedState.build(
            snapshot: snapshot,
            filters: DashboardFilters(),
            useSimplifiedSettlements: true
        )

        #expect(abs((derived.balances["alice"]?.netBalance ?? 0) - 160) < 0.001)
        #expect(abs((derived.balances["bob"]?.netBalance ?? 0) - -60) < 0.001)
        #expect(abs((derived.balances["charlie"]?.netBalance ?? 0) - -100) < 0.001)
        #expect(derived.visibleTransactions.map(\.from) == ["charlie", "bob"])
        #expect(derived.visibleTransactions.map(\.to) == ["alice", "alice"])
        #expect(derived.activities.map(\.id) == ["expense-dinner", "settlement-bob-paid"])
        #expect(derived.groupedActivities.count == 1)
    }

    @Test
    func perPersonPresentationMatchesWebsiteEquivalentTotals() {
        let snapshot = dashboardSnapshot()
        let derived = DashboardDerivedState.build(
            snapshot: snapshot,
            filters: DashboardFilters(),
            useSimplifiedSettlements: true
        )

        let presentation = PersonSettlementPresentation.build(
            person: people[1],
            snapshot: snapshot,
            simplifiedTransactions: derived.simplifiedTransactions,
            balances: derived.balances
        )

        #expect(abs(presentation.balance.totalOwed - 100) < 0.001)
        #expect(abs(presentation.balance.settledAsDebtor - 40) < 0.001)
        #expect(abs(presentation.balance.netBalance - -60) < 0.001)
        #expect(presentation.debts.count == 1)
        #expect(presentation.debts.first?.from == "bob")
        #expect(presentation.debts.first?.to == "alice")
        #expect(abs((presentation.debts.first?.amount ?? 0) - 60) < 0.001)
        #expect(presentation.credits.isEmpty)
        #expect(presentation.payments.map(\.id) == ["bob-paid"])
        #expect(presentation.expenseContributions.count == 1)
        #expect(abs((presentation.expenseContributions.first?.netEffect ?? 0) - -100) < 0.001)
    }

    @Test
    func expenseDetailPresentationBuildsAdjustedItemwiseShares() {
        let expense = Expense(
            id: "itemwise",
            description: "Celebration dinner",
            totalAmount: 120,
            category: "Food",
            paidBy: [PayerShare(personId: "alice", amount: 120)],
            splitMethod: .itemwise,
            shares: [
                PayerShare(personId: "alice", amount: 23.076923),
                PayerShare(personId: "bob", amount: 46.153846),
                PayerShare(personId: "charlie", amount: 30.769231)
            ],
            items: [
                ExpenseItem(id: "paneer-a", name: " Paneer  Tikka ", price: 60, sharedBy: ["alice", "bob"], categoryName: "Food"),
                ExpenseItem(id: "paneer-b", name: "Paneer Tikka", price: 60, sharedBy: ["bob", "charlie"], categoryName: "Food"),
                ExpenseItem(id: "cake", name: "Cake", price: 10, sharedBy: ["charlie"], categoryName: "Treats")
            ],
            celebrationContribution: CelebrationContribution(personId: "bob", amount: 20)
        )

        let detail = ExpenseDetailPresentation.build(
            expense: expense,
            peopleMap: ["alice": "Alice", "bob": "Bob", "charlie": "Charlie"]
        )

        #expect(abs(detail.amountEffectivelySplit - 100) < 0.001)
        #expect(detail.groupedOriginalItems.count == 2)
        #expect(detail.groupedOriginalItems.first?.name == "Paneer Tikka")
        #expect(detail.groupedOriginalItems.first?.quantity == 2)
        #expect(abs((detail.groupedOriginalItems.first?.totalPrice ?? 0) - 120) < 0.001)
        #expect(detail.groupedOriginalItems.first?.sharingVariants.count == 2)
        let bobShare = detail.adjustedItemShares.first { $0.personId == "bob" }
        #expect(abs((bobShare?.totalShareOfAdjustedItems ?? 0) - 46.153846) < 0.001)
        let bobNet = detail.netEffectRows.first { $0.personId == "bob" }
        #expect(abs((bobNet?.celebrationAmount ?? 0) - 20) < 0.001)
        #expect(abs((bobNet?.netEffect ?? 0) - -66.153846) < 0.001)
    }

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
    func summaryPayloadHashIsStableForEquivalentDashboardOrdering() throws {
        let dinner = Expense(
            id: "dinner",
            description: "Dinner",
            totalAmount: 300,
            category: "Food",
            paidBy: [
                PayerShare(personId: "alice", amount: 200),
                PayerShare(personId: "bob", amount: 100)
            ],
            splitMethod: .itemwise,
            shares: [
                PayerShare(personId: "alice", amount: 90),
                PayerShare(personId: "bob", amount: 100),
                PayerShare(personId: "charlie", amount: 90)
            ],
            items: [
                ExpenseItem(id: "noodles", name: "Noodles", price: 180, sharedBy: ["alice", "charlie"], categoryName: "Food"),
                ExpenseItem(id: "drinks", name: "Drinks", price: 120, sharedBy: ["bob", "alice"], categoryName: "Food")
            ],
            celebrationContribution: CelebrationContribution(personId: "charlie", amount: 20),
            createdAt: "2026-04-14T08:00:00.000Z"
        )
        let rent = Expense(
            id: "rent",
            description: "Rent",
            totalAmount: 600,
            category: "Rent",
            paidBy: [PayerShare(personId: "charlie", amount: 600)],
            splitMethod: .equal,
            shares: [
                PayerShare(personId: "alice", amount: 200),
                PayerShare(personId: "bob", amount: 200),
                PayerShare(personId: "charlie", amount: 200)
            ],
            createdAt: "2026-04-13T08:00:00.000Z"
        )
        let payments = [
            SettlementPayment(
                id: "bob-alice",
                debtorId: "bob",
                creditorId: "alice",
                amountSettled: 25,
                settledAt: "2026-04-15T08:00:00.000Z",
                markedByUserId: "user"
            ),
            SettlementPayment(
                id: "alice-charlie",
                debtorId: "alice",
                creditorId: "charlie",
                amountSettled: 40,
                settledAt: "2026-04-15T08:00:00.000Z",
                markedByUserId: "user"
            )
        ]
        let overrides = [
            ManualSettlementOverride(
                id: "override-bob-alice",
                debtorId: "bob",
                creditorId: "alice",
                amount: 15,
                createdAt: "2026-04-15T09:00:00.000Z",
                updatedAt: "2026-04-15T09:00:00.000Z",
                isActive: true
            )
        ]

        var reorderedDinner = dinner
        reorderedDinner.paidBy.reverse()
        reorderedDinner.shares.reverse()
        reorderedDinner.items = Array(reorderedDinner.items?.map { item in
            var item = item
            item.sharedBy.reverse()
            return item
        }.reversed() ?? [])

        let first = summaryPayload(
            expenses: [dinner, rent],
            settlementPayments: payments,
            manualOverrides: overrides,
            categories: categories
        )
        let second = summaryPayload(
            expenses: [rent, reorderedDinner],
            settlementPayments: Array(payments.reversed()),
            manualOverrides: Array(overrides.reversed()),
            categories: Array(categories.reversed())
        )

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

    private func dashboardSnapshot() -> DashboardSnapshot {
        DashboardSnapshot(
            profile: UserProfile(id: "profile", userId: "user", role: .admin),
            people: people,
            categories: categories,
            expenses: [
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
                    ],
                    createdAt: "2026-04-12T05:00:00.000Z"
                )
            ],
            settlementPayments: [
                SettlementPayment(
                    id: "bob-paid",
                    debtorId: "bob",
                    creditorId: "alice",
                    amountSettled: 40,
                    settledAt: "2026-04-12T06:00:00.000Z",
                    markedByUserId: "user"
                )
            ],
            manualOverrides: []
        )
    }

    private func summaryPayload(
        expenses: [Expense],
        settlementPayments: [SettlementPayment],
        manualOverrides: [ManualSettlementOverride],
        categories: [SettleEaseCore.Category]
    ) -> SettleJSONValue {
        let snapshot = DashboardSnapshot(
            profile: UserProfile(id: "profile", userId: "user", role: .admin),
            people: people,
            categories: categories,
            expenses: expenses,
            settlementPayments: settlementPayments,
            manualOverrides: manualOverrides
        )
        let derived = DashboardDerivedState.build(
            snapshot: snapshot,
            filters: DashboardFilters(),
            useSimplifiedSettlements: true
        )
        return SummaryPayloadBuilder.build(
            people: snapshot.people,
            peopleMap: snapshot.peopleMap,
            allExpenses: snapshot.expenses,
            categories: snapshot.categories,
            pairwiseTransactions: derived.pairwiseTransactions,
            simplifiedTransactions: derived.simplifiedTransactions,
            settlementPayments: snapshot.settlementPayments,
            manualOverrides: snapshot.manualOverrides,
            personBalances: derived.balances
        )
    }
}
