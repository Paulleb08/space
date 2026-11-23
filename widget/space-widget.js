// Widget iPhone — à coller dans l'appli gratuite « Scriptable », puis ajouter un widget Scriptable sur l'écran d'accueil.
// Renseigne ton adresse et ton jeton :
const URL_SITE = 'https://TON-SITE.vercel.app';
const TOKEN = 'TON_APP_TOKEN';

const EMOJI = { Devoir: '📚', Courses: '🛒', 'Projet pro': '💼', 'Projet perso': '🏡' };
const req = new Request(`${URL_SITE}/api/items`);
req.headers = { Authorization: `Bearer ${TOKEN}` };
const items = (await req.loadJSON()).filter((i) => i.echeance).slice(0, config.widgetFamily === 'large' ? 10 : 4);

const w = new ListWidget();
w.backgroundColor = new Color('#4f46e5');
w.url = URL_SITE;
w.refreshAfterDate = new Date(Date.now() + 30 * 60e3);
const t = w.addText('⏰ À venir'); t.font = Font.boldSystemFont(14); t.textColor = Color.white();
w.addSpacer(6);

const jour = new Date(); jour.setHours(0, 0, 0, 0);
for (const i of items) {
  const n = Math.round((new Date(i.echeance.slice(0, 10) + 'T00:00') - jour) / 864e5);
  const quand = n < 0 ? '⚠️ retard' : n === 0 ? "auj." : n === 1 ? 'demain' : `J-${n}`;
  const line = w.addText(`${EMOJI[i.categorie] ?? '📥'} ${quand} · ${i.titre}`);
  line.font = Font.systemFont(12); line.lineLimit = 1;
  line.textColor = n <= 1 ? new Color('#fde68a') : Color.white();
}
if (!items.length) w.addText('Rien de prévu 🎉').textColor = Color.white();

if (config.runsInWidget) Script.setWidget(w); else await w.presentMedium();
Script.complete();
