/**
 * Détection automatique des devoirs / évaluations dans Gmail.
 * 1. Va sur https://script.google.com > Nouveau projet, colle ce fichier.
 * 2. Paramètres du projet > Propriétés du script : ajoute SPACE_URL (https://ton-site.vercel.app) et APP_TOKEN.
 * 3. Exécute `installer` une fois (accepte les autorisations Gmail) : l'analyse tourne ensuite toutes les heures.
 */
const LABEL = 'Space/analysé';
// Ajuste la recherche si besoin (ex. ajoute "from:@mon-ecole.fr").
const RECHERCHE = 'newer_than:3d -category:promotions -category:social -label:"' + LABEL + '"';

function analyserMails() {
  const props = PropertiesService.getScriptProperties();
  const label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
  const threads = GmailApp.search(RECHERCHE, 0, 20);
  if (!threads.length) return;

  const mails = threads.map(function (th) {
    const m = th.getMessages().pop();
    return { sujet: m.getSubject(), de: m.getFrom(), date: m.getDate().toISOString(), texte: m.getPlainBody().slice(0, 8000) };
  });

  const res = UrlFetchApp.fetch(props.getProperty('SPACE_URL') + '/api/mail', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + props.getProperty('APP_TOKEN') },
    payload: JSON.stringify({ mails: mails }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('Space a répondu ' + res.getResponseCode() + ' : ' + res.getContentText());
  label.addToThreads(threads); // only after success, so failed mails are retried next hour
  Logger.log(res.getContentText());
}

function installer() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('analyserMails').timeBased().everyHours(1).create();
  analyserMails();
}
