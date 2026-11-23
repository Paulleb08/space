import Foundation
import WidgetKit

@MainActor
final class Store: ObservableObject {
    @Published var items: [Item] = []
    @Published var statut = ""
    @Published var occupe = false

    var notion: Notion? {
        let token = Keychain.lire("notionToken"), base = Keychain.lire("notionBase")
        return token.isEmpty || base.isEmpty ? nil : Notion(token: token, databaseID: base)
    }

    var claude: Claude? {
        let cle = Keychain.lire("claudeKey")
        return cle.isEmpty ? nil : Claude(apiKey: cle)
    }

    /// Shown in the menu bar: overdue, today and tomorrow.
    var urgents: Int { items.filter { ($0.joursRestants() ?? 99) <= 1 }.count }

    init() {
        Task { [weak self] in
            while let self {
                await self.rafraichir()
                try? await Task.sleep(nanoseconds: 15 * 60 * 1_000_000_000)
            }
        }
    }

    func rafraichir() async {
        guard let notion else { statut = "Renseigne Notion dans Réglages (⌘,)."; return }
        occupe = true
        defer { occupe = false }
        do {
            var liste = try await notion.lister()
            // Notes typed in Notion (e.g. on the phone) have no category: Claude sorts a few per refresh,
            // one at a time to stay under Notion's ~3 requests/second.
            if let claude {
                let aTrier = liste.indices.filter { liste[$0].categorie == nil && !liste[$0].titre.trimmingCharacters(in: .whitespaces).isEmpty }
                for i in aTrier.prefix(5) {
                    do {
                        guard let c = try await claude.classer(liste[i].titre), let cat = c.categorie else { continue }
                        var props = Notion.categorie(cat)
                        if liste[i].echeance == nil, let d = c.echeance { props = props + Notion.echeance(d) }
                        liste[i] = try await notion.modifier(liste[i].id, props)
                    } catch {
                        statut = error.localizedDescription
                    }
                }
            }
            items = liste
            if statut.hasPrefix("Renseigne") || statut.hasPrefix("Notion") { statut = "" }
            SharedCache.save(liste)
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            statut = error.localizedDescription
        }
    }

    func ajouter(_ texte: String, categorie: Categorie?, echeance: Date?) async -> Bool {
        guard let notion else { statut = "Renseigne Notion dans Réglages (⌘,)."; return false }
        occupe = true
        defer { occupe = false }
        var cat = categorie
        var date = echeance.map { Item.jour.string(from: $0) }
        if cat == nil, let claude {
            statut = "Claude range ta note…"
            if let c = try? await claude.classer(texte) {
                cat = c.categorie
                date = date ?? c.echeance
            }
        }
        do {
            let item = try await notion.creer(Notion.titre(texte) + Notion.categorie(cat) + Notion.echeance(date))
            items.append(item)
            statut = "Rangé dans \(item.categorie?.label ?? "📥 À trier")"
            SharedCache.save(items)
            WidgetCenter.shared.reloadAllTimelines()
            return true
        } catch {
            statut = error.localizedDescription
            return false
        }
    }

    func deplacer(_ item: Item, vers categorie: Categorie?) async {
        await modifier(item, Notion.categorie(categorie))
    }

    func terminer(_ item: Item) async {
        await modifier(item, Notion.fait)
    }

    private func modifier(_ item: Item, _ props: [String: Any]) async {
        guard let notion else { return }
        do {
            let maj = try await notion.modifier(item.id, props)
            if props["Fait"] != nil {
                items.removeAll { $0.id == item.id }
            } else if let i = items.firstIndex(where: { $0.id == item.id }) {
                items[i] = maj
            }
            SharedCache.save(items)
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            statut = error.localizedDescription
        }
    }
}
