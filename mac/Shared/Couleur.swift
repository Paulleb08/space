import SwiftUI

func couleur(_ c: Categorie?) -> Color {
    switch c {
    case .devoir: return .red
    case .courses: return .green
    case .projetPro: return .blue
    case .projetPerso: return .purple
    case nil: return .gray
    }
}
