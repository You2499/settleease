#if os(iOS)
import SwiftUI

struct AuthView: View {
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            Spacer()

            VStack(alignment: .leading, spacing: 10) {
                Text("SettleEase")
                    .font(.title.weight(.semibold))
                Text("A calm place for group money to become clear.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            ConcentricFormSection(title: "Sign in") {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                SecureField("Password", text: $password)
                    .textContentType(.password)
            }

            Button {
            } label: {
                Text("Continue")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SettlePillButtonStyle(prominent: true))

            Button {
            } label: {
                Label("Continue with Google", systemImage: "globe")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SettlePillButtonStyle())

            Spacer()
        }
        .padding(22)
        .settleScreenChrome()
    }
}
#endif
