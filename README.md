# Space — appli macOS pour tes devoirs, courses et projets

Une vraie appli Mac (SwiftUI), au look épuré façon Notion, branchée sur **ta base Notion** :

- 📚 **Devoirs** : devoirs à rendre et évaluations à réviser
- 🛒 **Courses / pense-bête** : la vie de tous les jours, hors travail
- 🚀 **Projets**, séparés en 💼 **Pro** et 🏡 **Perso**
- ⏰ **À venir** : tout ce qui a une échéance, du plus urgent au moins urgent
- 🪐 **Barre des menus** : le nombre de choses en retard, du jour ou du lendemain, et la liste des prochaines échéances
- **Widget** macOS (bureau et Centre de notifications) : tes prochaines échéances

**Claude range tout seul** chaque note sans catégorie, que tu l'écrives dans l'appli ou dans Notion sur ton téléphone (rangée au prochain rafraîchissement, toutes les 15 min). Il repère aussi la date (« vendredi », « demain »…). Tu peux aussi choisir la catégorie toi-même à l'ajout, ou cliquer sur la pastille d'une note pour la déplacer. Sans clé Claude, les notes arrivent dans 📥 *À trier*.

**Gmail** : un script Google (`gmail/apps-script.gs`) lit tes nouveaux mails toutes les heures, même Mac éteint, et ajoute les devoirs et évaluations dans Notion (préfixe 📧).

Pas de serveur : l'appli parle directement à Notion et à Claude, et tes clés restent dans le **Trousseau** de ton Mac.

## Installation

### 1. La base Notion (5 min)
1. <https://www.notion.so/my-integrations> → **Nouvelle intégration** → copie le *secret*.
2. Dans Notion, crée une **base de données** (pleine page) avec exactement ces propriétés :
   | Nom | Type |
   |---|---|
   | `Nom` | Titre (renomme la colonne « Name » / « Nom » existante) |
   | `Categorie` | Sélection |
   | `Echeance` | Date |
   | `Fait` | Case à cocher |
   Sans accents : c'est voulu. Les options de `Categorie` se créent toutes seules.
3. Sur la base : **⋯ → Connexions → ajoute ton intégration**.
4. Sur ton téléphone, mets cette base en favori dans l'appli Notion : tu y écris tes notes, le **Nom** suffit.

### 2. L'appli Mac

**Le plus simple : le .dmg.** Ouvre `Space.dmg` (fourni à chaque compilation dans l'onglet *Actions* de GitHub, artefact « Space ») et glisse **Space** dans **Applications**.
L'appli n'est pas signée par un compte développeur Apple payant : au premier lancement, fais **clic droit → Ouvrir → Ouvrir**. Si macOS refuse quand même : *Réglages Système → Confidentialité et sécurité → Ouvrir quand même*.

**Ou depuis le code (il faut Xcode) :**
```bash
brew install xcodegen
```
```bash
cd mac && xcodegen && open Space.xcodeproj
```
Dans Xcode : cible **Space** puis **SpaceWidget** → *Signing & Capabilities* → choisis ton équipe (un compte Apple gratuit suffit). Ensuite **⌘R**.
Pour la garder hors d'Xcode : *Product → Archive → Distribute App → Copy App*, puis glisse `Space.app` dans **Applications**.

Au premier lancement, **⌘,** (Réglages) : colle le secret Notion, le lien de ta base et ta clé Claude (<https://console.anthropic.com>, facultatif).

Pour qu'elle se lance seule : *Réglages Système → Général → Ouverture* → ajoute Space.

### 3. Le widget
Clic droit sur le bureau → **Modifier les widgets** → cherche **Space**. Le widget affiche ce que l'appli a chargé en dernier : laisse l'appli tourner dans la barre des menus pour qu'il reste à jour.

### 4. Analyse automatique de Gmail
1. <https://script.google.com> → **Nouveau projet**, colle `gmail/apps-script.gs`.
2. **Paramètres du projet → Propriétés du script** : `CLAUDE_KEY`, `NOTION_TOKEN`, `NOTION_DATABASE_ID` (les 32 caractères de l'ID de ta base).
3. Sélectionne `installer` → **Exécuter**, accepte l'accès Gmail.

Il traite 5 mails récents par heure (hors Promotions et Réseaux sociaux) et leur met le libellé `Space/analysé`. Pour ne viser que ton école, ajoute `from:@mon-ecole.fr` dans `RECHERCHE`.

> Confidentialité : le contenu de ces mails est envoyé à l'API Claude pour l'analyse.

### Bonus : widget iPhone
Appli gratuite **Scriptable** → nouveau script → colle `widget/space-widget.js` (avec ton secret Notion et l'ID de la base) → ajoute un widget Scriptable.

## Développement
- `mac/Shared/` : modèle, Notion, Claude (utilisés par l'appli, le widget et les tests)
- `mac/Space/` : l'appli (fenêtre, barre des menus, réglages, Trousseau)
- `mac/SpaceWidget/` : le widget
- `mac/SpaceTests/` : tests (`xcodebuild test -scheme Space`, aussi lancés par GitHub Actions sur Mac à chaque push)
