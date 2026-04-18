#if os(iOS)
import SwiftUI
import SettleEaseCore
import UIKit

struct DashboardView: View {
    @Environment(DashboardStore.self) private var store
    @FocusState private var activitySearchFocused: Bool

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 22) {
                if !store.activeOverrides.isEmpty {
                    ManualOverrideAlert()
                }

                SettlementHub()
                ActivityFeed(searchFocused: $activitySearchFocused)
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 118)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .background(SettleTheme.page)
        .background {
            SettleKeyboardDismissInstaller(isEnabled: activitySearchFocused) {
                activitySearchFocused = false
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            }
        }
        .sheet(item: selectedExpenseBinding) { expense in
            ExpenseDetailSheet(expense: expense)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(item: relevantExpensesBinding) { drilldown in
            RelevantExpensesSheet(drilldown: drilldown)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(item: summaryBinding) { _ in
            AISummarySheet()
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }

    private var selectedExpenseBinding: Binding<Expense?> {
        Binding(get: { store.selectedExpense }, set: { store.selectedExpense = $0 })
    }

    private var relevantExpensesBinding: Binding<RelevantExpenseDrilldown?> {
        Binding(get: { store.relevantExpenseDrilldown }, set: { store.relevantExpenseDrilldown = $0 })
    }

    private var summaryBinding: Binding<DashboardSummarySheet?> {
        Binding(get: { store.summarySheet }, set: { store.summarySheet = $0 })
    }
}

private struct DashboardSectionHeader: View {
    var title: String
    var subtitle: String?
    var systemImage: String

    var body: some View {
        HStack(spacing: 11) {
            Image(systemName: SettleIcon.symbol(for: systemImage))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SettleTheme.primary)
                .frame(width: 34, height: 34)
                .background {
                    SettleGlass(shape: AnyShape(RoundedRectangle(cornerRadius: 11, style: .continuous))) {
                        SettleTheme.stone.opacity(0.32)
                    }
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(SettleTheme.primary)
                    .fixedSize(horizontal: false, vertical: true)
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(SettleTheme.mutedText)
                        .lineLimit(2)
                }
            }

            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct NativePanel<Content: View>: View {
    var padding: CGFloat = 14
    var glass = false
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            content
        }
        .padding(padding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            if glass {
                SettleGlass(shape: AnyShape(RoundedRectangle(cornerRadius: 18, style: .continuous))) {
                    SettleTheme.stone.opacity(0.22)
                }
            } else {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(SettleTheme.rowHighlight)
            }
        }
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(SettleTheme.border.opacity(0.72), lineWidth: 0.7)
        }
    }
}

private struct ManualOverrideAlert: View {
    @Environment(DashboardStore.self) private var store

    var totalOverride: Double {
        store.activeOverrides.reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        NativePanel(glass: true) {
            VStack(alignment: .leading, spacing: 11) {
                DashboardSectionHeader(
                    title: "Manual path active",
                    subtitle: "\(store.activeOverrides.count) override\(store.activeOverrides.count == 1 ? "" : "s") · \(SettleEaseFormatters.currency(totalOverride))",
                    systemImage: "hand.raised.fill"
                )

                VStack(spacing: 8) {
                    ForEach(store.activeOverrides.prefix(3)) { override in
                        HStack(spacing: 7) {
                            Text(store.peopleMap[override.debtorId] ?? "Debtor")
                            Image(systemName: "arrow.right")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(SettleTheme.warning)
                            Text(store.peopleMap[override.creditorId] ?? "Creditor")
                            Spacer(minLength: 8)
                            SettleAmountText(value: override.amount, font: .caption.weight(.bold))
                        }
                        .font(.caption.weight(.medium))
                        .lineLimit(1)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(SettleTheme.warningSurface, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
            }
        }
    }
}

private struct SettlementHub: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        @Bindable var store = store

        VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .center, spacing: 10) {
                DashboardSectionHeader(
                    title: "Settlement Hub",
                    subtitle: "\(store.visibleTransactions.count) \(store.visibleTransactions.count == 1 ? "payment" : "payments")",
                    systemImage: "person.2.fill"
                )
                .layoutPriority(0)

                SettleGlassButton(
                    title: "Summarise",
                    systemImage: "sparkles",
                    role: .primary,
                    isLoading: store.isSummarising
                ) {
                    Task { await store.summarise() }
                }
                .layoutPriority(2)
                .fixedSize(horizontal: true, vertical: false)
            }

            SettleSegmentedControl(
                selection: $store.dashboardMode,
                segments: DashboardMode.allCases.map { SettleSegment(value: $0, title: $0.rawValue) }
            )

            switch store.dashboardMode {
            case .overview:
                SettlementOverview()
            case .person:
                PerPersonDashboard()
            }
        }
    }
}

private struct SettlementOverview: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        @Bindable var store = store

        VStack(alignment: .leading, spacing: 12) {
            SettleControlSurface(
                shape: AnyShape(RoundedRectangle(cornerRadius: 16, style: .continuous)),
                fill: SettleTheme.controlFill,
                stroke: SettleTheme.controlStroke
            ) {
                HStack(spacing: 12) {
                    Text(store.useSimplifiedSettlements ? "Minimum transactions required to settle all debts." : "Detailed pairwise debts reflecting direct expense involvement.")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(SettleTheme.mutedText)
                        .fixedSize(horizontal: false, vertical: true)

                    Spacer(minLength: 8)

                    Toggle("Simplify", isOn: $store.useSimplifiedSettlements)
                        .font(.caption.weight(.semibold))
                        .toggleStyle(.switch)
                        .accessibilityLabel("Simplify settlements")
                }
                .padding(12)
            }

            if store.visibleTransactions.isEmpty {
                EmptyState(
                    title: "All settled up",
                    message: "There are no open payments for the current settlement mode.",
                    symbol: "checkmark.seal.fill"
                )
            } else {
                LazyVStack(spacing: 10) {
                    ForEach(store.visibleTransactions) { transaction in
                        TransactionPaymentRow(transaction: transaction)
                    }
                }
            }
        }
    }
}

private struct TransactionPaymentRow: View {
    @Environment(DashboardStore.self) private var store
    var transaction: CalculatedTransaction

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 7) {
                    Text(store.peopleMap[transaction.from] ?? "Unknown")
                        .lineLimit(1)
                    Image(systemName: "arrow.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(SettleTheme.warmAccent)
                    Text(store.peopleMap[transaction.to] ?? "Unknown")
                        .lineLimit(1)
                }
                .font(.subheadline.weight(.semibold))

                SettleAmountText(value: transaction.amount, font: .headline.weight(.bold))
                    .foregroundStyle(SettleTheme.positive)
            }

            Spacer(minLength: 8)

            if store.isAdmin {
                SettleGlassButton(title: "Mark Paid", systemImage: "checkmark.circle", role: .quiet) {
                    Task { await store.markPaid(transaction) }
                }
                .fixedSize(horizontal: true, vertical: false)
            }
        }
        .padding(13)
        .background(SettleTheme.rowHighlight, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(SettleTheme.border.opacity(0.7), lineWidth: 0.7)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct PerPersonDashboard: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        @Bindable var store = store

        VStack(alignment: .leading, spacing: 13) {
            SettleControlSurface(
                shape: AnyShape(RoundedRectangle(cornerRadius: 16, style: .continuous)),
                fill: SettleTheme.controlFill,
                stroke: SettleTheme.controlStroke
            ) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 10) {
                        PersonSelectorChip()
                        Toggle("Balanced", isOn: $store.showBalancedPeople)
                            .font(.caption.weight(.semibold))
                            .toggleStyle(.switch)
                            .accessibilityLabel("Show balanced people")
                    }
                    Text("Choose a person to inspect how expenses, payments, and optimized settlements shape their balance.")
                        .font(.caption)
                        .foregroundStyle(SettleTheme.mutedText)
                }
                .padding(12)
            }

            if let person = store.selectedPerson,
               let presentation = store.personPresentation(for: person) {
                PersonBalanceOverview(presentation: presentation)
                PersonExpenseBreakdownSection(presentation: presentation)
                PersonSettlementStatusSection(presentation: presentation)
                PersonPaymentHistorySection(presentation: presentation)
                PersonCalculationNote(presentation: presentation)
            } else {
                EmptyState(
                    title: "Select a person",
                    message: "Their balance, expenses, settlement actions, and payment history will appear here.",
                    symbol: "person.2.fill"
                )
            }
        }
    }
}

