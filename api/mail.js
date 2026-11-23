import { authorized } from '../lib/auth.js';
import { createItem } from '../lib/notion.js';
import { detectFromMail } from '../lib/claude.js';

// Called by gmail/apps-script.gs with recent mails; creates "Devoir" items for detected work/exams.
export default async function handler(req, res) {
  if (!authorized(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();
  const mails = Array.isArray(req.body?.mails) ? req.body.mails.slice(0, 20) : null;
  if (!mails) return res.status(400).json({ error: 'mails[] requis' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'ANTHROPIC_API_KEY manquante' });
  try {
    const crees = [];
    for (const mail of mails) {
      if (typeof mail !== 'object' || !mail) continue;
      for (const t of await detectFromMail(mail)) {
        crees.push(await createItem({ titre: `📧 ${t.titre}`, categorie: 'Devoir', echeance: t.echeance, fait: false }));
      }
    }
    res.json({ crees });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
