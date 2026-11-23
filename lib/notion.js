// Notion database = single source of truth. Expected properties:
// Nom (title), Categorie (select), Echeance (date), Fait (checkbox). `npm run setup-notion` creates it.
export const CATEGORIES = ['Devoir', 'Courses', 'Projet pro', 'Projet perso'];

async function notion(path, method = 'GET', body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body && JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Notion ${res.status}: ${data.message}`);
  return data;
}

export function toItem(page) {
  const p = page.properties;
  return {
    id: page.id,
    titre: p.Nom.title.map((t) => t.plain_text).join(''),
    categorie: p.Categorie.select?.name ?? null,
    echeance: p.Echeance.date?.start ?? null,
    fait: p.Fait.checkbox,
    url: page.url,
  };
}

export function toProps({ titre, categorie, echeance, fait }) {
  const props = {};
  if (titre !== undefined) props.Nom = { title: [{ text: { content: titre } }] };
  if (categorie !== undefined) props.Categorie = { select: categorie ? { name: categorie } : null };
  if (echeance !== undefined) props.Echeance = { date: echeance ? { start: echeance } : null };
  if (fait !== undefined) props.Fait = { checkbox: Boolean(fait) };
  return props;
}

export async function listItems() {
  const items = [];
  let cursor;
  do {
    const data = await notion(`/databases/${process.env.NOTION_DATABASE_ID}/query`, 'POST', {
      filter: { property: 'Fait', checkbox: { equals: false } },
      sorts: [{ property: 'Echeance', direction: 'ascending' }],
      start_cursor: cursor,
    });
    items.push(...data.results.map(toItem));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return items;
}

export async function createItem(item) {
  const page = await notion('/pages', 'POST', {
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: toProps(item),
  });
  return toItem(page);
}

export async function updateItem(id, changes) {
  return toItem(await notion(`/pages/${encodeURIComponent(id)}`, 'PATCH', { properties: toProps(changes) }));
}

export { notion };
