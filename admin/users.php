<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'Nutzer';
$activeNav = 'users';
require __DIR__ . '/includes/layout_top.php';
?>
<div class="toolbar">
  <button class="btn btn-primary" onclick="document.getElementById('createUserForm').classList.toggle('open')">+ Nutzer anlegen</button>
</div>

<form id="createUserForm" class="inline-form">
  <input type="text" id="newUserName" placeholder="Anzeigename">
  <input type="email" id="newUserEmail" placeholder="E-Mail" required>
  <input type="password" id="newUserPassword" placeholder="Passwort (min. 6 Zeichen)" required minlength="6">
  <div class="avatar-picker-label">Avatar wählen:</div>
  <div class="avatar-picker" id="adminAvatarPicker"></div>
  <button type="submit" class="btn btn-primary">Anlegen</button>
</form>

<table class="data-table" id="usersTable">
  <thead>
    <tr><th>Avatar</th><th>E-Mail</th><th>Anzeigename</th><th>Registriert</th><th>Highscores</th><th>Status</th><th>Aktionen</th></tr>
  </thead>
  <tbody><tr><td colspan="7">Lade…</td></tr></tbody>
</table>

<style>
.avatar-picker-label { font-size: 13px; color: var(--text-dim, #888); margin-top: 6px; }
.avatar-picker { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 12px; }
.avatar-opt-admin {
  width: 44px; height: 44px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.12);
  cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-size: 20px; background: #1a1a2e; transition: border-color .15s;
}
.avatar-opt-admin.selected { border-color: #7C3AED; box-shadow: 0 0 8px rgba(124,58,237,0.4); }
.avatar-cell { font-size: 22px; text-align: center; }
</style>

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

function avatarEmoji(id) {
  return AVATARS.find(a => a.id === id)?.emoji ?? '👤';
}

function buildAvatarPicker() {
  const picker = document.getElementById('adminAvatarPicker');
  picker.innerHTML = '';
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

async function loadUsers(){
  const users = await apiCall('GET', 'api/users.php');
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';
  if(!Array.isArray(users) || users.length===0){
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
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

    const tdCreated = document.createElement('td');
    tdCreated.textContent = new Date(u.created_at).toLocaleDateString('de-DE');
    tr.appendChild(tdCreated);

    const tdScore = document.createElement('td');
    tdScore.textContent = u.score_count;
    tr.appendChild(tdScore);

    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = u.active ? 'badge badge-ok' : 'badge badge-off';
    badge.textContent = u.active ? 'Aktiv' : 'Deaktiviert';
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = document.createElement('td');
    tdActions.className = 'actions';

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

    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

async function toggleActive(id, active){
  await apiCall('PATCH', 'api/users.php', { id, active });
  loadUsers();
}

async function deleteUser(id, email){
  if(!confirm(`Nutzer ${email} wirklich löschen? Das entfernt auch alle Highscores dieses Nutzers.`)) return;
  await apiCall('DELETE', `api/users.php?id=${encodeURIComponent(id)}`);
  loadUsers();
}

document.getElementById('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const display_name = document.getElementById('newUserName').value.trim();
  const email = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPassword').value;
  await apiCall('POST', 'api/users.php', { email, password, display_name, avatar: selectedAvatar });
  e.target.reset();
  selectedAvatar = '';
  document.querySelectorAll('.avatar-opt-admin').forEach(b => b.classList.remove('selected'));
  e.target.classList.remove('open');
  loadUsers();
});

buildAvatarPicker();
loadUsers();
</script>
<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
