import Foundation

public enum SettleIcon {
    public static func symbol(for rawName: String?) -> String {
        let key = normalize(rawName)
        guard !key.isEmpty else { return "tag.fill" }

        switch key {
        case "sparkles":
            return "sparkles"
        case "exclamationmarktriangle", "exclamationmarktrianglefill":
            return "exclamationmark.triangle.fill"
        case "personcropcirclebadgecheckmark":
            return "person.crop.circle.badge.checkmark"
        case "person2", "person2fill", "people":
            return "person.2.fill"
        case "personcropcircle":
            return "person.crop.circle"
        case "handraised", "handraisedfill":
            return "hand.raised.fill"
        case "doc", "doctext", "doctextfill":
            return "doc.text.fill"
        case "checkmarkseal", "checkmarksealfill":
            return "checkmark.seal.fill"
        case "line3horizontaldecreasecircle":
            return "line.3.horizontal.decrease.circle"
        case "infocircle":
            return "info.circle"
        case "camera", "camerafill":
            return "camera.fill"
        case "photo", "photofill":
            return "photo.fill"
        case "handshake":
            return "person.2.fill"
        case "utensils", "forkknife", "food", "restaurant", "dining":
            return "fork.knife"
        case "beer", "wine", "alcohol", "martini", "cocktail", "liquor", "drinks":
            return "wineglass.fill"
        case "cigarette", "cigarettes", "tobacco", "smoke", "vape":
            return "tag.fill"
        case "handcoins", "handcoinsfill", "settlement", "payment", "payments":
            return "creditcard.fill"
        case "home", "house", "housefill", "accommodation", "hotel", "stay":
            return "house.fill"
        case "car", "carfill", "travel", "transport", "taxi", "bus", "train":
            return "car.fill"
        case "partypopper", "partypopperfill", "fun", "entertainment", "celebration":
            return "party.popper.fill"
        case "shoppingbag", "shopping", "bag":
            return "bag.fill"
        case "receipt", "receiptfill", "receipttext", "filetext":
            return "receipt.fill"
        case "settings", "settings2", "gear", "gearshape":
            return "gearshape.fill"
        case "helpcircle", "questionmarkcircle":
            return "questionmark.circle.fill"
        case "tags", "tag", "tagfill":
            return "tag.fill"
        default:
            return "tag.fill"
        }
    }

    private static func normalize(_ value: String?) -> String {
        (value ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .filter { $0.isLetter || $0.isNumber }
    }
}

public struct DashboardDerivedState: Sendable {
    public var balances: [String: PersonBalanceSnapshot]
    public var simplifiedTransactions: [CalculatedTransaction]
    public var pairwiseTransactions: [CalculatedTransaction]
    public var visibleTransactions: [CalculatedTransaction]
    public var activities: [DashboardActivity]
    public var groupedActivities: [(date: String, items: [DashboardActivity])]

    public init(
        balances: [String: PersonBalanceSnapshot] = [:],
        simplifiedTransactions: [CalculatedTransaction] = [],
        pairwiseTransactions: [CalculatedTransaction] = [],
        visibleTransactions: [CalculatedTransaction] = [],
        activities: [DashboardActivity] = [],
        groupedActivities: [(date: String, items: [DashboardActivity])] = []
    ) {
        self.balances = balances
        self.simplifiedTransactions = simplifiedTransactions
        self.pairwiseTransactions = pairwiseTransactions
        self.visibleTransactions = visibleTransactions
        self.activities = activities
        self.groupedActivities = groupedActivities
    }

    public static let empty = DashboardDerivedState()

