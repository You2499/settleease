#if os(iOS)
import SwiftUI
import SettleEaseCore

struct RootView: View {
    var body: some View {
        NavigationStack {
            SettleAppShell()
                .toolbar(.hidden, for: .navigationBar)
        }
        .background(SettleTheme.page.ignoresSafeArea())
        .tint(SettleTheme.primary)
    }
}
#endif
