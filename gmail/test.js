// node gmail/test.js — checks the filter on Claude's reply before anything is written to Notion.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ctx = {};
vm.runInNewContext(fs.readFileSync(`${__dirname}/apps-script.gs`, 'utf8'), ctx);
const reponse = (taches, stop = 'end_turn') => ({ stop_reason: stop, content: [{ type: 'text', text: JSON.stringify({ taches }) }] });
const lire = (res) => JSON.parse(JSON.stringify(ctx.lireTaches(res))); // copy out of the VM realm for deepEqual

assert.deepEqual(lire(reponse([{ titre: ' Rendre TP réseau ', echeance: '2026-12-01' }])), [{ titre: 'Rendre TP réseau', echeance: '2026-12-01' }]);
assert.deepEqual(lire(reponse([{ titre: 'Réviser maths', echeance: 'vendredi' }])), [{ titre: 'Réviser maths', echeance: null }]);
assert.deepEqual(lire(reponse([{ titre: '   ', echeance: '2026-12-01' }, { titre: 42, echeance: '' }])), []);
assert.deepEqual(lire(reponse([{ titre: 'x', echeance: '' }], 'refusal')), []);
assert.deepEqual(lire({ stop_reason: 'end_turn', content: [] }), []);
assert.equal(lire(reponse([{ titre: 'a'.repeat(500), echeance: '' }]))[0].titre.length, 200);
console.log('gmail: ok');
