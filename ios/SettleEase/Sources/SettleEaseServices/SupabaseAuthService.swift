import Foundation

public struct SupabaseSession: Codable, Equatable, Sendable {
    public var accessToken: String
    public var refreshToken: String?
    public var userId: String?
    public var email: String?

    public init(accessToken: String, refreshToken: String? = nil, userId: String? = nil, email: String? = nil) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.userId = userId
        self.email = email
    }
}

public protocol SupabaseAuthenticating: Sendable {
    func restoreSession() async throws -> SupabaseSession?
    func signIn(email: String, password: String) async throws -> SupabaseSession
    func signOut() async throws
    func googleOAuthURL(redirectTo: URL) async throws -> URL
}

public actor SupabaseAuthService: SupabaseAuthenticating {
    private let configuration: AppConfiguration
    private let httpClient: HTTPClient
    private var cachedSession: SupabaseSession?

    public init(configuration: AppConfiguration, httpClient: HTTPClient = URLSessionHTTPClient()) {
        self.configuration = configuration
        self.httpClient = httpClient
    }

    public func restoreSession() async throws -> SupabaseSession? {
        cachedSession
    }

    public func signIn(email: String, password: String) async throws -> SupabaseSession {
        let url = configuration.supabaseURL
            .appending(path: "auth/v1/token")
            .appending(queryItems: [URLQueryItem(name: "grant_type", value: "password")])
        let body = try JSONEncoder().encode(PasswordSignInRequest(email: email, password: password))
        let request = HTTPRequest(
            url: url,
            method: "POST",
            headers: [
                "Content-Type": "application/json",
                "apikey": configuration.supabaseAnonKey,
                "Accept": "application/json"
            ],
            body: body
        )
        let (data, _) = try await httpClient.data(for: request)
        let response = try JSONDecoder().decode(SupabasePasswordResponse.self, from: data)
        let session = SupabaseSession(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            userId: response.user?.id,
            email: response.user?.email
        )
        cachedSession = session
        return session
    }

    public func signOut() async throws {
        cachedSession = nil
    }

    public func googleOAuthURL(redirectTo: URL) async throws -> URL {
        configuration.supabaseURL
            .appending(path: "auth/v1/authorize")
            .appending(queryItems: [
                URLQueryItem(name: "provider", value: "google"),
                URLQueryItem(name: "redirect_to", value: redirectTo.absoluteString)
            ])
    }
}

private struct PasswordSignInRequest: Encodable {
    var email: String
    var password: String
}

private struct SupabasePasswordResponse: Decodable {
    struct User: Decodable {
        var id: String?
        var email: String?
    }

    var accessToken: String
    var refreshToken: String?
    var user: User?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
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

    public func signIn(email: String, password: String) async throws -> SupabaseSession {
        let session = SupabaseSession(accessToken: "sample-access-token", userId: "sample-user", email: email)
        self.session = session
        return session
    }

    public func signOut() async throws {
        session = nil
    }

    public func googleOAuthURL(redirectTo: URL) async throws -> URL {
        redirectTo
    }
}
