import Foundation

public struct AppConfiguration: Equatable, Sendable {
    public var supabaseURL: URL
    public var supabaseAnonKey: String
    public var convexURL: URL
    public var webBaseURL: URL
    public var oauthRedirectURL: URL
    public var useSampleData: Bool

    public init(
        supabaseURL: URL,
        supabaseAnonKey: String,
        convexURL: URL,
        webBaseURL: URL,
        oauthRedirectURL: URL,
        useSampleData: Bool = false
    ) {
        self.supabaseURL = supabaseURL
        self.supabaseAnonKey = supabaseAnonKey
        self.convexURL = convexURL
        self.webBaseURL = webBaseURL
        self.oauthRedirectURL = oauthRedirectURL
        self.useSampleData = useSampleData
    }

    public static let sample = AppConfiguration(
        supabaseURL: URL(string: "https://example.supabase.co")!,
        supabaseAnonKey: "replace-with-supabase-anon-key",
        convexURL: URL(string: "https://example.convex.cloud")!,
        webBaseURL: URL(string: "https://settleease-navy.vercel.app")!,
        oauthRedirectURL: URL(string: "settleease://auth-callback")!,
        useSampleData: true
    )

    public static func live(
        bundle: Bundle = .main,
        environment: [String: String] = ProcessInfo.processInfo.environment
    ) throws -> AppConfiguration {
        AppConfiguration(
            supabaseURL: try requiredURL("SETTLEEASE_SUPABASE_URL", bundle: bundle, environment: environment),
            supabaseAnonKey: try requiredString("SETTLEEASE_SUPABASE_ANON_KEY", bundle: bundle, environment: environment),
            convexURL: try requiredURL("SETTLEEASE_CONVEX_URL", bundle: bundle, environment: environment),
            webBaseURL: optionalURL("SETTLEEASE_WEB_BASE_URL", bundle: bundle, environment: environment)
                ?? URL(string: "https://settleease-navy.vercel.app")!,
            oauthRedirectURL: optionalURL("SETTLEEASE_OAUTH_REDIRECT_URL", bundle: bundle, environment: environment)
                ?? URL(string: "settleease://auth-callback")!,
            useSampleData: false
        )
    }

    private static func requiredString(
        _ key: String,
        bundle: Bundle,
        environment: [String: String]
    ) throws -> String {
        guard let value = optionalString(key, bundle: bundle, environment: environment) else {
            throw AppConfigurationError.missing(key)
        }
        return value
    }

    private static func requiredURL(
        _ key: String,
        bundle: Bundle,
        environment: [String: String]
    ) throws -> URL {
        guard let value = optionalURL(key, bundle: bundle, environment: environment) else {
            throw AppConfigurationError.missing(key)
        }
        return value
    }

    private static func optionalURL(
        _ key: String,
        bundle: Bundle,
        environment: [String: String]
    ) -> URL? {
        optionalString(key, bundle: bundle, environment: environment).flatMap(URL.init(string:))
    }

    private static func optionalString(
        _ key: String,
        bundle: Bundle,
        environment: [String: String]
    ) -> String? {
        let raw = environment[key] ?? bundle.object(forInfoDictionaryKey: key) as? String
        let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !trimmed.isEmpty, !trimmed.hasPrefix("$("), !trimmed.hasPrefix("YOUR_") else {
            return nil
        }
        return trimmed
    }
}

public enum AppConfigurationError: LocalizedError, Equatable, Sendable {
    case missing(String)

    public var errorDescription: String? {
        switch self {
        case .missing(let key):
            "Missing iOS backend config: \(key). Add it to Xcode build settings, environment, or XcodeApp/Secrets.xcconfig for this personal build."
        }
    }
}