    public static func build(
        snapshot: DashboardSnapshot?,
        filters: DashboardFilters,
        useSimplifiedSettlements: Bool
    ) -> DashboardDerivedState {
        guard let snapshot else { return .empty }

        let balances = PersonBalanceBuilder.balances(
            people: snapshot.people,
            expenses: snapshot.expenses,
            settlementPayments: snapshot.settlementPayments
        )
        let simplifiedTransactions = SettlementCalculator.simplifiedTransactions(
            people: snapshot.people,
            expenses: snapshot.expenses,
            settlementPayments: snapshot.settlementPayments,
            manualOverrides: snapshot.manualOverrides
        )
        let pairwiseTransactions = SettlementCalculator.pairwiseTransactions(
            people: snapshot.people,
            expenses: snapshot.expenses,
            settlementPayments: snapshot.settlementPayments
        )
        let visibleTransactions = useSimplifiedSettlements ? simplifiedTransactions : pairwiseTransactions
        let activities = DashboardActivityBuilder.activities(
            expenses: snapshot.expenses,
            settlementPayments: snapshot.settlementPayments,
            peopleMap: snapshot.peopleMap,
            categories: snapshot.categories,
            filters: filters
        )

        return DashboardDerivedState(
            balances: balances,
            simplifiedTransactions: simplifiedTransactions,
            pairwiseTransactions: pairwiseTransactions,
            visibleTransactions: visibleTransactions,
            activities: activities,
            groupedActivities: DashboardActivityBuilder.grouped(activities)
        )
    }
}

public struct PersonExpenseContribution: Equatable, Sendable, Identifiable {
    public var id: String { expense.id }
    public var expense: Expense
    public var amountPaid: Double
    public var shareAmount: Double
    public var celebrationAmount: Double
    public var netEffect: Double
    public var payerNames: [String]

    public var totalOwed: Double {
        shareAmount + celebrationAmount
    }
}

public struct PersonSettlementPresentation: Equatable, Sendable {
    public var person: Person
    public var balance: PersonBalanceSnapshot
    public var expenseContributions: [PersonExpenseContribution]
    public var debts: [CalculatedTransaction]
    public var credits: [CalculatedTransaction]
    public var payments: [SettlementPayment]

    public var isBalanced: Bool {
        abs(balance.netBalance) <= 0.01
    }

    public static func build(
        person: Person,
        snapshot: DashboardSnapshot,
        simplifiedTransactions: [CalculatedTransaction],
        balances: [String: PersonBalanceSnapshot]
    ) -> PersonSettlementPresentation {
        let peopleMap = snapshot.peopleMap
        let contributions = snapshot.expenses.compactMap { expense -> PersonExpenseContribution? in
            let amountPaid = expense.paidBy.first { $0.personId == person.id }?.amount ?? 0
            let shareAmount = expense.shares.first { $0.personId == person.id }?.amount ?? 0
            let celebrationAmount = expense.celebrationContribution?.personId == person.id
                ? expense.celebrationContribution?.amount ?? 0
                : 0
            let itemShare = (expense.items ?? []).contains { $0.sharedBy.contains(person.id) }
            guard amountPaid > 0 || shareAmount > 0 || celebrationAmount > 0 || itemShare else {
                return nil
            }

            return PersonExpenseContribution(
                expense: expense,
                amountPaid: amountPaid,
                shareAmount: shareAmount,
                celebrationAmount: celebrationAmount,
                netEffect: amountPaid - shareAmount - celebrationAmount,
                payerNames: expense.paidBy.map { peopleMap[$0.personId] ?? "Unknown" }
            )
        }

        let payments = snapshot.settlementPayments
            .filter { $0.debtorId == person.id || $0.creditorId == person.id }
            .sorted { ($0.settledAt) > ($1.settledAt) }

        return PersonSettlementPresentation(
            person: person,
            balance: balances[person.id] ?? PersonBalanceSnapshot(),
            expenseContributions: contributions,
            debts: simplifiedTransactions.filter { $0.from == person.id },
            credits: simplifiedTransactions.filter { $0.to == person.id },
            payments: payments
        )
    }
}

public struct GroupedItemSharingVariant: Equatable, Sendable {
    public var quantity: Int
    public var sharedBy: [String]
}

public struct GroupedExpenseItemDisplay: Equatable, Sendable, Identifiable {
    public var id: String { "\(firstSeenIndex)-\(name)-\(unitPrice)-\(categoryName ?? "")" }
    public var name: String
    public var categoryName: String?
    public var quantity: Int
    public var unitPrice: Double
    public var totalPrice: Double
    public var firstSeenIndex: Int
    public var sharingVariants: [GroupedItemSharingVariant]
}

public struct AdjustedItemShare: Equatable, Sendable, Identifiable {
    public var id: String
    public var itemName: String
    public var categoryName: String?
    public var originalItemPrice: Double
    public var adjustedItemPriceForSplit: Double
    public var shareForPerson: Double
    public var sharedByCount: Int
}

public struct PersonAdjustedItemShares: Equatable, Sendable, Identifiable {
    public var id: String { personId }
    public var personId: String
    public var items: [AdjustedItemShare]
    public var totalShareOfAdjustedItems: Double
}

public struct ExpenseNetEffectRow: Equatable, Sendable, Identifiable {
    public var id: String { personId }
    public var personId: String
    public var amountPaid: Double
    public var shareAmount: Double
    public var celebrationAmount: Double
    public var netEffect: Double
}

public struct ExpenseDetailPresentation: Equatable, Sendable {
    public var totalOriginalBill: Double
    public var amountEffectivelySplit: Double
    public var sortedPaidBy: [PayerShare]
    public var sortedShares: [PayerShare]
    public var involvedPersonIds: [String]
    public var groupedOriginalItems: [GroupedExpenseItemDisplay]
    public var adjustedItemShares: [PersonAdjustedItemShares]
    public var netEffectRows: [ExpenseNetEffectRow]

