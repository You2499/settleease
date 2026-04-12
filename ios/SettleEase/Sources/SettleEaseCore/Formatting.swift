import Foundation

public enum SettleEaseFormatters {
    public static func currency(_ value: Double, currencyCode: String = "INR", locale: Locale = Locale(identifier: "en_IN")) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currencyCode
        formatter.locale = locale
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = value.rounded() == value ? 0 : 2
        return formatter.string(from: NSNumber(value: value)) ?? "\(currencyCode) \(String(format: "%.2f", value))"
    }

    public static func compactCurrency(_ value: Double, currencyCode: String = "INR") -> String {
        let absolute = abs(value)
        if absolute >= 100_000 {
            return "\(value < 0 ? "-" : "")\(currency(absolute / 100_000, currencyCode: currencyCode))L"
        }
        if absolute >= 1_000 {
            return "\(value < 0 ? "-" : "")\(currency(absolute / 1_000, currencyCode: currencyCode))K"
        }
        return currency(value, currencyCode: currencyCode)
    }

    public static func percent(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .percent
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "\(Int(value * 100))%"
    }

    public static func shortDate(_ isoString: String?) -> String {
        guard
            let isoString,
            let date = parseISODate(isoString)
        else {
            return "Date unavailable"
        }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_IN")
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    public static func parseISODate(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) {
            return date
        }

        let standard = ISO8601DateFormatter()
        standard.formatOptions = [.withInternetDateTime]
        return standard.date(from: value)
    }
}
