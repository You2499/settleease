#if os(iOS)
import SwiftUI
import SettleEaseCore

struct DashboardView: View {
    @Environment(AppModel.self) private var model
    @State private var settlementMode: SettlementMode = .overview
    @State private var useSimplifiedSettlements = true

    private enum SettlementMode: String, CaseIterable, Identifiable {
        case overview = "Overview"
        case person = "Per Person"

        var id: String { rawValue }
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 14) {
                if case .failed(let message) = model.state {
                    ErrorBanner(message: message)
                }

                if model.metrics.activeOverrideCount > 0 {
                    manualOverrideAlert
                }

                settlementHub
                activityFeed
            }
            .padding(.horizontal, 16)
                .padding(.top, 10)
                .padding(.bottom, 112)
        }
        .scrollIndicators(.hidden)
        .background(SettleTheme.page)
    }

    private var manualOverrideAlert: some View {
        HStack(alignment: .center, spacing: 10) {
            Image(systemName: "hand.raised.fill")
                .foregroundStyle(SettleTheme.warning)
                .font(.headline)
                .frame(width: 30, height: 30)
                .background(SettleTheme.warning.opacity(0.12), in: RoundedRectangle(cornerRadius: 9, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text("Manual settlement path active")
                    .font(.subheadline.weight(.semibold))
                Text("Optimized payments are respecting your preferred route.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(SettleTheme.stone.opacity(0.84), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(SettleTheme.warning.opacity(0.24), lineWidth: 0.7)
        }
    }

    private var settlementHub: some View {
        ContentCard(spacing: 14) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .center, spacing: 10) {
                    Image(systemName: "handshake")
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .frame(width: 32, height: 32)
                        .background(SettleTheme.stone, in: RoundedRectangle(cornerRadius: 9, style: .continuous))

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Settlement Hub")
                            .font(.title3.weight(.semibold))
                        Text("\(visibleTransactions.count) \(visibleTransactions.count == 1 ? "payment" : "payments")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Spacer(minLength: 8)

                    Button {
                    } label: {
                        Label("Summarise", systemImage: "sparkles")
                            .labelStyle(.iconOnly)
                    }
                    .buttonStyle(SettlePillButtonStyle())
                    .accessibilityLabel("Summarise")
                }

                Picker("Settlement mode", selection: $settlementMode) {
                    ForEach(SettlementMode.allCases) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .labelsHidden()

                switch settlementMode {
                case .overview:
                    settlementOverview
                case .person:
                    perPersonOverview
                }
            }
        }
    }

    private var settlementOverview: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Text(useSimplifiedSettlements ? "Minimum transactions required to settle all debts." : "Detailed pairwise debts from direct expense involvement.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: 8)

                Toggle("Simplify", isOn: $useSimplifiedSettlements)
                    .font(.caption.weight(.medium))
                    .toggleStyle(.switch)
                    .labelsHidden()
                    .accessibilityLabel("Simplify settlements")
            }
            .padding(12)
            .background(SettleTheme.stone.opacity(0.72), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

            if visibleTransactions.isEmpty {
                EmptyState(title: "All Settled Up", message: "All debts are settled, or no expenses need settlement yet.", symbol: "checkmark.seal.fill")
            } else {
                VStack(spacing: 9) {
                    ForEach(visibleTransactions.prefix(2)) { transaction in
                        TransactionPaymentRow(transaction: transaction)
                    }
                    if visibleTransactions.count > 2 {
                        HStack {
                            Text("\(visibleTransactions.count - 2) more \(visibleTransactions.count - 2 == 1 ? "payment" : "payments")")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("Open Settlements from Menu")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.primary)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(SettleTheme.stone.opacity(0.72), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
            }
        }
    }

    private var perPersonOverview: some View {
        VStack(spacing: 9) {
            ForEach(model.people) { person in
                let balance = balances[person.id, default: 0]
                HStack(spacing: 12) {
                    Image(systemName: "person.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: 30, height: 30)
                        .background(SettleTheme.stone.opacity(0.9), in: RoundedRectangle(cornerRadius: 9, style: .continuous))

                    VStack(alignment: .leading, spacing: 2) {
                        Text(person.name)
                            .font(.subheadline.weight(.semibold))
                        Text(balance >= 0 ? "Gets back" : "Owes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer(minLength: 8)

                    Text(SettleEaseFormatters.currency(abs(balance)))
                        .font(.subheadline.weight(.semibold))
                        .monospacedDigit()
                        .contentTransition(.numericText(value: balance))
                        .foregroundStyle(balance >= 0 ? SettleTheme.positive : SettleTheme.warning)
                }
                .padding(12)
                .background(SettleTheme.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.black.opacity(0.06), lineWidth: 0.6)
                }
            }
        }
    }

    private var activityFeed: some View {
        ContentCard(spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Label("Activity Feed", systemImage: "doc.text.fill")
                        .font(.title3.weight(.semibold))
                    Text("\(activities.count) \(activities.count == 1 ? "transaction" : "transactions") found")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }

            filterToolbar

            if activities.isEmpty {
                EmptyState(title: "No Transactions Found", message: "Expenses and recorded payments will appear here.", symbol: "line.3.horizontal.decrease.circle")
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(groupedActivities, id: \.date) { group in
                        VStack(alignment: .leading, spacing: 8) {
                            DateDivider(title: group.date)

                            VStack(spacing: 9) {
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

    private var filterToolbar: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                FilterPill(title: "Search", systemImage: "magnifyingglass")
                FilterPill(title: "All People", systemImage: "person.2")
                FilterPill(title: "All Categories", systemImage: "folder")
            }
            .padding(.vertical, 1)
        }
        .scrollIndicators(.hidden)
    }

    private var visibleTransactions: [CalculatedTransaction] {
        useSimplifiedSettlements ? model.simplifiedTransactions : model.pairwiseTransactions
    }

    private var balances: [String: Double] {
        SettlementCalculator.netBalances(
            people: model.people,
            expenses: model.expenses,
            settlementPayments: model.settlementPayments
        )
    }

    private var activities: [DashboardActivity] {
        let expenseItems = model.expenses
            .filter { !$0.excludeFromSettlement }
            .map(DashboardActivity.expense)
        let paymentItems = model.settlementPayments.map(DashboardActivity.settlement)
        return (expenseItems + paymentItems)
            .sorted { $0.sortDate > $1.sortDate }
    }

    private var groupedActivities: [(date: String, items: [DashboardActivity])] {
        var groups: [(date: String, items: [DashboardActivity])] = []
        for activity in activities.prefix(8) {
            let date = activity.dateText
            if let index = groups.firstIndex(where: { $0.date == date }) {
                groups[index].items.append(activity)
            } else {
                groups.append((date: date, items: [activity]))
            }
        }
        return groups
    }
}

private struct TransactionPaymentRow: View {
    @Environment(AppModel.self) private var model
    var transaction: CalculatedTransaction

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 7) {
                    Text(model.peopleMap[transaction.from] ?? "Unknown")
                        .lineLimit(1)
                    Image(systemName: "arrow.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(SettleTheme.warmAccent)
                    Text(model.peopleMap[transaction.to] ?? "Unknown")
                        .lineLimit(1)
                }
                .font(.subheadline.weight(.semibold))

                AnimatedMoneyText(value: transaction.amount, style: .headline.weight(.semibold))
                    .foregroundStyle(SettleTheme.positive)
            }

            Spacer(minLength: 8)

            if model.isAdmin {
                Button {
                    Task { await model.markPaid(transaction) }
                } label: {
                    Label("Mark Paid", systemImage: "checkmark.circle")
                        .labelStyle(.titleAndIcon)
                }
                .buttonStyle(SettlePillButtonStyle())
            }
        }
        .padding(12)
        .background(SettleTheme.card.opacity(0.95), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.black.opacity(0.06), lineWidth: 0.6)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct FilterPill: View {
    var title: String
    var systemImage: String

    var body: some View {
        Label(title, systemImage: systemImage)
            .font(.caption.weight(.medium))
            .foregroundStyle(.primary)
            .padding(.horizontal, 11)
            .padding(.vertical, 8)
            .background(SettleTheme.stone.opacity(0.78), in: Capsule())
            .overlay {
                Capsule().stroke(Color.black.opacity(0.06), lineWidth: 0.6)
            }
    }
}

private struct DateDivider: View {
    var title: String

    var body: some View {
        HStack(spacing: 8) {
            Rectangle()
                .fill(Color.black.opacity(0.08))
                .frame(height: 0.6)
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(SettleTheme.card, in: Capsule())
                .overlay {
                    Capsule().stroke(Color.black.opacity(0.06), lineWidth: 0.5)
                }
            Rectangle()
                .fill(Color.black.opacity(0.08))
                .frame(height: 0.6)
        }
    }
}

private enum DashboardActivity: Identifiable {
    case expense(Expense)
    case settlement(SettlementPayment)

    var id: String {
        switch self {
        case .expense(let expense): "expense-\(expense.id)"
        case .settlement(let payment): "settlement-\(payment.id)"
        }
    }

    var sortDate: Date {
        switch self {
        case .expense(let expense):
            return expense.createdAt.flatMap(SettleEaseFormatters.parseISODate) ?? .distantPast
        case .settlement(let payment):
            return SettleEaseFormatters.parseISODate(payment.settledAt) ?? .distantPast
        }
    }

    var dateText: String {
        switch self {
        case .expense(let expense):
            return SettleEaseFormatters.shortDate(expense.createdAt)
        case .settlement(let payment):
            return SettleEaseFormatters.shortDate(payment.settledAt)
        }
    }
}

private struct ActivityRow: View {
    @Environment(AppModel.self) private var model
    var activity: DashboardActivity

    var body: some View {
        switch activity {
        case .expense(let expense):
            NavigationLink {
                ExpenseDetailView(expense: expense)
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
    @Environment(AppModel.self) private var model
    var expense: Expense

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbol(for: expense.category))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.primary)
                .frame(width: 34, height: 34)
                .background(SettleTheme.stone.opacity(0.92), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(expense.description)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Text("\(expense.category) · \(paidByText)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            AnimatedMoneyText(value: expense.totalAmount, style: .subheadline.weight(.semibold))
                .foregroundStyle(.primary)
        }
        .padding(12)
        .background(SettleTheme.card.opacity(0.95), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.black.opacity(0.06), lineWidth: 0.6)
        }
        .accessibilityElement(children: .combine)
    }

    private var paidByText: String {
        guard let firstPayer = expense.paidBy.first else {
            return "No payer"
        }
        return model.peopleMap[firstPayer.personId] ?? "Unknown"
    }

    private func symbol(for category: String) -> String {
        model.categories.first { $0.name == category }?.iconName ?? "receipt.fill"
    }
}

private struct SettlementActivityRow: View {
    @Environment(AppModel.self) private var model
    var payment: SettlementPayment

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SettleTheme.positive)
                .frame(width: 34, height: 34)
                .background(SettleTheme.stone.opacity(0.92), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text("Payment recorded")
                    .font(.subheadline.weight(.semibold))
                Text("\(model.peopleMap[payment.debtorId] ?? "Someone") paid \(model.peopleMap[payment.creditorId] ?? "someone")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            AnimatedMoneyText(value: payment.amountSettled, style: .subheadline.weight(.semibold))
                .foregroundStyle(SettleTheme.positive)
        }
        .padding(12)
        .background(SettleTheme.card.opacity(0.95), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.black.opacity(0.06), lineWidth: 0.6)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct ExpenseDetailView: View {
    @Environment(AppModel.self) private var model
    var expense: Expense

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                ContentCard(spacing: 12) {
                    Text(expense.description)
                        .font(.title2.weight(.semibold))
                    AnimatedMoneyText(value: expense.totalAmount, style: .largeTitle.weight(.semibold))
                    Text("\(expense.category) · \(SettleEaseFormatters.shortDate(expense.createdAt))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                ContentCard(spacing: 10) {
                    Text("Split")
                        .font(.headline)
                    Text(expense.splitMethod.displayName)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    ForEach(expense.shares) { share in
                        HStack {
                            Text(model.peopleMap[share.personId] ?? share.personId)
                            Spacer()
                            Text(SettleEaseFormatters.currency(share.amount))
                                .monospacedDigit()
                        }
                        .font(.subheadline)
                        .padding(.vertical, 4)
                    }
                }
            }
            .padding(16)
            .padding(.bottom, 80)
        }
        .navigationTitle("Expense")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
        .settleScreenChrome()
    }
}
#endif
