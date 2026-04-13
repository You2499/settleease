#if os(iOS)
import SwiftUI

struct AuthView: View {
    @Environment(DashboardStore.self) private var store
    @FocusState private var focusedField: Field?

    private enum Field {
        case email
        case password
    }

    var body: some View {
        @Bindable var store = store

        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Spacer(minLength: 42)

                HStack(spacing: 10) {
                    Image("SettleEaseBrandMark")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 42, height: 42)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("SettleEase")
                            .font(.title2.weight(.semibold))
                        Text("Live balances from your real group.")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(SettleTheme.warmAccent)
                    }
                }

                WebBetaCard {
                    VStack(alignment: .leading, spacing: 16) {
                        WebSectionHeader(
                            title: "Sign in",
                            subtitle: "Use the same account as the website.",
                            systemImage: "person.crop.circle.badge.checkmark"
                        )

                        VStack(spacing: 10) {
                            TextField("Email", text: $store.email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .focused($focusedField, equals: .email)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .password }
                                .settleTextField()

                            SecureField("Password", text: $store.password)
                                .textContentType(.password)
                                .focused($focusedField, equals: .password)
                                .submitLabel(.go)
                                .onSubmit {
                                    Task { await store.signInWithPassword() }
                                }
                                .settleTextField()
                        }

                        if let authError = store.authError {
                            ErrorBanner(message: authError)
                                .transition(.opacity)
                        }

                        Button {
                            Task { await store.signInWithPassword() }
                        } label: {
                            if store.phase == .authenticating {
                                ProgressView()
                                    .tint(.white)
                                    .frame(maxWidth: .infinity)
                            } else {
                                Text("Continue")
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        .buttonStyle(WebPillButtonStyle(kind: .primary))

                        Button {
                            Task { await store.signInWithGoogle() }
                        } label: {
                            Label("Continue with Google", systemImage: "globe")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(WebPillButtonStyle(kind: .secondary))
                    }
                }

                Text("This build is dashboard-only and uses real Supabase + Convex data. If setup is missing, it will stop and tell you instead of opening sample data.")
                    .font(.caption)
                    .foregroundStyle(SettleTheme.mutedText)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: 42)
            }
            .padding(.horizontal, 20)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(SettleTheme.page.ignoresSafeArea())
    }
}

private extension View {
    func settleTextField() -> some View {
        self
            .font(.subheadline.weight(.medium))
            .textFieldStyle(.plain)
            .padding(.horizontal, 13)
            .padding(.vertical, 12)
            .background(SettleTheme.stone.opacity(0.75), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(Color.black.opacity(0.07), lineWidth: 0.7)
            }
    }
}
#endif
