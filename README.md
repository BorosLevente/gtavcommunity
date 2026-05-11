# Magyar GTA V Community — Railway Deploy

## 🚀 Deployment (Railway.app — ingyenes, adatbázissal)

### 1. Railway fiók & projekt létrehozás
1. Menj: https://railway.app és regisztrálj (GitHub-kal a leggyorsabb)
2. **New Project** → **Deploy from GitHub repo** → töltsd fel / linkeld a kódot
3. Vagy: **New Project** → **Empty Project** → húzd be a mappát

### 2. PostgreSQL adatbázis hozzáadása
1. A projekten belül: **+ New** → **Database** → **Add PostgreSQL**
2. Railway automatikusan beállítja a `DATABASE_URL` environment variable-t ✅

### 3. Environment Variables beállítása
A Railway projekt **Variables** fülén add hozzá:

| Változó | Érték |
|---------|-------|
| `DISCORD_TOKEN` | A Discord bot tokened |
| `GUILD_ID` | `1059572724617465926` |
| `JWT_SECRET` | Valami egyedi hosszú string (pl. `gtav-secret-2024-xyz`) |
| `STAFF_ROLES` | (lásd .env.example — már ki van töltve a config.json alapján) |

> `DATABASE_URL` és `PORT` automatikusan be van állítva Railway-en!

### 4. Deploy
- Railway automatikusan deployol minden push-ra
- Az URL: `https://xxxxx.up.railway.app` (nem formázza át!)

---

## 📁 Mappastruktúra

```
├── server.js          ← fő szerver (Express + Discord bot)
├── package.json
├── .env.example       ← ebből csináld a Railway Variables-t
├── db/
│   └── index.js       ← PostgreSQL kapcsolat + tábla init
├── middleware/
│   └── auth.js        ← JWT ellenőrzés
├── routes/
│   ├── auth.js        ← POST/GET /api/auth, /api/auth/setup
│   ├── applications.js← /api/applications
│   ├── accounts.js    ← /api/accounts
│   ├── logs.js        ← /api/logs
│   ├── settings.js    ← /api/settings
│   └── discord.js     ← /api/discord/members, /staff, /stats
└── public/
    ├── index.html     ← főoldal
    ├── client.js      ← főoldal JS (API alapú)
    ├── dashboard.html ← admin dashboard
    └── dashboard.js   ← dashboard JS (API alapú)
```

---

## 🔑 Első bejelentkezés

Az első indításkor automatikusan létrejön egy admin fiók:
- **Felhasználónév:** `admin`
- **Jelszó:** `admin123`

> ⚠️ Változtasd meg rögtön az első belépés után!

Dashboard elérhető: `https://xxxxx.up.railway.app/dashboard`

---

## 📡 API végpontok

| Endpoint | Módszer | Auth | Leírás |
|----------|---------|------|--------|
| `/api/auth` | POST | ❌ | Bejelentkezés |
| `/api/auth` | GET | ✅ | Token ellenőrzés |
| `/api/auth/setup` | GET/POST | ❌ | Első fiók setup |
| `/api/applications` | GET | ✅ | Jelentkezések listája |
| `/api/applications` | POST | ❌ | Új jelentkezés (publikus) |
| `/api/applications/:id` | PATCH/DELETE | ✅ | Szerkesztés/törlés |
| `/api/accounts` | GET/POST | ✅ | Admin fiókok |
| `/api/accounts/:id` | PATCH/DELETE | ✅ | Szerkesztés/törlés |
| `/api/logs` | GET/DELETE | ✅ | Napló |
| `/api/settings` | GET/PUT | ✅ | Beállítások |
| `/api/discord/members` | GET | ❌ | Discord tagszám |
| `/api/discord/staff` | GET | ❌ | Stáb lista |
| `/api/discord/stats` | GET | ✅ | Dashboard összesítő |

---

## 🆚 Mi változott a régi verzióhoz képest?

| Régi | Új |
|------|----|
| localStorage (böngészőnként külön) | PostgreSQL adatbázis (centralizált) |
| Jelszavak plaintextben | bcrypt hash |
| Nincs auth a backenden | JWT token auth |
| Wispbyte-on futott | Railway (ingyenes, adatbázissal) |
| Netlify functions | Egyszerű Express szerver |
