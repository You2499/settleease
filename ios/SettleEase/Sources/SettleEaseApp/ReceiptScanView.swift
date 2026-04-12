#if os(iOS)
import SwiftUI
import SettleEaseCore

struct ReceiptScanView: View {
    @Environment(AppModel.self) private var model
    @State private var step: Step = .capture
    @State private var parsedReceipt: ParsedReceiptData?
    @State private var progress = 0.0

    enum Step: String, CaseIterable {
        case capture = "Capture"
        case read = "Read"
        case split = "Split"
        case save = "Save"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                stepRail

                ZStack(alignment: .bottom) {
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .fill(Color(uiColor: .secondarySystemBackground))
                        .frame(height: 280)
                        .overlay {
                            VStack(spacing: 12) {
                                Image(systemName: "receipt.fill")
                                    .font(.system(size: 64, weight: .bold))
                                    .foregroundStyle(.secondary)
                                Text("Receipt preview")
                                    .font(.headline)
                                    .foregroundStyle(.secondary)
                            }
                        }

                    SettleGlassActionGroup {
                        SettleGlassToolbarButton(title: "Camera", systemImage: "camera.fill") {
                            startSampleScan()
                        }
                        SettleGlassToolbarButton(title: "Photo", systemImage: "photo.fill") {
                            startSampleScan()
                        }
                    }
                    .padding(.bottom, 14)
                }

                if step == .read {
                    ContentCard {
                        Text("Reading receipt")
                            .font(.headline)
                        ProgressView(value: progress)
                            .animation(.settleEaseState, value: progress)
                        Text("Extracting items, taxes, and final total.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                if let parsedReceipt {
                    parsedReceiptView(parsedReceipt)
                }
            }
            .padding(16)
        }
        .navigationTitle("Receipt Scan")
    }

    private var stepRail: some View {
        HStack(spacing: 8) {
            ForEach(Step.allCases, id: \.rawValue) { item in
                VStack(spacing: 6) {
                    Circle()
                        .fill(stepIndex(item) <= stepIndex(step) ? Color.green : Color.secondary.opacity(0.25))
                        .frame(width: 10, height: 10)
                    Text(item.rawValue)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(step == item ? .primary : .secondary)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(12)
        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func parsedReceiptView(_ receipt: ParsedReceiptData) -> some View {
        ContentCard {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(receipt.restaurantName ?? "Parsed receipt")
                        .font(.title2.bold())
                    Text("\(receipt.items.count) items · \(receipt.currency)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                AnimatedMoneyText(value: receipt.totalAmount, style: .title3.bold())
            }

            ForEach(receipt.items) { item in
                HStack {
                    Text(item.name)
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Text(SettleEaseFormatters.currency(item.totalPrice))
                        .font(.subheadline.weight(.bold))
                        .monospacedDigit()
                }
                .padding(.vertical, 6)
            }

            Button {
                saveReceipt(receipt)
            } label: {
                Label("Save as Itemwise Expense", systemImage: "checkmark.circle.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .clipShape(Capsule())
            .disabled(!model.isAdmin)
        }
    }

    private func startSampleScan() {
        step = .read
        progress = 0.18
        Task {
            try? await Task.sleep(nanoseconds: 260_000_000)
            progress = 0.52
            try? await Task.sleep(nanoseconds: 260_000_000)
            progress = 0.9
            parsedReceipt = await model.scanSampleReceipt()
            progress = 1
            step = .split
        }
    }

    private func saveReceipt(_ receipt: ParsedReceiptData) {
        guard let payer = model.people.first else { return }
        let peopleIds = model.people.map(\.id)
        let items = receipt.items.map {
            ExpenseItem(
                id: UUID().uuidString,
                name: $0.name,
                price: $0.totalPrice,
                sharedBy: peopleIds,
                categoryName: categoryName(for: $0.categoryHint)
            )
        }
        let shares = peopleIds.map { id in
            PayerShare(personId: id, amount: receipt.totalAmount / Double(max(peopleIds.count, 1)))
        }
        let expense = Expense(
            id: UUID().uuidString,
            description: receipt.restaurantName ?? "Scanned receipt",
            totalAmount: receipt.totalAmount,
            category: categoryName(for: receipt.items.first?.categoryHint ?? "food"),
            paidBy: [PayerShare(personId: payer.id, amount: receipt.totalAmount)],
            splitMethod: .itemwise,
            shares: shares,
            items: items,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
        Task {
            await model.saveExpense(expense)
            step = .save
        }
    }

    private func categoryName(for hint: String) -> String {
        let lower = hint.lowercased()
        return model.categories.first { $0.name.lowercased().contains(lower) }?.name
            ?? model.categories.first?.name
            ?? "Food"
    }

    private func stepIndex(_ value: Step) -> Int {
        Step.allCases.firstIndex(of: value) ?? 0
    }
}
#endif
