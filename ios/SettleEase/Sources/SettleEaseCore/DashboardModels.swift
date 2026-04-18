import CryptoKit
import Foundation

public struct DashboardSnapshot: Equatable, Sendable {
    public var profile: UserProfile
    public var people: [Person]
    public var categories: [Category]
    public var expenses: [Expense]
    public var settlementPayments: [SettlementPayment]
    public var manualOverrides: [ManualSettlementOverride]
    public var activeAiPrompt: AiPrompt?
    public var activeAiConfig: AiConfig?

    public init(
        profile: UserProfile,
        people: [Person],
        categories: [Category],
        expenses: [Expense],
        settlementPayments: [SettlementPayment],
        manualOverrides: [ManualSettlementOverride],
        activeAiPrompt: AiPrompt? = nil,
        activeAiConfig: AiConfig? = nil
    ) {
        self.profile = profile
        self.people = people
        self.categories = categories
        self.expenses = expenses
        self.settlementPayments = settlementPayments
        self.manualOverrides = manualOverrides
        self.activeAiPrompt = activeAiPrompt
        self.activeAiConfig = activeAiConfig
    }

    public var peopleMap: [String: String] {
        Dictionary(uniqueKeysWithValues: people.map { ($0.id, $0.name) })
    }
}

public struct AiPrompt: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var promptText: String
    public var isActive: Bool
    public var version: Int
    public var description: String?
    public var createdAt: String?
    public var updatedAt: String?

    public init(
        id: String,
        name: String,
        promptText: String,
        isActive: Bool,
        version: Int,
        description: String? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.name = name
        self.promptText = promptText
        self.isActive = isActive
        self.version = version
        self.description = description
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case promptText = "prompt_text"
        case isActive = "is_active"
        case version
        case description
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

public struct AiConfig: Codable, Equatable, Sendable {
    public var key: String
    public var modelCode: String
    public var fallbackModelCodes: [String]
    public var updatedAt: String?

    public init(key: String, modelCode: String, fallbackModelCodes: [String], updatedAt: String? = nil) {
        self.key = key
        self.modelCode = modelCode
        self.fallbackModelCodes = fallbackModelCodes
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case key
        case modelCode
        case fallbackModelCodes
        case updatedAt
        case modelCodeSnake = "model_code"
        case fallbackModelCodesSnake = "fallback_model_codes"
        case updatedAtSnake = "updated_at"
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        key = try container.decode(String.self, forKey: .key)
        modelCode = try container.decodeIfPresent(String.self, forKey: .modelCode)
            ?? container.decode(String.self, forKey: .modelCodeSnake)
        fallbackModelCodes = try container.decodeIfPresent([String].self, forKey: .fallbackModelCodes)
            ?? container.decode([String].self, forKey: .fallbackModelCodesSnake)
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
            ?? container.decodeIfPresent(String.self, forKey: .updatedAtSnake)
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(key, forKey: .key)
        try container.encode(modelCode, forKey: .modelCode)
        try container.encode(fallbackModelCodes, forKey: .fallbackModelCodes)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}

public struct AISummaryCacheRecord: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var userId: String
    public var dataHash: String
    public var summary: String
    public var modelName: String?
    public var createdAt: String?
    public var updatedAt: String?

    public init(
        id: String,
        userId: String,
        dataHash: String,
        summary: String,
        modelName: String? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.userId = userId
        self.dataHash = dataHash
        self.summary = summary
        self.modelName = modelName
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case dataHash = "data_hash"
        case summary
        case modelName = "model_name"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

public struct SettlementSummaryResponse: Codable, Equatable, Sendable {
    public var source: String
    public var hash: String
    public var cacheKeyVersion: Int
    public var promptVersion: Int
    public var modelCode: String
    public var modelName: String?
    public var modelDisplayName: String?
    public var modelConfigFingerprint: String?
    public var payload: SettleJSONValue
    public var summary: StructuredSettlementSummary
    public var createdAt: String?
    public var updatedAt: String?

    public init(
        source: String,
        hash: String,
        cacheKeyVersion: Int,
        promptVersion: Int,
        modelCode: String,
        modelName: String? = nil,
        modelDisplayName: String? = nil,
        modelConfigFingerprint: String? = nil,
        payload: SettleJSONValue,
        summary: StructuredSettlementSummary,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.source = source
        self.hash = hash
        self.cacheKeyVersion = cacheKeyVersion
        self.promptVersion = promptVersion
        self.modelCode = modelCode
        self.modelName = modelName
        self.modelDisplayName = modelDisplayName
        self.modelConfigFingerprint = modelConfigFingerprint
        self.payload = payload
        self.summary = summary
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct PersonBalanceSnapshot: Codable, Equatable, Sendable {
    public var totalPaid: Double
    public var totalOwed: Double
    public var settledAsDebtor: Double
    public var settledAsCreditor: Double
    public var netBalance: Double

    public init(
        totalPaid: Double = 0,
        totalOwed: Double = 0,
        settledAsDebtor: Double = 0,
        settledAsCreditor: Double = 0,
        netBalance: Double = 0
    ) {
        self.totalPaid = totalPaid
        self.totalOwed = totalOwed
        self.settledAsDebtor = settledAsDebtor
        self.settledAsCreditor = settledAsCreditor
        self.netBalance = netBalance
    }
}

public struct DashboardFilters: Equatable, Sendable {
    public var searchQuery: String
    public var personId: String?
    public var categoryName: String?

    public init(searchQuery: String = "", personId: String? = nil, categoryName: String? = nil) {
        self.searchQuery = searchQuery
        self.personId = personId
        self.categoryName = categoryName
    }

    public var hasActiveFilters: Bool {
        !searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || personId != nil || categoryName != nil
    }
}

public enum DashboardActivity: Identifiable, Equatable, Sendable {
    case expense(Expense)
    case settlement(SettlementPayment)

    public var id: String {
        switch self {
        case .expense(let expense): "expense-\(expense.id)"
        case .settlement(let payment): "settlement-\(payment.id)"
        }
    }

    public var sortDate: Date {
        switch self {
        case .expense(let expense):
            return expense.createdAt.flatMap(SettleEaseFormatters.parseISODate) ?? .distantPast
        case .settlement(let payment):
            return SettleEaseFormatters.parseISODate(payment.settledAt) ?? .distantPast
        }
    }

    public var dateText: String {
        switch self {
        case .expense(let expense):
            return SettleEaseFormatters.longDate(expense.createdAt)
        case .settlement(let payment):
            return SettleEaseFormatters.longDate(payment.settledAt)
        }
    }
}

public enum SettleJSONValue: Equatable, Sendable {
    case string(String)
    case number(Double)
    case int(Int)
    case bool(Bool)
    case array([SettleJSONValue])
    case object([String: SettleJSONValue])
    case null
}

extension SettleJSONValue: Codable {
    public init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Int.self) {
            self = .int(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([SettleJSONValue].self) {
            self = .array(value)
        } else if let value = try? container.decode([String: SettleJSONValue].self) {
            self = .object(value)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported JSON value")
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .int(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}

public enum DashboardActivityBuilder {
    public static func activities(
        expenses: [Expense],
        settlementPayments: [SettlementPayment],
        peopleMap: [String: String],
        categories: [Category],
        filters: DashboardFilters
    ) -> [DashboardActivity] {
        let categoryRank = Dictionary(uniqueKeysWithValues: categories.map { ($0.name, $0.rank ?? 999) })
        let query = filters.searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        let expenseItems = expenses
            .filter { !$0.excludeFromSettlement }
            .map(DashboardActivity.expense)
        let settlementItems = settlementPayments.map(DashboardActivity.settlement)

        return (expenseItems + settlementItems)
            .filter { activity in
                matchesSearch(activity, query: query, peopleMap: peopleMap)
                    && matchesPerson(activity, personId: filters.personId)
                    && matchesCategory(activity, categoryName: filters.categoryName)
            }
            .sorted { lhs, rhs in
                let lhsDate = Calendar.current.startOfDay(for: lhs.sortDate)
                let rhsDate = Calendar.current.startOfDay(for: rhs.sortDate)
                if lhsDate != rhsDate { return lhsDate > rhsDate }

                switch (lhs, rhs) {
                case (.expense(let left), .expense(let right)):
                    let leftRank = categoryRank[left.category] ?? 999
                    let rightRank = categoryRank[right.category] ?? 999
                    if leftRank != rightRank { return leftRank < rightRank }
                    return left.description.localizedCaseInsensitiveCompare(right.description) == .orderedAscending
                case (.expense, .settlement):
                    return true
                case (.settlement, .expense):
                    return false
                case (.settlement(let left), .settlement(let right)):
                    return left.settledAt > right.settledAt
                }
            }
    }

    public static func grouped(_ activities: [DashboardActivity]) -> [(date: String, items: [DashboardActivity])] {
        var groups: [(date: String, items: [DashboardActivity])] = []
        for activity in activities {
            if let index = groups.firstIndex(where: { $0.date == activity.dateText }) {
                groups[index].items.append(activity)
            } else {
                groups.append((activity.dateText, [activity]))
            }
        }
        return groups
    }

    private static func matchesSearch(_ activity: DashboardActivity, query: String, peopleMap: [String: String]) -> Bool {
        guard !query.isEmpty else { return true }
        switch activity {
        case .expense(let expense):
            return expense.description.lowercased().contains(query)
        case .settlement(let payment):
            let debtor = peopleMap[payment.debtorId, default: ""]
            let creditor = peopleMap[payment.creditorId, default: ""]
            let notes = payment.notes ?? ""
            return "payment \(debtor) \(creditor) \(notes)".lowercased().contains(query)
        }
    }

    private static func matchesPerson(_ activity: DashboardActivity, personId: String?) -> Bool {
        guard let personId else { return true }
        switch activity {
        case .expense(let expense):
            return expense.paidBy.contains { $0.personId == personId }
                || expense.shares.contains { $0.personId == personId }
                || (expense.items ?? []).contains { $0.sharedBy.contains(personId) }
                || expense.celebrationContribution?.personId == personId
        case .settlement(let payment):
            return payment.debtorId == personId || payment.creditorId == personId
        }
    }

    private static func matchesCategory(_ activity: DashboardActivity, categoryName: String?) -> Bool {
        guard let categoryName else { return true }
        switch activity {
        case .expense(let expense):
            return expense.category == categoryName
                || (expense.items ?? []).contains { $0.categoryName == categoryName }
        case .settlement:
            return false
        }
    }
}

public enum PersonBalanceBuilder {
    public static func balances(
        people: [Person],
        expenses: [Expense],
        settlementPayments: [SettlementPayment]
    ) -> [String: PersonBalanceSnapshot] {
        var balances = Dictionary(uniqueKeysWithValues: people.map { ($0.id, PersonBalanceSnapshot()) })

        for expense in expenses where !expense.excludeFromSettlement {
            for payment in expense.paidBy {
                balances[payment.personId, default: PersonBalanceSnapshot()].totalPaid += payment.amount
            }
            for share in expense.shares {
                balances[share.personId, default: PersonBalanceSnapshot()].totalOwed += share.amount
            }
            if let celebration = expense.celebrationContribution, celebration.amount > 0 {
                balances[celebration.personId, default: PersonBalanceSnapshot()].totalOwed += celebration.amount
            }
        }

        for payment in settlementPayments {
            balances[payment.debtorId, default: PersonBalanceSnapshot()].settledAsDebtor += payment.amountSettled
            balances[payment.creditorId, default: PersonBalanceSnapshot()].settledAsCreditor += payment.amountSettled
        }

        let net = SettlementCalculator.netBalances(people: people, expenses: expenses, settlementPayments: settlementPayments)
        for person in people {
            balances[person.id, default: PersonBalanceSnapshot()].netBalance = net[person.id] ?? 0
        }
        return balances
    }
}

public enum SummaryPayloadBuilder {
    private static let epsilon = 0.01
    private static let uncategorized = "Uncategorized"

    public static func build(
        people: [Person],
        peopleMap: [String: String],
        allExpenses: [Expense],
        categories: [Category],
        pairwiseTransactions: [CalculatedTransaction],
        simplifiedTransactions: [CalculatedTransaction],
        settlementPayments: [SettlementPayment],
        manualOverrides: [ManualSettlementOverride],
        personBalances: [String: PersonBalanceSnapshot]
    ) -> SettleJSONValue {
        let includedExpenses = ordered(allExpenses).filter { !$0.excludeFromSettlement }
        let excludedExpenses = ordered(allExpenses).filter(\.excludeFromSettlement)
        let activeOverrides = manualOverrides.filter(\.isActive)
        let categoryTotals = categoryTotals(expenses: includedExpenses)
        let includedSpend = round(includedExpenses.reduce(0) { $0 + $1.totalAmount })
        let excludedSpend = round(excludedExpenses.reduce(0) { $0 + $1.totalAmount })
        let amountAlreadySettled = round(settlementPayments.reduce(0) { $0 + $1.amountSettled })
        let recommendedPaymentOrder = recommendedPayments(
            simplifiedTransactions: simplifiedTransactions,
            settlementPayments: settlementPayments,
            peopleMap: peopleMap,
            people: people
        )
        let remaining = round(recommendedPaymentOrder.reduce(0) { sum, value in
            sum + (value["outstanding_amount"]?.doubleValue ?? 0)
        })
        let netBalances = SettlementCalculator.netBalances(
            people: people,
            expenses: allExpenses,
            settlementPayments: settlementPayments
        )
        let warnings = integrityWarnings(people: people, expenses: allExpenses, settlementPayments: settlementPayments)
        let balanceSum = round(netBalances.values.reduce(0, +))
        let categoriesWithTotals = categoriesWithTotals(categories: categories, totals: categoryTotals)

        return .object([
            "schemaVersion": .int(2),
            "counts": .object([
                "people": .int(people.count),
                "expenses": .int(includedExpenses.count),
                "excludedExpenses": .int(excludedExpenses.count),
                "settlementPayments": .int(settlementPayments.count),
                "pairwiseTransactions": .int(pairwiseTransactions.count),
                "simplifiedTransactions": .int(simplifiedTransactions.count),
                "activeManualOverrides": .int(activeOverrides.count)
            ]),
            "overviewDescriptions": .object([
                "simplifyOn": .string("Minimum transactions required to settle all debts."),
                "simplifyOff": .string("Detailed pairwise debts reflecting direct expense involvements and payments.")
            ]),
            "personBalances": .object(personBalancesByName(people: people, peopleMap: peopleMap, balances: personBalances)),
            "personBalancesList": .array(personBalanceList(people: people, peopleMap: peopleMap, balances: personBalances)),
            "transactions": .object([
                "pairwise": .array(namedTransactions(pairwiseTransactions, people: people, peopleMap: peopleMap)),
                "simplified": .array(namedTransactions(simplifiedTransactions, people: people, peopleMap: peopleMap)),
                "recommendedPaymentOrder": .array(recommendedPaymentOrder.map { .object($0) })
            ]),
            "categories": .array(categoriesWithTotals),
            "settlementPayments": .array(namedSettlementPayments(settlementPayments, people: people, peopleMap: peopleMap)),
            "manualOverrides": .array(namedOverrides(activeOverrides, people: people, peopleMap: peopleMap)),
            "expenses": .array(namedExpenses(includedExpenses, people: people, peopleMap: peopleMap)),
            "people": .array(people.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }.map { .object(["name": .string($0.name)]) }),
            "analysis": .object([
                "totals": .object([
                    "includedSpend": .number(includedSpend),
                    "excludedSpend": .number(excludedSpend),
                    "amountAlreadySettled": .number(amountAlreadySettled),
                    "remainingSimplifiedSettlementAmount": .number(remaining),
                    "activeManualOverrides": .int(activeOverrides.count)
                ]),
                "balances": .object([
                    "rankedCreditors": .array(rankedBalances(netBalances, people: people, peopleMap: peopleMap, positive: true)),
                    "rankedDebtors": .array(rankedBalances(netBalances, people: people, peopleMap: peopleMap, positive: false)),
                    "balancedPeopleCount": .int(people.filter { abs(netBalances[$0.id] ?? 0) <= epsilon }.count)
                ]),
                "spending": .object([
                    "topCategories": .array(topCategories(categoriesWithTotals, includedSpend: includedSpend)),
                    "topExpenses": .array(namedExpenses(includedExpenses, people: people, peopleMap: peopleMap).prefix(5).map { $0 }),
                    "splitMethodDistribution": .array(splitMethodDistribution(includedExpenses)),
                    "celebrationUsage": celebrationUsage(includedExpenses)
                ]),
                "settlement": .object([
                    "recommendedPaymentOrder": .array(recommendedPaymentOrder.map { .object($0) }),
                    "largestPayment": recommendedPaymentOrder.first.map { .object($0) } ?? .null,
                    "manualOverrideImpact": .object([
                        "active_count": .int(activeOverrides.count),
                        "total_override_amount": .number(round(activeOverrides.reduce(0) { $0 + $1.amount })),
                        "affected_pairs": .array(namedOverrides(activeOverrides, people: people, peopleMap: peopleMap).map {
                            if case .object(let object) = $0 {
                                return .object([
                                    "debtor": object["debtor"] ?? .string("Unknown"),
                                    "creditor": object["creditor"] ?? .string("Unknown"),
                                    "amount": object["amount"] ?? .number(0)
                                ])
                            }
                            return .null
                        })
                    ])
                ]),
                "integrity": .object([
                    "conservationCheck": .object([
                        "passes": .bool(abs(balanceSum) <= epsilon),
                        "balanceSum": .number(balanceSum),
                        "threshold": .number(epsilon)
                    ]),
                    "expenseConsistency": .object([
                        "checkedExpenses": .int(allExpenses.count),
                        "warningsCount": .int(warnings.count),
                        "passes": .bool(warnings.isEmpty)
                    ]),
                    "warningList": .array(warnings.map(SettleJSONValue.string))
                ])
            ])
        ])
    }

    public static func hash(_ value: SettleJSONValue) throws -> String {
        let data = try JSONEncoder.settleEaseSorted.encode(value.sortedForHashing())
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    private static func idToName(_ id: String, people: [Person], peopleMap: [String: String]) -> String {
        peopleMap[id] ?? people.first { $0.id == id }?.name ?? "Unknown"
    }

    private static func round(_ value: Double) -> Double {
        Foundation.round(value * 100) / 100
    }

    private static func ordered(_ expenses: [Expense]) -> [Expense] {
        expenses.sorted {
            if ($0.createdAt ?? "") != ($1.createdAt ?? "") { return ($0.createdAt ?? "") < ($1.createdAt ?? "") }
            if $0.description != $1.description { return $0.description < $1.description }
            if abs($0.totalAmount - $1.totalAmount) > epsilon { return $0.totalAmount < $1.totalAmount }
            return $0.id < $1.id
        }
    }

    private static func categoryTotals(expenses: [Expense]) -> [String: Double] {
        var totals: [String: Double] = [:]
        for expense in expenses {
            if expense.splitMethod == .itemwise, let items = expense.items, !items.isEmpty {
                for item in items {
                    totals[item.categoryName ?? expense.category, default: 0] += item.price
                }
            } else {
                totals[expense.category.isEmpty ? uncategorized : expense.category, default: 0] += expense.totalAmount
            }
        }
        return totals.mapValues(round)
    }

    private static func categoriesWithTotals(categories: [Category], totals: [String: Double]) -> [SettleJSONValue] {
        let allNames = Set(categories.map(\.name)).union(totals.keys)
        return allNames.map { name in
            let category = categories.first { $0.name == name }
            return .object([
                "name": .string(name),
                "icon_name": .string(category?.iconName ?? "HelpCircle"),
                "total_spent": .number(round(totals[name] ?? 0))
            ])
        }
        .sorted {
            let leftTotal = $0.objectValue?["total_spent"]?.doubleValue ?? 0
            let rightTotal = $1.objectValue?["total_spent"]?.doubleValue ?? 0
            if abs(leftTotal - rightTotal) > epsilon { return leftTotal > rightTotal }
            return ($0.objectValue?["name"]?.stringValue ?? "") < ($1.objectValue?["name"]?.stringValue ?? "")
        }
    }

    private static func namedTransactions(_ transactions: [CalculatedTransaction], people: [Person], peopleMap: [String: String]) -> [SettleJSONValue] {
        transactions
            .map {
                .object([
                    "from": .string(idToName($0.from, people: people, peopleMap: peopleMap)),
                    "to": .string(idToName($0.to, people: people, peopleMap: peopleMap)),
                    "amount": .number(round($0.amount))
                ])
            }
            .sorted { lhs, rhs in
                let leftAmount = lhs.objectValue?["amount"]?.doubleValue ?? 0
                let rightAmount = rhs.objectValue?["amount"]?.doubleValue ?? 0
                if abs(leftAmount - rightAmount) > epsilon { return leftAmount > rightAmount }
                let leftPair = "\(lhs.objectValue?["from"]?.stringValue ?? "")::\(lhs.objectValue?["to"]?.stringValue ?? "")"
                let rightPair = "\(rhs.objectValue?["from"]?.stringValue ?? "")::\(rhs.objectValue?["to"]?.stringValue ?? "")"
                return leftPair < rightPair
            }
    }

    private static func recommendedPayments(
        simplifiedTransactions: [CalculatedTransaction],
        settlementPayments: [SettlementPayment],
        peopleMap: [String: String],
        people: [Person]
    ) -> [[String: SettleJSONValue]] {
        var settled: [String: Double] = [:]
        for payment in settlementPayments {
            settled["\(payment.debtorId)::\(payment.creditorId)", default: 0] += payment.amountSettled
        }
        return simplifiedTransactions
            .map { transaction in
                let already = settled["\(transaction.from)::\(transaction.to)", default: 0]
                let outstanding = max(0, transaction.amount - already)
                return [
                    "from": .string(idToName(transaction.from, people: people, peopleMap: peopleMap)),
                    "to": .string(idToName(transaction.to, people: people, peopleMap: peopleMap)),
                    "original_amount": .number(round(transaction.amount)),
                    "already_settled_amount": .number(round(already)),
                    "outstanding_amount": .number(round(outstanding))
                ]
            }
            .filter { ($0["outstanding_amount"]?.doubleValue ?? 0) > epsilon }
            .sorted { lhs, rhs in
                let leftAmount = lhs["outstanding_amount"]?.doubleValue ?? 0
                let rightAmount = rhs["outstanding_amount"]?.doubleValue ?? 0
                if abs(leftAmount - rightAmount) > epsilon { return leftAmount > rightAmount }
                let leftPair = "\(lhs["from"]?.stringValue ?? "")::\(lhs["to"]?.stringValue ?? "")"
                let rightPair = "\(rhs["from"]?.stringValue ?? "")::\(rhs["to"]?.stringValue ?? "")"
                return leftPair < rightPair
            }
    }

    private static func personBalancesByName(people: [Person], peopleMap: [String: String], balances: [String: PersonBalanceSnapshot]) -> [String: SettleJSONValue] {
        Dictionary(uniqueKeysWithValues: personBalanceList(people: people, peopleMap: peopleMap, balances: balances).compactMap {
            guard case .object(let object) = $0, case .string(let name)? = object["name"] else { return nil }
            var value = object
            value.removeValue(forKey: "name")
            return (name, .object(value))
        })
    }

    private static func personBalanceList(people: [Person], peopleMap: [String: String], balances: [String: PersonBalanceSnapshot]) -> [SettleJSONValue] {
        people.map { person in
            let balance = balances[person.id] ?? PersonBalanceSnapshot()
            return .object([
                "name": .string(idToName(person.id, people: people, peopleMap: peopleMap)),
                "totalPaid": .number(round(balance.totalPaid)),
                "totalOwed": .number(round(balance.totalOwed)),
                "settledAsDebtor": .number(round(balance.settledAsDebtor)),
                "settledAsCreditor": .number(round(balance.settledAsCreditor)),
                "netBalance": .number(round(balance.netBalance))
            ])
        }.sorted { ($0.objectValue?["name"]?.stringValue ?? "") < ($1.objectValue?["name"]?.stringValue ?? "") }
    }

    private static func namedSettlementPayments(_ payments: [SettlementPayment], people: [Person], peopleMap: [String: String]) -> [SettleJSONValue] {
        payments.map { payment in
            .object([
                "debtor": .string(idToName(payment.debtorId, people: people, peopleMap: peopleMap)),
                "creditor": .string(idToName(payment.creditorId, people: people, peopleMap: peopleMap)),
                "amount_settled": .number(round(payment.amountSettled)),
                "settled_at": .string(payment.settledAt),
                "notes": payment.notes.map(SettleJSONValue.string) ?? .null
            ])
        }
        .sorted { lhs, rhs in
            let leftDate = lhs.objectValue?["settled_at"]?.stringValue ?? ""
            let rightDate = rhs.objectValue?["settled_at"]?.stringValue ?? ""
            if leftDate != rightDate { return leftDate > rightDate }
            let leftPair = "\(lhs.objectValue?["debtor"]?.stringValue ?? "")::\(lhs.objectValue?["creditor"]?.stringValue ?? "")"
            let rightPair = "\(rhs.objectValue?["debtor"]?.stringValue ?? "")::\(rhs.objectValue?["creditor"]?.stringValue ?? "")"
            if leftPair != rightPair { return leftPair < rightPair }
            return (lhs.objectValue?["amount_settled"]?.doubleValue ?? 0) > (rhs.objectValue?["amount_settled"]?.doubleValue ?? 0)
        }
    }

    private static func namedOverrides(_ overrides: [ManualSettlementOverride], people: [Person], peopleMap: [String: String]) -> [SettleJSONValue] {
        overrides.map { override in
            .object([
                "debtor": .string(idToName(override.debtorId, people: people, peopleMap: peopleMap)),
                "creditor": .string(idToName(override.creditorId, people: people, peopleMap: peopleMap)),
                "amount": .number(round(override.amount)),
                "notes": override.notes.map(SettleJSONValue.string) ?? .null,
                "is_active": .bool(override.isActive)
            ])
        }
        .sorted { lhs, rhs in
            let leftPair = "\(lhs.objectValue?["debtor"]?.stringValue ?? "")::\(lhs.objectValue?["creditor"]?.stringValue ?? "")"
            let rightPair = "\(rhs.objectValue?["debtor"]?.stringValue ?? "")::\(rhs.objectValue?["creditor"]?.stringValue ?? "")"
            if leftPair != rightPair { return leftPair < rightPair }
            return (lhs.objectValue?["amount"]?.doubleValue ?? 0) > (rhs.objectValue?["amount"]?.doubleValue ?? 0)
        }
    }

    private static func namedExpenses(_ expenses: [Expense], people: [Person], peopleMap: [String: String]) -> [SettleJSONValue] {
        expenses.map { expense in
            .object([
                "description": .string(expense.description),
                "total_amount": .number(round(expense.totalAmount)),
                "category": .string(expense.category),
                "split_method": .string(expense.splitMethod.rawValue),
                "created_at": expense.createdAt.map(SettleJSONValue.string) ?? .null,
                "paid_by": .array(expense.paidBy.map { .object([
                    "person": .string(idToName($0.personId, people: people, peopleMap: peopleMap)),
                    "amount": .number(round($0.amount))
                ]) }.sorted(by: namedAmountSort(personKey: "person", amountKey: "amount"))),
                "shares": .array(expense.shares.map { .object([
                    "person": .string(idToName($0.personId, people: people, peopleMap: peopleMap)),
                    "amount": .number(round($0.amount))
                ]) }.sorted(by: namedAmountSort(personKey: "person", amountKey: "amount"))),
                "celebration_contribution": expense.celebrationContribution.map { contribution in
                    .object([
                        "person": .string(idToName(contribution.personId, people: people, peopleMap: peopleMap)),
                        "amount": .number(round(contribution.amount))
                    ])
                } ?? .null,
                "items": .array((expense.items ?? []).map { item in
                    .object([
                        "name": .string(item.name),
                        "price": .number(round(item.price)),
                        "category_name": .string(item.categoryName ?? expense.category),
                        "shared_by": .array(item.sharedBy.map { .string(idToName($0, people: people, peopleMap: peopleMap)) }.sorted(by: stringValueSort))
                    ])
                }.sorted(by: itemSort))
            ])
        }
        .sorted(by: expenseSort)
    }

    private static func rankedBalances(_ balances: [String: Double], people: [Person], peopleMap: [String: String], positive: Bool) -> [SettleJSONValue] {
        balances
            .filter { positive ? $0.value > epsilon : $0.value < -epsilon }
            .map { id, balance in
                .object([
                    "name": .string(idToName(id, people: people, peopleMap: peopleMap)),
                    "amount": .number(round(positive ? balance : abs(balance)))
                ])
            }
            .sorted { lhs, rhs in
                let leftAmount = lhs.objectValue?["amount"]?.doubleValue ?? 0
                let rightAmount = rhs.objectValue?["amount"]?.doubleValue ?? 0
                if abs(leftAmount - rightAmount) > epsilon { return leftAmount > rightAmount }
                return (lhs.objectValue?["name"]?.stringValue ?? "") < (rhs.objectValue?["name"]?.stringValue ?? "")
            }
    }

    private static func topCategories(_ categories: [SettleJSONValue], includedSpend: Double) -> [SettleJSONValue] {
        categories.prefix(5).map { category in
            guard case .object(let object) = category else { return category }
            let total = object["total_spent"]?.doubleValue ?? 0
            return .object([
                "name": object["name"] ?? .string(uncategorized),
                "total_spent": .number(total),
                "share_of_included_spend": .number(includedSpend > epsilon ? round((total / includedSpend) * 100) : 0)
            ])
        }
    }

    private static func splitMethodDistribution(_ expenses: [Expense]) -> [SettleJSONValue] {
        SplitMethod.allCases.map { method in
            let count = expenses.filter { $0.splitMethod == method }.count
            return .object([
                "method": .string(method.rawValue),
                "count": .int(count),
                "percentage": .number(expenses.isEmpty ? 0 : round((Double(count) / Double(expenses.count)) * 100))
            ])
        }
    }

    private static func celebrationUsage(_ expenses: [Expense]) -> SettleJSONValue {
        let celebrationExpenses = expenses.filter { ($0.celebrationContribution?.amount ?? 0) > epsilon }
        return .object([
            "expense_count": .int(celebrationExpenses.count),
            "contribution_total": .number(round(celebrationExpenses.reduce(0) { $0 + ($1.celebrationContribution?.amount ?? 0) })),
            "spend_in_celebration_expenses": .number(round(celebrationExpenses.reduce(0) { $0 + $1.totalAmount }))
        ])
    }

    private static func integrityWarnings(people: [Person], expenses: [Expense], settlementPayments: [SettlementPayment]) -> [String] {
        let known = Set(people.map(\.id))
        var warnings: Set<String> = []
        for expense in expenses {
            let paid = expense.paidBy.reduce(0) { $0 + $1.amount }
            let shares = expense.shares.reduce(0) { $0 + $1.amount }
            let celebration = expense.celebrationContribution?.amount ?? 0
            if abs(paid - expense.totalAmount) > epsilon {
                warnings.insert("Expense \"\(expense.description)\" has paid_by total \(round(paid)) but total_amount \(round(expense.totalAmount)).")
            }
            if abs(shares + celebration - expense.totalAmount) > epsilon {
                warnings.insert("Expense \"\(expense.description)\" has shares+celebration \(round(shares + celebration)) but total_amount \(round(expense.totalAmount)).")
            }
            for payer in expense.paidBy where !known.contains(payer.personId) {
                warnings.insert("Expense \"\(expense.description)\" references an unknown payer.")
            }
            for share in expense.shares where !known.contains(share.personId) {
                warnings.insert("Expense \"\(expense.description)\" references an unknown sharer.")
            }
        }
        for payment in settlementPayments {
            if !known.contains(payment.debtorId) { warnings.insert("Settlement payment references an unknown debtor.") }
            if !known.contains(payment.creditorId) { warnings.insert("Settlement payment references an unknown creditor.") }
        }
        return warnings.sorted()
    }

    private static func namedAmountSort(personKey: String, amountKey: String) -> (SettleJSONValue, SettleJSONValue) -> Bool {
        { lhs, rhs in
            let leftName = lhs.objectValue?[personKey]?.stringValue ?? ""
            let rightName = rhs.objectValue?[personKey]?.stringValue ?? ""
            if leftName != rightName { return leftName < rightName }
            return (lhs.objectValue?[amountKey]?.doubleValue ?? 0) > (rhs.objectValue?[amountKey]?.doubleValue ?? 0)
        }
    }

    private static func stringValueSort(_ lhs: SettleJSONValue, _ rhs: SettleJSONValue) -> Bool {
        (lhs.stringValue ?? "") < (rhs.stringValue ?? "")
    }

    private static func itemSort(_ lhs: SettleJSONValue, _ rhs: SettleJSONValue) -> Bool {
        let leftCategory = lhs.objectValue?["category_name"]?.stringValue ?? ""
        let rightCategory = rhs.objectValue?["category_name"]?.stringValue ?? ""
        if leftCategory != rightCategory { return leftCategory < rightCategory }
        let leftName = lhs.objectValue?["name"]?.stringValue ?? ""
        let rightName = rhs.objectValue?["name"]?.stringValue ?? ""
        if leftName != rightName { return leftName < rightName }
        return (lhs.objectValue?["price"]?.doubleValue ?? 0) > (rhs.objectValue?["price"]?.doubleValue ?? 0)
    }

    private static func expenseSort(_ lhs: SettleJSONValue, _ rhs: SettleJSONValue) -> Bool {
        let leftObject = lhs.objectValue ?? [:]
        let rightObject = rhs.objectValue ?? [:]
        let leftDate = leftObject["created_at"]?.stringValue ?? ""
        let rightDate = rightObject["created_at"]?.stringValue ?? ""
        if leftDate != rightDate { return leftDate > rightDate }

        let leftDescription = leftObject["description"]?.stringValue ?? ""
        let rightDescription = rightObject["description"]?.stringValue ?? ""
        if leftDescription != rightDescription { return leftDescription < rightDescription }

        let leftTotal = leftObject["total_amount"]?.doubleValue ?? 0
        let rightTotal = rightObject["total_amount"]?.doubleValue ?? 0
        if abs(leftTotal - rightTotal) > epsilon { return leftTotal > rightTotal }

        let leftCategory = leftObject["category"]?.stringValue ?? ""
        let rightCategory = rightObject["category"]?.stringValue ?? ""
        return leftCategory < rightCategory
    }
}

private extension SettleJSONValue {
    var doubleValue: Double? {
        switch self {
        case .number(let value): value
        case .int(let value): Double(value)
        default: nil
        }
    }

    var stringValue: String? {
        if case .string(let value) = self { value } else { nil }
    }

    var objectValue: [String: SettleJSONValue]? {
        if case .object(let value) = self { value } else { nil }
    }

    func sortedForHashing() -> SettleJSONValue {
        switch self {
        case .array(let values):
            return .array(values.map { $0.sortedForHashing() })
        case .object(let object):
            return .object(Dictionary(uniqueKeysWithValues: object.keys.sorted().map { ($0, object[$0]!.sortedForHashing()) }))
        default:
            return self
        }
    }
}

private extension JSONEncoder {
    static var settleEaseSorted: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return encoder
    }
}
