import { createHash, timingSafeEqual } from 'node:crypto';

const hash = (s) => createHash('sha256').update(s).digest();

// Single-user app: one shared secret (APP_TOKEN) protects every endpoint. Fails closed if unset.
export function authorized(req, res) {
  const expected = process.env.APP_TOKEN;
  const given = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (expected && given && timingSafeEqual(hash(given), hash(expected))) return true;
  res.status(401).json({ error: 'Jeton invalide' });
  return false;
}
