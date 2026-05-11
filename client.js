// ============================================================
//  client.js — Magyar GTA V Community
//  API-alapú frontend (Railway backend)
// ============================================================

const ORDERED_ROLES = ['Tulajdonos','Server Manager','Community Manager','Staff Manager',
  'Senior Support','Support+','Discord Supervisor','Support','Junior Support'];

// ── Admin panel token (sessionStorage-ban marad) ───────────
let adminToken = sessionStorage.getItem('adminToken');
let currentUser = null;

// ============================================================
//  DISCORD ADATOK (tagszám + stáb)
// ============================================================
async function fetchMembers() {
  try {
    const res = await fetch('/api/discord/members');
    const data = await res.json();
    const el = document.getElementById('stat-total');
    if (el && data.total !== undefined) el.textContent = data.total.toLocaleString('hu-HU') + '+';
  } catch {
    const el = document.getElementById('stat-total');
    if (el) el.textContent = '–';
  }
}

async function fetchStaff() {
  const grid = document.getElementById('staffGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/discord/staff');
    const apiStaff = await res.json();
    if (Array.isArray(apiStaff) && apiStaff.length > 0) {
      const sorted = [];
      ORDERED_ROLES.forEach(r => apiStaff.filter(m => m.role === r).forEach(m => sorted.push(m)));
      apiStaff.forEach(m => { if (!sorted.find(s => s.id === m.id)) sorted.push(m); });
      grid.innerHTML = sorted.map(m => `
        <div class="staff-card">
          <div class="staff-avatar"><img src="${m.avatar||''}" alt="${m.name}" loading="lazy" onerror="this.style.display='none'"></div>
          <div class="staff-name">${m.name||'Ismeretlen'}</div>
          <div class="staff-role">${m.role||'Stáb'}</div>
          <div class="staff-status status-${m.status||'offline'}"><span class="status-dot"></span><span class="status-text"></span></div>
        </div>`).join('');
      return;
    }
  } catch {}
  grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:20px 0">Stáb adatok nem elérhetők.</p>';
}

fetchMembers();
fetchStaff();
setInterval(fetchMembers, 60000);
setInterval(fetchStaff, 30000);

// ============================================================
//  FORM — JELENTKEZÉS (API hívás)
// ============================================================
document.querySelector('.apply-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const btn = e.target.querySelector('.submit-btn');
  btn.textContent = 'Küldés…'; btn.disabled = true;

  try {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username:    fd.get('username'),
        age:         fd.get('age'),
        memberSince: fd.get('memberSince'),
        position:    fd.get('position'),
        motivation:  fd.get('motivation'),
      }),
    });
    if (res.ok) {
      showToast('Jelentkezés elküldve!', 'success');
      btn.textContent = '✓ Elküldve!';
      btn.style.background = '#23d18b'; btn.style.color = '#000';
      setTimeout(() => {
        btn.textContent = 'Jelentkezés Küldése →';
        btn.style.background = ''; btn.style.color = ''; btn.disabled = false;
        e.target.reset();
      }, 4000);
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Hiba történt, próbáld újra!', 'error');
      btn.textContent = 'Jelentkezés Küldése →'; btn.disabled = false;
    }
  } catch {
    showToast('Hálózati hiba, próbáld újra!', 'error');
    btn.textContent = 'Jelentkezés Küldése →'; btn.disabled = false;
  }
});

// ============================================================
//  ADMIN PANEL — belső modal (index.html-en)
// ============================================================
const adminBtn      = document.getElementById('adminBtn');
const adminOverlay  = document.getElementById('adminOverlay');
const adminCloseBtn = document.getElementById('adminCloseBtn');
const applicationPanel  = document.getElementById('applicationPanel');
const applicationDetail = document.getElementById('applicationDetail');
const acceptedListInner = document.getElementById('acceptedListInner');

// Rejtett hozzáférés: ?panel=mgtavcommunity vagy Ctrl+Shift+A
(function checkAdminAccess() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('panel') === 'mgtavcommunity') adminBtn?.classList.add('show');
})();

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    adminOverlay?.classList.add('active');
  }
});

