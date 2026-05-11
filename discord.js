// routes/discord.js — nyilvános Discord adatok + admin stats
import { Router } from 'express';
import { cachedDiscord } from '../server.js';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/discord/members — nyilvános tagszám
router.get('/members', (req, res) => {
  res.json({ total: cachedDiscord.total, online: cachedDiscord.online });
});

// GET /api/discord/staff — nyilvános stáb lista
router.get('/staff', (req, res) => {
  res.json(cachedDiscord.staff);
});

// GET /api/stats — admin áttekintő számok (auth)
router.get('/stats', requireAuth, async (req, res) => {
  const [appCount, pendingCount, auditCount, accCount, lastLog] = await Promise.all([
    db.query('SELECT COUNT(*) FROM applications'),
    db.query("SELECT COUNT(*) FROM applications WHERE audition_status IS NULL"),
    db.query("SELECT COUNT(*) FROM applications WHERE audition_status = 'pending'"),
    db.query('SELECT COUNT(*) FROM accounts'),
    db.query('SELECT text FROM logs ORDER BY created_at DESC LIMIT 1'),
  ]);
  res.json({
    totalApplications: parseInt(appCount.rows[0].count),
    pendingApplications: parseInt(pendingCount.rows[0].count),
    auditApplications: parseInt(auditCount.rows[0].count),
    totalAccounts: parseInt(accCount.rows[0].count),
    recentActivity: lastLog.rows[0]?.text || '–',
    discordTotal: cachedDiscord.total,
    discordOnline: cachedDiscord.online,
  });
});

export default router;
