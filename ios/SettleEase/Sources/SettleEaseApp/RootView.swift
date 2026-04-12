#if os(iOS)
import SwiftUI
import SettleEaseCore

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model

        TabView {
            NavigationStack {
                DashboardView()
            }
            .tabItem { Label("Dashboard", systemImage: "house.fill") }

            NavigationStack {
                AnalyticsView()
            }
            .tabItem { Label("Analytics", systemImage: "chart.xyaxis.line") }

            NavigationStack {
                AddExpenseView(selectedMode: $model.selectedAddMode)
            }
            .tabItem { Label("Add", systemImage: "plus.circle.fill") }

            NavigationStack {
                ManageView()
            }
            .tabItem { Label("Manage", systemImage: "person.3.fill") }

            NavigationStack {
                SettingsView()
            }
            .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        }
        .task {
            await model.refresh()
        }
        .modifier(TabBarBehavior())
    }
}

private struct TabBarBehavior: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .tabBarMinimizeBehavior(.onScrollDown)
        } else {
            content
        }
    }
}
#endif
