// routes/applications.js
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function mapApp(row) {
  return {
    id: row.id,
    username: row.username,
    age: row.age,
    position: row.position,
    memberSince: row.member_since,
    motivation: row.motivation,
    auditionStatus: row.audition_status,
    submittedAt: parseInt(row.submitted_at),
  };
}

// GET /api/applications — lista (auth szükséges)
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM applications ORDER BY submitted_at DESC');
  res.json(rows.map(mapApp));
});

// POST /api/applications — új jelentkezés (publikus)
router.post('/', async (req, res) => {
  const { username, age, position, memberSince, motivation } = req.body;
  if (!username || !position) return res.status(400).json({ error: 'Hiányzó kötelező adatok' });

  const { rows } = await db.query(
    'INSERT INTO applications (username, age, position, member_since, motivation) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [username, age || null, position, memberSince || null, motivation || null]
  );
  await db.query('INSERT INTO logs (type, username, text) VALUES ($1,$2,$3)',
    ['action', 'Rendszer', `Új jelentkezés: ${username} (${position})`]);
  res.json({ id: rows[0].id });
});

// PATCH /api/applications/:id — állapot frissítés (auth szükséges)
router.patch('/:id', requireAuth, async (req, res) => {
  const { auditionStatus } = req.body;
  const { rows } = await db.query(
    'UPDATE applications SET audition_status=$1 WHERE id=$2 RETURNING username, position',
    [auditionStatus, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Nem található' });
  await db.query('INSERT INTO logs (type, username, text) VALUES ($1,$2,$3)',
    ['action', req.user.username, `Jelentkezés állapot: ${rows[0].username} → ${auditionStatus}`]);
  res.json({ ok: true });
});

// DELETE /api/applications/:id (auth szükséges)
router.delete('/:id', requireAuth, async (req, res) => {
  const { rows } = await db.query('DELETE FROM applications WHERE id=$1 RETURNING username', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Nem található' });
  await db.query('INSERT INTO logs (type, username, text) VALUES ($1,$2,$3)',
    ['action', req.user.username, `Jelentkezés törölve: ${rows[0].username}`]);
  res.json({ ok: true });
});

export default router;
