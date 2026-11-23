// Drives the API handlers against a fake Notion (no network, no Claude key → manual sorting path).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import items from '../api/items.js';
import mail from '../api/mail.js';

let pages;
process.env.APP_TOKEN = 'secret';
process.env.NOTION_DATABASE_ID = 'db';
delete process.env.ANTHROPIC_API_KEY;

globalThis.fetch = async (url, { method, body }) => {
  const b = body && JSON.parse(body);
  const ok = (data) => ({ ok: true, json: async () => data });
  const page = (id, props) => ({ id, url: `u/${id}`, properties: { Nom: { title: [] }, Categorie: { select: null }, Echeance: { date: null }, Fait: { checkbox: false }, ...props } });
  const fromProps = (p) => ({ ...(p.Nom && { Nom: { title: [{ plain_text: p.Nom.title[0].text.content }] } }), ...(p.Categorie && { Categorie: p.Categorie }), ...(p.Echeance && { Echeance: p.Echeance }), ...(p.Fait && { Fait: p.Fait }) });
  if (url.endsWith('/query')) return ok({ results: pages.filter((p) => !p.properties.Fait.checkbox), has_more: false });
  if (url.endsWith('/pages') && method === 'POST') { const p = page(`id${pages.length}`, fromProps(b.properties)); pages.push(p); return ok(p); }
  const p = pages.find((x) => url.endsWith(x.id)); Object.assign(p.properties, fromProps(b.properties)); return ok(p);
};

function call(handler, { method = 'GET', body, token = 'secret' } = {}) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this; }, json(d) { resolve({ status: this.statusCode, body: d }); }, end() { resolve({ status: this.statusCode }); } };
    handler({ method, body, headers: { authorization: `Bearer ${token}` } }, res);
  });
}

beforeEach(() => { pages = []; });

test('refuse sans bon jeton', async () => {
  assert.equal((await call(items, { token: 'nope' })).status, 401);
  assert.equal((await call(mail, { method: 'POST', token: '' })).status, 401);
});

test('ajout avec catégorie choisie, déplacement, puis fait', async () => {
  const created = await call(items, { method: 'POST', body: { texte: 'Lait, œufs', categorie: 'Courses' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.categorie, 'Courses');
  const moved = await call(items, { method: 'PATCH', body: { id: created.body.id, categorie: 'Projet perso' } });
  assert.equal(moved.body.categorie, 'Projet perso');
  await call(items, { method: 'PATCH', body: { id: created.body.id, fait: true } });
  assert.deepEqual((await call(items)).body, []);
});

test('sans clé Claude, la note reste « à trier »', async () => {
  const r = await call(items, { method: 'POST', body: { texte: 'truc', categorie: 'Nimporte' } });
  assert.equal(r.body.categorie, null);
});

test('validation des entrées', async () => {
  assert.equal((await call(items, { method: 'POST', body: { texte: '' } })).status, 400);
  assert.equal((await call(items, { method: 'PATCH', body: { id: 'x', categorie: 'Faux' } })).status, 400);
  assert.equal((await call(items, { method: 'PATCH', body: { id: 'x', echeance: 'demain' } })).status, 400);
  assert.equal((await call(mail, { method: 'POST', body: {} })).status, 400);
});
