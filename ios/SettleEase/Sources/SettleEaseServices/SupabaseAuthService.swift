import Auth
import Foundation
import Supabase

public struct SupabaseSession: Codable, Equatable, Sendable {
    public var accessToken: String
    public var refreshToken: String?
    public var userId: String?
    public var email: String?
    public var expiresAt: Date?

    public init(
        accessToken: String,
        refreshToken: String? = nil,
        userId: String? = nil,
        email: String? = nil,
        expiresAt: Date? = nil
    ) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.userId = userId
        self.email = email
        self.expiresAt = expiresAt
    }
}

public protocol SupabaseAuthenticating: Sendable {
    func restoreSession() async throws -> SupabaseSession?
    func currentValidSession() async throws -> SupabaseSession
    func signIn(email: String, password: String) async throws -> SupabaseSession
    @MainActor func signInWithGoogle() async throws -> SupabaseSession
    func handleOAuthCallback(_ url: URL) async throws -> SupabaseSession?
    func signOut() async throws
}

public actor SupabaseSessionManager: SupabaseAuthenticating {
    private let configuration: AppConfiguration
    private let client: SupabaseClient

    public init(configuration: AppConfiguration) {
        self.configuration = configuration
        self.client = SupabaseClient(
            supabaseURL: configuration.supabaseURL,
            supabaseKey: configuration.supabaseAnonKey,
            options: SupabaseClientOptions(
                auth: .init(
                    redirectToURL: configuration.oauthRedirectURL,
                    flowType: .pkce,
                    autoRefreshToken: true,
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
    }

    public func restoreSession() async throws -> SupabaseSession? {
        if let current = client.auth.currentSession {
            await client.auth.startAutoRefresh()
            if current.isExpired {
                let refreshed = try await client.auth.refreshSession()
                return convert(refreshed)
            }
            return convert(current)
        }

        do {
            let session = try await client.auth.session
            await client.auth.startAutoRefresh()
            return convert(session)
        } catch {
            return nil
        }
    }

    public func currentValidSession() async throws -> SupabaseSession {
        let session = try await client.auth.session
        await client.auth.startAutoRefresh()
        return convert(session)
    }

    public func signIn(email: String, password: String) async throws -> SupabaseSession {
        let session = try await client.auth.signIn(email: email, password: password)
        await client.auth.startAutoRefresh()
        return convert(session)
    }

    @MainActor
    public func signInWithGoogle() async throws -> SupabaseSession {
        let session = try await client.auth.signInWithOAuth(
            provider: .google,
            redirectTo: configuration.oauthRedirectURL
        )
        await client.auth.startAutoRefresh()
        return convert(session)
    }

    public func handleOAuthCallback(_ url: URL) async throws -> SupabaseSession? {
        guard url.scheme == configuration.oauthRedirectURL.scheme else {
            return nil
        }
        let session = try await client.auth.session(from: url)
        await client.auth.startAutoRefresh()
        return convert(session)
    }

    public func signOut() async throws {
        try await client.auth.signOut()
        await client.auth.stopAutoRefresh()
    }

    private nonisolated func convert(_ session: Session) -> SupabaseSession {
        SupabaseSession(
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            userId: session.user.id.uuidString.lowercased(),
            email: session.user.email,
            expiresAt: Date(timeIntervalSince1970: session.expiresAt)
        )
    }
}

public actor SampleAuthService: SupabaseAuthenticating {
    private var session: SupabaseSession? = SupabaseSession(
        accessToken: "sample-access-token",
        refreshToken: "sample-refresh-token",
        userId: "sample-user",
        email: "you@example.com"
    )

    public init() {}

    public func restoreSession() async throws -> SupabaseSession? {
        session
    }

    public func currentValidSession() async throws -> SupabaseSession {
        if let session {
            return session
        }
        throw AuthRuntimeError.noSession
    }

    public func signIn(email: String, password: String) async throws -> SupabaseSession {
        let session = SupabaseSession(accessToken: "sample-access-token", userId: "sample-user", email: email)
        self.session = session
        return session
    }

    @MainActor
    public func signInWithGoogle() async throws -> SupabaseSession {
        SupabaseSession(accessToken: "sample-access-token", userId: "sample-user", email: "you@example.com")
    }

    public func handleOAuthCallback(_ url: URL) async throws -> SupabaseSession? {
        session
    }

    public func signOut() async throws {
        session = nil
    }
}

public enum AuthRuntimeError: LocalizedError, Equatable, Sendable {
    case noSession

    public var errorDescription: String? {
        switch self {
        case .noSession:
            "No active Supabase session."
        }
    }
}
