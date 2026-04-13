@preconcurrency import Combine
import ConvexMobile
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

public protocol DashboardRepository: Sendable {
    func bootstrapProfile(session: SupabaseSession) async throws -> UserProfile
    func streamDashboardSnapshot(session: SupabaseSession) async throws -> AsyncThrowingStream<DashboardSnapshot, Error>
    func markSettlementPaid(_ transaction: CalculatedTransaction, markedByUserId: String) async throws
    func deleteSettlementPayment(id: String) async throws
    func cachedSummary(hash: String) async throws -> AISummaryCacheRecord?
    func storeSummary(hash: String, summary: StructuredSettlementSummary, modelName: String?, userId: String) async throws
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

public struct ConvexAuthResult: Sendable {
    public var supabaseSession: SupabaseSession
    public var convexToken: String
    public var expiresAt: Date

    public init(supabaseSession: SupabaseSession, convexToken: String, expiresAt: Date) {
        self.supabaseSession = supabaseSession
        self.convexToken = convexToken
        self.expiresAt = expiresAt
    }
}

public final class SettleEaseConvexAuthProvider: AuthProvider, @unchecked Sendable {
    public typealias T = ConvexAuthResult

    private let auth: any SupabaseAuthenticating
    private let bridge: any ConvexAuthBridging

    public init(auth: any SupabaseAuthenticating, bridge: any ConvexAuthBridging) {
        self.auth = auth
        self.bridge = bridge
    }

