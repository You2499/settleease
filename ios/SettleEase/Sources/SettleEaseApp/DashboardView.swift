#if os(iOS)
import SwiftUI
import SettleEaseCore

struct DashboardView: View {
    @Environment(DashboardStore.self) private var store
    @Namespace private var expenseNamespace

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 14) {
                if !store.activeOverrides.isEmpty {
                    ManualOverrideAlert()
                        .settleEntrance(delay: 0.02)
                }

                SettlementHub()
                    .settleEntrance(delay: 0.05)

                ActivityFeed()
                    .settleEntrance(delay: 0.09)
            }
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 118)
        }
        .scrollIndicators(.hidden)
        .background(SettleTheme.page)
        .sheet(item: selectedExpenseBinding) { expense in
            ExpenseDetailSheet(expense: expense)
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
        Binding(
            get: { store.selectedExpense },
            set: { store.selectedExpense = $0 }
        )
    }

    private var summaryBinding: Binding<DashboardSummarySheet?> {
        Binding(
            get: { store.summarySheet },
            set: { store.summarySheet = $0 }
        )
    }
}

private struct ManualOverrideAlert: View {
    @Environment(DashboardStore.self) private var store

    var totalOverride: Double {
        store.activeOverrides.reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        WebBetaCard(padding: 14) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .center, spacing: 10) {
                    Image(systemName: "hand.raised.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(SettleTheme.warning)
                        .frame(width: 30, height: 30)
                        .background(SettleTheme.warning.opacity(0.12), in: RoundedRectangle(cornerRadius: 9, style: .continuous))

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Manual settlement path active")
                            .font(.subheadline.weight(.semibold))
                        Text("\(store.activeOverrides.count) active override\(store.activeOverrides.count == 1 ? "" : "s") · \(SettleEaseFormatters.currency(totalOverride)) total")
                            .font(.caption)
                            .foregroundStyle(SettleTheme.mutedText)
                    }
                }

                ForEach(store.activeOverrides.prefix(3)) { override in
                    HStack(spacing: 7) {
                        Text(store.peopleMap[override.debtorId] ?? "Debtor")
                            .lineLimit(1)
                        Image(systemName: "arrow.right")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(SettleTheme.warmAccent)
                        Text(store.peopleMap[override.creditorId] ?? "Creditor")
                            .lineLimit(1)
                        Spacer(minLength: 8)
                        SettleAmountText(value: override.amount, font: .caption.weight(.bold))
                    }
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(SettleTheme.stone.opacity(0.72), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
        }
        .accessibilityElement(children: .combine)
    }
}

private struct SettlementHub: View {
    @Environment(DashboardStore.self) private var store
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        @Bindable var store = store

        WebBetaCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .center, spacing: 10) {
                    WebSectionHeader(
                        title: "Settlement Hub",
                        subtitle: "\(store.visibleTransactions.count) \(store.visibleTransactions.count == 1 ? "payment" : "payments")",
                        systemImage: "handshake"
                    )

                    Spacer(minLength: 8)

                    SettleGlassActionGroup {
                        SettleGlassToolbarButton(title: "Summarise", systemImage: "sparkles") {
                            Task { await store.summarise() }
                        }
                    }
                }

                Picker("Settlement mode", selection: $store.dashboardMode) {
                    ForEach(DashboardMode.allCases) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .labelsHidden()

                switch store.dashboardMode {
                case .overview:
                    SettlementOverview()
                case .person:
                    PerPersonDashboard()
                }
            }
        }
    }
}

private struct SettlementOverview: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        @Bindable var store = store

        VStack(alignment: .leading, spacing: 11) {
            HStack(spacing: 10) {
                Text(store.useSimplifiedSettlements ? "Minimum transactions required to settle all debts." : "Detailed pairwise debts reflecting direct expense involvements and payments.")
                    .font(.caption)
                    .foregroundStyle(SettleTheme.mutedText)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: 8)

                Toggle("Simplify", isOn: $store.useSimplifiedSettlements)
                    .font(.caption.weight(.medium))
                    .toggleStyle(.switch)
                    .accessibilityLabel("Simplify settlements")
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(SettleTheme.stone.opacity(0.7), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            if store.visibleTransactions.isEmpty {
                EmptyState(
                    title: "All Settled Up!",
                    message: "All debts are settled, or no expenses to settle yet!",
                    symbol: "checkmark.seal.fill"
                )
            } else {
                VStack(spacing: 9) {
                    ForEach(store.visibleTransactions) { transaction in
                        TransactionPaymentRow(transaction: transaction)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                    }
                }
                .animation(.settleEaseState, value: store.visibleTransactions)
            }
        }
    }
}

