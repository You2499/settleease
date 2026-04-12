#if os(iOS)
import SwiftUI
import SettleEaseServices

public struct SettleEaseRoot: View {
    @State private var model = AppModel.sample()

    public init() {}

    public var body: some View {
        RootView()
            .environment(model)
    }
}
#endif
