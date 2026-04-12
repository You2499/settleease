#if os(iOS)
import SwiftUI

struct SettingsView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model

        List {
            Section("Account") {
                LabeledContent("Signed in as", value: model.profile.firstName ?? "Personal device")
                LabeledContent("Role", value: model.profile.role.rawValue.capitalized)
            }

            Section("Experience") {
                Toggle("Haptics", isOn: $model.hapticsEnabled)
                Toggle("Preview reduced motion", isOn: $model.reduceMotionPreview)
                LabeledContent("Appearance", value: model.profile.themePreference ?? "System")
            }

            Section("Diagnostics") {
                LabeledContent("People", value: "\(model.people.count)")
                LabeledContent("Expenses", value: "\(model.expenses.count)")
                LabeledContent("Payments", value: "\(model.settlementPayments.count)")
                LabeledContent("Overrides", value: "\(model.manualOverrides.filter(\.isActive).count)")
            }

            Section {
                Button(role: .destructive) {
                } label: {
                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
        }
        .navigationTitle("Settings")
    }
}
#endif
