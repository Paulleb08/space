import Foundation

/// Sorts a note into a category and finds its due date. Raw HTTP: there is no official Swift SDK.
struct Claude {
    let apiKey: String
    var session: URLSession = .shared

    struct Classement: Equatable {
        var categorie: Categorie?
        var echeance: String?
    }

    static func consigne(aujourdhui: String) -> String {
        """
        Tu ranges les notes personnelles d'un étudiant. Nous sommes le \(aujourdhui).
        Catégories :
        - "Devoir" : devoir à rendre, exercice, évaluation / examen / contrôle à réviser, tout ce qui est scolaire.
        - "Courses" : liste de courses, achat, pense-bête du quotidien non professionnel (RDV médecin, appeler mamie...).
        - "Projet pro" : projet ou tâche liée au travail, stage, entreprise, client, carrière.
        - "Projet perso" : projet personnel (loisir, voyage, création, sport...).
        Donne aussi l'échéance au format AAAA-MM-JJ si la note en mentionne une (ex. "demain", "vendredi", "le 12"), sinon "".
        """
    }

    static let schema: [String: Any] = [
        "type": "object",
        "properties": [
            "categorie": ["type": "string", "enum": Categorie.allCases.map(\.rawValue)],
            "echeance": ["type": "string"],
        ],
        "required": ["categorie", "echeance"],
        "additionalProperties": false,
    ]

    func classer(_ texte: String) async throws -> Classement? {
        let corps: [String: Any] = [
            "model": "claude-opus-5-5",
            "max_tokens": 2048,
            "fallbacks": "default",
            "output_config": ["effort": "low", "format": ["type": "json_schema", "schema": Claude.schema]],
            "system": Claude.consigne(aujourdhui: Item.jour.string(from: Date())),
            "messages": [["role": "user", "content": texte]],
        ]
        var req = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        req.httpMethod = "POST"
        req.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        req.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        req.setValue("server-side-fallback-2026-07-01", forHTTPHeaderField: "anthropic-beta")
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONSerialization.data(withJSONObject: corps)
        let (data, rep) = try await session.data(for: req)
        let code = (rep as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { throw AppError(message: "Claude \(code) : \(String(decoding: data, as: UTF8.self).prefix(200))") }
        return Claude.lire(data)
    }

    /// Model output is untrusted: keep only known categories and well-formed dates. nil on refusal / truncation.
    static func lire(_ reponse: Data) -> Classement? {
        guard
            let obj = try? JSONSerialization.jsonObject(with: reponse) as? [String: Any],
            obj["stop_reason"] as? String == "end_turn",
            let blocs = obj["content"] as? [[String: Any]],
            let texte = blocs.first(where: { $0["type"] as? String == "text" })?["text"] as? String,
            let json = try? JSONSerialization.jsonObject(with: Data(texte.utf8)) as? [String: Any]
        else { return nil }
        return Classement(
            categorie: (json["categorie"] as? String).flatMap(Categorie.init(rawValue:)),
            echeance: dateValide(json["echeance"] as? String)
        )
    }

    static func dateValide(_ s: String?) -> String? {
        guard let s, s.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil else { return nil }
        return s
    }
}
