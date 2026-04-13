#if os(iOS)
import Foundation
import Observation
import SettleEaseCore
import SettleEaseServices
import SwiftUI

enum RootPhase: Equatable {
    case launching
    case needsAuth
    case authenticating
    case syncingDashboard
    case ready
    case recoverableError(String)
}

enum DashboardMode: String, CaseIterable, Identifiable {
    case overview = "Overview"
    case person = "Per Person"

    var id: String { rawValue }
}

struct DashboardSummarySheet: Identifiable, Equatable {
    var id: String { hash }
    var hash: String
    var summary: StructuredSettlementSummary?
    var source: String
    var modelDisplayName: String?
    var errorMessage: String?
    var isLoading: Bool
}

@Observable
@MainActor
final class DashboardStore {
    var phase: RootPhase = .launching
    var snapshot: DashboardSnapshot?
    var session: SupabaseSession?
    var email = ""
    var password = ""
    var authError: String?
    var filters = DashboardFilters()
    var dashboardMode: DashboardMode = .overview
    var useSimplifiedSettlements = true
    var selectedPersonId: String?
    var showBalancedPeople = false
    var selectedExpense: Expense?
    var futurePhaseMessage: String?
    var summarySheet: DashboardSummarySheet?
    var hapticsEnabled = true

    private let auth: (any SupabaseAuthenticating)?
    private let repository: (any DashboardRepository)?
    private let aiService: (any AIServiceProtocol)?
    private let haptics: any HapticsProviding
    private var streamTask: Task<Void, Never>?
    private var startupTask: Task<Void, Never>?

    init(
        auth: (any SupabaseAuthenticating)?,
        repository: (any DashboardRepository)?,
        aiService: (any AIServiceProtocol)?,
        haptics: any HapticsProviding,
        initialError: String? = nil
    ) {
        self.auth = auth
        self.repository = repository
        self.aiService = aiService
        self.haptics = haptics
        if let initialError {
            phase = .recoverableError(initialError)
        }
    }

    static func live() -> DashboardStore {
        do {
            let configuration = try AppConfiguration.live()
            let auth = SupabaseSessionManager(configuration: configuration)
            let bridge = ConvexAuthBridge(webBaseURL: configuration.webBaseURL)
            let repository = LiveDashboardRepository(
                configuration: configuration,
                auth: auth,
                authBridge: bridge
            )
            return DashboardStore(
                auth: auth,
                repository: repository,
                aiService: AIService(webBaseURL: configuration.webBaseURL),
                haptics: HapticsService()
            )
        } catch {
            return DashboardStore(
                auth: nil,
                repository: nil,
                aiService: nil,
                haptics: NoopHapticsService(),
                initialError: error.localizedDescription
            )
        }
    }

    var isReady: Bool {
        if case .ready = phase { return true }
        return false
    }

    var hasAuthBackend: Bool {
        auth != nil && repository != nil
    }

    var isAdmin: Bool {
        snapshot?.profile.role == .admin
    }

    var people: [Person] { snapshot?.people ?? [] }
    var categories: [SettleEaseCore.Category] { snapshot?.categories ?? [] }
    var expenses: [Expense] { snapshot?.expenses ?? [] }
    var settlementPayments: [SettlementPayment] { snapshot?.settlementPayments ?? [] }
    var manualOverrides: [ManualSettlementOverride] { snapshot?.manualOverrides ?? [] }
    var peopleMap: [String: String] { snapshot?.peopleMap ?? [:] }

    var balances: [String: PersonBalanceSnapshot] {
        PersonBalanceBuilder.balances(
            people: people,
            expenses: expenses,
            settlementPayments: settlementPayments
        )
    }

    var simplifiedTransactions: [CalculatedTransaction] {
        SettlementCalculator.simplifiedTransactions(
            people: people,
            expenses: expenses,
            settlementPayments: settlementPayments,
            manualOverrides: manualOverrides
        )
    }

    var pairwiseTransactions: [CalculatedTransaction] {
        SettlementCalculator.pairwiseTransactions(
            people: people,
            expenses: expenses,
            settlementPayments: settlementPayments
        )
    }

    var visibleTransactions: [CalculatedTransaction] {
        useSimplifiedSettlements ? simplifiedTransactions : pairwiseTransactions
    }

    var activities: [DashboardActivity] {
        DashboardActivityBuilder.activities(
            expenses: expenses,
            settlementPayments: settlementPayments,
            peopleMap: peopleMap,
            categories: categories,
            filters: filters
        )
    }

    var groupedActivities: [(date: String, items: [DashboardActivity])] {
        DashboardActivityBuilder.grouped(activities)
    }

    var activeOverrides: [ManualSettlementOverride] {
        manualOverrides.filter(\.isActive)
    }

    var selectedPerson: Person? {
        guard let selectedPersonId else { return nil }
        return people.first { $0.id == selectedPersonId }
    }

    func start() {
        guard startupTask == nil else { return }
        startupTask = Task { [weak self] in
            await self?.restore()
        }
    }

    func restore() async {
        guard let auth else { return }
        if case .recoverableError = phase { return }
        phase = .launching
        do {
            if let restored = try await auth.restoreSession() {
                session = restored
                await connect(restored)
            } else {
                phase = .needsAuth
            }
        } catch {
            phase = .recoverableError(error.localizedDescription)
        }
    }

    func signInWithPassword() async {
        guard let auth else { return }
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty, !password.isEmpty else {
            authError = "Enter your email and password."
            play(.validationWarning)
            return
        }

        authError = nil
        phase = .authenticating
        do {
            let signedIn = try await auth.signIn(email: trimmedEmail, password: password)
            session = signedIn
            await connect(signedIn)
        } catch {
            authError = error.localizedDescription
            phase = .needsAuth
            play(.validationWarning)
        }
    }