adminBtn?.addEventListener('click', () => adminOverlay?.classList.add('active'));
adminCloseBtn?.addEventListener('click', () => adminOverlay?.classList.remove('active'));
adminOverlay?.addEventListener('click', e => { if (e.target === adminOverlay) adminOverlay.classList.remove('active'); });

// ---- BEJELENTKEZÉS (API) ----
async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!username || !password) { showToast('Töltsd ki az összes mezőt!', 'error'); return; }

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Hibás bejelentkezés!', 'error'); return; }

    adminToken = data.token;
    currentUser = data.user;
    sessionStorage.setItem('adminToken', adminToken);

    document.getElementById('loginPassword').value = '';
    document.getElementById('loginUsername').value = '';
    document.getElementById('adminSubtitle').textContent = `Bejelentkezve: ${currentUser.username} (${currentUser.role})`;
    showToast(`Üdv, ${currentUser.username}!`, 'success');
    setTimeout(() => switchTab('applications'), 80);
    loadApplications();
    renderAccounts();
  } catch {
    showToast('Hálózati hiba!', 'error');
  }
}

document.getElementById('adminLoginBtn')?.addEventListener('click', doLogin);
document.getElementById('loginPassword')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

// ---- TABOK ----
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const name = tab.getAttribute('data-tab');
    if (name !== 'login' && !adminToken) { showToast('Előbb be kell jelentkezned!', 'error'); return; }
    switchTab(name);
  });
});

function switchTab(name) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === name));
  document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
  document.getElementById(name + '-tab')?.classList.add('active');
}

// ---- API segéd ----
async function adminApi(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    sessionStorage.removeItem('adminToken');
    adminToken = null;
    showToast('Session lejárt, jelentkezz be újra!', 'error');
    switchTab('login');
    return null;
  }
  return res.json();
}

