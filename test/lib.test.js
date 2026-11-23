import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toItem, toProps } from '../lib/notion.js';
import { clean } from '../lib/claude.js';

const page = {
  id: 'p1', url: 'https://notion.so/p1',
  properties: {
    Nom: { title: [{ plain_text: 'Rendre ' }, { plain_text: 'DM' }] },
    Categorie: { select: { name: 'Devoir' } },
    Echeance: { date: { start: '2026-11-28' } },
    Fait: { checkbox: false },
  },
};

test('toItem lit une page Notion', () => {
  assert.deepEqual(toItem(page), { id: 'p1', titre: 'Rendre DM', categorie: 'Devoir', echeance: '2026-11-28', fait: false, url: 'https://notion.so/p1' });
  assert.equal(toItem({ ...page, properties: { ...page.properties, Categorie: { select: null }, Echeance: { date: null } } }).categorie, null);
});

test('toProps aller-retour et effacement', () => {
  const props = toProps({ titre: 'Rendre DM', categorie: 'Devoir', echeance: '2026-11-28', fait: false });
  assert.equal(props.Nom.title[0].text.content, 'Rendre DM');
  assert.deepEqual(toProps({ categorie: null, echeance: null }), { Categorie: { select: null }, Echeance: { date: null } });
  assert.deepEqual(toProps({ fait: true }), { Fait: { checkbox: true } });
});

test('clean filtre la sortie du modèle', () => {
  assert.deepEqual(clean({ categorie: 'Courses', echeance: '2026-12-01' }), { categorie: 'Courses', echeance: '2026-12-01' });
  assert.deepEqual(clean({ categorie: 'Inconnue', echeance: 'vendredi' }), { categorie: null, echeance: null });
  assert.deepEqual(clean({ categorie: 'Devoir', echeance: '' }), { categorie: 'Devoir', echeance: null });
});
