/**
 * Détection automatique des devoirs / évaluations dans Gmail → base Notion « Space ».
 * Tourne chez Google toutes les heures, même quand ton Mac est éteint.
 * 1. https://script.google.com > Nouveau projet, colle ce fichier.
 * 2. Paramètres du projet > Propriétés du script : CLAUDE_KEY, NOTION_TOKEN, NOTION_DATABASE_ID.
 * 3. Exécute `installer` une fois et accepte l'accès Gmail.
 */
const LABEL = 'Space/analysé';
// Ajuste la recherche si besoin (ex. ajoute "from:@mon-ecole.fr").
const RECHERCHE = 'newer_than:3d -category:promotions -category:social -label:"' + LABEL + '"';

function analyserMails() {
  const label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
  // 5 per run keeps each run short; the rest waits for the next hour.
  GmailApp.search(RECHERCHE, 0, 5).forEach(function (thread) {
    try {
      const m = thread.getMessages().pop();
      detecter(m).forEach(function (t) { creerDansNotion('📧 ' + t.titre, t.echeance); });
      label.addToThread(thread); // only once this mail is fully handled, so a failure is retried later
    } catch (e) {
      console.error(thread.getFirstMessageSubject() + ' : ' + e);
    }
  });
}

function detecter(m) {
  const today = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
  return lireTaches(appel('https://api.anthropic.com/v1/messages', {
    'x-api-key': prop('CLAUDE_KEY'),
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'server-side-fallback-2026-07-01',
  }, {
    model: 'claude-opus-5-5',
    max_tokens: 2048,
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: {
      type: 'object', additionalProperties: false, required: ['taches'],
      properties: { taches: { type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['titre', 'echeance'],
        properties: { titre: { type: 'string' }, echeance: { type: 'string' } },
      } } },
    } } },
    system: 'Tu lis les mails d\'un étudiant. Nous sommes le ' + today + '.\n' +
      'Relève uniquement les travaux à rendre et les évaluations / examens / contrôles à réviser qui le concernent, ' +
      'avec un titre court (ex. "Rendre TP réseau", "Réviser partiel de maths") et l\'échéance AAAA-MM-JJ ("" si inconnue). ' +
      'Ignore les newsletters, publicités, notifications et tout ce qui n\'est pas un travail ou une évaluation. Liste vide si rien.',
    messages: [{ role: 'user', content: 'De : ' + m.getFrom() + '\nDate : ' + m.getDate() + '\nSujet : ' + m.getSubject() + '\n\n' + m.getPlainBody().slice(0, 8000) }],
  }));
}

// Model output is untrusted: keep non-empty titles and well-formed dates only.
function lireTaches(res) {
  if (res.stop_reason !== 'end_turn') return [];
  const bloc = res.content.filter(function (b) { return b.type === 'text'; })[0];
  if (!bloc) return [];
  return JSON.parse(bloc.text).taches
    .filter(function (t) { return typeof t.titre === 'string' && t.titre.trim(); })
    .map(function (t) { return { titre: t.titre.trim().slice(0, 200), echeance: /^\d{4}-\d{2}-\d{2}$/.test(t.echeance) ? t.echeance : null }; });
}

function creerDansNotion(titre, echeance) {
  appel('https://api.notion.com/v1/pages', {
    Authorization: 'Bearer ' + prop('NOTION_TOKEN'),
    'Notion-Version': '2022-06-28',
  }, {
    parent: { database_id: prop('NOTION_DATABASE_ID') },
    properties: {
      Nom: { title: [{ text: { content: titre } }] },
      Categorie: { select: { name: 'Devoir' } },
      Echeance: { date: echeance ? { start: echeance } : null },
    },
  });
}

function appel(url, headers, corps) {
  const res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: headers, payload: JSON.stringify(corps), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error(url + ' → ' + res.getResponseCode() + ' : ' + res.getContentText().slice(0, 300));
  return JSON.parse(res.getContentText());
}

function prop(nom) {
  const v = PropertiesService.getScriptProperties().getProperty(nom);
  if (!v) throw new Error('Propriété du script manquante : ' + nom);
  return v;
}

function installer() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('analyserMails').timeBased().everyHours(1).create();
  analyserMails();
}
