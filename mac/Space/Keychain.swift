import Foundation
import Security

/// API keys live in the macOS Keychain, never in plain files.
enum Keychain {
    private static func requete(_ cle: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "Space", kSecAttrAccount as String: cle]
    }

    static func lire(_ cle: String) -> String {
        var q = requete(cle)
        q[kSecReturnData as String] = true
        var sortie: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &sortie) == errSecSuccess, let data = sortie as? Data else { return "" }
        return String(decoding: data, as: UTF8.self)
    }

    static func ecrire(_ cle: String, _ valeur: String) {
        SecItemDelete(requete(cle) as CFDictionary)
        guard !valeur.isEmpty else { return }
        var q = requete(cle)
        q[kSecValueData as String] = Data(valeur.utf8)
        SecItemAdd(q as CFDictionary, nil)
    }
}
