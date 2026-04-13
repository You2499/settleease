#if os(iOS)
import SwiftUI
import SettleEaseServices

public struct SettleEaseRoot: View {
    @State private var store = DashboardStore.live()

    public init() {}

    public var body: some View {
        DashboardRootView()
            .environment(store)
            .background(SettleTheme.page.ignoresSafeArea())
            .tint(SettleTheme.primary)
            .task {
                store.start()
            }
            .onOpenURL { url in
                store.handleOpenURL(url)
            }
    }
}
#endif
