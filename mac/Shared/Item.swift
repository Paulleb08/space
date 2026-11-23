import Foundation

enum Categorie: String, CaseIterable, Codable, Identifiable {
    case devoir = "Devoir"
    case courses = "Courses"
    case projetPro = "Projet pro"
    case projetPerso = "Projet perso"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .devoir: return "📚 Devoir"
        case .courses: return "🛒 Courses"
        case .projetPro: return "💼 Pro"
        case .projetPerso: return "🏡 Perso"
        }
    }
}

struct Item: Codable, Identifiable, Hashable {
    var id: String
    var titre: String
    var categorie: Categorie?
    var echeance: String? // "AAAA-MM-JJ" (Notion may add a time: only the day is used)

    static let jour: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    var date: Date? { echeance.flatMap { Item.jour.date(from: String($0.prefix(10))) } }

    func joursRestants(depuis maintenant: Date = Date()) -> Int? {
        guard let date else { return nil }
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: maintenant), to: cal.startOfDay(for: date)).day
    }

    static func libelle(jours: Int, date: Date) -> String {
        switch jours {
        case ..<0: return "en retard (\(-jours) j)"
        case 0: return "aujourd'hui"
        case 1: return "demain"
        case 2...6: return date.formatted(.dateTime.weekday(.wide))
        default: return date.formatted(.dateTime.day().month(.abbreviated))
        }
    }
}

enum Onglet: String, CaseIterable, Identifiable {
    case avenir = "⏰ À venir"
    case devoirs = "📚 Devoirs"
    case courses = "🛒 Courses"
    case projets = "🚀 Projets"
    case trier = "📥 À trier"

    var id: Self { self }

    func filtre(_ items: [Item], projet: Categorie = .projetPro) -> [Item] {
        switch self {
        case .avenir: return items.filter { $0.echeance != nil }
        case .devoirs: return items.filter { $0.categorie == .devoir }
        case .courses: return items.filter { $0.categorie == .courses }
        case .projets: return items.filter { $0.categorie == projet }
        case .trier: return items.filter { $0.categorie == nil }
        }
    }
}

struct AppError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

/// Last list fetched by the app, shared with the widget through the App Group (no secrets in it).
enum SharedCache {
    static let defaults = UserDefaults(suiteName: Bundle.main.object(forInfoDictionaryKey: "AppGroup") as? String ?? "space")

    static func save(_ items: [Item]) {
        defaults?.set(try? JSONEncoder().encode(items), forKey: "items")
    }

    static func load() -> [Item] {
        guard let data = defaults?.data(forKey: "items") else { return [] }
        return (try? JSONDecoder().decode([Item].self, from: data)) ?? []
    }
}
