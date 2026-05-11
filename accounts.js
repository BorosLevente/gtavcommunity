// routes/accounts.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/accounts (auth)
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query('SELECT id, username, role, created_at, last_login FROM accounts ORDER BY created_at ASC');
  res.json(rows.map(r => ({
    id: r.id,
    username: r.username,
    role: r.role,
    createdAt: parseInt(r.created_at),
    lastLogin: r.last_login ? parseInt(r.last_login) : null,
  })));
});

// POST /api/accounts — új fiók (auth)
router.post('/', requireAuth, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Hiányzó adatok' });

  const exists = await db.query('SELECT id FROM accounts WHERE LOWER(username)=LOWER($1)', [username]);
  if (exists.rows.length) return res.status(409).json({ error: 'Ez a felhasználónév már foglalt' });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    'INSERT INTO accounts (username, password, role) VALUES ($1,$2,$3) RETURNING id',
    [username, hash, role || 'Support']
  );
  await db.query('INSERT INTO logs (type, username, text) VALUES ($1,$2,$3)',
    ['action', req.user.username, `Új fiók létrehozva: ${username} (${role})`]);
  res.json({ id: rows[0].id });
});

// PATCH /api/accounts/:id — jelszó/rang módosítás (auth)
router.patch('/:id', requireAuth, async (req, res) => {
  const { password, role } = req.body;
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'A jelszónak legalább 6 karakter kell' });
    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE accounts SET password=$1 WHERE id=$2', [hash, req.params.id]);
    await db.query('INSERT INTO logs (type, username, text) VALUES ($1,$2,$3)',
      ['action', req.user.username, 'Jelszó megváltoztatva']);
  }
  if (role) {
    await db.query('UPDATE accounts SET role=$1 WHERE id=$2', [role, req.params.id]);
  }
  res.json({ ok: true });
});

// DELETE /api/accounts/:id (auth)
router.delete('/:id', requireAuth, async (req, res) => {
  if (String(req.user.userId) === String(req.params.id))
    return res.status(400).json({ error: 'Saját fiókodat nem törölheted' });
  const { rows } = await db.query('DELETE FROM accounts WHERE id=$1 RETURNING username', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Nem található' });
  await db.query('INSERT INTO logs (type, username, text) VALUES ($1,$2,$3)',
    ['action', req.user.username, `Fiók törölve: ${rows[0].username}`]);
  res.json({ ok: true });
});

export default router;
