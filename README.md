# Space — mes notes, devoirs, courses et projets

Site web + appli téléphone (PWA, à installer sur l'écran d'accueil) branchés sur **Notion** :

- 📚 **Devoirs** : devoirs à rendre et évaluations à réviser
- 🛒 **Courses / pense-bête** : la vie de tous les jours, hors travail
- 🚀 **Projets**, séparés en 💼 **Pro** et 🏡 **Perso**
- ⏰ **À venir** : tout ce qui a une échéance, du plus urgent au moins urgent (c'est aussi ce que montre le widget)

**Claude range tout seul** chaque note sans catégorie, que tu l'écrives dans l'appli ou directement dans Notion sur ton téléphone. Il repère aussi l'échéance (« vendredi », « demain »…). Tu peux aussi choisir la catégorie toi-même à l'ajout, ou déplacer une note avec son menu. Sans clé Claude, les notes arrivent dans 📥 *À trier* et tu les ranges à la main.

**Gmail** : un script analyse tes nouveaux mails toutes les heures et ajoute automatiquement les devoirs à rendre et les évaluations à réviser (préfixe 📧).

## Installation (≈ 15 min, tout est gratuit sauf l'usage de l'API Claude, quelques centimes)

### 1. Notion
1. Va sur <https://www.notion.so/my-integrations> → **Nouvelle intégration** → copie le *secret* (`NOTION_TOKEN`).
2. Crée une page Notion vide « Space », puis **⋯ → Connexions → ajoute ton intégration**.
3. Copie l'identifiant de la page (les 32 caractères à la fin de son URL), puis lance :
   ```bash
   npm install
   NOTION_TOKEN=secret_xxx npm run setup-notion -- <id-de-la-page>
   ```
   Le script crée la base « Space — mes notes » et affiche `NOTION_DATABASE_ID`.
4. Sur ton téléphone, dans l'appli Notion, ajoute la base en favori : tu y écris tes notes (juste le **Nom** suffit, Claude remplit le reste).

### 2. Clé Claude (facultatif mais recommandé)
Crée une clé sur <https://console.anthropic.com> → `ANTHROPIC_API_KEY`.

### 3. Mise en ligne sur Vercel
1. Importe ce dépôt GitHub sur <https://vercel.com/new> (aucun réglage de build).
2. Dans **Settings → Environment Variables**, ajoute :
   | Variable | Valeur |
   |---|---|
   | `NOTION_TOKEN` | secret de l'intégration |
   | `NOTION_DATABASE_ID` | affiché à l'étape 1 |
   | `ANTHROPIC_API_KEY` | ta clé Claude |
   | `APP_TOKEN` | un mot de passe long que tu inventes (il protège ton site) |
3. Ouvre le site et entre ton `APP_TOKEN` quand il est demandé.

### 4. L'appli sur ton téléphone
- **iPhone** : ouvre le site dans Safari → Partager → **Sur l'écran d'accueil**.
- **Android** : ouvre le site dans Chrome → ⋮ → **Installer l'application**.

### 5. Le widget « prochaines échéances »
- **iPhone** : installe l'appli gratuite **Scriptable**, crée un script, colle `widget/space-widget.js` en renseignant `URL_SITE` et `TOKEN`. Ensuite, appui long sur l'écran d'accueil → **+** → Scriptable → choisis le script. Le widget se met à jour toutes les 30 minutes environ, et un appui ouvre le site.
- **Android** : avec une appli de widget web (par ex. *Web Widget*), affiche `https://ton-site.vercel.app/?widget&token=TON_APP_TOKEN`. C'est une vue compacte des 5 prochaines échéances.

### 6. Analyse automatique de Gmail
1. Va sur <https://script.google.com> → **Nouveau projet**, colle `gmail/apps-script.gs`.
2. **Paramètres du projet → Propriétés du script** : `SPACE_URL` = l'adresse de ton site, `APP_TOKEN` = ton jeton.
3. Sélectionne la fonction `installer` → **Exécuter**, puis accepte l'accès Gmail.
Les mails des 3 derniers jours (hors Promotions et Réseaux sociaux) sont analysés toutes les heures, puis reçoivent le libellé `Space/analysé` pour ne pas être traités deux fois. Pour ne cibler que ton école, ajoute par exemple `from:@mon-ecole.fr` dans `RECHERCHE`.

> Confidentialité : le contenu de ces mails est envoyé à l'API Claude pour l'analyse.

## Développement
```bash
npm test          # tests (Notion simulé, aucun appel réseau)
npx vercel dev    # site + API en local, avec les variables dans .env
```
Structure : `public/` (PWA), `api/items.js` (lire, ajouter, ranger, cocher), `api/mail.js` (analyse des mails), `lib/` (Notion, Claude, jeton).
