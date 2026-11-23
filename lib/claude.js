import Anthropic from '@anthropic-ai/sdk';
import { CATEGORIES } from './notion.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
let client;

async function ask(system, content, schema) {
  if (!process.env.ANTHROPIC_API_KEY) return null; // no key: user sorts manually in the app
  client ??= new Anthropic();
  const res = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 2048,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content }],
  });
  if (res.stop_reason !== 'end_turn') return null;
  const text = res.content.find((b) => b.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}

const today = () => new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); // YYYY-MM-DD

// Model output is untrusted: keep only known categories and well-formed dates.
export function clean({ categorie, echeance } = {}) {
  return {
    categorie: CATEGORIES.includes(categorie) ? categorie : null,
    echeance: DATE.test(echeance ?? '') ? echeance : null,
  };
}

export async function classify(texte) {
  const out = await ask(
    `Tu ranges les notes personnelles d'un étudiant. Nous sommes le ${today()}.
Catégories :
- "Devoir" : devoir à rendre, exercice, évaluation / examen / contrôle à réviser, tout ce qui est scolaire.
- "Courses" : liste de courses, achat, pense-bête du quotidien non professionnel (RDV médecin, appeler mamie...).
- "Projet pro" : projet ou tâche liée au travail, stage, entreprise, client, carrière.
- "Projet perso" : projet personnel (loisir, voyage, création, sport...).
Donne aussi l'échéance au format AAAA-MM-JJ si la note en mentionne une (ex. "demain", "vendredi", "le 12"), sinon "".`,
    texte,
    {
      type: 'object',
      properties: {
        categorie: { type: 'string', enum: CATEGORIES },
        echeance: { type: 'string' },
      },
      required: ['categorie', 'echeance'],
      additionalProperties: false,
    },
  );
  return out && clean(out);
}

export async function detectFromMail({ sujet = '', de = '', date = '', texte = '' }) {
  const out = await ask(
    `Tu lis les mails d'un étudiant. Nous sommes le ${today()}.
Relève uniquement les travaux à rendre et les évaluations / examens / contrôles à réviser qui le concernent,
avec un titre court (ex. "Rendre TP réseau", "Réviser partiel de maths") et l'échéance AAAA-MM-JJ ("" si inconnue).
Ignore les newsletters, publicités, notifications et tout ce qui n'est pas un travail ou une évaluation. Liste vide si rien.`,
    `De : ${de}\nDate : ${date}\nSujet : ${sujet}\n\n${texte.slice(0, 8000)}`,
    {
      type: 'object',
      properties: {
        taches: {
          type: 'array',
          items: {
            type: 'object',
            properties: { titre: { type: 'string' }, echeance: { type: 'string' } },
            required: ['titre', 'echeance'],
            additionalProperties: false,
          },
        },
      },
      required: ['taches'],
      additionalProperties: false,
    },
  );
  return (out?.taches ?? [])
    .filter((t) => typeof t.titre === 'string' && t.titre.trim())
    .map((t) => ({ titre: t.titre.trim().slice(0, 200), echeance: clean(t).echeance }));
}
