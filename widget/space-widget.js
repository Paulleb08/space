// Widget iPhone (bonus) — appli gratuite « Scriptable » : crée un script, colle ce fichier, puis ajoute un widget Scriptable.
// Lit directement ta base Notion. Renseigne :
const NOTION_TOKEN = 'secret_...';
const NOTION_DATABASE_ID = '...';

const EMOJI = { Devoir: '📚', Courses: '🛒', 'Projet pro': '💼', 'Projet perso': '🏡' };
const w = new ListWidget();
w.backgroundColor = Color.dynamic(Color.white(), new Color('#191919'));
w.refreshAfterDate = new Date(Date.now() + 30 * 60e3);
const texte = Color.dynamic(new Color('#37352f'), new Color('#e6e6e6'));
const t = w.addText('⏰ À venir'); t.font = Font.boldSystemFont(14); t.textColor = texte;
w.addSpacer(6);

try {
  const req = new Request(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`);
  req.method = 'POST';
  req.headers = { Authorization: `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
  req.body = JSON.stringify({
    filter: { and: [{ property: 'Fait', checkbox: { equals: false } }, { property: 'Echeance', date: { is_not_empty: true } }] },
    sorts: [{ property: 'Echeance', direction: 'ascending' }],
    page_size: config.widgetFamily === 'large' ? 10 : 4,
  });
  const pages = (await req.loadJSON()).results ?? [];
  const jour = new Date(); jour.setHours(0, 0, 0, 0);
  for (const p of pages) {
    const titre = p.properties.Nom.title.map((x) => x.plain_text).join('');
    const n = Math.round((new Date(p.properties.Echeance.date.start.slice(0, 10) + 'T00:00') - jour) / 864e5);
    const quand = n < 0 ? '⚠️ retard' : n === 0 ? 'auj.' : n === 1 ? 'demain' : `J-${n}`;
    const line = w.addText(`${EMOJI[p.properties.Categorie.select?.name] ?? '📥'} ${quand} · ${titre}`);
    line.font = Font.systemFont(12); line.lineLimit = 1;
    line.textColor = n < 0 ? Color.red() : n <= 1 ? Color.orange() : texte;
  }
  if (!pages.length) w.addText('Rien de prévu 🎉').textColor = texte;
} catch (e) {
  w.addText('Hors ligne').textColor = Color.gray();
}

if (config.runsInWidget) Script.setWidget(w); else await w.presentMedium();
Script.complete();
