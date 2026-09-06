<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'E-Mail';
$activeNav = 'email';
require __DIR__ . '/includes/layout_top.php';
?>

<style>
.mail-toggle-bar{
  display:flex; align-items:center; gap:16px;
  background:var(--card); border:1px solid rgba(255,255,255,0.06);
  border-radius:var(--radius); padding:18px 22px; margin-bottom:28px;
}
.mail-toggle-label{font-family:'Fredoka'; font-size:16px; flex:1;}
.mail-toggle-label small{display:block; font-family:'Inter'; font-size:12px; color:var(--text-dim); margin-top:2px; font-weight:400;}
.toggle-big{position:relative; display:inline-block; width:56px; height:30px; flex-shrink:0;}
.toggle-big input{opacity:0; width:0; height:0;}
.toggle-big span{
  position:absolute; inset:0; background:rgba(255,255,255,0.12);
  border-radius:999px; cursor:pointer; transition:.25s;
}
.toggle-big span::before{
  content:""; position:absolute; width:22px; height:22px;
  left:4px; top:4px; background:#fff; border-radius:50%; transition:.25s;
}
.toggle-big input:checked + span{background:var(--lime);}
.toggle-big input:checked + span::before{transform:translateX(26px); background:#14101F;}
.status-badge{padding:4px 12px; border-radius:999px; font-size:12px; font-weight:700;}

.mail-form{background:var(--card); border:1px solid rgba(255,255,255,0.06); border-radius:var(--radius); padding:24px; margin-bottom:24px;}
.mail-form.disabled{opacity:.45; pointer-events:none;}
.form-grid{display:grid; grid-template-columns:1fr 1fr; gap:14px 20px;}
@media(max-width:700px){.form-grid{grid-template-columns:1fr;}}
.form-group{display:flex; flex-direction:column; gap:6px;}
.form-group label{font-size:12px; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:.4px;}
.form-group input, .form-group select{
  padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);
  background:var(--bg-alt); color:var(--text); font-size:13.5px;
}
.form-group select option{background:var(--bg-alt);}
.form-actions{display:flex; gap:10px; align-items:center; margin-top:20px; flex-wrap:wrap;}
.form-msg{font-size:13px; padding:6px 12px; border-radius:6px;}
.form-msg.ok{background:rgba(198,255,61,0.12); color:var(--lime);}
.form-msg.err{background:rgba(255,107,74,0.12); color:var(--orange);}

.test-card{background:var(--card); border:1px solid rgba(255,255,255,0.06); border-radius:var(--radius); padding:22px;}
.test-card.disabled{opacity:.45; pointer-events:none;}
.test-row{display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;}
.test-row .form-group{flex:1; min-width:200px;}
</style>

<p class="admin-hint">SMTP-Konfiguration für den E-Mail-Versand aus dem Admin-Panel (z.B. Test-E-Mails). Die Supabase Auth-E-Mails (Bestätigung, Passwort-Reset) werden separat über die Supabase-Einstellungen gesteuert.</p>

<!-- Toggle-Riegel -->
<div class="mail-toggle-bar">
  <div class="mail-toggle-label">
    E-Mail-Versand
    <small>Aktiviert oder deaktiviert den SMTP-Versand glob für diesen Server</small>
  </div>
  <span id="statusBadge" class="status-badge"></span>
  <label class="toggle-big">
    <input type="checkbox" id="enabledToggle" onchange="toggleEnabled(this.checked)">
    <span></span>
  </label>
</div>

<!-- SMTP-Einstellungen -->
<div class="mail-form" id="smtpForm">
  <h3>SMTP-Server</h3>
  <div class="form-grid">
    <div class="form-group" style="grid-column:span 2 / span 2">
      <label>SMTP-Host</label>
      <input id="smtp_host" type="text" placeholder="smtp.example.com">
    </div>
    <div class="form-group">
      <label>Port</label>
      <input id="smtp_port" type="number" placeholder="587">
    </div>
    <div class="form-group">
      <label>Verschlüsselung</label>
      <select id="smtp_encryption">
        <option value="tls">STARTTLS (Port 587)</option>
        <option value="ssl">SSL/TLS (Port 465)</option>
        <option value="none">Keine</option>
      </select>
    </div>
    <div class="form-group">
      <label>Benutzername</label>
      <input id="smtp_user" type="text" autocomplete="off" placeholder="user@example.com">
    </div>
    <div class="form-group">
      <label>Passwort</label>
      <input id="smtp_password" type="password" autocomplete="new-password" placeholder="Leer lassen = nicht ändern">
    </div>
  </div>

  <h3 style="margin-top:22px;">Absender</h3>
  <div class="form-grid">
    <div class="form-group">
      <label>Anzeigename</label>
      <input id="from_name" type="text" placeholder="ZockZone">
    </div>
    <div class="form-group">
      <label>Absender-E-Mail</label>
      <input id="from_email" type="email" placeholder="noreply@example.com">
    </div>
  </div>

  <div class="form-actions">
    <button class="btn btn-primary" onclick="saveSettings()">Speichern</button>
    <span id="saveMsg" class="form-msg" style="display:none;"></span>
  </div>