private struct PersonSelectorChip: View {
    @Environment(DashboardStore.self) private var store

    var selectedName: String {
        store.selectedPerson?.name ?? "Select person"
    }

    var body: some View {
        Menu {
            ForEach(store.personPickerPeople) { person in
                Button(person.name) {
                    store.selectedPersonId = person.id
                }
            }
        } label: {
            SettleMenuChip(
                title: selectedName,
                systemImage: "person.crop.circle",
                alignment: .leading,
                isEnabled: !store.personPickerPeople.isEmpty
            )
        }
        .disabled(store.personPickerPeople.isEmpty)
    }
}

private struct PersonBalanceOverview: View {
    var presentation: PersonSettlementPresentation

    var body: some View {
        let balance = presentation.balance
        let status = balance.netBalance > 0.01 ? "Receives" : balance.netBalance < -0.01 ? "Pays" : "Balanced"
        let statusColor = balance.netBalance > 0.01 ? SettleTheme.positive : balance.netBalance < -0.01 ? SettleTheme.warning : SettleTheme.mutedText

        NativePanel(glass: true) {
            VStack(alignment: .leading, spacing: 13) {
                HStack(spacing: 12) {
                    Text(String(presentation.person.name.prefix(1)).uppercased())
                        .font(.headline.weight(.bold))
                        .foregroundStyle(statusColor)
                        .frame(width: 42, height: 42)
                        .background(statusColor.opacity(0.15), in: Circle())

                    VStack(alignment: .leading, spacing: 2) {
                        Text(presentation.person.name)
                            .font(.headline.weight(.bold))
                            .foregroundStyle(SettleTheme.primary)
                        Text(status)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(statusColor)
                    }

                    Spacer()

                    SettleAmountText(value: abs(balance.netBalance), font: .title3.weight(.bold))
                        .foregroundStyle(statusColor)
                }

                HStack(spacing: 8) {
                    BalanceMetric(title: "Paid", amount: balance.totalPaid, tint: SettleTheme.positive)
                    BalanceMetric(title: "Share", amount: balance.totalOwed, tint: SettleTheme.warning)
                }

                HStack(spacing: 8) {
                    BalanceMetric(title: "Settled out", amount: balance.settledAsDebtor, tint: SettleTheme.warning)
                    BalanceMetric(title: "Settled in", amount: balance.settledAsCreditor, tint: SettleTheme.positive)
                }
            }
        }
    }
}

private struct BalanceMetric: View {
    var title: String
    var amount: Double
    var tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(SettleTheme.mutedText)
                .lineLimit(1)
            SettleAmountText(value: amount, font: .caption.weight(.bold), compact: true)
                .foregroundStyle(tint)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(tint.opacity(0.11), in: RoundedRectangle(cornerRadius: 11, style: .continuous))
    }
}

private struct PersonExpenseBreakdownSection: View {
    @Environment(DashboardStore.self) private var store
    var presentation: PersonSettlementPresentation

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel("Expense breakdown", subtitle: "\(presentation.expenseContributions.count) expense\(presentation.expenseContributions.count == 1 ? "" : "s")")

            if presentation.expenseContributions.isEmpty {
                EmptyState(title: "No expense involvement", message: "This person has not paid or owed any tracked expenses.", symbol: "receipt.fill")
            } else {
                LazyVStack(spacing: 9) {
                    ForEach(presentation.expenseContributions) { contribution in
                        Button {
                            store.selectedExpense = contribution.expense
                        } label: {
                            PersonExpenseContributionRow(contribution: contribution)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}

private struct PersonExpenseContributionRow: View {
    var contribution: PersonExpenseContribution

    var body: some View {
        let tint = contribution.netEffect > 0.01 ? SettleTheme.positive : contribution.netEffect < -0.01 ? SettleTheme.warning : SettleTheme.mutedText

        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(contribution.expense.description)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(SettleTheme.primary)
                    .lineLimit(1)

                Spacer(minLength: 8)

                SignedAmountText(value: contribution.netEffect, tint: tint)
            }

            HStack(spacing: 8) {
                Text(SettleEaseFormatters.shortDate(contribution.expense.createdAt))
                Text("·")
                Text("Total \(SettleEaseFormatters.currency(contribution.expense.totalAmount))")
                Spacer(minLength: 6)
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
            }
            .font(.caption)
            .foregroundStyle(SettleTheme.mutedText)

            HStack(spacing: 8) {
                if contribution.amountPaid > 0 {
                    MiniLedgerPill(title: "Paid", value: contribution.amountPaid, tint: SettleTheme.positive)
                }
                if contribution.shareAmount > 0 {
                    MiniLedgerPill(title: "Share", value: contribution.shareAmount, tint: SettleTheme.warning)
                }
                if contribution.celebrationAmount > 0 {
                    MiniLedgerPill(title: "Treat", value: contribution.celebrationAmount, tint: SettleTheme.warning)
                }
            }
        }
        .padding(13)
        .background(SettleTheme.rowHighlight, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(SettleTheme.border.opacity(0.65), lineWidth: 0.7)
        }
    }
}

private struct MiniLedgerPill: View {
    var title: String
    var value: Double
    var tint: Color

    var body: some View {
        Text("\(title) \(SettleEaseFormatters.compactCurrency(value))")
            .font(.caption2.weight(.bold))
            .foregroundStyle(tint)
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(tint.opacity(0.12), in: Capsule())
    }
}

private struct PersonSettlementStatusSection: View {
    @Environment(DashboardStore.self) private var store
    var presentation: PersonSettlementPresentation

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel("Current settlement status", subtitle: presentation.isBalanced ? "No open action for this person" : "Optimized actions")

            if presentation.isBalanced {
                NativePanel {
                    Text("\(presentation.person.name) is balanced. No money needs to move for this person right now.")
                        .font(.subheadline)
                        .foregroundStyle(SettleTheme.mutedText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            } else {
                if !presentation.debts.isEmpty {
                    SettlementActionGroup(title: "Needs to pay", transactions: presentation.debts, type: .debt)
                }
                if !presentation.credits.isEmpty {
                    SettlementActionGroup(title: "Will receive", transactions: presentation.credits, type: .credit)
                }
                if presentation.debts.isEmpty && presentation.credits.isEmpty {
                    NativePanel {
                        Text("The settlement optimizer found no direct action for this person, even though their net balance is not zero.")
                            .font(.subheadline)
                            .foregroundStyle(SettleTheme.mutedText)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }
}

private enum SettlementActionType {
    case debt
    case credit
}

private struct SettlementActionGroup: View {
    @Environment(DashboardStore.self) private var store
    var title: String
    var transactions: [CalculatedTransaction]
    var type: SettlementActionType

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption.weight(.bold))
                .foregroundStyle(SettleTheme.mutedText)
                .textCase(.uppercase)

            ForEach(transactions) { transaction in
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(rowTitle(for: transaction))
                            .font(.subheadline.weight(.semibold))
                            .lineLimit(1)
                        SettleAmountText(value: transaction.amount, font: .headline.weight(.bold))
                            .foregroundStyle(type == .debt ? SettleTheme.warning : SettleTheme.positive)
                    }

                    Spacer(minLength: 8)

                    Button("Expenses") {
                        store.relevantExpenseDrilldown = RelevantExpenseDrilldown(
                            title: relevantTitle(for: transaction),
                            expenses: relevantExpenses(for: transaction)
                        )
                    }
                    .buttonStyle(WebPillButtonStyle(kind: .secondary))
                    .font(.caption.weight(.bold))

                    if store.isAdmin && type == .debt {
                        Button("Mark Paid") {
                            Task { await store.markPaid(transaction) }
                        }
                        .buttonStyle(WebPillButtonStyle(kind: .tertiary))
                        .font(.caption.weight(.bold))
                    }
                }
                .padding(13)
                .background(SettleTheme.rowHighlight, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(SettleTheme.border.opacity(0.65), lineWidth: 0.7)
                }
            }
        }
    }

    private func rowTitle(for transaction: CalculatedTransaction) -> String {
        switch type {
        case .debt:
            return "Pay \(store.peopleMap[transaction.to] ?? "Unknown")"
        case .credit:
            return "\(store.peopleMap[transaction.from] ?? "Unknown") pays you"
        }
    }

    private func relevantTitle(for transaction: CalculatedTransaction) -> String {
        "\(store.peopleMap[transaction.from] ?? "Payer") → \(store.peopleMap[transaction.to] ?? "Receiver")"
    }

    private func relevantExpenses(for transaction: CalculatedTransaction) -> [Expense] {
        let contributingExpenseIds = transaction.contributingExpenseIds ?? []
        if !contributingExpenseIds.isEmpty {
            let ids = Set(contributingExpenseIds)
            return store.expenses.filter { ids.contains($0.id) }
        }

        return store.expenses.filter { expense in
            let debtorShared = expense.shares.contains { $0.personId == transaction.from && $0.amount > 0 }
            let creditorPaid = expense.paidBy.contains { $0.personId == transaction.to && $0.amount > 0 }
            let debtorPaid = expense.paidBy.contains { $0.personId == transaction.from && $0.amount > 0 }
            let creditorShared = expense.shares.contains { $0.personId == transaction.to && $0.amount > 0 }
            return (debtorShared && creditorPaid) || (debtorPaid && creditorShared)
        }
    }
}

private struct PersonPaymentHistorySection: View {
    @Environment(DashboardStore.self) private var store
    var presentation: PersonSettlementPresentation

