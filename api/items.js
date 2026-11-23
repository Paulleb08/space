import { authorized } from '../lib/auth.js';
import { CATEGORIES, listItems, createItem, updateItem } from '../lib/notion.js';
import { classify } from '../lib/claude.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (d) => d === null || (typeof d === 'string' && DATE.test(d));
const validCat = (c) => c === null || CATEGORIES.includes(c);

// Notes typed directly in Notion arrive without a category: Claude sorts a few per request.
async function sortUnclassified(items) {
  const todo = items.filter((i) => !i.categorie).slice(0, 5);
  await Promise.all(
    todo.map(async (item) => {
      const c = await classify(item.titre).catch((e) => (console.error(e), null));
      if (!c?.categorie) return;
      const changes = { categorie: c.categorie, ...(!item.echeance && c.echeance && { echeance: c.echeance }) };
      Object.assign(item, await updateItem(item.id, changes));
    }),
  );
  return items;
}

export default async function handler(req, res) {
  if (!authorized(req, res)) return;
  try {
    if (req.method === 'GET') return res.json(await sortUnclassified(await listItems()));

    const body = req.body ?? {};
    if (req.method === 'POST') {
      const texte = typeof body.texte === 'string' ? body.texte.trim() : '';
      if (!texte || texte.length > 2000) return res.status(400).json({ error: 'Texte requis (2000 caractères max)' });
      const item = {
        titre: texte,
        categorie: CATEGORIES.includes(body.categorie) ? body.categorie : null,
        echeance: validDate(body.echeance ?? null) ? body.echeance ?? null : null,
        fait: false,
      };
      if (!item.categorie) {
        const c = await classify(texte).catch((e) => (console.error(e), null));
        item.categorie = c?.categorie ?? null;
        item.echeance ??= c?.echeance ?? null;
      }
      return res.status(201).json(await createItem(item));
    }

    if (req.method === 'PATCH') {
      const { id, categorie, echeance, fait, titre } = body;
      if (typeof id !== 'string' || !id) return res.status(400).json({ error: 'id requis' });
      const changes = {};
      if (categorie !== undefined) { if (!validCat(categorie)) return res.status(400).json({ error: 'Catégorie inconnue' }); changes.categorie = categorie; }
      if (echeance !== undefined) { if (!validDate(echeance)) return res.status(400).json({ error: 'Date invalide' }); changes.echeance = echeance; }
      if (fait !== undefined) changes.fait = Boolean(fait);
      if (typeof titre === 'string' && titre.trim()) changes.titre = titre.trim().slice(0, 2000);
      return res.json(await updateItem(id, changes));
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
