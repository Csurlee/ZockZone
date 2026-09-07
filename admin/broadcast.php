<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'Broadcast';
$activeNav = 'broadcast';
require __DIR__ . '/includes/layout_top.php';
?>

<style>
.bc-hint{
  background:rgba(198,255,61,.07); border:1px solid rgba(198,255,61,.2);
  border-radius:10px; padding:14px 18px; font-size:13px; color:#B8D45A;
  margin-bottom:24px; display:flex; align-items:center; gap:10px;
}
.bc-count{ font-family:'Fredoka'; font-size:22px; color:var(--lime); }

.bc-form{
  background:var(--card); border:1px solid rgba(255,255,255,0.06);
  border-radius:var(--radius); padding:28px; margin-bottom:20px;
}
.bc-form h3{ margin:0 0 20px; font-size:16px; }

.bc-row{ display:flex; gap:14px; align-items:flex-start; margin-bottom:16px; }
.bc-row .form-group{ flex:1; }

.icon-picker{ display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; }
.icon-pick-btn{
  background:var(--bg-alt); border:1px solid rgba(255,255,255,0.1);
  border-radius:8px; padding:6px 10px; font-size:20px;
  cursor:pointer; transition:border-color .15s, background .15s;
  line-height:1;
}
.icon-pick-btn:hover{ background:rgba(124,58,237,.2); border-color:#7C3AED; }
.icon-pick-btn.active{ background:rgba(124,58,237,.25); border-color:#7C3AED; }

.bc-subject-input, .bc-message-input{
  width:100%; box-sizing:border-box;
  background:var(--bg-alt); border:1px solid rgba(255,255,255,0.1);
  border-radius:8px; padding:11px 14px; color:var(--text);
  font-size:14px; font-family:'Inter',sans-serif; outline:none;
  transition:border-color .15s;
}
.bc-subject-input:focus, .bc-message-input:focus{ border-color:#7C3AED; }
.bc-message-input{ resize:vertical; min-height:130px; line-height:1.6; }

.bc-actions{ display:flex; gap:10px; align-items:center; margin-top:8px; flex-wrap:wrap; }
.form-msg{ font-size:13px; padding:6px 12px; border-radius:6px; }
.form-msg.ok{ background:rgba(198,255,61,0.12); color:var(--lime); }
.form-msg.err{ background:rgba(255,107,74,0.12); color:var(--orange); }

/* Preview modal */
.bc-modal-bg{
  position:fixed; inset:0; background:rgba(0,0,0,.75); backdrop-filter:blur(6px);
  z-index:500; display:flex; align-items:center; justify-content:center;
}
.bc-modal{
  background:#1A1428; border:1px solid rgba(255,255,255,0.1);
  border-radius:16px; padding:20px; width:min(600px,95vw);
  max-height:90vh; display:flex; flex-direction:column; gap:14px;
}
.bc-modal-head{ display:flex; justify-content:space-between; align-items:center; }
.bc-modal-head h3{ margin:0; font-size:16px; }
.bc-modal-close{
  background:transparent; border:none; color:#888;
  font-size:18px; cursor:pointer; padding:4px; line-height:1;
}
.bc-modal-close:hover{ color:#fff; }
.bc-preview-frame{
  border:none; border-radius:10px; flex:1;
  min-height:400px; background:#14101F;
}

/* Confirm overlay */
.bc-confirm{
  background:var(--card); border:1px solid rgba(255,107,74,.3);
  border-radius:12px; padding:20px 24px; margin-top:16px;
  display:none;
}
.bc-confirm p{ margin:0 0 16px; font-size:14px; line-height:1.6; }
.bc-confirm strong{ color:var(--orange); }
.bc-confirm-btns{ display:flex; gap:10px; }
.btn-danger{ background:#C0392B; color:#fff; }
.btn-danger:hover{ background:#A93226; }
</style>

<p class="admin-hint">Broadcast-E-Mails werden an alle nicht-Admin-Nutzer gesendet. Die E-Mail nutzt das gleiche Design wie die Registrierungs-E-Mail.</p>

<!-- Empfänger-Zahl -->
<div class="bc-hint">
  <span>👥</span>
  <span>Empfänger: <span class="bc-count" id="recipientCount">…</span> Nutzer</span>
</div>

<!-- Compose-Formular -->
<div class="bc-form">
  <h3>📢 Neue Broadcast-Nachricht</h3>

  <div class="form-group" style="margin-bottom:16px">
    <label class="form-label">Icon auswählen</label>
    <div class="icon-picker" id="iconPicker">
      <?php foreach(['📢','📣','🎉','🎮','⚡','🔔','🏆','🎁','🚀','🛠️','⚠️','💡'] as $em): ?>
        <button class="icon-pick-btn <?= $em==='📢'?'active':'' ?>"
                onclick="pickIcon(this,'<?= $em ?>')"><?= $em ?></button>
      <?php endforeach; ?>
    </div>
    <input type="hidden" id="selectedIcon" value="📢">
  </div>

  <div class="form-group" style="margin-bottom:16px">
    <label class="form-label">Betreff</label>
    <input id="bcSubject" class="bc-subject-input" type="text"
           placeholder="z.B. Neues Feature: Online-Modus!" maxlength="120">
  </div>

  <div class="form-group" style="margin-bottom:4px">
    <label class="form-label">Nachricht</label>
    <textarea id="bcMessage" class="bc-message-input"
              placeholder="Schreib hier deine Nachricht an alle Nutzer…"></textarea>
  </div>

  <div class="bc-actions">
    <button class="btn btn-secondary" onclick="previewEmail()">👁 Vorschau</button>
    <button class="btn btn-primary" onclick="askConfirm()">📤 Senden</button>
    <span id="bcMsg" class="form-msg" style="display:none"></span>
  </div>

  <!-- Bestätigung -->
  <div class="bc-confirm" id="bcConfirm">
    <p>
      ⚠️ Du bist dabei, eine E-Mail an <strong id="confirmCount">…</strong> Nutzer zu senden.<br>
      Dieser Vorgang kann nicht rückgängig gemacht werden.
    </p>
    <div class="bc-confirm-btns">
      <button class="btn btn-danger" onclick="sendBroadcast()" id="sendBtn">Jetzt senden</button>
      <button class="btn btn-secondary" onclick="document.getElementById('bcConfirm').style.display='none'">Abbrechen</button>
    </div>
  </div>
</div>

<!-- Preview-Modal -->
<div class="bc-modal-bg" id="previewModal" style="display:none" onclick="closePreview(event)">
  <div class="bc-modal" onclick="event.stopPropagation()">
    <div class="bc-modal-head">
      <h3>Vorschau</h3>
      <button class="bc-modal-close" onclick="closePreview()">✕</button>
    </div>
    <iframe id="previewFrame" class="bc-preview-frame" srcdoc=""></iframe>
  </div>
</div>

<script>
function pickIcon(btn, icon) {
  document.querySelectorAll('.icon-pick-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('selectedIcon').value = icon;
}

function getFormData() {
  return {
    icon:    document.getElementById('selectedIcon').value,
    subject: document.getElementById('bcSubject').value.trim(),
    message: document.getElementById('bcMessage').value.trim(),
  };
}

function showMsg(text, type) {
  const el = document.getElementById('bcMsg');
  el.textContent = text;
  el.className = 'form-msg ' + type;
  el.style.display = '';
  if(type === 'ok') setTimeout(() => el.style.display = 'none', 5000);
}

async function previewEmail() {
  const d = getFormData();
  if(!d.subject || !d.message) { showMsg('Betreff und Nachricht eingeben.', 'err'); return; }
  const res  = await fetch('api/broadcast.php', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({action:'preview', ...d}),
  });
  const json = await res.json().catch(() => ({}));
  if(!res.ok) { showMsg('Fehler: ' + (json.error || '?'), 'err'); return; }
  document.getElementById('previewFrame').srcdoc = json.html;
  document.getElementById('previewModal').style.display = 'flex';
}

function closePreview(e) {
  if(!e || e.target === document.getElementById('previewModal'))
    document.getElementById('previewModal').style.display = 'none';
}

function askConfirm() {
  const d = getFormData();
  if(!d.subject || !d.message) { showMsg('Betreff und Nachricht eingeben.', 'err'); return; }
  const cnt = document.getElementById('recipientCount').textContent;
  document.getElementById('confirmCount').textContent = cnt;
  const conf = document.getElementById('bcConfirm');
  conf.style.display = conf.style.display === 'none' ? '' : 'none';
}

async function sendBroadcast() {
  const btn = document.getElementById('sendBtn');
  const d   = getFormData();
  btn.disabled = true;
  btn.textContent = 'Sende…';
  document.getElementById('bcConfirm').style.display = 'none';

  const res  = await fetch('api/broadcast.php', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({action:'send', ...d}),
  });
  const json = await res.json().catch(() => ({}));

  btn.disabled = false;
  btn.textContent = 'Jetzt senden';

  if(!res.ok) {
    showMsg('Fehler: ' + (json.error || '?'), 'err');
    return;
  }

  let msg = '✓ Gesendet: ' + json.sent + ' E-Mail(s)';
  if(json.errors && json.errors.length > 0)
    msg += ' · ' + json.errors.length + ' Fehler';
  showMsg(msg, 'ok');

  if(json.errors && json.errors.length > 0)
    console.warn('Broadcast-Fehler:', json.errors);
}

async function loadRecipientCount() {
  const res  = await fetch('api/broadcast.php');
  const json = await res.json().catch(() => ({}));
  document.getElementById('recipientCount').textContent = json.count ?? '?';
  document.getElementById('confirmCount').textContent = json.count ?? '?';
}

loadRecipientCount();
</script>

<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
