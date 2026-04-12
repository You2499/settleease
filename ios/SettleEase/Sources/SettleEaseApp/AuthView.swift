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
                    .font(.largeTitle.bold())
                Text("A quiet place for group money to become clear.")
                    .font(.body)
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
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .clipShape(Capsule())

            Button {
            } label: {
                Label("Continue with Google", systemImage: "globe")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.bordered)
            .clipShape(Capsule())

            Spacer()
        }
        .padding(22)
        .background(.background)
    }
}
#endif
