<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'Nutzer';
$activeNav = 'users';
require __DIR__ . '/includes/layout_top.php';
?>

<style>
.create-panel {
  display: none; background: var(--card); border-radius: var(--radius);
  border: 1px solid rgba(255,255,255,0.08); padding: 24px;
  margin-bottom: 20px; max-width: 480px;
}
.create-panel.open { display: block; }
.create-panel h3 { margin-bottom: 16px; color: var(--text); }
.create-field {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12); background: var(--bg-alt);
  color: var(--text); font-size: 13.5px; margin-bottom: 12px; font-family: 'Inter', sans-serif;
}
.create-field:focus { outline: none; border-color: var(--violet-light); }
.avatar-picker-label { font-size: 12px; color: var(--text-dim); margin-bottom: 8px; }
.avatar-picker { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.avatar-opt-admin {
  width: 46px; height: 46px; border-radius: 10px;
  border: 2px solid rgba(255,255,255,0.1); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; transition: border-color .15s, transform .12s;
}
.avatar-opt-admin:hover { transform: scale(1.08); }
.avatar-opt-admin.selected { border-color: var(--violet-light); box-shadow: 0 0 8px rgba(124,58,237,0.4); }
.create-panel-actions { display: flex; gap: 10px; }
.avatar-cell { font-size: 20px; text-align: center; }
.role-select {
  background: var(--bg-alt); color: var(--text); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px; padding: 4px 8px; font-size: 12px; cursor: pointer; font-family: 'Inter', sans-serif;
}
.user-search {
  padding: 8px 14px; border-radius: 8px; font-size: 13.5px;
  border: 1px solid rgba(255,255,255,0.12); background: var(--bg-alt);
  color: var(--text); font-family: 'Inter', sans-serif; width: 280px;
}
.user-search:focus { outline: none; border-color: var(--violet-light); }
.uid-cell {
  font-size: 11px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace;
  cursor: pointer; user-select: all; white-space: nowrap;
}
.uid-cell:hover { color: var(--violet-light); }
.pw-modal-overlay {
  display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  z-index: 9999; align-items: center; justify-content: center;
}
.pw-modal-overlay.open { display: flex; }
.pw-modal {
  background: var(--card); border-radius: var(--radius); border: 1px solid rgba(255,255,255,0.1);
  padding: 24px; width: 340px; max-width: 90vw;
}
.pw-modal h3 { margin-bottom: 16px; font-size: 15px; color: var(--text); }
.pw-modal-error { color: var(--orange); font-size: 12px; min-height: 16px; margin-bottom: 8px; }
.pw-modal-actions { display: flex; gap: 10px; margin-top: 4px; }
</style>

<div class="toolbar">
  <button class="btn btn-primary" onclick="document.getElementById('createPanel').classList.toggle('open')">+ Nutzer anlegen</button>
  <input class="user-search" id="userSearch" type="search" placeholder="🔍 Name, E-Mail oder User-ID suchen…" oninput="filterUsers()">
</div>

<div class="create-panel" id="createPanel">
  <h3>Neuen Nutzer anlegen</h3>
  <form id="createUserForm">
    <input class="create-field" type="text" id="newUserName" placeholder="Anzeigename">
    <input class="create-field" type="email" id="newUserEmail" placeholder="E-Mail" required>
    <input class="create-field" type="password" id="newUserPassword" placeholder="Passwort (min. 6 Zeichen)" required minlength="6">
    <input class="create-field" type="password" id="newUserPassword2" placeholder="Passwort wiederholen" required minlength="6">
    <div id="createError" style="color:var(--orange); font-size:13px; margin-bottom:8px; min-height:16px;"></div>
    <div class="avatar-picker-label">Avatar wählen (optional)</div>
    <div class="avatar-picker" id="adminAvatarPicker"></div>
    <div class="create-panel-actions">
      <button type="submit" class="btn btn-primary">Anlegen</button>
      <button type="button" class="btn" onclick="document.getElementById('createPanel').classList.remove('open')">Abbrechen</button>
    </div>
  </form>
</div>

<!-- Passwort-Modal -->
<div class="pw-modal-overlay" id="pwModalOverlay" onclick="if(event.target===this) closePwModal()">
  <div class="pw-modal">
    <h3>Passwort ändern</h3>
    <input class="create-field" type="password" id="pwModalInput" placeholder="Neues Passwort (min. 6 Zeichen)">
    <div class="pw-modal-error" id="pwModalError"></div>
    <div class="pw-modal-actions">
      <button class="btn btn-primary" onclick="submitPwModal()">Speichern</button>
      <button class="btn" onclick="closePwModal()">Abbrechen</button>
    </div>
  </div>
</div>

<table class="data-table" id="usersTable">
  <thead>
    <tr><th>Avatar</th><th>E-Mail</th><th>Anzeigename</th><th>User ID</th><th>Rolle</th><th>Registriert</th><th>Highscores</th><th>Status</th><th>Aktionen</th></tr>
  </thead>
  <tbody><tr><td colspan="9">Lade…</td></tr></tbody>
</table>

<script>
const AVATARS = [
  { id: 'snake',     emoji: '🐍', bg: '#14532d' },
  { id: 'alien',     emoji: '👾', bg: '#3b0764' },
  { id: 'rocket',    emoji: '🚀', bg: '#172554' },
  { id: 'bomb',      emoji: '💣', bg: '#1c1917' },
  { id: 'dice',      emoji: '🎲', bg: '#7c2d12' },
  { id: 'joker',     emoji: '🃏', bg: '#1f2937' },
  { id: 'puzzle',    emoji: '🧩', bg: '#0c4a6e' },
  { id: 'lightning', emoji: '⚡', bg: '#713f12' },
  { id: 'ghost',     emoji: '👻', bg: '#2e1065' },
  { id: 'trophy',    emoji: '🏆', bg: '#78350f' },
];

let selectedAvatar = '';
let allUsers = [];

function avatarEmoji(id) {
  return AVATARS.find(a => a.id === id)?.emoji ?? '👤';
}

function filterUsers() {
  const q = document.getElementById('userSearch').value.trim().toLowerCase();
  const filtered = q
    ? allUsers.filter(u =>
        (u.display_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.id || '').toLowerCase().includes(q)
      )
    : allUsers;
  renderUsers(filtered);
}

function buildAvatarPicker() {
  const picker = document.getElementById('adminAvatarPicker');
  AVATARS.forEach(a => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-opt-admin';
    btn.title = a.id;
    btn.style.background = a.bg;
    btn.textContent = a.emoji;
    btn.dataset.id = a.id;
    btn.addEventListener('click', () => {
      selectedAvatar = a.id;
      picker.querySelectorAll('.avatar-opt-admin').forEach(b => b.classList.toggle('selected', b.dataset.id === a.id));
    });
    picker.appendChild(btn);
  });
}

