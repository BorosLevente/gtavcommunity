// dashboard.js — Magyar GTA V Community Admin Dashboard
// API-alapú verzió (Railway backend)

let token = sessionStorage.getItem('dashToken');
let currentUser = null;
let allApps = [];
let allLogs = [];
let activeFilter = 'all';
let activeLogFilter = 'all';
let selectedAppId = null;

// ── API helper ────────────────────────────────────────────
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && path !== '/api/auth') {
      sessionStorage.removeItem('dashToken');
      token = null;
      showLogin();
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}

// ── Init ──────────────────────────────────────────────────
async function init() {
  if (token) {
    const result = await api('GET', '/api/auth');
    if (result?.valid) {
      currentUser = result.user;
      showDashboard();
      return;
    }
    sessionStorage.removeItem('dashToken');
    token = null;
  }
  const setup = await fetch('/api/auth/setup').then(r => r.json()).catch(() => ({ needsSetup: false }));
  if (setup?.needsSetup) {
    showSetup();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
}

function showSetup() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('setupScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  document.getElementById('sidebarUser').textContent = currentUser.username;
  document.getElementById('sidebarRole').textContent = currentUser.role;
  navigate('overview');
  startClock();
}

// ── Auth handlers (inline script fogja hívni) ─────────────
window.handleLogin = async function() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginErr');
  const btn = document.getElementById('loginBtn');
  if (!username || !password) { errEl.textContent = 'Töltsd ki az összes mezőt!'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Bejelentkezés…';
  const result = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(r => r.json()).catch(() => null);

  btn.disabled = false; btn.textContent = 'Belépés →';
  if (result?.token) {
    token = result.token;
    currentUser = result.user;
    sessionStorage.setItem('dashToken', token);
    showDashboard();
  } else {
    errEl.textContent = result?.error || 'Hibás bejelentkezés!';
    errEl.style.display = 'block';
  }
};

window.handleSetup = async function() {
  const username = document.getElementById('setupUser').value.trim();
  const password = document.getElementById('setupPass').value;
  const errEl = document.getElementById('setupErr');
  if (!username || !password || password.length < 6) {
    errEl.textContent = 'Felhasználónév és legalább 6 karakteres jelszó szükséges!';
    errEl.style.display = 'block'; return;
  }
  const result = await fetch('/api/auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(r => r.json()).catch(() => null);

  if (result?.token) {
    token = result.token;
    currentUser = result.user;
    sessionStorage.setItem('dashToken', token);
    showDashboard();
  } else {
    errEl.textContent = result?.error || 'Hiba történt!';
    errEl.style.display = 'block';
  }
};

// ── Navigation ────────────────────────────────────────────
const SECTION_TITLES = {
  overview: 'ÁTTEKINTÉS', applications: 'JELENTKEZÉSEK',
  accounts: 'ADMIN FIÓKOK', logs: 'TEVÉKENYSÉGI NAPLÓ', settings: 'BEÁLLÍTÁSOK',
};

function navigate(section) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.section === section));
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  document.getElementById(`sec-${section}`).classList.add('active');
  document.getElementById('topbarTitle').textContent = SECTION_TITLES[section] || section.toUpperCase();
  if (section === 'overview')      loadOverview();
  if (section === 'applications')  loadApplications();
  if (section === 'accounts')      loadAccounts();
  if (section === 'logs')          loadLogs();
  if (section === 'settings')      loadSettings();
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.section));
});

