import Foundation

public struct PayerShare: Codable, Equatable, Sendable, Identifiable {
    public var id: String { personId }
    public var personId: String
    public var amount: Double

    public init(personId: String, amount: Double) {
        self.personId = personId
        self.amount = amount
    }
}

public struct ExpenseItem: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var price: Double
    public var sharedBy: [String]
    public var categoryName: String?

    public init(
        id: String,
        name: String,
        price: Double,
        sharedBy: [String],
        categoryName: String? = nil
    ) {
        self.id = id
        self.name = name
        self.price = price
        self.sharedBy = sharedBy
        self.categoryName = categoryName
    }
}

public struct CelebrationContribution: Codable, Equatable, Sendable {
    public var personId: String
    public var amount: Double

    public init(personId: String, amount: Double) {
        self.personId = personId
        self.amount = amount
    }
}

public enum SplitMethod: String, Codable, Equatable, Sendable, CaseIterable {
    case equal
    case unequal
    case itemwise

    public var displayName: String {
        switch self {
        case .equal: "Equal"
        case .unequal: "Unequal"
        case .itemwise: "Itemwise"
        }
    }
}

public struct Expense: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var description: String
    public var totalAmount: Double
    public var category: String
    public var paidBy: [PayerShare]
    public var splitMethod: SplitMethod
    public var shares: [PayerShare]
    public var items: [ExpenseItem]?
    public var celebrationContribution: CelebrationContribution?
    public var excludeFromSettlement: Bool
    public var createdAt: String?
    public var updatedAt: String?

    public init(
        id: String,
        description: String,
        totalAmount: Double,
        category: String,
        paidBy: [PayerShare],
        splitMethod: SplitMethod,
        shares: [PayerShare],
        items: [ExpenseItem]? = nil,
        celebrationContribution: CelebrationContribution? = nil,
        excludeFromSettlement: Bool = false,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.description = description
        self.totalAmount = totalAmount
        self.category = category
        self.paidBy = paidBy
        self.splitMethod = splitMethod
        self.shares = shares
        self.items = items
        self.celebrationContribution = celebrationContribution
        self.excludeFromSettlement = excludeFromSettlement
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case description
        case totalAmount = "total_amount"
        case category
        case paidBy = "paid_by"
        case splitMethod = "split_method"
        case shares
        case items
        case celebrationContribution = "celebration_contribution"
        case excludeFromSettlement = "exclude_from_settlement"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

public struct Person: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var createdAt: String?

    public init(id: String, name: String, createdAt: String? = nil) {
        self.id = id
        self.name = name
        self.createdAt = createdAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case createdAt = "created_at"
    }
}

public struct Category: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var iconName: String
    public var createdAt: String?
    public var rank: Int?

    public init(id: String, name: String, iconName: String, createdAt: String? = nil, rank: Int? = nil) {
        self.id = id
        self.name = name
        self.iconName = iconName
        self.createdAt = createdAt
        self.rank = rank
    }

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case iconName = "icon_name"
        case createdAt = "created_at"
        case rank
    }
}

public enum UserRole: String, Codable, Equatable, Sendable {
    case admin
    case user
}

public enum ActiveView: String, Codable, Equatable, Sendable, CaseIterable {
    case dashboard
    case analytics
    case addExpense
    case editExpenses
    case managePeople
    case manageCategories
    case manageSettlements
    case exportExpense
    case scanReceipt
    case settings
}

public struct UserProfile: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var userId: String
    public var role: UserRole
    public var firstName: String?
    public var lastName: String?
    public var themePreference: String?
    public var lastActiveView: ActiveView?

    public init(
        id: String,
        userId: String,
        role: UserRole,
        firstName: String? = nil,
        lastName: String? = nil,
        themePreference: String? = nil,
        lastActiveView: ActiveView? = nil
    ) {
        self.id = id
        self.userId = userId
        self.role = role
        self.firstName = firstName
        self.lastName = lastName
        self.themePreference = themePreference
        self.lastActiveView = lastActiveView
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case role
        case firstName = "first_name"
        case lastName = "last_name"
        case themePreference = "theme_preference"
        case lastActiveView = "last_active_view"
    }
}

public struct SettlementPayment: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var debtorId: String
    public var creditorId: String
    public var amountSettled: Double
    public var settledAt: String
    public var markedByUserId: String
    public var notes: String?

    public init(
        id: String,
        debtorId: String,
        creditorId: String,
        amountSettled: Double,
        settledAt: String,
        markedByUserId: String,
        notes: String? = nil
    ) {
        self.id = id
        self.debtorId = debtorId
        self.creditorId = creditorId
        self.amountSettled = amountSettled
        self.settledAt = settledAt
        self.markedByUserId = markedByUserId
        self.notes = notes
    }

    enum CodingKeys: String, CodingKey {
        case id
        case debtorId = "debtor_id"
        case creditorId = "creditor_id"
        case amountSettled = "amount_settled"
        case settledAt = "settled_at"
        case markedByUserId = "marked_by_user_id"
        case notes
    }
}

