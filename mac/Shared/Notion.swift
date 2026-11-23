import Foundation

/// Notion database with properties: Nom (title), Categorie (select), Echeance (date), Fait (checkbox).
struct Notion {
    let token: String
    let databaseID: String
    var session: URLSession = .shared

    struct Page: Decodable {
        let id: String
        let properties: Properties

        struct Properties: Decodable {
            let Nom: Titre
            let Categorie: Choix
            let Echeance: DateProp
        }
        struct Titre: Decodable { let title: [Morceau] }
        struct Morceau: Decodable { let plain_text: String }
        struct Choix: Decodable { let select: Option? }
        struct Option: Decodable { let name: String }
        struct DateProp: Decodable { let date: Debut? }
        struct Debut: Decodable { let start: String }
    }

    struct Query: Decodable {
        let results: [Page]
        let has_more: Bool
        let next_cursor: String?
    }

    static func item(_ page: Page) -> Item {
        let p = page.properties
        return Item(
            id: page.id,
            titre: p.Nom.title.map(\.plain_text).joined(),
            categorie: p.Categorie.select.flatMap { Categorie(rawValue: $0.name) }, // unknown option → "À trier"
            echeance: p.Echeance.date?.start
        )
    }

    /// Accepts a raw ID, a dashed UUID, or a full Notion URL ("…/Titre-<id>?v=<vue>").
    static func extraireID(_ saisie: String) -> String {
        let chemin = saisie.split(separator: "?").first.map(String.init) ?? saisie
        let dernier = chemin.split(separator: "/").last.map(String.init) ?? chemin
        return String(dernier.replacingOccurrences(of: "-", with: "").trimmingCharacters(in: .whitespacesAndNewlines).suffix(32))
    }

    static func titre(_ t: String) -> [String: Any] { ["Nom": ["title": [["text": ["content": t]]]]] }
    static func categorie(_ c: Categorie?) -> [String: Any] {
        if let c { return ["Categorie": ["select": ["name": c.rawValue]]] }
        return ["Categorie": ["select": NSNull()]]
    }
    static func echeance(_ d: String?) -> [String: Any] {
        if let d { return ["Echeance": ["date": ["start": d]]] }
        return ["Echeance": ["date": NSNull()]]
    }
    static let fait: [String: Any] = ["Fait": ["checkbox": true]]

    func lister() async throws -> [Item] {
        var items: [Item] = []
        var curseur: String?
        repeat {
            var corps: [String: Any] = [
                "filter": ["property": "Fait", "checkbox": ["equals": false]],
                "sorts": [["property": "Echeance", "direction": "ascending"]],
            ]
            if let curseur { corps["start_cursor"] = curseur }
            let q = try JSONDecoder().decode(Query.self, from: try await envoyer("/databases/\(databaseID)/query", "POST", corps))
            items += q.results.map(Notion.item)
            curseur = q.has_more ? q.next_cursor : nil
        } while curseur != nil
        return items
    }

    func creer(_ props: [String: Any]) async throws -> Item {
        let corps: [String: Any] = ["parent": ["database_id": databaseID], "properties": props]
        return Notion.item(try JSONDecoder().decode(Page.self, from: try await envoyer("/pages", "POST", corps)))
    }

    func modifier(_ id: String, _ props: [String: Any]) async throws -> Item {
        Notion.item(try JSONDecoder().decode(Page.self, from: try await envoyer("/pages/\(id)", "PATCH", ["properties": props])))
    }

    private func envoyer(_ chemin: String, _ methode: String, _ corps: [String: Any]) async throws -> Data {
        var req = URLRequest(url: URL(string: "https://api.notion.com/v1" + chemin)!)
        req.httpMethod = methode
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("2022-06-28", forHTTPHeaderField: "Notion-Version")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: corps)
        let (data, rep) = try await session.data(for: req)
        let code = (rep as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["message"] as? String
            throw AppError(message: "Notion \(code) : \(msg ?? "erreur inconnue")")
        }
        return data
    }
}

// Merge helper: Notion.titre(x) + Notion.categorie(y)
func + (a: [String: Any], b: [String: Any]) -> [String: Any] { a.merging(b) { _, new in new } }
