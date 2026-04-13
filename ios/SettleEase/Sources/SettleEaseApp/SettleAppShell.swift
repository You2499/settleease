#if os(iOS)
import SwiftUI
import SettleEaseCore

struct SettleAppShell: View {
    @Environment(AppModel.self) private var model
    @State private var activeView: ActiveView = .dashboard
    @State private var isMenuPresented = false

    var body: some View {
        @Bindable var model = model

        VStack(spacing: 0) {
            appHeader

            ZStack {
                SettleTheme.page.ignoresSafeArea()

                currentScreen(selectedAddMode: $model.selectedAddMode)
                    .id(activeView.rawValue)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            BottomNavBar(activeView: activeView) { item in
                switch item {
                case .menu:
                    isMenuPresented = true
                case .view(let view):
                    activeView = view
                }
            }
        }
        .background(SettleTheme.page.ignoresSafeArea())
        .sheet(isPresented: $isMenuPresented) {
            AppMenuSheet(
                activeView: activeView,
                selectView: { view in
                    activeView = view
                    isMenuPresented = false
                }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .task {
            await model.refresh()
        }
    }

    private var appHeader: some View {
        HStack(spacing: 10) {
            Image("SettleEaseBrandMark")
                .resizable()
                .scaledToFit()
                .frame(width: 34, height: 34)

            Text("SettleEase")
                .font(.headline.weight(.semibold))
                .foregroundStyle(SettleTheme.primary)

            Spacer()

            if model.state == .loading {
                ProgressView()
                    .controlSize(.small)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .background(SettleTheme.page)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.black.opacity(0.05))
                .frame(height: 0.6)
        }
    }

    @ViewBuilder
    private func currentScreen(selectedAddMode: Binding<AddMode>) -> some View {
        switch activeView {
        case .dashboard:
            DashboardView()
        case .analytics:
            AnalyticsView()
        case .scanReceipt:
            ReceiptScanView()
        case .addExpense:
            AddExpenseView(selectedMode: selectedAddMode)
        case .managePeople:
            PeopleScreen()
        case .manageCategories:
            CategoriesScreen()
        case .manageSettlements:
            SettlementsScreen()
        case .editExpenses:
            EditExpensesScreen()
        case .exportExpense:
            ExportScreen()
        case .settings:
            SettingsView()
        }
    }
}

private enum BottomNavItem: Hashable {
    case view(ActiveView)
    case menu
}

private struct BottomNavBar: View {
    var activeView: ActiveView
    var action: (BottomNavItem) -> Void

    private let items: [(BottomNavItem, String, String)] = [
        (.view(.dashboard), "Home", "rectangle.grid.2x2.fill"),
        (.view(.analytics), "Analytics", "chart.xyaxis.line"),
        (.view(.scanReceipt), "Smart Scan", "viewfinder"),
        (.view(.addExpense), "Add", "creditcard.fill"),
        (.menu, "Menu", "line.3.horizontal")
    ]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                navButton(item: item)
            }
        }
        .padding(.horizontal, 10)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .frame(maxWidth: .infinity)
        .background {
            SettleTheme.page.ignoresSafeArea(edges: .bottom)
        }
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.black.opacity(0.06))
                .frame(height: 0.6)
        }
    }

    private func navButton(item: (BottomNavItem, String, String)) -> some View {
        let isActive = isSelected(item.0)

        return Button {
            action(item.0)
        } label: {
            VStack(spacing: 5) {
                Image(systemName: item.2)
                    .font(.system(size: 22, weight: .semibold))
                    .frame(height: 24)
                Text(item.1)
                    .font(.caption2.weight(.semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.74)
            }
            .foregroundStyle(isActive ? SettleTheme.primary : SettleTheme.warmAccent)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(isActive ? SettleTheme.stone.opacity(0.95) : Color.clear, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(item.1)
    }

    private func isSelected(_ item: BottomNavItem) -> Bool {
        switch item {
        case .view(let view):
            return activeView == view
        case .menu:
            return ![.dashboard, .analytics, .scanReceipt, .addExpense].contains(activeView)
        }
    }
}

private struct AppMenuSheet: View {
    @Environment(AppModel.self) private var model
    var activeView: ActiveView
    var selectView: (ActiveView) -> Void

    private let primaryItems: [(ActiveView, String, String)] = [
        (.managePeople, "People", "person.2.fill"),
        (.manageCategories, "Categories", "list.bullet.rectangle.fill"),
        (.manageSettlements, "Settlements", "handshake.fill"),
        (.editExpenses, "Edit Expenses", "square.and.pencil"),
        (.exportExpense, "Export Expense", "doc.text.fill"),
        (.settings, "Settings", "gearshape.fill")
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    accountCard
                    menuGrid
                    signOutButton
                }
                .padding(16)
            }
            .background(SettleTheme.page.ignoresSafeArea())
            .navigationTitle("Menu")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var accountCard: some View {
        ContentCard(spacing: 8) {
            Label("SettleEase", systemImage: model.isAdmin ? "person.badge.key.fill" : "lock.fill")
                .font(.headline.weight(.semibold))
            Text(model.profile.firstName ?? "Personal device")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(model.profile.role.rawValue.capitalized)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(SettleTheme.stone, in: Capsule())
        }
    }

    private var menuGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            ForEach(primaryItems, id: \.0) { item in
                Button {
                    selectView(item.0)
                } label: {
                    VStack(alignment: .leading, spacing: 10) {
                        Image(systemName: item.2)
                            .font(.headline.weight(.semibold))
                            .frame(width: 32, height: 32)
                            .background(SettleTheme.stone, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                        Text(item.1)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, minHeight: 104, alignment: .leading)
                    .padding(14)
                    .background(SettleTheme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(activeView == item.0 ? Color.black.opacity(0.18) : Color.black.opacity(0.07), lineWidth: 0.8)
                    }
                }
                .buttonStyle(.plain)
                .disabled(adminOnly(item.0) && !model.isAdmin)
                .opacity(adminOnly(item.0) && !model.isAdmin ? 0.42 : 1)
            }
        }
    }

    private var signOutButton: some View {
        Button(role: .destructive) {
        } label: {
            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(SettlePillButtonStyle())
    }

    private func adminOnly(_ view: ActiveView) -> Bool {
        view != .dashboard && view != .analytics
    }
}

private struct PeopleScreen: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ShellScrollScreen(title: "Manage People", subtitle: "\(model.people.count) participants") {
            ForEach(model.people) { person in
                MenuRow(title: person.name, subtitle: "Participant", systemImage: "person.fill")
            }
        }
    }
}