    var body: some View {
        if !presentation.payments.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel("Payment history", subtitle: "\(presentation.payments.count) recorded")

                LazyVStack(spacing: 9) {
                    ForEach(presentation.payments) { payment in
                        HStack(spacing: 11) {
                            Image(systemName: payment.debtorId == presentation.person.id ? "arrow.up.right.circle.fill" : "arrow.down.left.circle.fill")
                                .font(.title3)
                                .foregroundStyle(payment.debtorId == presentation.person.id ? SettleTheme.warning : SettleTheme.positive)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(historyTitle(payment))
                                    .font(.subheadline.weight(.semibold))
                                    .lineLimit(1)
                                Text(SettleEaseFormatters.shortDate(payment.settledAt))
                                    .font(.caption)
                                    .foregroundStyle(SettleTheme.mutedText)
                            }

                            Spacer()

                            SettleAmountText(value: payment.amountSettled, font: .subheadline.weight(.bold))
                                .foregroundStyle(SettleTheme.positive)

                            if store.isAdmin {
                                Button {
                                    Task { await store.unmarkPayment(id: payment.id) }
                                } label: {
                                    Image(systemName: "arrow.uturn.backward")
                                }
                                .buttonStyle(WebPillButtonStyle(kind: .destructive))
                                .accessibilityLabel("Unmark payment")
                            }
                        }
                        .padding(13)
                        .background(SettleTheme.rowHighlight, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(SettleTheme.border.opacity(0.65), lineWidth: 0.7)
                        }
                    }
                }
            }
        }
    }

    private func historyTitle(_ payment: SettlementPayment) -> String {
        if payment.debtorId == presentation.person.id {
            return "Paid \(store.peopleMap[payment.creditorId] ?? "Unknown")"
        }
        return "\(store.peopleMap[payment.debtorId] ?? "Unknown") paid \(presentation.person.name)"
    }
}

private struct PersonCalculationNote: View {
    var presentation: PersonSettlementPresentation

    var body: some View {
        DisclosureGroup {
            Text("Net balance is calculated as total paid minus total owed, then adjusted by recorded settlement payments. Green means this person should receive money; amber means they should pay.")
                .font(.caption)
                .foregroundStyle(SettleTheme.mutedText)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 6)
        } label: {
            Label("How this was calculated", systemImage: "info.circle")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SettleTheme.primary)
        }
        .padding(13)
        .background(SettleTheme.stone.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct SectionLabel: View {
    var title: String
    var subtitle: String?

    init(_ title: String, subtitle: String? = nil) {
        self.title = title
        self.subtitle = subtitle
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.headline.weight(.bold))
                .foregroundStyle(SettleTheme.primary)
            Spacer()
            if let subtitle {
                Text(subtitle)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(SettleTheme.mutedText)
            }
        }
    }
}

private struct SignedAmountText: View {
    var value: Double
    var tint: Color

    var body: some View {
        Text("\(value > 0.01 ? "+" : value < -0.01 ? "-" : "")\(SettleEaseFormatters.currency(abs(value)))")
            .font(.subheadline.weight(.bold))
            .monospacedDigit()
            .foregroundStyle(tint)
            .lineLimit(1)
            .minimumScaleFactor(0.72)
    }
}