// ---- JELENTKEZÉSEK ----
function formatDate(ts) {
  return new Date(ts).toLocaleString('hu-HU',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function auditLabel(s) {
  return {success:'✅ Sikeres meghallgatás',failure:'❌ Sikertelen meghallgatás',pending:'⏳ Meghallgatásra vár'}[s] || '–';
}

async function loadApplications() {
  const apps = await adminApi('GET', '/api/applications');
  if (!apps) return;
  const inner = document.getElementById('appsListInner');
  updateAcceptedList(apps);
  if (!apps.length) {
    inner.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:16px 8px;">Nincs még leadott jelentkezés.</p>';
    if (applicationDetail) applicationDetail.innerHTML = '<div class="admin-application-empty">Nincs még egyetlen jelentkezés sem.</div>';
    return;
  }
  inner.innerHTML = apps.map(app => {
    const dot = app.auditionStatus
      ? `<span style="width:7px;height:7px;border-radius:50%;background:${app.auditionStatus==='success'?'#23d18b':app.auditionStatus==='failure'?'#f04747':'#faa61a'};display:inline-block;flex-shrink:0;"></span>`
      : '';
    return `<div class="admin-apps-list-item" onclick="showApplicationDetail(${app.id})" id="app-${app.id}">
      <div class="app-icon">${(app.username||'?')[0].toUpperCase()}</div>
      <div class="app-info">
        <div class="app-info-title">${app.username}</div>
        <div class="app-info-meta">${dot}${app.position}</div>
      </div>
    </div>`;
  }).join('');
  if (applicationDetail) applicationDetail.innerHTML = '<div class="admin-application-empty">Válassz ki egy jelentkezést a listából.</div>';
}

function updateAcceptedList(apps) {
  const accepted = apps.filter(a => a.auditionStatus);
  const btn = document.getElementById('acceptedToggleBtn');
  if (!accepted || !accepted.length) {
    btn?.classList.remove('visible');
    if (acceptedListInner) acceptedListInner.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Nincs meghallgatott lap.</p>';
    return;
  }
  btn?.classList.add('visible');
  document.getElementById('acceptedToggleLabel').textContent = `Meghallgatottak (${accepted.length})`;
  if (acceptedListInner) acceptedListInner.innerHTML = accepted.map(a => `
    <div class="accepted-item" onclick="showApplicationDetail(${a.id})">
      <span class="accepted-item-name">${a.username}</span>
      <span class="accepted-item-status ${a.auditionStatus}">${auditLabel(a.auditionStatus)}</span>
    </div>`).join('');
}

document.getElementById('acceptedToggleBtn')?.addEventListener('click', () => {
  applicationPanel?.classList.toggle('show-accepted');
});

async function showApplicationDetail(id) {
  const app = await adminApi('GET', `/api/applications`).then(apps => apps?.find(a => a.id === id));
  if (!app) return;
  document.querySelectorAll('.admin-apps-list-item').forEach(el => el.classList.toggle('active', el.id === `app-${id}`));
  let actions = '';
  if (!app.auditionStatus) {
    actions = `<button class="admin-staff-btn" onclick="markApp(${id},'pending')">⏳ Meghallgatásra jelöl</button>`;
  } else if (app.auditionStatus === 'pending') {
    actions = `<button class="admin-staff-btn" onclick="markApp(${id},'success')">✅ Sikeres</button>
               <button class="admin-staff-btn delete" onclick="markApp(${id},'failure')">❌ Sikertelen</button>`;
  } else {
    actions = `<span style="font-size:13px;color:var(--text-muted);">${auditLabel(app.auditionStatus)}</span>`;
  }
  applicationDetail.innerHTML = `
    <h4>Jelentkező: ${app.username}</h4>
    <div class="detail-label">Pozíció</div><div class="detail-value">${app.position}</div>
    <div class="detail-label">Életkor</div><div class="detail-value">${app.age} év</div>
    <div class="detail-label">Mióta tag</div><div class="detail-value">${app.memberSince}</div>
    <div class="detail-label">Beküldve</div><div class="detail-value">${formatDate(app.submittedAt)}</div>
    <div class="detail-label">Motiváció</div><div class="detail-value">${app.motivation.replace(/\n/g,'<br>')}</div>
    <div class="detail-label">Állapot</div><div class="detail-value">${app.auditionStatus ? auditLabel(app.auditionStatus) : 'Nincs kiválasztva'}</div>
    <div class="admin-application-actions">
      <button class="admin-staff-btn delete" onclick="deleteApp(${id})">🗑 Törlés</button>
      ${actions}
    </div>`;
}

async function deleteApp(id) {
  showConfirm('Biztosan törlöd ezt a jelentkezést?', async () => {
    const result = await adminApi('DELETE', `/api/applications/${id}`);
    if (result?.ok) { loadApplications(); showToast('Jelentkezés törölve.', 'success'); }
    else showToast(result?.error || 'Hiba', 'error');
  });
}

async function markApp(id, status) {
  const result = await adminApi('PATCH', `/api/applications/${id}`, { auditionStatus: status });
  if (result?.ok) {
    loadApplications();
    showToast('Állapot frissítve.', 'success');
  } else showToast(result?.error || 'Hiba', 'error');
}

// ---- FIÓKOK ----
async function renderAccounts() {
  const accounts = await adminApi('GET', '/api/accounts');
  const container = document.getElementById('accountsList');
  if (!container || !accounts) return;
  container.innerHTML = accounts.map(acc => `
    <div class="account-card">
      <div class="account-info">
        <strong>${acc.username}</strong>
        <span>${acc.role} · Létrehozva: ${new Date(acc.createdAt).toLocaleDateString('hu-HU')}</span>
      </div>
      <div class="account-actions">
        ${acc.username !== currentUser?.username
          ? `<button class="admin-staff-btn delete" onclick="deleteAccount(${acc.id},'${acc.username}')">Törlés</button>`
          : '<span style="font-size:11px;color:var(--neon-cyan);">te vagy</span>'}
      </div>
    </div>`).join('');
}

window.createAccount = async function() {
  const username = document.getElementById('newAccUsername').value.trim();
  const password = document.getElementById('newAccPassword').value;
  const role     = document.getElementById('newAccRole').value;
  if (!username || !password) { showToast('Töltsd ki az összes mezőt!', 'error'); return; }
  const result = await adminApi('POST', '/api/accounts', { username, password, role });
  if (result?.id) {
    document.getElementById('newAccUsername').value = '';
    document.getElementById('newAccPassword').value = '';
    renderAccounts();
    showToast(`✓ Fiók létrehozva: ${username}`, 'success');
  } else {
    showToast(result?.error || 'Hiba történt', 'error');
  }
};

window.deleteAccount = async function(id, name) {
  showConfirm(`Biztosan törlöd ezt a fiókot: <b>${name}</b>?`, async () => {
    const result = await adminApi('DELETE', `/api/accounts/${id}`);
    if (result?.ok) { renderAccounts(); showToast('Fiók törölve.', 'success'); }
    else showToast(result?.error || 'Hiba', 'error');
  });
};

// ---- BEÁLLÍTÁSOK ----
document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
  const discord = document.getElementById('discordLink').value;
  const api     = document.getElementById('apiUrl').value;
  const newPw   = document.getElementById('newAdminPassword').value;

  if (discord || api) {
    const body = {};
    if (discord) body.discordLink = discord;
    if (api) body.apiUrl = api;
    await adminApi('PUT', '/api/settings', body);
    if (api) fetchMembers(); fetchStaff();
  }
  if (newPw && currentUser) {
    if (newPw.length < 6) { showToast('A jelszónak legalább 6 karakter kell!', 'error'); return; }
    await adminApi('PATCH', `/api/accounts/${currentUser.userId}`, { password: newPw });
    document.getElementById('newAdminPassword').value = '';
  }
  showToast('Beállítások mentve!', 'success');
});