    func signInWithGoogle() async {
        guard let auth else { return }
        authError = nil
        phase = .authenticating
        do {
            let signedIn = try await auth.signInWithGoogle()
            session = signedIn
            await connect(signedIn)
        } catch {
            authError = error.localizedDescription
            phase = .needsAuth
            play(.validationWarning)
        }
    }

    func handleOpenURL(_ url: URL) {
        Task {
            guard let auth else { return }
            do {
                if let signedIn = try await auth.handleOAuthCallback(url) {
                    session = signedIn
                    await connect(signedIn)
                }
            } catch {
                authError = error.localizedDescription
                phase = .needsAuth
            }
        }
    }

    func retry() async {
        if let session {
            await connect(session)
        } else {
            await restore()
        }
    }

    func signOut() async {
        guard auth != nil else {
            phase = .recoverableError("Backend config is missing. Add Supabase and Convex settings before signing in.")
            return
        }
        streamTask?.cancel()
        streamTask = nil
        snapshot = nil
        session = nil
        do {
            try await auth?.signOut()
        } catch {
            authError = error.localizedDescription
        }
        phase = .needsAuth
    }

    func clearFilters() {
        withAnimation(.settleEaseState) {
            filters = DashboardFilters()
        }
    }

    func selectFuturePhase(_ title: String) {
        futurePhaseMessage = "\(title) lands in the next phase. This build is intentionally dashboard-only so Home can be real and stable first."
    }

    func markPaid(_ transaction: CalculatedTransaction) async {
        guard isAdmin, let userId = snapshot?.profile.userId else {
            play(.validationWarning)
            return
        }
        do {
            try await repository?.markSettlementPaid(transaction, markedByUserId: userId)
            play(.settlementRecorded)
        } catch {
            phase = .recoverableError(error.localizedDescription)
        }
    }

    func unmarkPayment(id: String) async {
        guard isAdmin else {
            play(.validationWarning)
            return
        }
        do {
            try await repository?.deleteSettlementPayment(id: id)
            play(.destructiveConfirmation)
        } catch {
            phase = .recoverableError(error.localizedDescription)
        }
    }

    func summarise() async {
        guard let snapshot, let aiService, let repository else { return }
        let payload = SummaryPayloadBuilder.build(
            people: snapshot.people,
            peopleMap: snapshot.peopleMap,
            allExpenses: snapshot.expenses,
            categories: snapshot.categories,
            pairwiseTransactions: pairwiseTransactions,
            simplifiedTransactions: simplifiedTransactions,
            settlementPayments: snapshot.settlementPayments,
            manualOverrides: snapshot.manualOverrides,
            personBalances: balances
        )
        let promptVersion = snapshot.activeAiPrompt?.version ?? 0
        let modelCode = snapshot.activeAiConfig?.modelCode
        let hashInput = payload.mergingForHash(promptVersion: promptVersion, modelCode: modelCode)

        do {
            let hash = try SummaryPayloadBuilder.hash(hashInput)
            summarySheet = DashboardSummarySheet(
                hash: hash,
                summary: nil,
                source: "Loading",
                modelDisplayName: modelCode,
                errorMessage: nil,
                isLoading: true
            )

            if let cached = try await repository.cachedSummary(hash: hash),
               let data = cached.summary.data(using: .utf8),
               let parsed = try? JSONDecoder().decode(StructuredSettlementSummary.self, from: data) {
                summarySheet = DashboardSummarySheet(
                    hash: hash,
                    summary: parsed,
                    source: "Cached",
                    modelDisplayName: cached.modelName ?? modelCode,
                    errorMessage: nil,
                    isLoading: false
                )
                return
            }

            let result = try await aiService.summarize(
                jsonData: payload,
                hash: hash,
                promptVersion: promptVersion,
                modelCode: modelCode
            )
            try await repository.storeSummary(
                hash: hash,
                summary: result.summary,
                modelName: result.model,
                userId: snapshot.profile.userId
            )
            summarySheet = DashboardSummarySheet(
                hash: hash,
                summary: result.summary,
                source: "Generated",
                modelDisplayName: result.modelDisplayName ?? result.model ?? modelCode,
                errorMessage: nil,
                isLoading: false
            )
        } catch {
            summarySheet = DashboardSummarySheet(
                hash: UUID().uuidString,
                summary: nil,
                source: "Error",
                modelDisplayName: modelCode,
                errorMessage: error.localizedDescription,
                isLoading: false
            )
            play(.validationWarning)
        }
    }

    private func connect(_ session: SupabaseSession) async {
        guard let repository else { return }
        phase = .syncingDashboard
        streamTask?.cancel()
        do {
            let stream = try await repository.streamDashboardSnapshot(session: session)
            streamTask = Task { [weak self] in
                do {
                    for try await value in stream {
                        await MainActor.run {
                            withAnimation(.settleEaseState) {
                                self?.snapshot = value
                                self?.phase = .ready
                            }
                        }
                    }
                } catch {
                    await MainActor.run {
                        self?.phase = .recoverableError(error.localizedDescription)
                    }
                }
            }
        } catch {
            phase = .recoverableError(error.localizedDescription)
        }
    }

    private func play(_ event: SettleHapticEvent) {
        guard hapticsEnabled else { return }
        haptics.play(event)
    }
}

private extension SettleJSONValue {
    func mergingForHash(promptVersion: Int, modelCode: String?) -> SettleJSONValue {
        guard case .object(var object) = self else { return self }
        object["promptVersion"] = .int(promptVersion)
        object["modelCode"] = modelCode.map(SettleJSONValue.string) ?? .null
        return .object(object)
    }
}
#endif