private struct ActivityFeed: View {
    @Environment(DashboardStore.self) private var store
    var searchFocused: FocusState<Bool>.Binding

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .center, spacing: 10) {
                DashboardSectionHeader(
                    title: "Activity Feed",
                    subtitle: "\(store.activities.count) \(store.activities.count == 1 ? "transaction" : "transactions") found",
                    systemImage: "doc.text.fill"
                )

                if store.filters.hasActiveFilters {
                    SettleGlassButton(title: "Clear", systemImage: "xmark", role: .quiet) {
                        store.clearFilters()
                    }
                    .fixedSize(horizontal: true, vertical: false)
                }
            }

            FilterToolbar(searchFocused: searchFocused)

            if store.activities.isEmpty {
                EmptyState(
                    title: "No transactions found",
                    message: store.filters.hasActiveFilters ? "Try clearing filters." : "Expenses and recorded payments will appear here.",
                    symbol: "line.3.horizontal.decrease.circle"
                )
            } else {
                LazyVStack(alignment: .leading, spacing: 13) {
                    ForEach(store.groupedActivities, id: \.date) { group in
                        VStack(alignment: .leading, spacing: 8) {
                            DateDivider(title: group.date)
                            LazyVStack(spacing: 9) {
                                ForEach(group.items) { activity in
                                    ActivityRow(activity: activity)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct FilterToolbar: View {
    @Environment(DashboardStore.self) private var store
    var searchFocused: FocusState<Bool>.Binding

    var body: some View {
        @Bindable var store = store

        VStack(spacing: 9) {
            SettleSearchField(text: $store.filters.searchQuery, isFocused: searchFocused)

            HStack(spacing: 8) {
                PersonFilterChip()
                CategoryFilterChip()
            }
        }
    }
}

private struct PersonFilterChip: View {
    @Environment(DashboardStore.self) private var store

    var title: String {
        guard let personId = store.filters.personId else { return "People: All" }
        return "People: \(store.peopleMap[personId] ?? "Unknown")"
    }

    var body: some View {
        Menu {
            Button("All People") { store.filters.personId = nil }
            ForEach(store.people) { person in
                Button(person.name) { store.filters.personId = person.id }
            }
        } label: {
            FilterChipLabel(title: title, systemImage: "person.2.fill")
        }
    }
}

private struct CategoryFilterChip: View {
    @Environment(DashboardStore.self) private var store

    var title: String {
        guard let category = store.filters.categoryName else { return "Category: All" }
        return "Category: \(category)"
    }

    var body: some View {
        Menu {
            Button("All Categories") { store.filters.categoryName = nil }
            ForEach(store.categories) { category in
                Button(category.name) { store.filters.categoryName = category.name }
            }
        } label: {
            FilterChipLabel(title: title, systemImage: "tag.fill")
        }
    }
}

private struct FilterChipLabel: View {
    var title: String
    var systemImage: String

    var body: some View {
        SettleMenuChip(title: title, systemImage: systemImage)
    }
}

private struct DateDivider: View {
    var title: String

    var body: some View {
        HStack(spacing: 8) {
            Rectangle()
                .fill(SettleTheme.border.opacity(0.75))
                .frame(height: 0.7)
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(SettleTheme.mutedText)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(SettleTheme.page, in: Capsule())
            Rectangle()
                .fill(SettleTheme.border.opacity(0.75))
                .frame(height: 0.7)
        }
    }
}

private struct ActivityRow: View {
    @Environment(DashboardStore.self) private var store
    var activity: DashboardActivity

    var body: some View {
        switch activity {
        case .expense(let expense):
            Button {
                store.selectedExpense = expense
            } label: {
                ExpenseActivityRow(expense: expense)
            }
            .buttonStyle(.plain)
        case .settlement(let payment):
            SettlementActivityRow(payment: payment)
        }
    }
}

private struct ExpenseActivityRow: View {
    @Environment(DashboardStore.self) private var store
    var expense: Expense

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(expense.description)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(SettleTheme.primary)
                    .lineLimit(2)

                Spacer(minLength: 8)

                SettleAmountText(value: expense.totalAmount, font: .subheadline.weight(.bold))
                    .foregroundStyle(SettleTheme.primary)
            }

            HStack(spacing: 8) {
                Label(expense.category, systemImage: SettleIcon.symbol(for: store.categories.first { $0.name == expense.category }?.iconName ?? expense.category))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(SettleTheme.mutedText)
                    .lineLimit(1)

                Spacer(minLength: 6)

                Text("Paid by \(paidByText)")
                    .font(.caption)
                    .foregroundStyle(SettleTheme.mutedText)
                    .lineLimit(1)
            }

            if let highlighted = store.filters.categoryName,
               expense.category != highlighted,
               expense.splitMethod == .itemwise,
               (expense.items ?? []).contains(where: { $0.categoryName == highlighted }) {
                Text("Includes items in \(highlighted)")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(SettleTheme.warning)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 4)
                    .background(SettleTheme.warningSurface, in: Capsule())
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 11)
        .background(SettleTheme.rowHighlight, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(SettleTheme.border.opacity(0.65), lineWidth: 0.7)
        }
        .accessibilityElement(children: .combine)
    }

    private var paidByText: String {
        if expense.paidBy.count > 1 { return "Multiple Payers" }
        guard let payer = expense.paidBy.first else { return "None" }
        return store.peopleMap[payer.personId] ?? "Unknown"
    }
}

private struct SettlementActivityRow: View {
    @Environment(DashboardStore.self) private var store
    var payment: SettlementPayment

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: SettleIcon.symbol(for: "HandCoins"))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SettleTheme.positive)
                .frame(width: 34, height: 34)
                .background(SettleTheme.positive.opacity(0.12), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(store.peopleMap[payment.debtorId] ?? "Unknown")
                    Image(systemName: "arrow.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(SettleTheme.positive)
                    Text(store.peopleMap[payment.creditorId] ?? "Unknown")
                }
                .font(.subheadline.weight(.bold))
                .lineLimit(1)

                Text(payment.notes == nil ? "Settlement" : "Custom payment")
                    .font(.caption)
                    .foregroundStyle(SettleTheme.mutedText)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            SettleAmountText(value: payment.amountSettled, font: .subheadline.weight(.bold))
                .foregroundStyle(SettleTheme.positive)
        }
        .padding(12)
        .background(SettleTheme.rowHighlight, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(SettleTheme.positive)
                .frame(width: 4)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(SettleTheme.border.opacity(0.65), lineWidth: 0.7)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct RelevantExpensesSheet: View {
    @Environment(DashboardStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var selectedExpense: Expense?
    var drilldown: RelevantExpenseDrilldown

    var body: some View {
        Group {
            if let selectedExpense {
                ExpenseDetailContent(
                    expense: selectedExpense,
                    leadingAction: {
                        Button {
                            self.selectedExpense = nil
                        } label: {
                            Label("Back", systemImage: "chevron.left")
                        }
                        .buttonStyle(WebPillButtonStyle(kind: .secondary))
                    },
                    trailingAction: {
                        Button("Done") { dismiss() }
                            .buttonStyle(WebPillButtonStyle(kind: .secondary))
                    }
                )
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            DashboardSectionHeader(
                                title: "Related expenses",
                                subtitle: drilldown.title,
                                systemImage: "receipt.fill"
                            )
                            Button("Done") { dismiss() }
                                .buttonStyle(WebPillButtonStyle(kind: .secondary))
                        }

                        if drilldown.expenses.isEmpty {
                            EmptyState(title: "No linked expenses", message: "This settlement was optimized without direct expense links.", symbol: "receipt.fill")
                        } else {
                            ForEach(drilldown.expenses) { expense in
                                Button {
                                    selectedExpense = expense
                                } label: {
                                    ExpenseActivityRow(expense: expense)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(16)
                    .padding(.bottom, 24)
                }
                .background(SettleTheme.page.ignoresSafeArea())
            }
        }
    }
}

private struct ExpenseDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    var expense: Expense

    var body: some View {
        ExpenseDetailContent(
            expense: expense,
            trailingAction: {
                Button("Done") { dismiss() }
                    .buttonStyle(WebPillButtonStyle(kind: .secondary))
            }
        )
    }
}

private struct ExpenseDetailContent<LeadingAction: View, TrailingAction: View>: View {
    @Environment(DashboardStore.self) private var store
    var expense: Expense
    @ViewBuilder var leadingAction: LeadingAction
    @ViewBuilder var trailingAction: TrailingAction

    init(
        expense: Expense,
        @ViewBuilder leadingAction: () -> LeadingAction = { EmptyView() },
        @ViewBuilder trailingAction: () -> TrailingAction = { EmptyView() }
    ) {
        self.expense = expense
        self.leadingAction = leadingAction()
        self.trailingAction = trailingAction()
    }

    var body: some View {
        let presentation = ExpenseDetailPresentation.build(expense: expense, peopleMap: store.peopleMap)

        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .center, spacing: 10) {
                    leadingAction
                    DashboardSectionHeader(
                        title: expense.description,
                        subtitle: "\(expense.category) · \(SettleEaseFormatters.shortDate(expense.createdAt))",
                        systemImage: "receipt.fill"
                    )
                    trailingAction
                }

                ExpenseGeneralInfoSection(expense: expense, presentation: presentation)
                ExpensePaymentInfoSection(expense: expense, presentation: presentation)
                ExpenseSplitDetailsSection(expense: expense, presentation: presentation)
                ExpenseNetEffectSection(expense: expense, presentation: presentation)
            }
            .padding(16)
            .padding(.bottom, 24)
        }
        .background(SettleTheme.page.ignoresSafeArea())
    }
}

private struct ExpenseGeneralInfoSection: View {
    @Environment(DashboardStore.self) private var store
    var expense: Expense
    var presentation: ExpenseDetailPresentation

    var body: some View {
        NativePanel {
            VStack(alignment: .leading, spacing: 12) {
                SectionLabel("General information")
                DetailRow(title: "Description", value: expense.description)
                DetailRow(title: "Total bill", value: SettleEaseFormatters.currency(presentation.totalOriginalBill), emphasized: true)
                HStack {
                    Text("Category")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(SettleTheme.mutedText)
                    Spacer()
                    Label(expense.category, systemImage: SettleIcon.symbol(for: store.categories.first { $0.name == expense.category }?.iconName ?? expense.category))
                        .font(.subheadline.weight(.semibold))
                }
                DetailRow(title: "Expense date", value: SettleEaseFormatters.shortDate(expense.createdAt))
                DetailRow(title: "Settlement", value: expense.excludeFromSettlement ? "Excluded" : "Included")
            }
        }
    }
}

private struct ExpensePaymentInfoSection: View {
    @Environment(DashboardStore.self) private var store
    var expense: Expense
    var presentation: ExpenseDetailPresentation

    var body: some View {
        NativePanel {
            VStack(alignment: .leading, spacing: 12) {
                SectionLabel("Payment and contribution")
                if presentation.sortedPaidBy.isEmpty {
                    Text("No payers listed.")
                        .font(.subheadline)
                        .foregroundStyle(SettleTheme.mutedText)
                } else {
                    ForEach(presentation.sortedPaidBy) { payer in
                        DetailRow(
                            title: store.peopleMap[payer.personId] ?? "Unknown",
                            value: SettleEaseFormatters.currency(payer.amount),
                            emphasized: true
                        )
                    }
                }

                if let celebration = expense.celebrationContribution {
                    Divider()
                    Label("Celebration contribution", systemImage: "party.popper.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(SettleTheme.warning)
                    DetailRow(title: store.peopleMap[celebration.personId] ?? "Unknown", value: SettleEaseFormatters.currency(celebration.amount), emphasized: true)
                }

                Divider()
                DetailRow(title: "Net amount for splitting", value: SettleEaseFormatters.currency(presentation.amountEffectivelySplit), emphasized: true)
            }
        }
    }
}

private struct ExpenseSplitDetailsSection: View {
    @Environment(DashboardStore.self) private var store
    var expense: Expense
    var presentation: ExpenseDetailPresentation

    var body: some View {
        NativePanel {
            VStack(alignment: .leading, spacing: 13) {
                SectionLabel("Split method", subtitle: expense.splitMethod.displayName)

                switch expense.splitMethod {
                case .equal:
                    Text("Split equally among \(expense.shares.count) \(expense.shares.count == 1 ? "person" : "people") based on \(SettleEaseFormatters.currency(presentation.amountEffectivelySplit)).")
                        .font(.caption)
                        .foregroundStyle(SettleTheme.mutedText)
                    ForEach(presentation.sortedShares) { share in
                        DetailRow(title: store.peopleMap[share.personId] ?? "Unknown", value: SettleEaseFormatters.currency(share.amount), emphasized: true)
                    }
                case .unequal:
                    Text("Specific shares assigned against \(SettleEaseFormatters.currency(presentation.amountEffectivelySplit)).")
                        .font(.caption)
                        .foregroundStyle(SettleTheme.mutedText)
                    ForEach(presentation.sortedShares) { share in
                        DetailRow(title: store.peopleMap[share.personId] ?? "Unknown", value: SettleEaseFormatters.currency(share.amount), emphasized: true)
                    }
                case .itemwise:
                    ItemwiseOriginalItems(expense: expense, presentation: presentation)
                    ItemwiseAdjustedShares(presentation: presentation)
                }
            }
        }
    }
}

private struct ItemwiseOriginalItems: View {
    @Environment(DashboardStore.self) private var store
    var expense: Expense
    var presentation: ExpenseDetailPresentation

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text("Original items and prices")
                .font(.subheadline.weight(.bold))
            ForEach(sortedCategoryNames, id: \.self) { category in
                if !category.isEmpty {
                    Label(category, systemImage: SettleIcon.symbol(for: store.categories.first { $0.name == category }?.iconName ?? category))
                        .font(.caption.weight(.bold))
                        .foregroundStyle(SettleTheme.mutedText)
                }
                ForEach(items(for: category)) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        DetailRow(title: item.name, value: SettleEaseFormatters.currency(item.totalPrice), emphasized: true)
                        if item.quantity > 1 {
                            Text("\(item.quantity)x · \(SettleEaseFormatters.currency(item.unitPrice)) each")
                                .font(.caption2)
                                .foregroundStyle(SettleTheme.mutedText)
                        }
                        ForEach(Array(item.sharingVariants.enumerated()), id: \.offset) { _, variant in
                            Text("\(variant.quantity)x shared by \(variant.sharedBy.map { store.peopleMap[$0] ?? "Unknown" }.joined(separator: ", "))")
                                .font(.caption2)
                                .foregroundStyle(SettleTheme.mutedText)
                                .lineLimit(2)
                        }
                    }
                    .padding(10)
                    .background(SettleTheme.stone.opacity(0.62), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
        }
    }

    private var sortedCategoryNames: [String] {
        Array(Set(presentation.groupedOriginalItems.map { $0.categoryName ?? "" }))
            .sorted { categoryRank($0) < categoryRank($1) }
    }

    private func items(for category: String) -> [GroupedExpenseItemDisplay] {
        presentation.groupedOriginalItems.filter { ($0.categoryName ?? "") == category }
    }

    private func categoryRank(_ category: String) -> Int {
        store.categories.first { $0.name == category }?.rank ?? 9999
    }
}

private struct ItemwiseAdjustedShares: View {
    @Environment(DashboardStore.self) private var store
    var presentation: ExpenseDetailPresentation

    var body: some View {
        if !presentation.adjustedItemShares.isEmpty {
            VStack(alignment: .leading, spacing: 9) {
                Text("Individual item shares")
                    .font(.subheadline.weight(.bold))
                Text("Based on splitting \(SettleEaseFormatters.currency(presentation.amountEffectivelySplit)). Original item prices are proportionally adjusted before shares are calculated.")
                    .font(.caption)
                    .foregroundStyle(SettleTheme.mutedText)

                ForEach(presentation.adjustedItemShares.filter { $0.totalShareOfAdjustedItems > 0.001 }) { personShare in
                    VStack(alignment: .leading, spacing: 8) {
                        DetailRow(
                            title: store.peopleMap[personShare.personId] ?? "Unknown",
                            value: SettleEaseFormatters.currency(personShare.totalShareOfAdjustedItems),
                            emphasized: true
                        )
                        ForEach(personShare.items) { item in
                            HStack(spacing: 8) {
                                Text(item.itemName)
                                    .font(.caption)
                                    .foregroundStyle(SettleTheme.mutedText)
                                    .lineLimit(1)
                                Spacer()
                                Text(SettleEaseFormatters.currency(item.shareForPerson))
                                    .font(.caption.weight(.semibold))
                                    .monospacedDigit()
                            }
                        }
                    }
                    .padding(10)
                    .background(SettleTheme.stone.opacity(0.62), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
        }
    }
}

private struct ExpenseNetEffectSection: View {
    @Environment(DashboardStore.self) private var store
    var expense: Expense
    var presentation: ExpenseDetailPresentation

    var body: some View {
        NativePanel {
            VStack(alignment: .leading, spacing: 12) {
                SectionLabel("Individual net effect")
                Text("Each person’s position after payments, split shares, and celebration contributions.")
                    .font(.caption)
                    .foregroundStyle(SettleTheme.mutedText)

                ForEach(presentation.netEffectRows) { row in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(store.peopleMap[row.personId] ?? "Unknown")
                                .font(.subheadline.weight(.bold))
                            Spacer()
                            SignedAmountText(value: row.netEffect, tint: row.netEffect > 0.001 ? SettleTheme.positive : row.netEffect < -0.001 ? SettleTheme.warning : SettleTheme.mutedText)
                        }
                        HStack(spacing: 8) {
                            MiniLedgerPill(title: "Paid", value: row.amountPaid, tint: SettleTheme.positive)
                            MiniLedgerPill(title: "Share", value: row.shareAmount, tint: SettleTheme.warning)
                            if row.celebrationAmount > 0 {
                                MiniLedgerPill(title: "Treat", value: row.celebrationAmount, tint: SettleTheme.warning)
                            }
                        }
                    }
                    .padding(10)
                    .background(SettleTheme.stone.opacity(0.62), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
        }
    }
}

private struct DetailRow: View {
    var title: String
    var value: String
    var emphasized = false

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(SettleTheme.mutedText)
                .lineLimit(2)
            Spacer(minLength: 8)
            Text(value)
                .font((emphasized ? Font.subheadline.weight(.bold) : Font.subheadline.weight(.semibold)))
                .foregroundStyle(emphasized ? SettleTheme.primary : SettleTheme.mutedText)
                .multilineTextAlignment(.trailing)
                .lineLimit(2)
                .minimumScaleFactor(0.78)
        }
    }
}

private struct AISummarySheet: View {
    @Environment(DashboardStore.self) private var store
    @State private var copiedMarkdown = false

    private var summary: DashboardSummarySheet {
        store.summarySheet ?? DashboardSummarySheet(
            hash: "loading",
            payload: nil,
            summary: nil,
            source: "Loading",
            modelDisplayName: nil,
            errorMessage: nil,
            isLoading: true
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                DashboardSectionHeader(
                    title: "AI Settlement Summary",
                    subtitle: "\(summary.modelDisplayName ?? "SettleEase AI") · \(summary.source)",
                    systemImage: "sparkles"
                )
                .padding(.bottom, 2)

                if summary.isLoading {
                    NativePanel(glass: true) {
                        LoadingState(title: "Summarising current settlement")
                    }
                } else if let error = summary.errorMessage {
                    ErrorBanner(message: error)
                } else if let structured = summary.summary {
                    let presentation = AISummaryPresentation(
                        summary: structured,
                        payload: summary.payload
                    )

                    AIAttentionPanel(presentation: presentation)
                    AIPaymentActionsSection(payments: presentation.paymentRows)
                    AIMetricGrid(metrics: presentation.metrics)
                    AIProgressSection(presentation: presentation)

                    if !presentation.nextActions.isEmpty || !presentation.exceptionItems.isEmpty {
                        AINextActionsSection(
                            nextActions: presentation.nextActions,
                            exceptions: presentation.exceptionItems
                        )
                    }

                    AIDataQualitySection(
                        messages: presentation.dataQualityMessages,
                        hasWarnings: presentation.hasDataQualityWarnings
                    )

                    SettleGlassButton(
                        title: copiedMarkdown ? "Copied" : "Copy Markdown",
                        systemImage: copiedMarkdown ? "checkmark" : "doc.on.doc",
                        role: .secondary,
                        expands: true
                    ) {
                        UIPasteboard.general.string = presentation.markdown
                        copiedMarkdown = true
                    }
                }
            }
            .padding(16)
            .padding(.bottom, 24)
        }
        .background(SettleTheme.page.ignoresSafeArea())
    }
}

private struct AIAttentionPanel: View {
    var presentation: AISummaryPresentation

    var body: some View {
        NativePanel(glass: true) {
            VStack(alignment: .leading, spacing: 13) {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        SectionLabel(
                            "What needs attention",
                            subtitle: "A concise readout for closing this settlement."
                        )
                    }

                    Spacer(minLength: 0)

                    Text(presentation.paymentRows.isEmpty ? "Clear" : "\(presentation.paymentRows.count) open")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(presentation.paymentRows.isEmpty ? SettleTheme.positive : SettleTheme.warning)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background((presentation.paymentRows.isEmpty ? SettleTheme.positiveSurface : SettleTheme.warningSurface), in: Capsule())
                        .lineLimit(1)
                }

                AIBulletList(
                    items: presentation.snapshotItems.isEmpty ? ["Not available in input data."] : presentation.snapshotItems,
                    symbol: "checkmark.circle.fill",
                    tint: SettleTheme.positive
                )
            }
        }
    }
}

