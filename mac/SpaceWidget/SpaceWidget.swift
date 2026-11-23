import SwiftUI
import WidgetKit

struct Entree: TimelineEntry {
    let date: Date
    let items: [Item]
}

/// Reads the list the app last saved in the App Group; the app reloads the widget after every change.
struct Fournisseur: TimelineProvider {
    func placeholder(in context: Context) -> Entree {
        Entree(date: Date(), items: [
            Item(id: "1", titre: "Rendre DM de physique", categorie: .devoir, echeance: Item.jour.string(from: Date().addingTimeInterval(86_400))),
            Item(id: "2", titre: "Lait, œufs, pâtes", categorie: .courses, echeance: Item.jour.string(from: Date())),
        ])
    }

    func getSnapshot(in context: Context, completion: @escaping (Entree) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : entree())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entree>) -> Void) {
        // Recompute "demain"/"en retard" at least every 30 min, even if the app is closed.
        completion(Timeline(entries: [entree()], policy: .after(Date().addingTimeInterval(1_800))))
    }

    private func entree() -> Entree {
        let items = Onglet.avenir.filtre(SharedCache.load()).sorted { ($0.echeance ?? "") < ($1.echeance ?? "") }
        return Entree(date: Date(), items: items)
    }
}

struct SpaceWidgetView: View {
    @Environment(\.widgetFamily) private var famille
    let entree: Entree

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("⏰ À venir").font(.headline)
            if entree.items.isEmpty {
                Text("Rien de prévu 🎉").font(.caption).foregroundStyle(.secondary)
            }
            ForEach(entree.items.prefix(famille == .systemLarge ? 10 : famille == .systemMedium ? 5 : 4)) { item in
                HStack(spacing: 6) {
                    Circle().fill(couleur(item.categorie)).frame(width: 6, height: 6)
                    Text(item.titre).font(.caption).lineLimit(1)
                    Spacer(minLength: 4)
                    if let j = item.joursRestants(depuis: entree.date), let d = item.date {
                        Text(famille == .systemSmall ? court(j) : Item.libelle(jours: j, date: d))
                            .font(.caption2)
                            .foregroundStyle(j < 0 ? Color.red : j <= 1 ? Color.orange : Color.secondary)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }

    private func court(_ j: Int) -> String { j < 0 ? "⚠️" : j == 0 ? "auj." : j == 1 ? "dem." : "J-\(j)" }
}


@main
struct SpaceWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SpaceWidget", provider: Fournisseur()) { SpaceWidgetView(entree: $0) }
            .configurationDisplayName("Space — À venir")
            .description("Tes prochains devoirs, courses et projets.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
