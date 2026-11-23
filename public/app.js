const CATS = { Devoir: '📚 Devoir', Courses: '🛒 Courses', 'Projet pro': '💼 Pro', 'Projet perso': '🏡 Perso' };
const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

// ?token=... lets a widget app open the page without the prompt.
let token = params.get('token') || store.get('token');
if (!token) token = prompt('Jeton d’accès (APP_TOKEN) :') || '';
store.set('token', token);

let items = [];
let tab = store.get('tab') || 'avenir';
const widget = params.has('widget');
if (widget) { document.body.classList.add('widget'); tab = 'avenir'; }

async function api(method, body) {
  const res = await fetch('/api/items', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  if (res.status === 401) { store.set('token', ''); throw new Error('Jeton invalide — recharge la page.'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

const status = (msg) => { $('#status').textContent = msg; };
const today = () => new Date().toLocaleDateString('fr-CA');

function dateLabel(d) {
  if (!d) return '';
  const days = Math.round((new Date(d.slice(0, 10)) - new Date(today())) / 864e5);
  const txt = days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : days < 0 ? `en retard (${-days} j)` : days < 7
    ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'long' }) : new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `<span class="${days < 0 ? 'late' : days <= 2 ? 'soon' : ''}">${txt}</span>`;
}

const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function visible() {
  const proj = document.querySelector('input[name=proj]:checked').value;
  if (tab === 'avenir') return items.filter((i) => i.echeance).slice(0, widget ? 5 : undefined);
  if (tab === 'trier') return items.filter((i) => !i.categorie);
  if (tab === 'Projets') return items.filter((i) => i.categorie === proj);
  return items.filter((i) => i.categorie === tab);
}

function render() {
  const nbTrier = items.filter((i) => !i.categorie).length;
  $('[data-tab=trier]').hidden = !nbTrier;
  $('#nb-trier').textContent = nbTrier ? `(${nbTrier})` : '';
  if (tab === 'trier' && !nbTrier) tab = 'avenir';
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
  $('#sous-projets').hidden = tab !== 'Projets';

  const list = visible();
  $('#list').innerHTML = list.map((i) => `
    <li data-id="${i.id}">
      <input type="checkbox" aria-label="Fait">
      <div><div class="titre">${esc(i.titre)}</div><div class="meta">${tab === 'avenir' && i.categorie ? CATS[i.categorie] + ' · ' : ''}${dateLabel(i.echeance)}</div></div>
      <select aria-label="Déplacer">${['', ...Object.keys(CATS)].map((c) => `<option value="${c}" ${c === (i.categorie ?? '') ? 'selected' : ''}>${c ? CATS[c] : '📥 À trier'}</option>`).join('')}</select>
    </li>`).join('');
  status(list.length ? '' : tab === 'avenir' ? 'Rien de prévu 🎉' : 'Vide.');
}

async function load() {
  status('Chargement…');
  try { items = await api('GET'); render(); } catch (e) { status(e.message); }
}

$('#tabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.tab; store.set('tab', tab); render(); };
$('#sous-projets').onchange = render;
$('#refresh').onclick = load;

$('#add').onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true;
  status($('#categorie').value ? 'Ajout…' : 'Claude range ta note…');
  try {
    const item = await api('POST', { texte: $('#texte').value, categorie: $('#categorie').value || null, echeance: $('#echeance').value || null });
    items.push(item);
    $('#add').reset();
    render();
    status(`Rangé dans ${CATS[item.categorie] ?? '📥 À trier'}`);
  } catch (err) { status(err.message); } finally { btn.disabled = false; }
};

$('#list').onchange = async (e) => {
  const li = e.target.closest('li'); const item = items.find((i) => i.id === li.dataset.id);
  const changes = e.target.type === 'checkbox' ? { fait: true } : { categorie: e.target.value || null };
  try {
    const updated = await api('PATCH', { id: item.id, ...changes });
    items = updated.fait ? items.filter((i) => i.id !== item.id) : items.map((i) => (i.id === item.id ? updated : i));
    render();
  } catch (err) { status(err.message); }
};

load();
if (widget) setInterval(load, 15 * 60e3);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
