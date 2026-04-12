#if os(iOS)
import Foundation
import Observation
import SettleEaseCore
import SettleEaseServices

@Observable
@MainActor
final class AppModel {
    enum LoadState: Equatable {
        case idle
        case loading
        case ready
        case failed(String)
    }

    var state: LoadState = .idle
    var profile: UserProfile
    var people: [Person]
    var categories: [SettleEaseCore.Category]
    var expenses: [Expense]
    var settlementPayments: [SettlementPayment]
    var manualOverrides: [ManualSettlementOverride]
    var selectedAddMode: AddMode = .manual
    var hapticsEnabled = true
    var reduceMotionPreview = false

    private let repository: any SettleEaseRepository
    private let aiService: any AIServiceProtocol
    private let haptics: any HapticsProviding

    init(
        snapshot: SettleEaseSnapshot,
        repository: any SettleEaseRepository,
        aiService: any AIServiceProtocol,
        haptics: any HapticsProviding
    ) {
        self.profile = snapshot.profile
        self.people = snapshot.people
        self.categories = snapshot.categories
        self.expenses = snapshot.expenses
        self.settlementPayments = snapshot.settlementPayments
        self.manualOverrides = snapshot.manualOverrides
        self.repository = repository
        self.aiService = aiService
        self.haptics = haptics
    }

    static func sample() -> AppModel {
        AppModel(
            snapshot: .sample,
            repository: SampleSettleEaseRepository(),
            aiService: SampleAIService(),
            haptics: NoopHapticsService()
        )
    }

    var isAdmin: Bool {
        profile.role == .admin
    }

    var peopleMap: [String: String] {
        Dictionary(uniqueKeysWithValues: people.map { ($0.id, $0.name) })
    }

    var metrics: DashboardMetrics {
        SettlementCalculator.dashboardMetrics(
            people: people,
            expenses: expenses,
            settlementPayments: settlementPayments,
            manualOverrides: manualOverrides
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

    func refresh() async {
        state = .loading
        do {
            let snapshot = try await repository.snapshot()
            profile = snapshot.profile
            people = snapshot.people
            categories = snapshot.categories
            expenses = snapshot.expenses
            settlementPayments = snapshot.settlementPayments
            manualOverrides = snapshot.manualOverrides
            state = .ready
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func saveExpense(_ expense: Expense) async {
        do {
            try await repository.saveExpense(expense)
            await refresh()
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func markPaid(_ transaction: CalculatedTransaction) async {
        guard isAdmin else { return }
        let payment = SettlementPayment(
            id: UUID().uuidString,
            debtorId: transaction.from,
            creditorId: transaction.to,
            amountSettled: transaction.amount,
            settledAt: ISO8601DateFormatter().string(from: Date()),
            markedByUserId: profile.userId
        )
        do {
            try await repository.addSettlementPayment(payment)
            if hapticsEnabled {
                haptics.play(.settlementRecorded)
            }
            await refresh()
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func scanSampleReceipt() async -> ParsedReceiptData? {
        do {
            let result = try await aiService.scanReceipt(imageBase64: "sample", mimeType: "image/jpeg")
            if hapticsEnabled {
                haptics.play(.receiptParsed)
            }
            return result
        } catch {
            state = .failed(error.localizedDescription)
            return nil
        }
    }
}

enum AddMode: String, CaseIterable, Identifiable {
    case manual = "Manual"
    case receipt = "Receipt Scan"

    var id: String { rawValue }
}
#endif
