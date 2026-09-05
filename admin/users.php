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
  <input type="email" id="newUserEmail" placeholder="E-Mail" required>
  <input type="password" id="newUserPassword" placeholder="Passwort (min. 6 Zeichen)" required minlength="6">
  <button type="submit" class="btn btn-primary">Anlegen</button>
</form>

<table class="data-table" id="usersTable">
  <thead>
    <tr><th>E-Mail</th><th>Anzeigename</th><th>Registriert</th><th>Highscores</th><th>Status</th><th>Aktionen</th></tr>
  </thead>
  <tbody><tr><td colspan="6">Lade…</td></tr></tbody>
</table>

<script>
async function loadUsers(){
  const users = await apiCall('GET', 'api/users.php');
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';
  if(!Array.isArray(users) || users.length===0){
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = 'Keine Nutzer.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  users.forEach(u => {
    const tr = document.createElement('tr');

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
  const email = document.getElementById('newUserEmail').value;
  const password = document.getElementById('newUserPassword').value;
  await apiCall('POST', 'api/users.php', { email, password });
  e.target.reset();
  e.target.classList.remove('open');
  loadUsers();
});

loadUsers();
</script>
<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
