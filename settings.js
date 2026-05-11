// routes/settings.js
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query('SELECT key, value FROM settings');
  const obj = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});

router.put('/', requireAuth, async (req, res) => {
  const { discordLink, apiUrl } = req.body;
  const entries = [];
  if (discordLink !== undefined) entries.push(['discordLink', discordLink]);
  if (apiUrl !== undefined) entries.push(['apiUrl', apiUrl]);

  for (const [key, value] of entries) {
    await db.query(
      'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
      [key, value]
    );
  }
  await db.query('INSERT INTO logs (type, username, text) VALUES ($1,$2,$3)',
    ['action', req.user.username, 'Beállítások mentve']);
  res.json({ ok: true });
});

export default router;