public struct ManualSettlementOverride: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var debtorId: String
    public var creditorId: String
    public var amount: Double
    public var notes: String?
    public var createdByUserId: String?
    public var createdAt: String
    public var updatedAt: String
    public var isActive: Bool

    public init(
        id: String,
        debtorId: String,
        creditorId: String,
        amount: Double,
        notes: String? = nil,
        createdByUserId: String? = nil,
        createdAt: String,
        updatedAt: String,
        isActive: Bool
    ) {
        self.id = id
        self.debtorId = debtorId
        self.creditorId = creditorId
        self.amount = amount
        self.notes = notes
        self.createdByUserId = createdByUserId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.isActive = isActive
    }

    enum CodingKeys: String, CodingKey {
        case id
        case debtorId = "debtor_id"
        case creditorId = "creditor_id"
        case amount
        case notes
        case createdByUserId = "created_by_user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case isActive = "is_active"
    }
}

public struct CalculatedTransaction: Codable, Equatable, Sendable, Identifiable {
    public var id: String { "\(from)-\(to)-\(roundedAmount)" }
    public var from: String
    public var to: String
    public var amount: Double
    public var contributingExpenseIds: [String]?

    public init(from: String, to: String, amount: Double, contributingExpenseIds: [String]? = nil) {
        self.from = from
        self.to = to
        self.amount = amount
        self.contributingExpenseIds = contributingExpenseIds
    }

    private var roundedAmount: String {
        String(format: "%.2f", amount)
    }
}

public struct ParsedReceiptData: Codable, Equatable, Sendable {
    public struct Item: Codable, Equatable, Sendable, Identifiable {
        public var id: String { "\(name)-\(totalPrice)" }
        public var name: String
        public var quantity: Double
        public var unitPrice: Double
        public var totalPrice: Double
        public var categoryHint: String

        public init(name: String, quantity: Double, unitPrice: Double, totalPrice: Double, categoryHint: String) {
            self.name = name
            self.quantity = quantity
            self.unitPrice = unitPrice
            self.totalPrice = totalPrice
            self.categoryHint = categoryHint
        }

        enum CodingKeys: String, CodingKey {
            case name
            case quantity
            case unitPrice = "unit_price"
            case totalPrice = "total_price"
            case categoryHint = "category_hint"
        }
    }

    public struct AmountLine: Codable, Equatable, Sendable, Identifiable {
        public var id: String { "\(label)-\(amount)" }
        public var label: String
        public var amount: Double

        public init(label: String, amount: Double) {
            self.label = label
            self.amount = amount
        }
    }

    public var restaurantName: String?
    public var date: String?
    public var items: [Item]
    public var subtotals: [AmountLine]
    public var taxes: [AmountLine]
    public var totalAmount: Double
    public var currency: String
    public var additionalCharges: [AmountLine]

    public init(
        restaurantName: String? = nil,
        date: String? = nil,
        items: [Item],
        subtotals: [AmountLine] = [],
        taxes: [AmountLine] = [],
        totalAmount: Double,
        currency: String = "INR",
        additionalCharges: [AmountLine] = []
    ) {
        self.restaurantName = restaurantName
        self.date = date
        self.items = items
        self.subtotals = subtotals
        self.taxes = taxes
        self.totalAmount = totalAmount
        self.currency = currency
        self.additionalCharges = additionalCharges
    }

    enum CodingKeys: String, CodingKey {
        case restaurantName = "restaurant_name"
        case date
        case items
        case subtotals
        case taxes
        case totalAmount = "total_amount"
        case currency
        case additionalCharges = "additional_charges"
    }
}

public struct StructuredSettlementSummary: Codable, Equatable, Sendable {
    public var settlementSnapshot: [String]
    public var paymentActions: [String]
    public var spendingMix: [String]
    public var balancePressure: [String]
    public var dataQuality: [String]
    public var nextBestActions: [String]

    public init(
        settlementSnapshot: [String] = [],
        paymentActions: [String] = [],
        spendingMix: [String] = [],
        balancePressure: [String] = [],
        dataQuality: [String] = [],
        nextBestActions: [String] = []
    ) {
        self.settlementSnapshot = settlementSnapshot
        self.paymentActions = paymentActions
        self.spendingMix = spendingMix
        self.balancePressure = balancePressure
        self.dataQuality = dataQuality
        self.nextBestActions = nextBestActions
    }
}
