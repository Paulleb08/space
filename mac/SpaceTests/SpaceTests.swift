import XCTest

final class SpaceTests: XCTestCase {
    private func page(categorie: String?, echeance: String?) -> Data {
        let select = categorie.map { #"{"name":"\#($0)"}"# } ?? "null"
        let date = echeance.map { #"{"start":"\#($0)"}"# } ?? "null"
        return Data(#"""
        {"id":"p1","url":"u","properties":{
          "Nom":{"title":[{"plain_text":"Rendre "},{"plain_text":"DM"}]},
          "Categorie":{"select":\#(select)},
          "Echeance":{"date":\#(date)},
          "Fait":{"checkbox":false}}}
        """#.utf8)
    }

    func testLecturePageNotion() throws {
        let item = Notion.item(try JSONDecoder().decode(Notion.Page.self, from: page(categorie: "Devoir", echeance: "2026-11-28")))
        XCTAssertEqual(item, Item(id: "p1", titre: "Rendre DM", categorie: .devoir, echeance: "2026-11-28"))
    }

    func testCategorieInconnueVaDansATrier() throws {
        let item = Notion.item(try JSONDecoder().decode(Notion.Page.self, from: page(categorie: "Sport", echeance: nil)))
        XCTAssertNil(item.categorie)
        XCTAssertEqual(Onglet.trier.filtre([item]), [item])
    }

    func testExtraireID() {
        let id = "0123456789abcdef0123456789abcdef"
        XCTAssertEqual(Notion.extraireID(id), id)
        XCTAssertEqual(Notion.extraireID("01234567-89ab-cdef-0123-456789abcdef"), id)
        XCTAssertEqual(Notion.extraireID("https://www.notion.so/moi/Mon-cafe-\(id)?v=ffffffffffffffffffffffffffffffff"), id)
    }

    func testProprietesNotion() throws {
        let props = Notion.titre("Lait") + Notion.categorie(nil) + Notion.echeance("2026-12-01")
        let json = String(decoding: try JSONSerialization.data(withJSONObject: props, options: .sortedKeys), as: UTF8.self)
        XCTAssertEqual(json, #"{"Categorie":{"select":null},"Echeance":{"date":{"start":"2026-12-01"}},"Nom":{"title":[{"text":{"content":"Lait"}}]}}"#)
    }

    private func reponse(_ texte: String, stop: String = "end_turn") -> Data {
        let bloc = try! JSONSerialization.data(withJSONObject: ["stop_reason": stop, "content": [["type": "text", "text": texte]]])
        return bloc
    }

    func testLectureReponseClaude() {
        XCTAssertEqual(Claude.lire(reponse(#"{"categorie":"Courses","echeance":"2026-12-01"}"#)), Claude.Classement(categorie: .courses, echeance: "2026-12-01"))
        XCTAssertEqual(Claude.lire(reponse(#"{"categorie":"Inconnue","echeance":"vendredi"}"#)), Claude.Classement(categorie: nil, echeance: nil))
        XCTAssertNil(Claude.lire(reponse(#"{"categorie":"Devoir","echeance":""}"#, stop: "refusal")))
        XCTAssertNil(Claude.lire(Data("pas du json".utf8)))
    }

    func testOngletsEtEcheances() {
        let demain = Item.jour.string(from: Date().addingTimeInterval(86_400))
        let items = [
            Item(id: "1", titre: "DM", categorie: .devoir, echeance: demain),
            Item(id: "2", titre: "Site", categorie: .projetPerso, echeance: nil),
        ]
        XCTAssertEqual(Onglet.avenir.filtre(items).map(\.id), ["1"])
        XCTAssertEqual(Onglet.projets.filtre(items, projet: .projetPerso).map(\.id), ["2"])
        XCTAssertEqual(Onglet.projets.filtre(items).map(\.id), [])
        XCTAssertEqual(items[0].joursRestants(), 1)
        XCTAssertEqual(Item.libelle(jours: 1, date: Date()), "demain")
        XCTAssertEqual(Item.libelle(jours: -2, date: Date()), "en retard (2 j)")
    }
}
