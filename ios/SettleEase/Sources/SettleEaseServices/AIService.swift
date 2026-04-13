import Foundation
import SettleEaseCore

public protocol AIServiceProtocol: Sendable {
    func scanReceipt(imageBase64: String, mimeType: String) async throws -> ParsedReceiptData
    func summarize(jsonData: String, hash: String, promptVersion: Int?) async throws -> StructuredSettlementSummary
    func summarize(jsonData: SettleJSONValue, hash: String, promptVersion: Int?, modelCode: String?) async throws -> AISummaryResult
}

public struct AISummaryResult: Codable, Equatable, Sendable {
    public var summary: StructuredSettlementSummary
    public var hash: String?
    public var model: String?
    public var modelDisplayName: String?
    public var promptVersion: Int?

    public init(
        summary: StructuredSettlementSummary,
        hash: String? = nil,
        model: String? = nil,
        modelDisplayName: String? = nil,
        promptVersion: Int? = nil
    ) {
        self.summary = summary
        self.hash = hash
        self.model = model
        self.modelDisplayName = modelDisplayName
        self.promptVersion = promptVersion
    }
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

    public func summarize(
        jsonData: SettleJSONValue,
        hash: String,
        promptVersion: Int?,
        modelCode: String?
    ) async throws -> AISummaryResult {
        let url = webBaseURL.appending(path: "api/summarize")
        let body = try encoder.encode(SummarizeJSONRequest(
            jsonData: jsonData,
            hash: hash,
            promptVersion: promptVersion,
            modelCode: modelCode
        ))
        let request = HTTPRequest(
            url: url,
            method: "POST",
            headers: ["Content-Type": "application/json", "Accept": "application/json"],
            body: body
        )
        let (data, _) = try await httpClient.data(for: request)
        return try decoder.decode(AISummaryResult.self, from: data)
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

private struct SummarizeJSONRequest: Encodable {
    var jsonData: SettleJSONValue
    var hash: String
    var promptVersion: Int?
    var modelCode: String?
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
            keyNumbers: ["Included spend is ₹6,080.", "Remaining settlement is ₹1,200."],
            whoShouldReceiveMoney: ["Alice should receive the largest amount."],
            whoShouldPay: ["Bob and Charlie have open balances."],
            recommendedSettlementActions: ["Bob should settle the next outstanding payment.", "Charlie has one manual path active."],
            spendingDrivers: ["Food leads the current group spend."],
            manualOverridesAndExceptions: ["One manual route is active."],
            dataQuality: ["No material data-quality issues in the sample data."],
            nextBestActions: ["Record the next payment once it is made.", "Review manual overrides after settlement."]
        )
    }

    public func summarize(
        jsonData: SettleJSONValue,
        hash: String,
        promptVersion: Int?,
        modelCode: String?
    ) async throws -> AISummaryResult {
        AISummaryResult(
            summary: try await summarize(jsonData: "", hash: hash, promptVersion: promptVersion),
            hash: hash,
            model: modelCode,
            modelDisplayName: modelCode
        )
    }
}