// ── Clock ─────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('topbarTime');
  function tick() {
    el.textContent = new Date().toLocaleString('hu-HU', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  tick(); setInterval(tick, 1000);
}

// ── Overview ──────────────────────────────────────────────
async function loadOverview() {
  const [stats, apps, logs] = await Promise.all([
    api('GET', '/api/discord/stats'),
    api('GET', '/api/applications'),
    api('GET', '/api/logs'),
  ]);

  if (stats) {
    document.getElementById('st-total').textContent = stats.totalApplications ?? 0;
    document.getElementById('st-pending').textContent = stats.pendingApplications ?? 0;
    document.getElementById('st-audit').textContent = stats.auditApplications ?? 0;
    document.getElementById('st-accounts').textContent = stats.totalAccounts ?? 0;
    document.getElementById('st-activity').textContent = stats.recentActivity ?? '–';
    if ((stats.pendingApplications ?? 0) > 0) {
      const badge = document.getElementById('navBadge');
      if (badge) { badge.style.display = 'inline'; badge.textContent = stats.pendingApplications; }
    }
  }

  if (apps) {
    const recent = apps.slice(0, 6);
    const el = document.getElementById('recentApps');
    el.innerHTML = recent.length ? recent.map(a => `
      <div class="app-row" onclick="navigate('applications');setTimeout(()=>selectApp(${a.id}),150)">
        <div class="app-avatar">${(a.username||'?')[0].toUpperCase()}</div>
        <div class="app-info">
          <div class="app-name">${esc(a.username)}</div>
          <div class="app-meta"><span class="badge ${appBadgeClass(a)}">${appStatusLabel(a)}</span>${esc(a.position)}</div>
        </div>
        <div class="app-time">${relTime(a.submittedAt)}</div>
      </div>`).join('') :
      '<div class="empty-state"><p>Nincs beérkezett jelentkezés.</p></div>';
  }

  if (logs) {
    const el = document.getElementById('recentLogs');
    el.innerHTML = logs.slice(0, 10).map(l => `
      <div class="log-entry">
        <div class="log-dot ${l.type}"></div>
        <div class="log-text"><span class="log-user">${esc(l.username || 'Rendszer')}</span> — ${esc(l.text)}</div>
        <div class="log-time">${relTime(l.createdAt)}</div>
      </div>`).join('') || '<div class="empty-state"><p>Nincs napló bejegyzés.</p></div>';
  }
}

// ── Applications ──────────────────────────────────────────
async function loadApplications() {
  const apps = await api('GET', '/api/applications');
  allApps = apps || [];
  renderAppList();
}

function renderAppList() {
  const filtered = activeFilter === 'all' ? allApps
    : activeFilter === 'new' ? allApps.filter(a => !a.auditionStatus)
    : allApps.filter(a => a.auditionStatus === activeFilter);

  const el = document.getElementById('appsList');
  el.innerHTML = filtered.length ? filtered.map(a => `
    <div class="app-item ${selectedAppId === a.id ? 'active' : ''}" onclick="selectApp(${a.id})">
      <div class="app-item-avatar">${(a.username||'?')[0].toUpperCase()}</div>
      <div class="app-item-info">
        <div class="app-item-name">${esc(a.username)}</div>
        <div class="app-item-meta"><span class="badge ${appBadgeClass(a)}">${appStatusLabel(a)}</span> ${esc(a.position)}</div>
      </div>
      <div class="app-item-time">${relTime(a.submittedAt)}</div>
    </div>`).join('') :
    '<div class="empty-state"><p>Nincs ide illő jelentkezés.</p></div>';
}

document.querySelectorAll('.app-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    document.querySelectorAll('.app-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderAppList();
  });
});

window.selectApp = function(id) {
  selectedAppId = id;
  renderAppList();
  const a = allApps.find(x => x.id === id);
  if (!a) return;
  const detail = document.getElementById('appDetail');
  let statusActions = '';
  if (!a.auditionStatus) {
    statusActions = `<button class="action-btn amber" onclick="setAudition(${a.id},'pending')">⏳ Meghallgatásra jelöl</button>`;
  } else if (a.auditionStatus === 'pending') {
    statusActions = `
      <button class="action-btn green" onclick="setAudition(${a.id},'success')">✅ Sikeres</button>
      <button class="action-btn red"   onclick="setAudition(${a.id},'failure')">❌ Sikertelen</button>`;
  }
  detail.innerHTML = `
    <div class="detail-header">
      <div class="detail-avatar">${(a.username||'?')[0].toUpperCase()}</div>
      <div>
        <div class="detail-name">${esc(a.username)}</div>
        <span class="badge ${appBadgeClass(a)}">${appStatusLabel(a)}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-field"><div class="detail-lbl">Pozíció</div><div class="detail-val">${esc(a.position)}</div></div>
      <div class="detail-field"><div class="detail-lbl">Életkor</div><div class="detail-val">${a.age ?? '–'} év</div></div>
      <div class="detail-field"><div class="detail-lbl">Mióta tag</div><div class="detail-val">${esc(a.memberSince ?? '–')}</div></div>
      <div class="detail-field"><div class="detail-lbl">Beküldve</div><div class="detail-val">${fmtDate(a.submittedAt)}</div></div>
    </div>
    <div class="detail-field" style="margin-top:12px"><div class="detail-lbl">Motiváció</div><div class="detail-val motivation">${esc(a.motivation ?? '–').replace(/\n/g,'<br>')}</div></div>
    <div class="detail-actions">
      ${statusActions}
      <button class="action-btn red outline" onclick="deleteApp(${a.id})">🗑 Törlés</button>
    </div>`;
};