</div>

<!-- Test-E-Mail -->
<div class="test-card" id="testCard">
  <h3>Test-E-Mail senden</h3>
  <div class="test-row">
    <div class="form-group">
      <label>Empfänger</label>
      <input id="testTo" type="email" placeholder="admin@example.com">
    </div>
    <button class="btn btn-primary" onclick="sendTest()" style="height:42px;">Senden</button>
    <span id="testMsg" class="form-msg" style="display:none;"></span>
  </div>
</div>

<script>
let currentEnabled = false;

async function loadSettings(){
  const s = await apiCall('GET', 'api/email.php');
  currentEnabled = s.enabled;

  document.getElementById('enabledToggle').checked = s.enabled;
  updateBadge(s.enabled);
  updateDisabled(s.enabled);

  document.getElementById('smtp_host').value       = s.smtp_host       || '';
  document.getElementById('smtp_port').value       = s.smtp_port       || 587;
  document.getElementById('smtp_encryption').value = s.smtp_encryption || 'tls';
  document.getElementById('smtp_user').value       = s.smtp_user       || '';
  document.getElementById('smtp_password').value   = s.smtp_password   || '';
  document.getElementById('from_name').value       = s.from_name       || '';
  document.getElementById('from_email').value      = s.from_email      || '';
}

function updateBadge(enabled){
  const b = document.getElementById('statusBadge');
  b.textContent  = enabled ? 'Aktiv' : 'Deaktiviert';
  b.style.background = enabled ? 'rgba(198,255,61,0.15)' : 'rgba(255,107,74,0.15)';
  b.style.color      = enabled ? 'var(--lime)' : 'var(--orange)';
}

function updateDisabled(enabled){
  document.getElementById('smtpForm').classList.toggle('disabled', !enabled);
  document.getElementById('testCard').classList.toggle('disabled', !enabled);
}

async function toggleEnabled(val){
  updateBadge(val);
  updateDisabled(val);
  await apiCall('POST', 'api/email.php', { action:'toggle', enabled: val });
  currentEnabled = val;
}

async function postEmail(body){
  const res  = await fetch('api/email.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, data: json };
}

async function saveSettings(){
  const msg = document.getElementById('saveMsg');
  msg.style.display = 'none';
  const { ok, data } = await postEmail({
    action:           'save',
    enabled:          currentEnabled,
    smtp_host:        document.getElementById('smtp_host').value.trim(),
    smtp_port:        parseInt(document.getElementById('smtp_port').value) || 587,
    smtp_encryption:  document.getElementById('smtp_encryption').value,
    smtp_user:        document.getElementById('smtp_user').value.trim(),
    smtp_password:    document.getElementById('smtp_password').value,
    from_name:        document.getElementById('from_name').value.trim(),
    from_email:       document.getElementById('from_email').value.trim(),
  });
  if(ok){
    msg.textContent = '✓ Gespeichert';
    msg.className = 'form-msg ok';
    msg.style.display = '';
    setTimeout(() => msg.style.display = 'none', 3000);
  } else {
    msg.textContent = '✗ ' + (data.error || 'Unbekannter Fehler');
    msg.className = 'form-msg err';
    msg.style.display = '';
  }
}

async function sendTest(){
  const btn = event.target;
  const msg = document.getElementById('testMsg');
  const to  = document.getElementById('testTo').value.trim();
  msg.style.display = 'none';
  if(!to){ msg.textContent = 'Bitte Empfänger eingeben'; msg.className='form-msg err'; msg.style.display=''; return; }
  btn.disabled = true;
  btn.textContent = 'Sende…';
  const { ok, data } = await postEmail({ action:'test', to });
  if(ok){
    msg.textContent = '✓ Test-E-Mail gesendet';
    msg.className = 'form-msg ok';
  } else {
    msg.textContent = '✗ ' + (data.error || 'Unbekannter Fehler');
    msg.className = 'form-msg err';
  }
  msg.style.display = '';
  btn.disabled = false;
  btn.textContent = 'Senden';
}

loadSettings();
</script>

<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
