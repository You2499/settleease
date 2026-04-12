import Foundation
import SettleEaseCore

public enum JSONValue: Equatable, Sendable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case array([JSONValue])
    case object([String: JSONValue])
    case null
}

extension PayerShare {
    var jsonValue: JSONValue {
        .object([
            "personId": .string(personId),
            "amount": .number(amount)
        ])
    }
}

extension ExpenseItem {
    var jsonValue: JSONValue {
        .object([
            "id": .string(id),
            "name": .string(name),
            "price": .number(price),
            "sharedBy": .array(sharedBy.map(JSONValue.string)),
            "categoryName": categoryName.map(JSONValue.string) ?? .null
        ])
    }
}

extension CelebrationContribution {
    var jsonValue: JSONValue {
        .object([
            "personId": .string(personId),
            "amount": .number(amount)
        ])
    }
}

extension Expense {
    public var convexMutationPayload: [String: JSONValue] {
        [
            "id": .string(id),
            "description": .string(description),
            "totalAmount": .number(totalAmount),
            "category": .string(category),
            "paidBy": .array(paidBy.map(\.jsonValue)),
            "splitMethod": .string(splitMethod.rawValue),
            "shares": .array(shares.map(\.jsonValue)),
            "items": items.map { .array($0.map(\.jsonValue)) } ?? .null,
            "celebrationContribution": celebrationContribution.map(\.jsonValue) ?? .null,
            "excludeFromSettlement": .bool(excludeFromSettlement),
            "createdAt": createdAt.map(JSONValue.string) ?? .null
        ]
    }
}

extension SettlementPayment {
    public var convexMutationPayload: [String: JSONValue] {
        [
            "debtorId": .string(debtorId),
            "creditorId": .string(creditorId),
            "amountSettled": .number(amountSettled),
            "markedByUserId": .string(markedByUserId),
            "settledAt": .string(settledAt),
            "notes": notes.map(JSONValue.string) ?? .null
        ]
    }
}
