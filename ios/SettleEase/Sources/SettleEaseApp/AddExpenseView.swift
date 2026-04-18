#if os(iOS)
import SwiftUI
import SettleEaseCore

struct AddExpenseView: View {
    @Environment(AppModel.self) private var model
    @Binding var selectedMode: AddMode

    var body: some View {
        VStack(spacing: 0) {
            Picker("Add mode", selection: $selectedMode) {
                ForEach(AddMode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 8)

            if selectedMode == .manual {
                ManualExpenseForm()
            } else {
                ReceiptScanView()
            }
        }
        .navigationTitle("Add")
        .navigationBarTitleDisplayMode(.inline)
        .settleScreenChrome()
    }
}

private struct ManualExpenseForm: View {
    @Environment(AppModel.self) private var model
    @State private var description = ""
    @State private var amount = ""
    @State private var category = "Food"
    @State private var payerId = ""
    @State private var splitMethod: SplitMethod = .equal
    @State private var expenseDate = Date()
    @State private var includeEveryone = true
    @State private var validationMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let validationMessage {
                    ErrorBanner(message: validationMessage)
                }

                ConcentricFormSection(title: "Basics") {
                    TextField("Dinner, cab, groceries", text: $description)
                        .textInputAutocapitalization(.words)
                    TextField("Amount", text: $amount)
                        .keyboardType(.decimalPad)
                    Picker("Category", selection: $category) {
                        ForEach(model.categories) { category in
                            Label(category.name, systemImage: SettleIcon.symbol(for: category.iconName))
                                .tag(category.name)
                        }
                    }
                    DatePicker("Date", selection: $expenseDate, displayedComponents: .date)
                }

                ConcentricFormSection(title: "Payment") {
                    Picker("Paid by", selection: $payerId) {
                        Text("Choose").tag("")
                        ForEach(model.people) { person in
                            Text(person.name).tag(person.id)
                        }
                    }

                    Toggle("Split with everyone", isOn: $includeEveryone)

                    Picker("Split method", selection: $splitMethod) {
                        ForEach(SplitMethod.allCases, id: \.self) { method in
                            Text(method.displayName).tag(method)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                ConcentricFormSection(title: "Fine tune") {
                    Text("Exact rupee amounts stay in text fields. Slider-style tuning can be added here for percentage-based sharing without compromising precision.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Button {
                    save()
                } label: {
                    Label("Save Expense", systemImage: "checkmark.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SettlePillButtonStyle(prominent: true))
                .disabled(!model.isAdmin)
            }
            .padding(16)
            .padding(.bottom, 96)
        }
        .onAppear {
            category = model.categories.first?.name ?? "Food"
            payerId = model.people.first?.id ?? ""
        }
    }

    private func save() {
        guard model.isAdmin else {
            validationMessage = "You need admin access to save expenses."
            return
        }
        guard !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            validationMessage = "Add a short description."
            return
        }
        guard let amountValue = Double(amount), amountValue > 0 else {
            validationMessage = "Enter a valid amount."
            return
        }
        guard !payerId.isEmpty else {
            validationMessage = "Choose who paid."
            return
        }

        let participantIds = includeEveryone ? model.people.map(\.id) : [payerId]
        let shareAmount = amountValue / Double(max(participantIds.count, 1))
        let shares = participantIds.map { PayerShare(personId: $0, amount: shareAmount) }
        let expense = Expense(
            id: UUID().uuidString,
            description: description,
            totalAmount: amountValue,
            category: category,
            paidBy: [PayerShare(personId: payerId, amount: amountValue)],
            splitMethod: splitMethod,
            shares: shares,
            createdAt: ISO8601DateFormatter().string(from: expenseDate)
        )

        validationMessage = nil
        Task {
            await model.saveExpense(expense)
            description = ""
            amount = ""
        }
    }
}
#endif
