import Foundation
import SettleEaseCore

public struct ConvexJWT: Codable, Equatable, Sendable {
    public var token: String
    public var expiresIn: Int

    public init(token: String, expiresIn: Int) {
        self.token = token
        self.expiresIn = expiresIn
    }
}

public protocol ConvexAuthBridging: Sendable {
    func mintConvexToken(supabaseAccessToken: String) async throws -> ConvexJWT
}

public struct ConvexAuthBridge: ConvexAuthBridging {
    private let webBaseURL: URL
    private let httpClient: HTTPClient
    private let decoder: JSONDecoder

    public init(webBaseURL: URL, httpClient: HTTPClient = URLSessionHTTPClient()) {
        self.webBaseURL = webBaseURL
        self.httpClient = httpClient
        self.decoder = JSONDecoder()
    }

    public func mintConvexToken(supabaseAccessToken: String) async throws -> ConvexJWT {
        let url = webBaseURL.appending(path: "api/convex-token")
        let request = HTTPRequest(
            url: url,
            method: "POST",
            headers: [
                "Authorization": "Bearer \(supabaseAccessToken)",
                "Accept": "application/json"
            ]
        )
        let (data, _) = try await httpClient.data(for: request)
        return try decoder.decode(ConvexJWT.self, from: data)
    }
}

public protocol SettleEaseRepository: Sendable {
    func snapshot() async throws -> SettleEaseSnapshot
    func saveExpense(_ expense: Expense) async throws
    func addSettlementPayment(_ payment: SettlementPayment) async throws
    func deleteSettlementPayment(id: String) async throws
}

public struct SettleEaseSnapshot: Sendable {
    public var profile: UserProfile
    public var people: [Person]
    public var categories: [SettleEaseCore.Category]
    public var expenses: [Expense]
    public var settlementPayments: [SettlementPayment]
    public var manualOverrides: [ManualSettlementOverride]

    public init(
        profile: UserProfile,
        people: [Person],
        categories: [SettleEaseCore.Category],
        expenses: [Expense],
        settlementPayments: [SettlementPayment],
        manualOverrides: [ManualSettlementOverride]
    ) {
        self.profile = profile
        self.people = people
        self.categories = categories
        self.expenses = expenses
        self.settlementPayments = settlementPayments
        self.manualOverrides = manualOverrides
    }

    public static let sample = SettleEaseSnapshot(
        profile: SettleEaseSampleData.profile,
        people: SettleEaseSampleData.people,
        categories: SettleEaseSampleData.categories,
        expenses: SettleEaseSampleData.expenses,
        settlementPayments: SettleEaseSampleData.settlementPayments,
        manualOverrides: SettleEaseSampleData.manualOverrides
    )
}

public actor SampleSettleEaseRepository: SettleEaseRepository {
    private var state: SettleEaseSnapshot

    public init(state: SettleEaseSnapshot = .sample) {
        self.state = state
    }

    public func snapshot() async throws -> SettleEaseSnapshot {
        state
    }

    public func saveExpense(_ expense: Expense) async throws {
        if let index = state.expenses.firstIndex(where: { $0.id == expense.id }) {
            state.expenses[index] = expense
        } else {
            state.expenses.insert(expense, at: 0)
        }
    }

    public func addSettlementPayment(_ payment: SettlementPayment) async throws {
        state.settlementPayments.insert(payment, at: 0)
    }

    public func deleteSettlementPayment(id: String) async throws {
        state.settlementPayments.removeAll { $0.id == id }
    }
}

public enum LiveRepositoryError: Error, Equatable {
    case convexSDKNotLinked
}
