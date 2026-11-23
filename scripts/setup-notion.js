// Usage: NOTION_TOKEN=secret_xxx node scripts/setup-notion.js <id-de-la-page-notion-parente>
import { notion, CATEGORIES } from '../lib/notion.js';

const pageId = process.argv[2];
if (!process.env.NOTION_TOKEN || !pageId) {
  console.error('Usage : NOTION_TOKEN=... node scripts/setup-notion.js <id-page-parente>');
  process.exit(1);
}
const colors = ['red', 'green', 'blue', 'purple'];
const db = await notion('/databases', 'POST', {
  parent: { type: 'page_id', page_id: pageId },
  title: [{ text: { content: 'Space — mes notes' } }],
  properties: {
    Nom: { title: {} },
    Categorie: { select: { options: CATEGORIES.map((name, i) => ({ name, color: colors[i] })) } },
    Echeance: { date: {} },
    Fait: { checkbox: {} },
  },
});
console.log(`Base créée : ${db.url}\nNOTION_DATABASE_ID=${db.id}`);
