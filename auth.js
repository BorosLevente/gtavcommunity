// middleware/auth.js — JWT ellenőrzés
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'gtav-secret-key-change-me';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nem vagy bejelentkezve' });
  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Érvénytelen token' });
  }
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}