private struct TransactionPaymentRow: View {
    @Environment(DashboardStore.self) private var store
    var transaction: CalculatedTransaction

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
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
                SettleGlassActionGroup {
                    Button {
                        Task { await store.markPaid(transaction) }
                    } label: {
                        Label("Mark as Paid", systemImage: "checkmark.circle")
                            .labelStyle(.titleAndIcon)
                    }
                    .buttonStyle(.plain)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(SettleTheme.primary)
                    .padding(.horizontal, 11)
                    .padding(.vertical, 9)
                    .background {
                        SettleGlass { Color.clear }
                    }
                }
            }
        }
        .padding(12)
        .background(SettleTheme.card.opacity(0.96), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(SettleTheme.border.opacity(0.88), lineWidth: 0.7)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct PerPersonDashboard: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        @Bindable var store = store

        VStack(alignment: .leading, spacing: 11) {
            VStack(alignment: .leading, spacing: 9) {
                Text("View settlement details for:")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(SettleTheme.mutedText)

                Picker("Person", selection: $store.selectedPersonId) {
                    Text("Select Person...").tag(String?.none)
                    ForEach(store.people) { person in
                        Text(person.name).tag(Optional(person.id))
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, alignment: .leading)

                Toggle("Show balanced people", isOn: $store.showBalancedPeople)
                    .font(.caption.weight(.medium))
            }
            .padding(12)
            .background(SettleTheme.stone.opacity(0.72), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            if let person = store.selectedPerson {
                PersonSettlementDetail(person: person)
            } else {
                HStack(spacing: 9) {
                    Image(systemName: "person.2.fill")
                    Text("Please select a person to see their specific settlement status.")
                }
                .font(.subheadline)
                .foregroundStyle(SettleTheme.mutedText)
                .frame(maxWidth: .infinity, minHeight: 96)
            }
        }
    }
}

private struct PersonSettlementDetail: View {
    @Environment(DashboardStore.self) private var store
    var person: Person

    var body: some View {
        let balance = store.balances[person.id] ?? PersonBalanceSnapshot()
        let relevantExpenses = store.expenses.filter { expense in
            expense.paidBy.contains { $0.personId == person.id }
                || expense.shares.contains { $0.personId == person.id }
                || (expense.items ?? []).contains { $0.sharedBy.contains(person.id) }
        }
        let relevantPayments = store.settlementPayments.filter {
            $0.debtorId == person.id || $0.creditorId == person.id
        }

        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "person.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(SettleTheme.primary)
                    .frame(width: 32, height: 32)
                    .background(SettleTheme.stone, in: RoundedRectangle(cornerRadius: 9, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(person.name)
                        .font(.headline.weight(.bold))
                    Text(balance.netBalance >= 0 ? "Gets back" : "Owes")
                        .font(.caption)
                        .foregroundStyle(SettleTheme.mutedText)
                }

                Spacer()

                SettleAmountText(value: abs(balance.netBalance), font: .headline.weight(.bold))
                    .foregroundStyle(balance.netBalance >= 0 ? SettleTheme.positive : SettleTheme.warning)
            }

            HStack(spacing: 8) {
                BalanceStat(title: "Paid", amount: balance.totalPaid)
                BalanceStat(title: "Share", amount: balance.totalOwed)
            }

            if !relevantExpenses.isEmpty {
                Text("Relevant expenses")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(SettleTheme.mutedText)
                ForEach(relevantExpenses.prefix(4)) { expense in
                    Button {
                        store.selectedExpense = expense
                    } label: {
                        ExpenseActivityRow(expense: expense)
                    }
                    .buttonStyle(.plain)
                }
            }

            if !relevantPayments.isEmpty {
                Text("Payment history")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(SettleTheme.mutedText)
                ForEach(relevantPayments.prefix(4)) { payment in
                    SettlementActivityRow(payment: payment)
                }
            }
        }
    }
}

private struct BalanceStat: View {
    var title: String
    var amount: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(SettleTheme.mutedText)
            SettleAmountText(value: amount, font: .caption.weight(.bold), compact: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(SettleTheme.stone.opacity(0.66), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

private struct ActivityFeed: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        WebBetaCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .firstTextBaseline) {
                    WebSectionHeader(
                        title: "Activity Feed",
                        subtitle: "\(store.activities.count) \(store.activities.count == 1 ? "transaction" : "transactions") found",
                        systemImage: "doc.text.fill"
                    )

                    Spacer(minLength: 8)

                    if store.filters.hasActiveFilters {
                        Button {
                            store.clearFilters()
                        } label: {
                            Label("Clear", systemImage: "xmark")
                                .labelStyle(.titleAndIcon)
                        }
                        .buttonStyle(WebPillButtonStyle(kind: .tertiary))
                        .font(.caption.weight(.semibold))
                    }
                }

                FilterToolbar()

                if store.activities.isEmpty {
                    EmptyState(
                        title: "No transactions found.",
                        message: store.filters.hasActiveFilters ? "Try clearing filters." : "Expenses and recorded payments will appear here.",
                        symbol: "line.3.horizontal.decrease.circle"
                    )
                } else {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(store.groupedActivities, id: \.date) { group in
                            VStack(alignment: .leading, spacing: 8) {
                                DateDivider(title: group.date)
                                VStack(spacing: 9) {
                                    ForEach(group.items) { activity in
                                        ActivityRow(activity: activity)
                                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                                    }
                                }
                            }
                        }
                    }
                    .animation(.settleEaseState, value: store.activities.map(\.id))
                }
            }
        }
    }
}

