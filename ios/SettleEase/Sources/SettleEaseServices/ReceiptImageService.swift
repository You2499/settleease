import Foundation

public struct PreparedReceiptImage: Equatable, Sendable {
    public var base64: String
    public var mimeType: String
    public var originalByteCount: Int
    public var preparedByteCount: Int

    public init(base64: String, mimeType: String, originalByteCount: Int, preparedByteCount: Int) {
        self.base64 = base64
        self.mimeType = mimeType
        self.originalByteCount = originalByteCount
        self.preparedByteCount = preparedByteCount
    }
}

public protocol ReceiptImagePreparing: Sendable {
    func prepare(data: Data, mimeType: String) async throws -> PreparedReceiptImage
}

public struct ReceiptImageService: ReceiptImagePreparing {
    public init() {}

    public func prepare(data: Data, mimeType: String) async throws -> PreparedReceiptImage {
        PreparedReceiptImage(
            base64: data.base64EncodedString(),
            mimeType: mimeType,
            originalByteCount: data.count,
            preparedByteCount: data.count
        )
    }
}