window.setAudition = async function(id, status) {
  const result = await api('PATCH', `/api/applications/${id}`, { auditionStatus: status });
  if (result?.ok) { toast('Állapot frissítve.', 'success'); await loadApplications(); selectApp(id); }
  else toast(result?.error || 'Hiba', 'error');
};

window.deleteApp = async function(id) {
  const a = allApps.find(x => x.id === id);
  confirm_(`Biztosan törlöd <b>${esc(a?.username ?? '')}</b> jelentkezését?`, async () => {
    const result = await api('DELETE', `/api/applications/${id}`);
    if (result?.ok) { toast('Jelentkezés törölve.', 'success'); selectedAppId = null; loadApplications(); }
    else toast(result?.error || 'Hiba', 'error');
  });
};

// ── Accounts ──────────────────────────────────────────────
async function loadAccounts() {
  const accounts = await api('GET', '/api/accounts');
  const grid = document.getElementById('accountsGrid');
  if (!accounts) return;
  grid.innerHTML = accounts.length ? accounts.map(acc => `
    <div class="account-card">
      <div class="acc-avatar">${(acc.username||'?')[0].toUpperCase()}</div>
      <div class="acc-info">
        <div class="acc-name">${esc(acc.username)}</div>
        <div class="acc-role">${esc(acc.role)}</div>
        <div class="acc-date">Létrehozva: ${fmtDate(acc.createdAt)} ${acc.lastLogin ? `&middot; Utolsó belépés: ${relTime(acc.lastLogin)}` : ''}</div>
      </div>
      <div class="acc-actions">
        ${acc.username !== currentUser?.username
          ? `<button class="acc-btn danger" onclick="deleteAccount(${acc.id},'${esc(acc.username)}')">Törlés</button>`
          : `<span class="acc-self">Te</span>`}
      </div>
    </div>`).join('') :
    '<div class="empty-state"><p>Nincs admin fiók.</p></div>';
}

document.getElementById('createAccBtn')?.addEventListener('click', async () => {
  const username = document.getElementById('newAccUser').value.trim();
  const password = document.getElementById('newAccPass').value;
  const role = document.getElementById('newAccRole').value;
  if (!username || !password) { toast('Töltsd ki az összes mezőt!', 'error'); return; }
  const result = await api('POST', '/api/accounts', { username, password, role });
  if (result?.id) {
    document.getElementById('newAccUser').value = '';
    document.getElementById('newAccPass').value = '';
    toast(`Fiók létrehozva: ${username}`, 'success');
    loadAccounts();
  } else {
    toast(result?.error || 'Hiba történt', 'error');
  }
});

window.deleteAccount = async function(id, name) {
  confirm_(`Biztosan törlöd ezt a fiókot: <b>${esc(name)}</b>?`, async () => {
    const result = await api('DELETE', `/api/accounts/${id}`);
    if (result?.ok) { toast('Fiók törölve.', 'success'); loadAccounts(); }
    else toast(result?.error || 'Hiba', 'error');
  });
};

// ── Logs ──────────────────────────────────────────────────
async function loadLogs() {
  const logs = await api('GET', '/api/logs');
  allLogs = logs || [];
  renderLogs();
}