private struct FilterToolbar: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        @Bindable var store = store

        VStack(spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(SettleTheme.mutedText)
                TextField("Search...", text: $store.filters.searchQuery)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .font(.subheadline)
            }
            .padding(.horizontal, 11)
            .padding(.vertical, 9)
            .background {
                SettleGlass(shape: AnyShape(RoundedRectangle(cornerRadius: 12, style: .continuous))) {
                    SettleTheme.stone.opacity(0.18)
                }
            }

            HStack(spacing: 8) {
                Picker("Person", selection: $store.filters.personId) {
                    Text("All People").tag(String?.none)
                    ForEach(store.people) { person in
                        Text(person.name).tag(Optional(person.id))
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity)
                .glassPickerChrome()

                Picker("Category", selection: $store.filters.categoryName) {
                    Text("All Categories").tag(String?.none)
                    ForEach(store.categories) { category in
                        Text(category.name).tag(Optional(category.name))
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity)
                .glassPickerChrome()
            }
        }
    }
}

private extension View {
    func glassPickerChrome() -> some View {
        self
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 9)
            .padding(.vertical, 8)
            .background {
                SettleGlass { Color.clear }
            }
    }
}

private struct DateDivider: View {
    var title: String

    var body: some View {
        HStack(spacing: 8) {
            Rectangle()
                .fill(SettleTheme.border)
                .frame(height: 0.7)
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(SettleTheme.mutedText)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(SettleTheme.card, in: Capsule())
                .overlay {
                    Capsule().stroke(SettleTheme.border, lineWidth: 0.6)
                }
            Rectangle()
                .fill(SettleTheme.border)
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
        VStack(alignment: .leading, spacing: 7) {
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
                Label(expense.category, systemImage: symbol(for: expense.category))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(SettleTheme.mutedText)
                    .lineLimit(1)

                Spacer(minLength: 6)

                Text("Paid by: \(paidByText)")
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
                    .background(SettleTheme.warning.opacity(0.10), in: Capsule())
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(SettleTheme.card.opacity(0.96), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(SettleTheme.border.opacity(0.88), lineWidth: 0.7)
        }
        .accessibilityElement(children: .combine)
    }

    private var paidByText: String {
        if expense.paidBy.count > 1 {
            return "Multiple Payers"
        }
        guard let payer = expense.paidBy.first else {
            return "None"
        }
        return store.peopleMap[payer.personId] ?? "Unknown"
    }

    private func symbol(for category: String) -> String {
        store.categories.first { $0.name == category }?.iconName ?? "receipt.fill"
    }
}

private struct SettlementActivityRow: View {
    @Environment(DashboardStore.self) private var store
    var payment: SettlementPayment

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "hand.coins.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SettleTheme.positive)
                .frame(width: 34, height: 34)
                .background(SettleTheme.stone.opacity(0.92), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

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

                HStack(spacing: 7) {
                    Text(payment.notes == nil ? "Settlement" : "Custom Payment")
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(SettleTheme.positive.opacity(0.12), in: Capsule())
                    if let notes = payment.notes {
                        Text(notes)
                            .font(.caption)
                            .foregroundStyle(SettleTheme.mutedText)
                            .lineLimit(1)
                    }
                }
            }

            Spacer(minLength: 8)

            SettleAmountText(value: payment.amountSettled, font: .subheadline.weight(.bold))
                .foregroundStyle(SettleTheme.positive)
        }
        .padding(12)
        .background(SettleTheme.card.opacity(0.96), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(SettleTheme.positive)
                .frame(width: 4)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(SettleTheme.border.opacity(0.88), lineWidth: 0.7)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct ExpenseDetailSheet: View {
    @Environment(DashboardStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var expense: Expense

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .center) {
                    WebSectionHeader(
                        title: expense.description,
                        subtitle: "\(expense.category) · \(SettleEaseFormatters.shortDate(expense.createdAt))",
                        systemImage: "receipt.fill"
                    )
                    Button("Done") { dismiss() }
                        .buttonStyle(WebPillButtonStyle(kind: .secondary))
                }

                WebBetaCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Basic info")
                            .font(.headline.weight(.bold))
                        DetailRow(title: "Total", value: SettleEaseFormatters.currency(expense.totalAmount))
                        DetailRow(title: "Split method", value: expense.splitMethod.displayName)
                        DetailRow(title: "Included", value: expense.excludeFromSettlement ? "Excluded from settlements" : "Included in settlements")
                    }
                }

                WebBetaCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Payment info")
                            .font(.headline.weight(.bold))
                        ForEach(expense.paidBy) { payer in
                            DetailRow(
                                title: store.peopleMap[payer.personId] ?? "Unknown",
                                value: SettleEaseFormatters.currency(payer.amount)
                            )
                        }
                    }
                }

                WebBetaCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Split details")
                            .font(.headline.weight(.bold))
                        ForEach(expense.shares) { share in
                            DetailRow(
                                title: store.peopleMap[share.personId] ?? "Unknown",
                                value: SettleEaseFormatters.currency(share.amount)
                            )
                        }
                        if let celebration = expense.celebrationContribution {
                            DetailRow(
                                title: "Celebration contribution · \(store.peopleMap[celebration.personId] ?? "Unknown")",
                                value: SettleEaseFormatters.currency(celebration.amount)
                            )
                        }
                    }
                }

                if let items = expense.items, !items.isEmpty {
                    WebBetaCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Itemwise details")
                                .font(.headline.weight(.bold))
                            ForEach(items) { item in
                                VStack(alignment: .leading, spacing: 5) {
                                    DetailRow(title: item.name, value: SettleEaseFormatters.currency(item.price))
                                    Text(item.sharedBy.map { store.peopleMap[$0] ?? "Unknown" }.joined(separator: ", "))
                                        .font(.caption)
                                        .foregroundStyle(SettleTheme.mutedText)
                                }
                            }
                        }
                    }
                }

                WebBetaCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Net effect summary")
                            .font(.headline.weight(.bold))
                        ForEach(expense.paidBy) { payer in
                            DetailRow(
                                title: "\(store.peopleMap[payer.personId] ?? "Unknown") paid",
                                value: SettleEaseFormatters.currency(payer.amount)
                            )
                        }
                    }
                }
            }
            .padding(16)
            .padding(.bottom, 24)
        }
        .background(SettleTheme.page.ignoresSafeArea())
    }
}