document.getElementById('exportStaffBtn')?.addEventListener('click', async () => {
  const apps = await adminApi('GET', '/api/applications');
  const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `jelentkezesek-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('adminToken');
  adminToken = null; currentUser = null;
  document.getElementById('adminSubtitle').textContent = 'Magyar GTA V Community — Kezelőfelület';
  switchTab('login');
  showToast('Kijelentkezve.', 'success');
});

// ---- TOAST & CONFIRM ----
function ensureToastContainer() {
  let c = document.querySelector('.custom-toast-container');
  if (!c) { c = document.createElement('div'); c.className = 'custom-toast-container'; document.body.appendChild(c); }
  return c;
}
function showToast(msg, type = 'success') {
  const c = ensureToastContainer();
  const t = document.createElement('div');
  t.className = `custom-toast ${type}`;
  t.innerHTML = `<div class="toast-title">${type==='success'?'✓ Siker':'✕ Hiba'}</div><div class="toast-msg">${msg}</div>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}
function showConfirm(msg, onYes) {
  const ov = document.createElement('div');
  ov.className = 'custom-confirm-overlay';
  ov.innerHTML = `<div class="custom-confirm-box"><h4>Megerősítés</h4><p>${msg}</p><div class="custom-confirm-actions"><button class="cancel-btn">Mégse</button><button class="confirm-btn">Igen</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('.cancel-btn').onclick = () => ov.remove();
  ov.querySelector('.confirm-btn').onclick = () => { ov.remove(); onYes(); };
}

// ---- INDULÁSKOR beállítások betöltése ----
window.addEventListener('load', async () => {
  const discordBtn = document.getElementById('discordBtn');
  // Ha van mentett token, próbáljuk meg validálni
  if (adminToken) {
    try {
      const res = await fetch('/api/auth', { headers: { 'Authorization': `Bearer ${adminToken}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.valid) {
          currentUser = data.user;
          document.getElementById('adminSubtitle').textContent = `Bejelentkezve: ${currentUser.username} (${currentUser.role})`;
        }
      } else {
        sessionStorage.removeItem('adminToken');
        adminToken = null;
      }
    } catch { /* hálózati hiba */ }
  }

  // Discord link betöltése beállításokból
  try {
    const res = await fetch('/api/settings', { headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {} });
    if (res.ok) {
      const settings = await res.json();
      if (settings.discordLink && discordBtn) discordBtn.href = settings.discordLink;
      if (settings.discordLink) {
        const inp = document.getElementById('discordLink');
        if (inp) inp.value = settings.discordLink;
      }
    }
  } catch {}
});

// Globálisan elérhetővé tesszük a onclick attribútumok miatt
window.showApplicationDetail = showApplicationDetail;
window.deleteApp = deleteApp;
window.markApp = markApp;