    public func login(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> ConvexAuthResult {
        try await mint(onIdToken: onIdToken)
    }

    public func loginFromCache(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> ConvexAuthResult {
        try await mint(onIdToken: onIdToken)
    }

    public func logout() async throws {
        try await auth.signOut()
    }

    public func extractIdToken(from authResult: ConvexAuthResult) -> String {
        authResult.convexToken
    }

    private func mint(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> ConvexAuthResult {
        let session = try await auth.currentValidSession()
        let jwt = try await bridge.mintConvexToken(supabaseAccessToken: session.accessToken)
        onIdToken(jwt.token)
        return ConvexAuthResult(
            supabaseSession: session,
            convexToken: jwt.token,
            expiresAt: Date().addingTimeInterval(TimeInterval(jwt.expiresIn))
        )
    }
}

public final class LiveDashboardRepository: DashboardRepository, @unchecked Sendable {
    private let client: ConvexClientWithAuth<ConvexAuthResult>
    private let auth: any SupabaseAuthenticating
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(
        configuration: AppConfiguration,
        auth: any SupabaseAuthenticating,
        authBridge: any ConvexAuthBridging
    ) {
        self.auth = auth
        self.client = ConvexClientWithAuth(
            deploymentUrl: configuration.convexURL.absoluteString,
            authProvider: SettleEaseConvexAuthProvider(auth: auth, bridge: authBridge)
        )
    }

    public func bootstrapProfile(session: SupabaseSession) async throws -> UserProfile {
        try await ensureConvexAuth()
        let supabaseUserId = try requireUserId(session)
        let _: UserProfile = try await client.mutation(
            "app:markSignIn",
            with: [
                "supabaseUserId": supabaseUserId,
                "email": optionalConvexString(session.email)
            ]
        )
        return try await client.mutation(
            "app:upsertUserProfile",
            with: [
                "supabaseUserId": supabaseUserId,
                "email": optionalConvexString(session.email)
            ]
        )
    }

    public func streamDashboardSnapshot(session: SupabaseSession) async throws -> AsyncThrowingStream<DashboardSnapshot, Error> {
        try await ensureConvexAuth()
        let supabaseUserId = try requireUserId(session)
        let initialProfile = try await bootstrapProfile(session: session)

        return AsyncThrowingStream { continuation in
            let accumulator = DashboardSnapshotAccumulator(continuation: continuation)
            Task {
                await accumulator.updateProfile(initialProfile)
            }

            let tasks = [
                subscriptionTask(
                    publisher: client.subscribe(
                        to: "app:getUserProfile",
                        with: ["supabaseUserId": supabaseUserId],
                        yielding: UserProfile?.self
                    ),
                    continuation: continuation
                ) { value in
                    if let value { await accumulator.updateProfile(value) }
                },
                subscriptionTask(
                    publisher: client.subscribe(to: "app:listPeople", yielding: [Person].self),
                    continuation: continuation
                ) { await accumulator.updatePeople($0) },
                subscriptionTask(
                    publisher: client.subscribe(to: "app:listCategories", yielding: [SettleEaseCore.Category].self),
                    continuation: continuation
                ) { await accumulator.updateCategories($0) },
                subscriptionTask(
                    publisher: client.subscribe(to: "app:listExpenses", yielding: [Expense].self),
                    continuation: continuation
                ) { await accumulator.updateExpenses($0) },
                subscriptionTask(
                    publisher: client.subscribe(to: "app:listSettlementPayments", yielding: [SettlementPayment].self),
                    continuation: continuation
                ) { await accumulator.updatePayments($0) },
                subscriptionTask(
                    publisher: client.subscribe(to: "app:listManualSettlementOverrides", yielding: [ManualSettlementOverride].self),
                    continuation: continuation
                ) { await accumulator.updateOverrides($0) },
                subscriptionTask(
                    publisher: client.subscribe(
                        to: "app:getActiveAiPrompt",
                        with: ["name": "settlement-summary"],
                        yielding: AiPrompt?.self
                    ),
                    continuation: continuation
                ) { await accumulator.updatePrompt($0) },
                subscriptionTask(
                    publisher: client.subscribe(
                        to: "app:getActiveAiConfig",
                        yielding: AiConfig.self
                    ),
                    continuation: continuation
                ) { await accumulator.updateConfig($0) }
            ]

            continuation.onTermination = { _ in
                tasks.forEach { $0.cancel() }
            }
        }
    }

    public func markSettlementPaid(_ transaction: CalculatedTransaction, markedByUserId: String) async throws {
        try await ensureConvexAuth()
        try await client.mutation(
            "app:addSettlementPayment",
            with: [
                "debtorId": transaction.from,
                "creditorId": transaction.to,
                "amountSettled": transaction.amount,
                "markedByUserId": markedByUserId,
                "settledAt": ISO8601DateFormatter().string(from: Date()),
                "notes": optionalConvexString(nil)
            ]
        )
    }

    public func deleteSettlementPayment(id: String) async throws {
        try await ensureConvexAuth()
        try await client.mutation("app:deleteSettlementPayment", with: ["id": id])
    }

    public func cachedSummary(hash: String) async throws -> AISummaryCacheRecord? {
        try await ensureConvexAuth()
        return try await queryOnce("app:getAiSummaryByHash", with: ["dataHash": hash], yielding: AISummaryCacheRecord?.self)
    }

    public func storeSummary(hash: String, summary: StructuredSettlementSummary, modelName: String?, userId: String) async throws {
        try await ensureConvexAuth()
        let data = try encoder.encode(summary)
        let summaryString = String(decoding: data, as: UTF8.self)
        try await client.mutation(
            "app:storeAiSummary",
            with: [
                "userId": userId,
                "dataHash": hash,
                "summary": summaryString,
                "modelName": optionalConvexString(modelName)
            ]
        )
    }

    private func ensureConvexAuth() async throws {
        switch await client.loginFromCache() {
        case .success:
            return
        case .failure(let error):
            throw error
        }
    }

    private func requireUserId(_ session: SupabaseSession) throws -> String {
        guard let userId = session.userId, !userId.isEmpty else {
            throw AuthRuntimeError.noSession
        }
        return userId
    }

    private func optionalConvexString(_ value: String?) -> ConvexEncodable? {
        guard let value else { return nil }
        return value
    }

    private func subscriptionTask<T: Decodable & Sendable>(
        publisher: AnyPublisher<T, ClientError>,
        continuation: AsyncThrowingStream<DashboardSnapshot, Error>.Continuation,
        update: @escaping @Sendable (T) async -> Void
    ) -> Task<Void, Never> {
        let sendablePublisher = SendablePublisher(publisher: publisher)
        return Task {
            do {
                for try await value in sendablePublisher.publisher.values {
                    await update(value)
                }
            } catch {
                continuation.finish(throwing: error)
            }
        }
    }

    private func queryOnce<T: Decodable>(
        _ name: String,
        with args: [String: ConvexEncodable?]? = nil,
        yielding type: T.Type
    ) async throws -> T {
        let publisher = client.subscribe(to: name, with: args, yielding: T.self)
        for try await value in publisher.values {
            return value
        }
        throw LiveDashboardRepositoryError.emptyQuery(name)
    }
}

public enum LiveDashboardRepositoryError: LocalizedError, Equatable, Sendable {
    case emptyQuery(String)

    public var errorDescription: String? {
        switch self {
        case .emptyQuery(let name):
            "Convex query \(name) completed without a value."
        }
    }
}

private struct SendablePublisher<Output>: @unchecked Sendable {
    var publisher: AnyPublisher<Output, ClientError>
}

private actor DashboardSnapshotAccumulator {
    private let continuation: AsyncThrowingStream<DashboardSnapshot, Error>.Continuation
    private var profile: UserProfile?
    private var people: [Person]?
    private var categories: [SettleEaseCore.Category]?
    private var expenses: [Expense]?
    private var payments: [SettlementPayment]?
    private var overrides: [ManualSettlementOverride]?
    private var prompt: AiPrompt?
    private var config: AiConfig?

    init(continuation: AsyncThrowingStream<DashboardSnapshot, Error>.Continuation) {
        self.continuation = continuation
    }

    func updateProfile(_ value: UserProfile) {
        profile = value
        yieldIfReady()
    }

    func updatePeople(_ value: [Person]) {
        people = value
        yieldIfReady()
    }

    func updateCategories(_ value: [SettleEaseCore.Category]) {
        categories = value
        yieldIfReady()
    }

    func updateExpenses(_ value: [Expense]) {
        expenses = value
        yieldIfReady()
    }

    func updatePayments(_ value: [SettlementPayment]) {
        payments = value
        yieldIfReady()
    }

    func updateOverrides(_ value: [ManualSettlementOverride]) {
        overrides = value
        yieldIfReady()
    }

    func updatePrompt(_ value: AiPrompt?) {
        prompt = value
        yieldIfReady()
    }

    func updateConfig(_ value: AiConfig?) {
        config = value
        yieldIfReady()
    }

    private func yieldIfReady() {
        guard
            let profile,
            let people,
            let categories,
            let expenses,
            let payments,
            let overrides
        else {
            return
        }

        continuation.yield(
            DashboardSnapshot(
                profile: profile,
                people: people,
                categories: categories,
                expenses: expenses,
                settlementPayments: payments,
                manualOverrides: overrides,
                activeAiPrompt: prompt,
                activeAiConfig: config
            )
        )
    }
}
