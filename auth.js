// routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth — bejelentkezés
router.post('/', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Hiányzó adatok' });

  const { rows } = await db.query('SELECT * FROM accounts WHERE LOWER(username) = LOWER($1)', [username]);
  const account = rows[0];
  if (!account) return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó' });

  const ok = await bcrypt.compare(password, account.password);
  if (!ok) return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó' });

  await db.query('UPDATE accounts SET last_login = $1 WHERE id = $2', [Date.now(), account.id]);
  await db.query('INSERT INTO logs (type, username, text) VALUES ($1,$2,$3)',
    ['login', account.username, 'Bejelentkezés']);

  const token = signToken({ userId: account.id, username: account.username, role: account.role });
  res.json({ token, user: { userId: account.id, username: account.username, role: account.role } });
});

// GET /api/auth — token ellenőrzés
router.get('/', requireAuth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// GET /api/setup — kell-e első beállítás?
router.get('/setup', async (req, res) => {
  const { rows } = await db.query('SELECT COUNT(*) FROM accounts');
  res.json({ needsSetup: parseInt(rows[0].count) === 0 });
});

// POST /api/setup — első admin fiók létrehozása
router.post('/setup', async (req, res) => {
  const { rows } = await db.query('SELECT COUNT(*) FROM accounts');
  if (parseInt(rows[0].count) > 0) return res.status(400).json({ error: 'Már van admin fiók' });

  const { username, password } = req.body;
  if (!username || !password || password.length < 6)
    return res.status(400).json({ error: 'Felhasználónév és legalább 6 karakteres jelszó szükséges' });

  const hash = await bcrypt.hash(password, 10);
  const { rows: newRows } = await db.query(
    'INSERT INTO accounts (username, password, role) VALUES ($1,$2,$3) RETURNING id',
    [username, hash, 'Tulajdonos']
  );
  const token = signToken({ userId: newRows[0].id, username, role: 'Tulajdonos' });
  res.json({ token, user: { userId: newRows[0].id, username, role: 'Tulajdonos' } });
});

export default router;
