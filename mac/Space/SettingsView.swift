import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var store: Store
    @State private var notionToken = Keychain.lire("notionToken")
    @State private var notionBase = Keychain.lire("notionBase")
    @State private var claudeKey = Keychain.lire("claudeKey")
    @State private var enregistre = false

    var body: some View {
        Form {
            Section {
                SecureField("Secret de l'intégration", text: $notionToken)
                TextField("Lien ou ID de la base", text: $notionBase)
            } header: { Text("Notion") } footer: {
                Text("notion.so/my-integrations → nouvelle intégration, puis connecte-la à ta base (⋯ → Connexions).")
                    .foregroundStyle(.secondary)
            }
            Section {
                SecureField("Clé API (facultatif)", text: $claudeKey)
            } header: { Text("Claude") } footer: {
                Text("Sans clé, tu choisis toi-même la catégorie ; les notes sans catégorie vont dans « À trier ».")
                    .foregroundStyle(.secondary)
            }
            HStack {
                Spacer()
                if enregistre { Text("Enregistré ✓").foregroundStyle(.secondary) }
                Button("Enregistrer") {
                    Keychain.ecrire("notionToken", notionToken.trimmingCharacters(in: .whitespacesAndNewlines))
                    notionBase = Notion.extraireID(notionBase)
                    Keychain.ecrire("notionBase", notionBase)
                    Keychain.ecrire("claudeKey", claudeKey.trimmingCharacters(in: .whitespacesAndNewlines))
                    enregistre = true
                    Task { await store.rafraichir() }
                }
                .keyboardShortcut(.defaultAction)
            }
        }
        .formStyle(.grouped)
        .frame(width: 460)
    }
}