async function loadUsers() {
  allUsers = await apiCall('GET', 'api/users.php') || [];
  filterUsers();
}

function renderUsers(users) {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';
  if (!Array.isArray(users) || users.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 9;
    td.textContent = 'Keine Nutzer.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  users.forEach(u => {
    const tr = document.createElement('tr');

    const tdAvatar = document.createElement('td');
    tdAvatar.className = 'avatar-cell';
    tdAvatar.textContent = avatarEmoji(u.avatar);
    tr.appendChild(tdAvatar);

    const tdEmail = document.createElement('td');
    tdEmail.textContent = u.email;
    tr.appendChild(tdEmail);

    const tdName = document.createElement('td');
    tdName.textContent = u.display_name || '—';
    tr.appendChild(tdName);

    const tdUid = document.createElement('td');
    tdUid.className = 'uid-cell';
    tdUid.title = u.id;
    tdUid.textContent = u.id ? u.id.slice(0, 8) + '…' : '—';
    tdUid.onclick = () => { navigator.clipboard.writeText(u.id); tdUid.textContent = '✓ kopiert'; setTimeout(() => { tdUid.textContent = u.id.slice(0, 8) + '…'; }, 1500); };
    tr.appendChild(tdUid);

    const tdRole = document.createElement('td');
    const roleSelect = document.createElement('select');
    roleSelect.className = 'role-select';
    ['user', 'moderator', 'admin'].forEach(r => {
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = r.charAt(0).toUpperCase() + r.slice(1);
      if (r === u.role) opt.selected = true;
      roleSelect.appendChild(opt);
    });
    roleSelect.addEventListener('change', () => changeRole(u.id, roleSelect.value));
    tdRole.appendChild(roleSelect);
    tr.appendChild(tdRole);

    const tdCreated = document.createElement('td');
    tdCreated.textContent = new Date(u.created_at).toLocaleDateString('de-DE');
    tr.appendChild(tdCreated);

    const tdScore = document.createElement('td');
    tdScore.textContent = u.score_count;
    tr.appendChild(tdScore);

    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    if (!u.active) {
      badge.className = 'badge badge-off';
      badge.textContent = 'Deaktiviert';
    } else if (!u.confirmed) {
      badge.className = 'badge badge-warn';
      badge.textContent = 'Unbestätigt';
    } else {
      badge.className = 'badge badge-ok';
      badge.textContent = 'Aktiv';
    }
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = document.createElement('td');
    tdActions.className = 'actions';

    if (u.role !== 'admin') {
      // Confirm button for unconfirmed users
      if (!u.confirmed) {
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-sm btn-primary';
        confirmBtn.textContent = 'Bestätigen';
        confirmBtn.addEventListener('click', () => confirmUser(u.id));
        tdActions.appendChild(confirmBtn);
      }

      const pwBtn = document.createElement('button');
      pwBtn.className = 'btn btn-sm';
      pwBtn.textContent = 'PW ändern';
      pwBtn.addEventListener('click', () => openPwModal(u.id));
      tdActions.appendChild(pwBtn);

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn btn-sm';
      toggleBtn.textContent = u.active ? 'Deaktivieren' : 'Aktivieren';
      toggleBtn.addEventListener('click', () => toggleActive(u.id, !u.active));
      tdActions.appendChild(toggleBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm btn-danger';
      delBtn.textContent = 'Löschen';
      delBtn.addEventListener('click', () => deleteUser(u.id, u.email));
      tdActions.appendChild(delBtn);
    } else {
      const note = document.createElement('span');
      note.style.cssText = 'font-size:11px; color:var(--text-dim)';
      note.textContent = 'Geschützt';
      tdActions.appendChild(note);
    }

    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

let pwModalUserId = null;

function openPwModal(id) {
  pwModalUserId = id;
  document.getElementById('pwModalInput').value = '';
  document.getElementById('pwModalError').textContent = '';
  document.getElementById('pwModalOverlay').classList.add('open');
  document.getElementById('pwModalInput').focus();
}

function closePwModal() {
  pwModalUserId = null;
  document.getElementById('pwModalOverlay').classList.remove('open');
}

async function submitPwModal() {
  const pw = document.getElementById('pwModalInput').value;
  const errEl = document.getElementById('pwModalError');
  errEl.textContent = '';
  if (!pw || pw.length < 6) { errEl.textContent = 'Mindestens 6 Zeichen erforderlich.'; return; }
  const res = await apiCall('PUT', 'api/users.php', { id: pwModalUserId, password: pw });
  if (res && res.ok) {
    closePwModal();
  } else {
    errEl.textContent = res?.detail?.message || res?.error || 'Fehler beim Speichern.';
  }
}

async function confirmUser(id) {
  await apiCall('PATCH', 'api/users.php', { id, confirm: true });
  loadUsers();
}

async function toggleActive(id, active) {
  await apiCall('PATCH', 'api/users.php', { id, active });
  loadUsers();
}

async function changeRole(id, role) {
  await apiCall('PUT', 'api/users.php?role=1', { id, role });
  loadUsers();
}

async function deleteUser(id, email) {
  if (!confirm(`Nutzer ${email} wirklich löschen? Das entfernt auch alle Highscores dieses Nutzers.`)) return;
  await apiCall('DELETE', `api/users.php?id=${encodeURIComponent(id)}`);
  loadUsers();
}

document.getElementById('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const display_name = document.getElementById('newUserName').value.trim();
  const email = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPassword').value;
  const password2 = document.getElementById('newUserPassword2').value;
  const errEl = document.getElementById('createError');
  errEl.textContent = '';
  if (password !== password2) { errEl.textContent = 'Passwörter stimmen nicht überein.'; return; }
  await apiCall('POST', 'api/users.php', { email, password, display_name, avatar: selectedAvatar });
  e.target.reset();
  selectedAvatar = '';
  document.getElementById('createError').textContent = '';
  document.querySelectorAll('.avatar-opt-admin').forEach(b => b.classList.remove('selected'));
  document.getElementById('createPanel').classList.remove('open');
  loadUsers();
});

buildAvatarPicker();
loadUsers();
</script>
<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