private struct DetailRow: View {
    var title: String
    var value: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(SettleTheme.mutedText)
            Spacer(minLength: 8)
            Text(value)
                .font(.subheadline.weight(.bold))
                .multilineTextAlignment(.trailing)
        }
    }
}

private struct AISummarySheet: View {
    @Environment(DashboardStore.self) private var store

    private var summary: DashboardSummarySheet {
        store.summarySheet ?? DashboardSummarySheet(
            hash: "loading",
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
                WebSectionHeader(
                    title: "AI Settlement Summary",
                    subtitle: "\(summary.modelDisplayName ?? "SettleEase AI") · \(summary.source)",
                    systemImage: "sparkles"
                )

                if summary.isLoading {
                    WebBetaCard {
                        LoadingState(title: "Summarising current settlement")
                    }
                } else if let error = summary.errorMessage {
                    ErrorBanner(message: error)
                } else if let structured = summary.summary {
                    SummarySection(title: "Settlement Snapshot", items: structured.settlementSnapshot)
                    SummarySection(title: "Key Numbers", items: structured.keyNumbers)
                    SummarySection(title: "Who Should Receive Money", items: structured.whoShouldReceiveMoney)
                    SummarySection(title: "Who Should Pay", items: structured.whoShouldPay)
                    SummarySection(title: "Recommended Settlement Actions", items: structured.recommendedSettlementActions)
                    SummarySection(title: "Spending Drivers", items: structured.spendingDrivers)
                    SummarySection(title: "Manual Overrides and Exceptions", items: structured.manualOverridesAndExceptions)
                    SummarySection(title: "Data Quality", items: structured.dataQuality)
                    SummarySection(title: "Next Best Actions", items: structured.nextBestActions)
                }
            }
            .padding(16)
            .padding(.bottom, 24)
        }
        .background(SettleTheme.page.ignoresSafeArea())
    }
}

private struct SummarySection: View {
    var title: String
    var items: [String]

    var body: some View {
        WebBetaCard {
            VStack(alignment: .leading, spacing: 10) {
                Text(title)
                    .font(.headline.weight(.bold))
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "check.circle.fill")
                            .font(.caption)
                            .foregroundStyle(SettleTheme.primary)
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
}
#endif
