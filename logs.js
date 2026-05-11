// routes/logs.js
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM logs ORDER BY created_at DESC LIMIT 500');
  res.json(rows.map(r => ({ id: r.id, type: r.type, username: r.username, text: r.text, createdAt: parseInt(r.created_at) })));
});

router.delete('/', requireAuth, async (req, res) => {
  await db.query('DELETE FROM logs');
  await db.query('INSERT INTO logs (type, username, text) VALUES ($1,$2,$3)',
    ['action', req.user.username, 'Napló törölve']);
  res.json({ ok: true });
});

export default router;
