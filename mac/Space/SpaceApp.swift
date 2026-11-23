import AppKit
import SwiftUI

@main
struct SpaceApp: App {
    @StateObject private var store = Store()

    var body: some Scene {
        WindowGroup("Space", id: "main") {
            ContentView()
                .environmentObject(store)
                .frame(minWidth: 520, minHeight: 560)
        }
        .defaultSize(width: 720, height: 760)

        MenuBarExtra {
            MenuView().environmentObject(store)
        } label: {
            Text(store.urgents > 0 ? "🪐 \(store.urgents)" : "🪐")
        }

        Settings {
            SettingsView().environmentObject(store)
        }
    }
}

/// Menu bar: the next deadlines at a glance.
struct MenuView: View {
    @EnvironmentObject var store: Store
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        let prochains = Onglet.avenir.filtre(store.items).prefix(8)
        if prochains.isEmpty { Text("Rien de prévu 🎉") }
        ForEach(prochains) { item in
            let quand = item.joursRestants().flatMap { j in item.date.map { Item.libelle(jours: j, date: $0) } } ?? ""
            Text("\(item.categorie?.label.prefix(2) ?? "📥") \(item.titre) — \(quand)")
        }
        Divider()
        Button("Ouvrir Space") {
            openWindow(id: "main")
            NSApp.activate(ignoringOtherApps: true)
        }
        Button("Rafraîchir") { Task { await store.rafraichir() } }
        SettingsLink { Text("Réglages…") }
        Divider()
        Button("Quitter") { NSApp.terminate(nil) }
    }
}