    public static func build(expense: Expense, peopleMap: [String: String]) -> ExpenseDetailPresentation {
        let totalOriginalBill = expense.totalAmount
        let celebrationAmount = expense.celebrationContribution?.amount ?? 0
        let amountEffectivelySplit = max(0, totalOriginalBill - celebrationAmount)
        let sortedPaidBy = expense.paidBy.sorted { name($0.personId, peopleMap) < name($1.personId, peopleMap) }
        let sortedShares = expense.shares.sorted { name($0.personId, peopleMap) < name($1.personId, peopleMap) }

        var involved = Set<String>()
        expense.paidBy.forEach { involved.insert($0.personId) }
        expense.shares.forEach { involved.insert($0.personId) }
        if let contributor = expense.celebrationContribution?.personId {
            involved.insert(contributor)
        }
        (expense.items ?? []).forEach { item in
            item.sharedBy.forEach { involved.insert($0) }
        }

        let adjustedItemShares = adjustedShares(
            items: expense.items ?? [],
            amountEffectivelySplit: amountEffectivelySplit,
            peopleMap: peopleMap
        )
        let netEffectRows = involved
            .map { personId in
                let paid = expense.paidBy.first { $0.personId == personId }?.amount ?? 0
                let share = expense.shares.first { $0.personId == personId }?.amount ?? 0
                let celebration = expense.celebrationContribution?.personId == personId
                    ? expense.celebrationContribution?.amount ?? 0
                    : 0
                return ExpenseNetEffectRow(
                    personId: personId,
                    amountPaid: paid,
                    shareAmount: share,
                    celebrationAmount: celebration,
                    netEffect: paid - share - celebration
                )
            }
            .sorted {
                let leftRank = netRank($0.netEffect)
                let rightRank = netRank($1.netEffect)
                if leftRank != rightRank { return leftRank < rightRank }
                return name($0.personId, peopleMap) < name($1.personId, peopleMap)
            }

        return ExpenseDetailPresentation(
            totalOriginalBill: totalOriginalBill,
            amountEffectivelySplit: amountEffectivelySplit,
            sortedPaidBy: sortedPaidBy,
            sortedShares: sortedShares,
            involvedPersonIds: involved.sorted { name($0, peopleMap) < name($1, peopleMap) },
            groupedOriginalItems: groupItemsForDisplay(expense.items ?? []),
            adjustedItemShares: adjustedItemShares,
            netEffectRows: netEffectRows
        )
    }