private struct AIPaymentActionsSection: View {
    var payments: [AISummaryPaymentRow]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel("Settle next", subtitle: "Recommended payment order")

            if payments.isEmpty {
                NativePanel {
                    Text("No outstanding payments.")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(SettleTheme.mutedText)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                NativePanel(padding: 0) {
                    VStack(spacing: 0) {
                        ForEach(payments) { payment in
                            VStack(spacing: 0) {
                                HStack(alignment: .center, spacing: 12) {
                                    VStack(alignment: .leading, spacing: 5) {
                                        HStack(spacing: 7) {
                                            Text(payment.from)
                                                .font(.subheadline.weight(.bold))
                                                .foregroundStyle(SettleTheme.primary)
                                                .lineLimit(1)
                                            Image(systemName: "arrow.right")
                                                .font(.caption.weight(.bold))
                                                .foregroundStyle(SettleTheme.mutedText)
                                            Text(payment.to)
                                                .font(.subheadline.weight(.bold))
                                                .foregroundStyle(SettleTheme.primary)
                                                .lineLimit(1)
                                        }
                                        Text(payment.status)
                                            .font(.caption.weight(.medium))
                                            .foregroundStyle(SettleTheme.mutedText)
                                    }

                                    Spacer(minLength: 8)

                                    Text(SettleEaseFormatters.currency(payment.amount))
                                        .font(.headline.weight(.bold))
                                        .foregroundStyle(SettleTheme.primary)
                                        .monospacedDigit()
                                        .lineLimit(1)
                                        .minimumScaleFactor(0.78)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 13)

                                if payment.id != payments.last?.id {
                                    Divider()
                                        .overlay(SettleTheme.border.opacity(0.45))
                                        .padding(.leading, 14)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct AIMetricGrid: View {
    var metrics: [AISummaryMetric]

    private let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10)
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 10) {
            ForEach(metrics) { metric in
                NativePanel(padding: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(metric.label)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(SettleTheme.mutedText)
                            .lineLimit(2)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(metric.value)
                            .font(.headline.weight(.bold))
                            .foregroundStyle(SettleTheme.primary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }
}

private struct AIProgressSection: View {
    var presentation: AISummaryPresentation

    var body: some View {
        NativePanel {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 16) {
                    AISettlementDonut(percent: presentation.progress.percentSettled)
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Settlement progress")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(SettleTheme.primary)
                        Text("Track what has already moved against what is still open.")
                            .font(.subheadline)
                            .foregroundStyle(SettleTheme.mutedText)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                HStack(spacing: 10) {
                    AIAmountTile(title: "Settled", value: presentation.progress.alreadySettled, tint: SettleTheme.positive)
                    AIAmountTile(title: "Remaining", value: presentation.progress.remaining, tint: SettleTheme.warning)
                }

                VStack(alignment: .leading, spacing: 10) {
                    SectionLabel("Spending mix", subtitle: "Top categories")
                    if presentation.categoryBars.isEmpty {
                        Text("Not available in input data.")
                            .font(.subheadline)
                            .foregroundStyle(SettleTheme.mutedText)
                    } else {
                        ForEach(presentation.categoryBars.prefix(4)) { row in
                            AIBarRow(
                                title: row.name,
                                trailing: "\(SettleEaseFormatters.currency(row.amount)) (\(AISummaryPresentation.percentText(row.share))%)",
                                percent: row.share,
                                tint: row.tint
                            )
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    SectionLabel("Balance pressure", subtitle: "Who is exposed")
                    if presentation.balanceBars.isEmpty {
                        Text("No active balances.")
                            .font(.subheadline)
                            .foregroundStyle(SettleTheme.mutedText)
                    } else {
                        ForEach(presentation.balanceBars.prefix(4)) { row in
                            AIBarRow(
                                title: row.name,
                                trailing: "\(row.direction) \(SettleEaseFormatters.currency(row.amount))",
                                percent: row.width,
                                tint: row.direction == "Receives" ? SettleTheme.positive : SettleTheme.warning
                            )
                        }
                    }
                }
            }
        }
    }
}

private struct AISettlementDonut: View {
    var percent: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(SettleTheme.stoneStrong.opacity(0.85), lineWidth: 12)
            Circle()
                .trim(from: 0, to: CGFloat(min(max(percent, 0), 100) / 100))
                .stroke(SettleTheme.positive, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(Int(percent.rounded()))%")
                .font(.headline.weight(.bold))
                .foregroundStyle(SettleTheme.primary)
                .monospacedDigit()
        }
        .frame(width: 84, height: 84)
        .accessibilityLabel("\(Int(percent.rounded())) percent settled")
    }
}

private struct AIAmountTile: View {
    var title: String
    var value: Double
    var tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(SettleTheme.mutedText)
            Text(SettleEaseFormatters.currency(value))
                .font(.subheadline.weight(.bold))
                .foregroundStyle(tint)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(11)
        .background(tint.opacity(0.10), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct AIBarRow: View {
    var title: String
    var trailing: String
    var percent: Double
    var tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(SettleTheme.primary)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text(trailing)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(SettleTheme.mutedText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
            }

            GeometryReader { geometry in
                let width = geometry.size.width * CGFloat(min(max(percent, 0), 100) / 100)
                ZStack(alignment: .leading) {
                    Capsule().fill(SettleTheme.stoneStrong.opacity(0.68))
                    Capsule().fill(tint).frame(width: width)
                }
            }
            .frame(height: 7)
        }
    }
}

private struct AINextActionsSection: View {
    var nextActions: [String]
    var exceptions: [String]

    var body: some View {
        NativePanel {
            VStack(alignment: .leading, spacing: 14) {
                if !nextActions.isEmpty {
                    VStack(alignment: .leading, spacing: 9) {
                        SectionLabel("Next best actions")
                        AINumberedList(items: nextActions)
                    }
                }

                if !exceptions.isEmpty {
                    if !nextActions.isEmpty {
                        Divider().overlay(SettleTheme.border.opacity(0.45))
                    }
                    VStack(alignment: .leading, spacing: 9) {
                        SectionLabel("Exceptions")
                        AIBulletList(items: exceptions, symbol: "exclamationmark.triangle.fill", tint: SettleTheme.warning)
                    }
                }
            }
        }
    }
}

private struct AIDataQualitySection: View {
    var messages: [String]
    var hasWarnings: Bool

    var body: some View {
        NativePanel {
            VStack(alignment: .leading, spacing: 10) {
                Label("Data Quality", systemImage: hasWarnings ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(hasWarnings ? SettleTheme.warning : SettleTheme.positive)
                AIBulletList(
                    items: messages.isEmpty ? ["No material data-quality issues detected."] : messages,
                    symbol: "circle.fill",
                    tint: hasWarnings ? SettleTheme.warning : SettleTheme.positive
                )
            }
        }
        .background((hasWarnings ? SettleTheme.warningSurface : SettleTheme.positiveSurface).opacity(0.28), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct AIBulletList: View {
    var items: [String]
    var symbol: String
    var tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: SettleIcon.symbol(for: symbol))
                        .font(.caption.weight(.bold))
                        .foregroundStyle(tint)
                        .padding(.top, 2)
                    Text(item)
                        .font(.subheadline)
                        .foregroundStyle(SettleTheme.mutedText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

private struct AINumberedList: View {
    var items: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                HStack(alignment: .top, spacing: 9) {
                    Text("\(index + 1)")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(SettleTheme.inverseText)
                        .frame(width: 22, height: 22)
                        .background(SettleTheme.inverseSurface, in: Circle())
                    Text(item)
                        .font(.subheadline)
                        .foregroundStyle(SettleTheme.mutedText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

private struct AISummaryPresentation {
    var summary: StructuredSettlementSummary
    var metrics: [AISummaryMetric]
    var progress: AISettlementProgress
    var paymentRows: [AISummaryPaymentRow]
    var balanceBars: [AISummaryBalanceBar]
    var categoryBars: [AISummaryCategoryBar]
    var dataQualityMessages: [String]
    var hasDataQualityWarnings: Bool
    var snapshotItems: [String]
    var nextActions: [String]
    var exceptionItems: [String]
    var markdown: String

    init(summary: StructuredSettlementSummary, payload: SettleJSONValue?) {
        self.summary = summary
        let payload = payload ?? .object([:])
        let totals = payload.value(at: "analysis", "totals")

        metrics = [
            AISummaryMetric(label: "Included Spend", value: SettleEaseFormatters.currency(totals?["includedSpend"]?.doubleValue ?? 0)),
            AISummaryMetric(label: "Already Settled", value: SettleEaseFormatters.currency(totals?["amountAlreadySettled"]?.doubleValue ?? 0)),
            AISummaryMetric(label: "Remaining", value: SettleEaseFormatters.currency(totals?["remainingSimplifiedSettlementAmount"]?.doubleValue ?? 0)),
            AISummaryMetric(label: "Manual Overrides", value: "\(Int(totals?["activeManualOverrides"]?.doubleValue ?? 0))")
        ]

        let alreadySettled = totals?["amountAlreadySettled"]?.doubleValue ?? 0
        let remaining = totals?["remainingSimplifiedSettlementAmount"]?.doubleValue ?? 0
        let totalSettlement = alreadySettled + remaining
        progress = AISettlementProgress(
            alreadySettled: alreadySettled,
            remaining: remaining,
            totalSettlement: totalSettlement,
            percentSettled: Self.percentage(alreadySettled, totalSettlement)
        )

        paymentRows = payload.value(at: "analysis", "settlement", "recommendedPaymentOrder")?.arrayValue?.enumerated().compactMap { index, value in
            guard let object = value.objectValue else { return nil }
            let already = object["already_settled_amount"]?.doubleValue ?? 0
            return AISummaryPaymentRow(
                id: "\(object["from"]?.stringValue ?? "")-\(object["to"]?.stringValue ?? "")-\(index)",
                from: object["from"]?.stringValue ?? "Not available in input data",
                to: object["to"]?.stringValue ?? "Not available in input data",
                amount: object["outstanding_amount"]?.doubleValue ?? 0,
                status: already > 0.01 ? "Partially settled" : "Outstanding"
            )
        } ?? []

        categoryBars = payload.value(at: "analysis", "spending", "topCategories")?.arrayValue?.prefix(5).enumerated().compactMap { index, value in
            guard let object = value.objectValue else { return nil }
            return AISummaryCategoryBar(
                id: "\(object["name"]?.stringValue ?? "Category")-\(index)",
                name: object["name"]?.stringValue ?? "Not available in input data",
                amount: object["total_spent"]?.doubleValue ?? 0,
                share: object["share_of_included_spend"]?.doubleValue ?? 0,
                tint: Self.barTint(index)
            )
        } ?? []

        let creditors = payload.value(at: "analysis", "balances", "rankedCreditors")?.arrayValue?.compactMap { value -> AISummaryBalanceBar? in
            guard let object = value.objectValue else { return nil }
            return AISummaryBalanceBar(
                id: "receives-\(object["name"]?.stringValue ?? UUID().uuidString)",
                name: object["name"]?.stringValue ?? "Not available in input data",
                amount: object["amount"]?.doubleValue ?? 0,
                direction: "Receives",
                width: 0
            )
        } ?? []
        let debtors = payload.value(at: "analysis", "balances", "rankedDebtors")?.arrayValue?.compactMap { value -> AISummaryBalanceBar? in
            guard let object = value.objectValue else { return nil }
            return AISummaryBalanceBar(
                id: "pays-\(object["name"]?.stringValue ?? UUID().uuidString)",
                name: object["name"]?.stringValue ?? "Not available in input data",
                amount: object["amount"]?.doubleValue ?? 0,
                direction: "Pays",
                width: 0
            )
        } ?? []
        let pressureRows = (creditors + debtors).sorted { lhs, rhs in
            if abs(lhs.amount - rhs.amount) > 0.01 { return lhs.amount > rhs.amount }
            return lhs.name < rhs.name
        }.prefix(6)
        let maxPressure = pressureRows.map(\.amount).max() ?? 0
        balanceBars = pressureRows.map { row in
            AISummaryBalanceBar(
                id: row.id,
                name: row.name,
                amount: row.amount,
                direction: row.direction,
                width: Self.percentage(row.amount, maxPressure)
            )
        }

        dataQualityMessages = Self.dataQualityMessages(from: payload, summary: summary)
        hasDataQualityWarnings = dataQualityMessages.contains { !$0.localizedCaseInsensitiveContains("no material data-quality issues") }
        snapshotItems = Self.uniqueItems(summary.settlementSnapshot, max: 2)
        nextActions = Self.uniqueItems(summary.nextBestActions, max: 3, existing: snapshotItems)

        let activeOverrides = Int(totals?["activeManualOverrides"]?.doubleValue ?? 0)
        let exceptions = Self.uniqueItems(
            summary.manualOverridesAndExceptions,
            max: 2,
            existing: snapshotItems + nextActions
        )
        exceptionItems = activeOverrides > 0 || !Self.isNoExceptionText(exceptions) ? exceptions : []

        markdown = Self.compactMarkdown(
            summary: summary,
            metrics: metrics,
            paymentRows: paymentRows,
            categoryBars: categoryBars,
            balanceBars: balanceBars,
            dataQualityMessages: dataQualityMessages
        )
    }

    static func percentText(_ value: Double) -> String {
        if abs(value.rounded() - value) < 0.05 {
            return "\(Int(value.rounded()))"
        }
        return String(format: "%.1f", value)
    }

    private static func percentage(_ value: Double, _ total: Double) -> Double {
        guard abs(total) > 0.01 else { return 0 }
        return min(100, max(0, ((value / total) * 1000).rounded() / 10))
    }

    private static func barTint(_ index: Int) -> Color {
        switch index % 5 {
        case 0: SettleTheme.positive
        case 1: Color(uiColor: .systemBlue)
        case 2: SettleTheme.warning
        case 3: Color(uiColor: .systemPink)
        default: SettleTheme.warmAccent
        }
    }

    private static func dataQualityMessages(from payload: SettleJSONValue, summary: StructuredSettlementSummary) -> [String] {
        guard payload.value(at: "analysis", "integrity")?.objectValue != nil else {
            let fromSummary = uniqueItems(summary.dataQuality, max: 3)
            return fromSummary.isEmpty ? ["No material data-quality issues detected."] : fromSummary
        }

        let warningList = payload.value(at: "analysis", "integrity", "warningList")?.arrayValue?.compactMap(\.stringValue) ?? []
        if !warningList.isEmpty { return warningList }

        let conservationPasses = payload.value(at: "analysis", "integrity", "conservationCheck", "passes")?.boolValue
        let expenseConsistencyPasses = payload.value(at: "analysis", "integrity", "expenseConsistency", "passes")?.boolValue
        if conservationPasses == false || expenseConsistencyPasses == false {
            return ["Data quality checks did not pass, but no detailed warning was available in input data."]
        }

        return ["No material data-quality issues detected."]
    }

    private static func normalizeForDedupe(_ value: String) -> String {
        value
            .lowercased()
            .replacingOccurrences(of: "[0-9.,₹$%]", with: "", options: .regularExpression)
            .replacingOccurrences(of: "[^a-z\\s]", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func uniqueItems(_ items: [String], max: Int, existing: [String] = []) -> [String] {
        var seen = Set(existing.map(normalizeForDedupe).filter { !$0.isEmpty })
        var result: [String] = []
        for item in items {
            let trimmed = item.trimmingCharacters(in: .whitespacesAndNewlines)
            let key = normalizeForDedupe(trimmed)
            guard !trimmed.isEmpty, !key.isEmpty, !seen.contains(key) else { continue }
            seen.insert(key)
            result.append(trimmed)
            if result.count >= max { break }
        }
        return result
    }

    private static func isNoExceptionText(_ items: [String]) -> Bool {
        if items.isEmpty { return true }
        return items.allSatisfy { item in
            let text = item.lowercased()
            return text.contains("no manual")
                || text.contains("none active")
                || text.contains("no exceptions")
                || text.contains("not available in input data")
        }
    }

    private static func compactMarkdown(
        summary: StructuredSettlementSummary,
        metrics: [AISummaryMetric],
        paymentRows: [AISummaryPaymentRow],
        categoryBars: [AISummaryCategoryBar],
        balanceBars: [AISummaryBalanceBar],
        dataQualityMessages: [String]
    ) -> String {
        var lines = ["# AI Settlement Summary", ""]
        lines.append("## Settlement Snapshot")
        uniqueItems(summary.settlementSnapshot, max: 3).forEach { lines.append("- \($0)") }
        lines.append("")

        lines.append("## Key Numbers")
        metrics.forEach { lines.append("- \($0.label): \($0.value)") }
        lines.append("")

        lines.append("## Payment Actions")
        if paymentRows.isEmpty {
            lines.append("- No outstanding payments.")
        } else {
            paymentRows.forEach { lines.append("- \($0.from) to \($0.to): \(SettleEaseFormatters.currency($0.amount)) (\($0.status))") }
        }
        lines.append("")

        lines.append("## Spending Mix")
        if categoryBars.isEmpty {
            lines.append("- Not available in input data.")
        } else {
            categoryBars.forEach { lines.append("- \($0.name): \(SettleEaseFormatters.currency($0.amount)) (\(percentText($0.share))%)") }
        }
        lines.append("")

        lines.append("## Balance Pressure")
        if balanceBars.isEmpty {
            lines.append("- No active balances.")
        } else {
            balanceBars.forEach { lines.append("- \($0.name): \($0.direction) \(SettleEaseFormatters.currency($0.amount))") }
        }
        lines.append("")

        lines.append("## Data Quality")
        dataQualityMessages.forEach { lines.append("- \($0)") }
        lines.append("")

        lines.append("## Next Best Actions")
        uniqueItems(summary.nextBestActions, max: 4, existing: summary.settlementSnapshot).forEach { lines.append("- \($0)") }

        return lines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

private struct AISummaryMetric: Identifiable {
    var id: String { label }
    var label: String
    var value: String
}

private struct AISettlementProgress {
    var alreadySettled: Double
    var remaining: Double
    var totalSettlement: Double
    var percentSettled: Double
}

private struct AISummaryPaymentRow: Identifiable, Equatable {
    var id: String
    var from: String
    var to: String
    var amount: Double
    var status: String
}

private struct AISummaryBalanceBar: Identifiable {
    var id: String
    var name: String
    var amount: Double
    var direction: String
    var width: Double
}

private struct AISummaryCategoryBar: Identifiable {
    var id: String
    var name: String
    var amount: Double
    var share: Double
    var tint: Color
}

private extension SettleJSONValue {
    var objectValue: [String: SettleJSONValue]? {
        if case .object(let value) = self { value } else { nil }
    }

    var arrayValue: [SettleJSONValue]? {
        if case .array(let value) = self { value } else { nil }
    }

    var stringValue: String? {
        if case .string(let value) = self { value } else { nil }
    }

    var doubleValue: Double? {
        switch self {
        case .number(let value): value
        case .int(let value): Double(value)
        default: nil
        }
    }

    var boolValue: Bool? {
        if case .bool(let value) = self { value } else { nil }
    }

    subscript(key: String) -> SettleJSONValue? {
        objectValue?[key]
    }

    func value(at path: String...) -> SettleJSONValue? {
        var current: SettleJSONValue? = self
        for key in path {
            current = current?[key]
        }
        return current
    }
}
#endif
