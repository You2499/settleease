#if os(iOS)
import SwiftUI
import SettleEaseCore

struct ManageView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        List {
            Section {
                if model.isAdmin {
                    Label("Admin tools are available on this device.", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(.green)
                } else {
                    Label("Read-only mode. Admin actions are disabled.", systemImage: "lock.fill")
                        .foregroundStyle(.secondary)
                }
            }

            Section("People") {
                ForEach(model.people) { person in
                    Label(person.name, systemImage: "person.fill")
                        .contextMenu {
                            Button("Rename") {}
                            Button("Delete", role: .destructive) {}
                        }
                }
            }

            Section("Categories") {
                ForEach(model.categories) { category in
                    Label(category.name, systemImage: category.iconName)
                        .contextMenu {
                            Button("Edit") {}
                            Button("Delete", role: .destructive) {}
                        }
                }
            }

            Section("Manual settlement overrides") {
                ForEach(model.manualOverrides) { override in
                    HStack {
                        VStack(alignment: .leading) {
                            Text("\(model.peopleMap[override.debtorId] ?? "Debtor") to \(model.peopleMap[override.creditorId] ?? "Creditor")")
                                .font(.headline)
                            Text(override.notes ?? "No notes")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(SettleEaseFormatters.currency(override.amount))
                            .font(.headline)
                            .monospacedDigit()
                    }
                }
            }

            Section("Recorded payments") {
                ForEach(model.settlementPayments) { payment in
                    HStack {
                        VStack(alignment: .leading) {
                            Text("\(model.peopleMap[payment.debtorId] ?? "Someone") paid \(model.peopleMap[payment.creditorId] ?? "someone")")
                                .font(.headline)
                            Text(SettleEaseFormatters.shortDate(payment.settledAt))
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(SettleEaseFormatters.currency(payment.amountSettled))
                            .font(.headline)
                            .monospacedDigit()
                    }
                }
            }
        }
        .navigationTitle("Manage")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Add person", systemImage: "person.badge.plus") {}
                    Button("Add category", systemImage: "folder.badge.plus") {}
                    Button("Add override", systemImage: "arrow.trianglehead.swap") {}
                } label: {
                    Image(systemName: "plus")
                }
                .disabled(!model.isAdmin)
            }
        }
    }
}
#endif