    public static func groupItemsForDisplay(_ items: [ExpenseItem]) -> [GroupedExpenseItemDisplay] {
        struct MutableGroup {
            var item: GroupedExpenseItemDisplay
            var variantMap: [String: Int]
        }

        var groups: [String: MutableGroup] = [:]
        var keyOrder: [String] = []

        for (index, item) in items.enumerated() {
            let normalizedName = item.name.trimmingCharacters(in: .whitespacesAndNewlines)
                .split(separator: " ")
                .joined(separator: " ")
                .lowercased()
            let normalizedCategory = (item.categoryName ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            let unitPriceCents = Int((item.price * 100).rounded())
            let groupKey = "\(normalizedName)::\(unitPriceCents)::\(normalizedCategory)"

            if groups[groupKey] == nil {
                groups[groupKey] = MutableGroup(
                    item: GroupedExpenseItemDisplay(
                        name: item.name.trimmingCharacters(in: .whitespacesAndNewlines)
                            .split(separator: " ")
                            .joined(separator: " "),
                        categoryName: item.categoryName,
                        quantity: 0,
                        unitPrice: Double(unitPriceCents) / 100,
                        totalPrice: 0,
                        firstSeenIndex: index,
                        sharingVariants: []
                    ),
                    variantMap: [:]
                )
                keyOrder.append(groupKey)
            }

            guard var group = groups[groupKey] else { continue }
            group.item.quantity += 1
            group.item.totalPrice += Double(unitPriceCents) / 100
            let sharedBy = item.sharedBy.sorted()
            let variantKey = sharedBy.joined(separator: "::")
            if let variantIndex = group.variantMap[variantKey] {
                group.item.sharingVariants[variantIndex].quantity += 1
            } else {
                group.variantMap[variantKey] = group.item.sharingVariants.count
                group.item.sharingVariants.append(GroupedItemSharingVariant(quantity: 1, sharedBy: sharedBy))
            }
            groups[groupKey] = group
        }

        return keyOrder.compactMap { groups[$0]?.item }
    }

    private static func adjustedShares(
        items: [ExpenseItem],
        amountEffectivelySplit: Double,
        peopleMap: [String: String]
    ) -> [PersonAdjustedItemShares] {
        let originalTotal = items.reduce(0) { $0 + $1.price }
        let factor: Double
        if originalTotal > 0.001, amountEffectivelySplit >= 0 {
            factor = amountEffectivelySplit / originalTotal
        } else if originalTotal == 0, amountEffectivelySplit == 0 {
            factor = 1
        } else {
            factor = 0
        }

        var shares: [String: [AdjustedItemShare]] = [:]
        for item in items {
            guard !item.sharedBy.isEmpty else { continue }
            let adjustedPrice = max(0, item.price * factor)
            let share = adjustedPrice > 0.001 ? adjustedPrice / Double(item.sharedBy.count) : 0
            for personId in item.sharedBy {
                shares[personId, default: []].append(
                    AdjustedItemShare(
                        id: item.id,
                        itemName: item.name,
                        categoryName: item.categoryName,
                        originalItemPrice: item.price,
                        adjustedItemPriceForSplit: adjustedPrice,
                        shareForPerson: share,
                        sharedByCount: item.sharedBy.count
                    )
                )
            }
        }

        return shares
            .map { personId, items in
                PersonAdjustedItemShares(
                    personId: personId,
                    items: items.sorted {
                        let leftCategory = ($0.categoryName ?? "").lowercased()
                        let rightCategory = ($1.categoryName ?? "").lowercased()
                        if leftCategory != rightCategory { return leftCategory < rightCategory }
                        return $0.itemName.localizedCaseInsensitiveCompare($1.itemName) == .orderedAscending
                    },
                    totalShareOfAdjustedItems: items.reduce(0) { $0 + $1.shareForPerson }
                )
            }
            .sorted { name($0.personId, peopleMap) < name($1.personId, peopleMap) }
    }

    private static func name(_ id: String, _ peopleMap: [String: String]) -> String {
        peopleMap[id] ?? "Unknown"
    }

    private static func netRank(_ value: Double) -> Int {
        if value > 0.001 { return 0 }
        if value < -0.001 { return 2 }
        return 1
    }
}
