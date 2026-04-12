#if os(iOS)
import SwiftUI
import SettleEaseCore

struct DashboardView: View {
    @Environment(AppModel.self) private var model
    @Namespace private var glassNamespace

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                header

                if case .failed(let message) = model.state {
                    ErrorBanner(message: message)
                }

                metricsGrid
                    .settleEntrance(delay: 0.04)

                if model.metrics.activeOverrideCount > 0 {
                    manualOverrideAlert
                        .settleEntrance(delay: 0.08)
                }

                settlementSection
                    .settleEntrance(delay: 0.12)

                expenseFeed
                    .settleEntrance(delay: 0.16)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 18)
        }
        .background(.background)
        .navigationTitle("SettleEase")
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                SettleGlassActionGroup {
                    SettleGlassToolbarButton(title: "Summarize", systemImage: "sparkles") {}
                    SettleGlassToolbarButton(title: "Filter", systemImage: "line.3.horizontal.decrease.circle") {}
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Friends, settled calmly.")
                .font(.largeTitle.bold())
                .fixedSize(horizontal: false, vertical: true)

            Text("Track shared spend, record payments, and keep the group balance easy to trust.")
                .font(.body)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var metricsGrid: some View {
        let metrics = model.metrics
        return Grid(horizontalSpacing: 12, verticalSpacing: 12) {
            GridRow {
                MetricCard(title: "Total spend", value: metrics.totalSpend, footnote: "\(metrics.expenseCount) expenses", symbol: "indianrupeesign.circle.fill", tint: .green)
                MetricCard(title: "Outstanding", value: metrics.outstanding, footnote: "Needs attention", symbol: "arrow.left.arrow.right.circle.fill", tint: .orange)
            }
            GridRow {
                MetricCard(title: "Settled", value: metrics.settled, footnote: "\(Int(metrics.settlementProgress * 100))% progress", symbol: "checkmark.circle.fill", tint: .blue)
                MetricCard(title: "Overrides", value: Double(metrics.activeOverrideCount), footnote: "Manual paths", symbol: "point.topleft.down.curvedto.point.bottomright.up.fill", tint: .purple)
            }
        }
    }

    private var manualOverrideAlert: some View {
        ContentCard {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "hand.raised.fill")
                    .foregroundStyle(.orange)
                    .font(.title3.bold())
                VStack(alignment: .leading, spacing: 4) {
                    Text("Manual settlement path active")
                        .font(.headline)
                    Text("Optimized payments are respecting your preferred route.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var settlementSection: some View {
        ContentCard {
            HStack {
                Text("Next payments")
                    .font(.title2.bold())
                Spacer()
                Text("\(model.simplifiedTransactions.count)")
                    .font(.headline)
                    .monospacedDigit()
                    .contentTransition(.numericText())
            }

            if model.simplifiedTransactions.isEmpty {
                EmptyState(title: "All clear", message: "No outstanding settlement payments right now.", symbol: "checkmark.seal.fill")
            } else {
                ForEach(model.simplifiedTransactions.prefix(4)) { transaction in
                    TransactionRow(transaction: transaction)
                }
            }
        }
    }

    private var expenseFeed: some View {
        ContentCard {
            Text("Activity feed")
                .font(.title2.bold())

            ForEach(model.expenses.prefix(8)) { expense in
                ExpenseRow(expense: expense)
            }
        }
    }
}

private struct TransactionRow: View {
    @Environment(AppModel.self) private var model
    var transaction: CalculatedTransaction

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(model.peopleMap[transaction.from] ?? "Someone") pays \(model.peopleMap[transaction.to] ?? "someone")")
                    .font(.headline)
                AnimatedMoneyText(value: transaction.amount, style: .subheadline.bold())
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Mark Paid") {
                Task { await model.markPaid(transaction) }
            }
            .buttonStyle(.borderedProminent)
            .disabled(!model.isAdmin)
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
    }
}

private struct ExpenseRow: View {
    @Environment(AppModel.self) private var model
    var expense: Expense

    var body: some View {
        NavigationLink {
            ExpenseDetailView(expense: expense)
        } label: {
            HStack(spacing: 12) {
                Image(systemName: symbol(for: expense.category))
                    .font(.headline)
                    .foregroundStyle(.blue)
                    .frame(width: 38, height: 38)
                    .background(.blue.opacity(0.12), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text(expense.description)
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text("\(expense.category) · \(SettleEaseFormatters.shortDate(expense.createdAt))")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                AnimatedMoneyText(value: expense.totalAmount, style: .headline.bold())
                    .foregroundStyle(.primary)
            }
            .padding(.vertical, 8)
        }
    }

    private func symbol(for category: String) -> String {
        model.categories.first { $0.name == category }?.iconName ?? "receipt.fill"
    }
}

private struct ExpenseDetailView: View {
    var expense: Expense

    var body: some View {
        List {
            Section("Amount") {
                AnimatedMoneyText(value: expense.totalAmount, style: .largeTitle.bold())
            }
            Section("Split") {
                Text(expense.splitMethod.displayName)
                ForEach(expense.shares) { share in
                    HStack {
                        Text(share.personId)
                        Spacer()
                        Text(SettleEaseFormatters.currency(share.amount))
                            .monospacedDigit()
                    }
                }
            }
        }
        .navigationTitle(expense.description)
    }
}
#endif
