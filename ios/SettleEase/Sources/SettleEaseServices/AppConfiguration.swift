import Foundation

public struct AppConfiguration: Equatable, Sendable {
    public var supabaseURL: URL
    public var supabaseAnonKey: String
    public var convexURL: URL
    public var webBaseURL: URL
    public var useSampleData: Bool

    public init(
        supabaseURL: URL,
        supabaseAnonKey: String,
        convexURL: URL,
        webBaseURL: URL,
        useSampleData: Bool = true
    ) {
        self.supabaseURL = supabaseURL
        self.supabaseAnonKey = supabaseAnonKey
        self.convexURL = convexURL
        self.webBaseURL = webBaseURL
        self.useSampleData = useSampleData
    }

    public static let sample = AppConfiguration(
        supabaseURL: URL(string: "https://example.supabase.co")!,
        supabaseAnonKey: "replace-with-supabase-anon-key",
        convexURL: URL(string: "https://example.convex.cloud")!,
        webBaseURL: URL(string: "https://settleease-navy.vercel.app")!,
        useSampleData: true
    )
}