function renderLogs() {
  const el = document.getElementById('logsContainer');
  const filtered = activeLogFilter === 'all' ? allLogs : allLogs.filter(l => l.type === activeLogFilter);
  el.innerHTML = filtered.length ? filtered.map(l => `
    <div class="log-full-entry">
      <span class="log-tag ${l.type}">${l.type}</span>
      <div class="log-full-text"><span class="log-full-user">${esc(l.username || 'Rendszer')}</span> — ${esc(l.text)}</div>
      <div class="log-full-time">${fmtDate(l.createdAt)}</div>
    </div>`).join('') :
    '<div class="empty-state" style="padding:40px"><p>Nincs megjelenítendő napló bejegyzés.</p></div>';
}

document.querySelectorAll('.log-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeLogFilter = btn.dataset.lfilter;
    document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderLogs();
  });
});

async function clearLogs() {
  confirm_('Biztosan törlöd az összes napló bejegyzést? Ez nem visszavonható.', async () => {
    const result = await api('DELETE', '/api/logs');
    if (result?.ok) { toast('Napló törölve.', 'success'); loadLogs(); }
  });
}

function exportLogs() {
  const lines = allLogs.map(l => `[${fmtDate(l.createdAt)}] [${l.type.toUpperCase()}] ${l.username || 'Rendszer'}: ${l.text}`).join('\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `naplo-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Settings ──────────────────────────────────────────────
async function loadSettings() {
  const s = await api('GET', '/api/settings');
  if (!s) return;
  if (s.discordLink) document.getElementById('settDiscord').value = s.discordLink;
  if (s.apiUrl) document.getElementById('settApi').value = s.apiUrl;
}

async function saveSettings() {
  const discord = document.getElementById('settDiscord').value.trim();
  const apiUrl  = document.getElementById('settApi').value.trim();
  const body = {};
  if (discord) body.discordLink = discord;
  if (apiUrl)  body.apiUrl = apiUrl;
  const result = await api('PUT', '/api/settings', body);
  if (result?.ok) toast('Beállítások mentve!', 'success');
  else toast('Hiba a mentés során.', 'error');
}

async function changePassword() {
  const pass = document.getElementById('settNewPass').value;
  if (!pass || pass.length < 6) { toast('A jelszónak legalább 6 karakter kell!', 'error'); return; }
  const result = await api('PATCH', `/api/accounts/${currentUser.userId}`, { password: pass });
  if (result?.ok) {
    document.getElementById('settNewPass').value = '';
    toast('Jelszó megváltoztatva. Jelentkezz be újra.', 'success');
    setTimeout(() => { sessionStorage.removeItem('dashToken'); token = null; showLogin(); }, 2000);
  } else {
    toast(result?.error || 'Hiba', 'error');
  }
}

// ── Logout ────────────────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('dashToken');
  token = null; currentUser = null;
  showLogin();
});

// ── Helpers ───────────────────────────────────────────────
function appBadgeClass(a) {
  if (a.auditionStatus === 'success') return 'success';
  if (a.auditionStatus === 'failure') return 'failure';
  if (a.auditionStatus === 'pending') return 'audition';
  return 'new';
}
function appStatusLabel(a) {
  if (a.auditionStatus === 'success') return 'Elfogadott';
  if (a.auditionStatus === 'failure') return 'Elutasított';
  if (a.auditionStatus === 'pending') return 'Meghallgatáson';
  return 'Új';
}
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(ts) {
  if (!ts) return '–';
  return new Date(ts).toLocaleString('hu-HU', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function relTime(ts) {
  if (!ts) return '–';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'most';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} perce`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} órája`;
  return `${Math.floor(diff / 86400000)} napja`;
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const titles = { success: 'Siker', error: 'Hiba', info: 'Info' };
  el.innerHTML = `<div class="toast-title">${titles[type] || 'Info'}</div><div class="toast-msg">${msg}</div><div class="toast-bar"><div class="toast-bar-fill"></div></div>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

// ── Confirm modal ─────────────────────────────────────────
function confirm_(msg, onYes) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.innerHTML = `<div class="modal"><h4>Megerősítés</h4><p>${msg}</p><div class="modal-actions"><button class="modal-cancel">Mégse</button><button class="modal-confirm danger">Igen, törlöm</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('.modal-cancel').onclick = () => ov.remove();
  ov.querySelector('.modal-confirm').onclick = () => { ov.remove(); onYes(); };
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
}

// ── Boot ──────────────────────────────────────────────────
window.addEventListener('load', init);
