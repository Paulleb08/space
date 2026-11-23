import AppKit
import SwiftUI

/// Notion-like page: big icon and title, quiet quick-add line, underlined view tabs, to-do rows with coloured pills.
struct ContentView: View {
    @EnvironmentObject var store: Store
    @State private var onglet: Onglet = .avenir
    @State private var projet: Categorie = .projetPro

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("🪐").font(.system(size: 64)).padding(.bottom, 8)
                HStack(alignment: .firstTextBaseline) {
                    Text("Space").font(.system(size: 40, weight: .bold))
                    Spacer()
                    if store.occupe { ProgressView().controlSize(.small) }
                    Button { Task { await store.rafraichir() } } label: { Image(systemName: "arrow.clockwise") }
                        .buttonStyle(.borderless).help("Rafraîchir").keyboardShortcut("r")
                }
                Text("Devoirs, courses et projets — rangés pour toi.")
                    .foregroundStyle(.secondary).padding(.top, 2).padding(.bottom, 28)

                AjoutView()

                onglets.padding(.top, 20)
                if onglet == .projets {
                    Picker("", selection: $projet) {
                        Text("💼 Pro").tag(Categorie.projetPro)
                        Text("🏡 Perso").tag(Categorie.projetPerso)
                    }
                    .pickerStyle(.segmented).labelsHidden().fixedSize().padding(.top, 10)
                }

                if !store.statut.isEmpty {
                    Text(store.statut).font(.callout).foregroundStyle(.tertiary).padding(.top, 12)
                }

                let liste = onglet.filtre(store.items, projet: projet)
                if liste.isEmpty && !store.occupe {
                    Text(onglet == .avenir ? "Rien de prévu 🎉" : "Vide.")
                        .foregroundStyle(.tertiary).padding(.top, 16)
                }
                LazyVStack(spacing: 0) {
                    ForEach(liste) { LigneView(item: $0) }
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, 48).padding(.vertical, 40)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(Color(nsColor: .textBackgroundColor))
    }

    private var onglets: some View {
        let aTrier = Onglet.trier.filtre(store.items).count
        return VStack(spacing: 0) {
            HStack(spacing: 2) {
                ForEach(Onglet.allCases) { o in
                    if o != .trier || aTrier > 0 {
                        Button { onglet = o } label: {
                            Text(o == .trier ? "\(o.rawValue) (\(aTrier))" : o.rawValue)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(onglet == o ? .primary : .secondary)
                                .padding(.horizontal, 8).padding(.vertical, 6)
                                .overlay(alignment: .bottom) {
                                    if onglet == o { Rectangle().frame(height: 2).padding(.horizontal, 8).offset(y: 1) }
                                }
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            Divider()
        }
    }
}

struct AjoutView: View {
    @EnvironmentObject var store: Store
    @State private var texte = ""
    @State private var categorie: Categorie?
    @State private var avecDate = false
    @State private var date = Date()

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextField("+ Nouvelle note… « rendre DM de physique vendredi »", text: $texte)
                .textFieldStyle(.plain).font(.title3)
                .onSubmit(ajouter)
            HStack(spacing: 12) {
                Picker("", selection: $categorie) {
                    Text("✨ Auto").tag(Categorie?.none)
                    ForEach(Categorie.allCases) { Text($0.label).tag(Categorie?.some($0)) }
                }
                .labelsHidden().fixedSize()
                Toggle("Échéance", isOn: $avecDate).toggleStyle(.checkbox).foregroundStyle(.secondary)
                if avecDate { DatePicker("", selection: $date, displayedComponents: .date).labelsHidden().fixedSize() }
                Spacer()
                Button("Ajouter", action: ajouter)
                    .buttonStyle(.borderedProminent)
                    .disabled(texte.trimmingCharacters(in: .whitespaces).isEmpty || store.occupe)
            }
            .controlSize(.small)
            Divider().padding(.top, 4)
        }
    }

    private func ajouter() {
        let t = texte.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, !store.occupe else { return }
        Task {
            if await store.ajouter(String(t.prefix(2000)), categorie: categorie, echeance: avecDate ? date : nil) {
                texte = ""
                avecDate = false
                categorie = nil
            }
        }
    }
}

struct LigneView: View {
    @EnvironmentObject var store: Store
    let item: Item
    @State private var survol = false

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Button { Task { await store.terminer(item) } } label: {
                Image(systemName: survol ? "checkmark.square" : "square").foregroundStyle(.secondary)
            }
            .buttonStyle(.plain).help("Marquer comme fait")

            VStack(alignment: .leading, spacing: 2) {
                Text(item.titre).textSelection(.enabled)
                if let j = item.joursRestants(), let d = item.date {
                    Text(Item.libelle(jours: j, date: d))
                        .font(.caption)
                        .foregroundStyle(j < 0 ? Color.red : j <= 2 ? Color.orange : Color.secondary)
                }
            }
            Spacer(minLength: 12)
            Menu {
                ForEach(Categorie.allCases) { c in
                    Button(c.label) { Task { await store.deplacer(item, vers: c) } }
                }
            } label: {
                Text(item.categorie?.label ?? "📥 À trier").font(.caption)
            }
            .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
            .padding(.horizontal, 6).padding(.vertical, 1)
            .background(couleur(item.categorie).opacity(0.18), in: RoundedRectangle(cornerRadius: 4))
        }
        .disabled(store.occupe) // a refresh in progress would overwrite the change
        .padding(.vertical, 7).padding(.horizontal, 4)
        .background(survol ? Color.primary.opacity(0.04) : .clear, in: RoundedRectangle(cornerRadius: 4))
        .overlay(alignment: .bottom) { Divider() }
        .onHover { survol = $0 }
    }
}

