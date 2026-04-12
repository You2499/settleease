import Foundation
import SettleEaseCore

public protocol AIServiceProtocol: Sendable {
    func scanReceipt(imageBase64: String, mimeType: String) async throws -> ParsedReceiptData
    func summarize(jsonData: String, hash: String, promptVersion: Int?) async throws -> StructuredSettlementSummary
}

public struct AIService: AIServiceProtocol {
    private let webBaseURL: URL
    private let httpClient: HTTPClient
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(webBaseURL: URL, httpClient: HTTPClient = URLSessionHTTPClient()) {
        self.webBaseURL = webBaseURL
        self.httpClient = httpClient
    }

    public func scanReceipt(imageBase64: String, mimeType: String) async throws -> ParsedReceiptData {
        let url = webBaseURL.appending(path: "api/scan-receipt")
        let body = try encoder.encode(ScanReceiptRequest(image: imageBase64, mimeType: mimeType))
        let request = HTTPRequest(
            url: url,
            method: "POST",
            headers: ["Content-Type": "application/json", "Accept": "application/json"],
            body: body
        )
        let (data, _) = try await httpClient.data(for: request)
        return try decoder.decode(ParsedReceiptData.self, from: data)
    }

    public func summarize(jsonData: String, hash: String, promptVersion: Int?) async throws -> StructuredSettlementSummary {
        let url = webBaseURL.appending(path: "api/summarize")
        let body = try encoder.encode(SummarizeRequest(jsonData: jsonData, hash: hash, promptVersion: promptVersion))
        let request = HTTPRequest(
            url: url,
            method: "POST",
            headers: ["Content-Type": "application/json", "Accept": "application/json"],
            body: body
        )
        let (data, _) = try await httpClient.data(for: request)
        let response = try decoder.decode(SummarizeResponse.self, from: data)
        return response.summary
    }
}

private struct ScanReceiptRequest: Encodable {
    var image: String
    var mimeType: String
}

private struct SummarizeRequest: Encodable {
    var jsonData: String
    var hash: String
    var promptVersion: Int?
}

private struct SummarizeResponse: Decodable {
    var summary: StructuredSettlementSummary
}

public struct SampleAIService: AIServiceProtocol {
    public init() {}

    public func scanReceipt(imageBase64: String, mimeType: String) async throws -> ParsedReceiptData {
        ParsedReceiptData(
            restaurantName: "Sample Cafe",
            date: "2026-04-12",
            items: [
                .init(name: "Cold coffee", quantity: 1, unitPrice: 220, totalPrice: 220, categoryHint: "drinks"),
                .init(name: "Paneer sandwich", quantity: 1, unitPrice: 340, totalPrice: 340, categoryHint: "food")
            ],
            taxes: [.init(label: "GST", amount: 28)],
            totalAmount: 588,
            currency: "INR"
        )
    }

    public func summarize(jsonData: String, hash: String, promptVersion: Int?) async throws -> StructuredSettlementSummary {
        StructuredSettlementSummary(
            settlementSnapshot: ["Alice is currently the largest creditor.", "Two payments will clear the sample group."],
            paymentActions: ["Bob should settle the next outstanding payment.", "Charlie has one manual path active."],
            spendingMix: ["Food leads the current group spend."],
            balancePressure: ["Outstanding balances are concentrated around dinner and travel."],
            dataQuality: ["No material data-quality issues in the sample data."],
            nextBestActions: ["Record the next payment once it is made.", "Review manual overrides after settlement."]
        )
    }
}