private struct CategoriesScreen: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ShellScrollScreen(title: "Manage Categories", subtitle: "\(model.categories.count) categories") {
            ForEach(model.categories) { category in
                MenuRow(title: category.name, subtitle: "Rank \(category.rank ?? 999)", systemImage: category.iconName)
            }
        }
    }
}

private struct SettlementsScreen: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ShellScrollScreen(title: "Settlements", subtitle: "\(model.settlementPayments.count) recorded payments") {
            ForEach(model.settlementPayments) { payment in
                MenuRow(
                    title: "\(model.peopleMap[payment.debtorId] ?? "Someone") paid \(model.peopleMap[payment.creditorId] ?? "someone")",
                    subtitle: SettleEaseFormatters.currency(payment.amountSettled),
                    systemImage: "checkmark.circle.fill"
                )
            }
            ForEach(model.manualOverrides) { override in
                MenuRow(
                    title: "\(model.peopleMap[override.debtorId] ?? "Debtor") to \(model.peopleMap[override.creditorId] ?? "Creditor")",
                    subtitle: override.notes ?? SettleEaseFormatters.currency(override.amount),
                    systemImage: "arrow.trianglehead.swap"
                )
            }
        }
    }
}

private struct EditExpensesScreen: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ShellScrollScreen(title: "Edit Expenses", subtitle: "\(model.expenses.count) expenses") {
            ForEach(model.expenses) { expense in
                MenuRow(
                    title: expense.description,
                    subtitle: "\(expense.category) · \(SettleEaseFormatters.currency(expense.totalAmount))",
                    systemImage: model.categories.first { $0.name == expense.category }?.iconName ?? "receipt.fill"
                )
            }
        }
    }
}

private struct ExportScreen: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ShellScrollScreen(title: "Export Expense", subtitle: "Personal report preview") {
            MenuRow(title: "Activity Feed", subtitle: "\(model.expenses.count + model.settlementPayments.count) rows", systemImage: "doc.text.fill")
            MenuRow(title: "Settlement Transactions", subtitle: "\(model.simplifiedTransactions.count) simplified payments", systemImage: "arrow.left.arrow.right")
            MenuRow(title: "Data Quality", subtitle: "Ready for report generation", systemImage: "checkmark.seal.fill")
        }
    }
}

private struct ShellScrollScreen<Content: View>: View {
    var title: String
    var subtitle: String
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.title3.weight(.semibold))
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                ContentCard(spacing: 8) {
                    content
                }
            }
            .padding(16)
            .padding(.bottom, 112)
        }
        .scrollIndicators(.hidden)
        .background(SettleTheme.page)
    }
}

private struct MenuRow: View {
    var title: String
    var subtitle: String
    var systemImage: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.subheadline.weight(.semibold))
                .frame(width: 34, height: 34)
                .background(SettleTheme.stone, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
        }
        .padding(.vertical, 5)
    }
}
#endif
