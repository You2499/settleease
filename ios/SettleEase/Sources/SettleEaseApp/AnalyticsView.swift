#if os(iOS)
import SwiftUI
import SettleEaseCore
#if canImport(Charts)
import Charts
#endif

struct AnalyticsView: View {
    @Environment(AppModel.self) private var model
    @State private var mode: Mode = .group
    @State private var selectedPersonId: String?

    enum Mode: String, CaseIterable, Identifiable {
        case group = "Group"
        case personal = "Personal"
        var id: String { rawValue }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                filters
                spendingChart
                categoryChart
                participantTable
            }
            .padding(16)
            .padding(.bottom, 96)
        }
        .navigationTitle("Analytics")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: .constant(""), placement: .toolbar, prompt: "Find expenses")
        .settleScreenChrome()
    }

    private var filters: some View {
        HStack {
            Picker("Mode", selection: $mode) {
                ForEach(Mode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 260)
            Spacer()
        }
        .padding(12)
        .background(SettleTheme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.black.opacity(0.08), lineWidth: 0.6)
        }
    }

    private var spendingChart: some View {
        ChartPanel(title: "Monthly spending", subtitle: "Total spend by expense date") {
            #if canImport(Charts)
            Chart(monthlySpend) { point in
                BarMark(
                    x: .value("Month", point.label),
                    y: .value("Spend", point.amount)
                )
            .foregroundStyle(SettleTheme.primary.gradient)
            }
            .chartYAxis {
                AxisMarks { value in
                    AxisGridLine()
                    AxisValueLabel {
                        if let amount = value.as(Double.self) {
                            Text(SettleEaseFormatters.compactCurrency(amount))
                        }
                    }
                }
            }
            .frame(height: 240)
            .animation(.settleEaseState, value: monthlySpend)
            #else
            Text("Swift Charts will render here in the iOS target.")
                .foregroundStyle(.secondary)
            #endif
        }
    }

    private var categoryChart: some View {
        ChartPanel(title: "Category mix", subtitle: "Where the group is spending") {
            #if canImport(Charts)
            Chart(categorySpend) { point in
                SectorMark(
                    angle: .value("Spend", point.amount),
                    innerRadius: .ratio(0.58),
                    angularInset: 1.5
                )
                .foregroundStyle(by: .value("Category", point.label))
            }
            .chartForegroundStyleScale([
                "Food": SettleTheme.primary,
                "Travel": SettleTheme.warmAccent,
                "Stay": SettleTheme.stoneStrong,
                "Fun": SettleTheme.warning
            ])
            .frame(height: 240)
            .animation(.settleEaseState, value: categorySpend)
            #else
            Text("Swift Charts will render here in the iOS target.")
                .foregroundStyle(.secondary)
            #endif
        }
    }

    private var participantTable: some View {
        ContentCard {
            Text("Participants")
                .font(.title3.weight(.semibold))

            ForEach(model.people) { person in
                let balance = SettlementCalculator.netBalances(
                    people: model.people,
                    expenses: model.expenses,
                    settlementPayments: model.settlementPayments
                )[person.id, default: 0]

                HStack {
                    Text(person.name)
                    Spacer()
                    Text(SettleEaseFormatters.currency(balance))
                        .font(.headline)
                        .monospacedDigit()
                        .foregroundStyle(balance >= 0 ? SettleTheme.positive : SettleTheme.warning)
                }
                .padding(.vertical, 6)
            }
        }
    }

    private var monthlySpend: [ChartPoint] {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM"
        let grouped = Dictionary(grouping: model.expenses.filter { !$0.excludeFromSettlement }) { expense in
            guard let iso = expense.createdAt, let date = SettleEaseFormatters.parseISODate(iso) else {
                return "Unknown"
            }
            return formatter.string(from: date)
        }
        return grouped.map { ChartPoint(label: $0.key, amount: $0.value.reduce(0) { $0 + $1.totalAmount }) }
            .sorted { $0.label < $1.label }
    }

    private var categorySpend: [ChartPoint] {
        let grouped = Dictionary(grouping: model.expenses.filter { !$0.excludeFromSettlement }, by: \.category)
        return grouped.map { ChartPoint(label: $0.key, amount: $0.value.reduce(0) { $0 + $1.totalAmount }) }
            .sorted { $0.amount > $1.amount }
    }
}

struct ChartPoint: Identifiable, Equatable {
    var id: String { label }
    var label: String
    var amount: Double
}

struct ChartPanel<Content: View>: View {
    var title: String
    var subtitle: String
    @ViewBuilder var content: Content

    var body: some View {
        ContentCard {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.title3.weight(.semibold))
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            content
        }
    }
}
#endif
