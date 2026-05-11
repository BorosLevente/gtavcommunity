// ══════════════════════════════════════════════════════════
//  Magyar GTA V Community — Fő szerver
//  Express API + Discord bot + PostgreSQL (Railway)
// ══════════════════════════════════════════════════════════
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits } from 'discord.js';
import { db, initDB } from './db/index.js';
import authRouter from './routes/auth.js';
import applicationsRouter from './routes/applications.js';
import accountsRouter from './routes/accounts.js';
import logsRouter from './routes/logs.js';
import settingsRouter from './routes/settings.js';
import discordRouter from './routes/discord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ── Trust proxy (Railway / reverse proxy mögött) ──────────
app.set('trust proxy', 1);

// ── Middleware ────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.options('*', cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Discord Bot ───────────────────────────────────────────
export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

export let cachedDiscord = { total: 0, online: 0, staff: [] };

async function refreshDiscordCache() {
  try {
    const guild = discordClient.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return;
    await guild.members.fetch();
    cachedDiscord.total = guild.memberCount;
    cachedDiscord.online = guild.members.cache.filter(
      m => !m.user.bot && ['online','idle','dnd'].includes(m.presence?.status)
    ).size;

    const staffRoles = JSON.parse(process.env.STAFF_ROLES || '[]');
    const seen = new Set();
    const list = [];
    for (const roleConfig of staffRoles) {
      const role = guild.roles.cache.get(roleConfig.id);
      if (!role) continue;
      for (const [, member] of role.members) {
        if (seen.has(member.id)) continue;
        seen.add(member.id);
        list.push({
          id: member.id,
          name: member.displayName || member.user.username,
          username: member.user.username,
          avatar: member.user.displayAvatarURL({ extension: 'png', size: 128 }),
          status: member.presence?.status || 'offline',
          role: roleConfig.name,
        });
      }
    }
    cachedDiscord.staff = list;
    console.log(`📊 Discord cache: ${cachedDiscord.total} tag, ${cachedDiscord.online} online, ${list.length} stáb`);
  } catch (e) {
    console.error('Discord cache hiba:', e.message);
  }
}

discordClient.once('ready', async () => {
  console.log(`🤖 Bot bejelentkezve: ${discordClient.user.tag}`);
  await refreshDiscordCache();
  setInterval(refreshDiscordCache, 2 * 60 * 1000);
});
discordClient.on('presenceUpdate', refreshDiscordCache);
discordClient.on('guildMemberAdd', refreshDiscordCache);
discordClient.on('guildMemberRemove', refreshDiscordCache);

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth',         authRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/accounts',     accountsRouter);
app.use('/api/logs',         logsRouter);
app.use('/api/settings',     settingsRouter);
app.use('/api/discord',      discordRouter);

// ── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: Math.floor(process.uptime()) }));

// ── SPA fallback ──────────────────────────────────────────
app.get('*', (req, res) => {
  const file = req.path.startsWith('/dashboard') ? 'dashboard.html' : 'index.html';
  res.sendFile(path.join(__dirname, 'public', file));
});

// ── Indulás ───────────────────────────────────────────────
async function start() {
  await initDB();
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Szerver fut: port ${PORT}`));
  if (process.env.DISCORD_TOKEN) {
    discordClient.login(process.env.DISCORD_TOKEN).catch(e => console.error('Discord login hiba:', e.message));
  } else {
    console.warn('⚠️  DISCORD_TOKEN nincs beállítva – bot nem indul el');
  }
}

start();
process.on('SIGINT', () => { discordClient.destroy(); process.exit(0); });
