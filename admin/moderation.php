<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'Chat-Moderation';
$activeNav = 'moderation';
require __DIR__ . '/includes/layout_top.php';
?>

<style>
.mod-grid{display:grid; grid-template-columns:1fr 360px; gap:20px; align-items:start;}
@media(max-width:900px){.mod-grid{grid-template-columns:1fr;}}

/* Chat panel */
.mod-card{background:var(--card); border:1px solid rgba(255,255,255,0.06); border-radius:var(--radius); overflow:hidden;}
.mod-card-head{padding:16px 18px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:space-between;}
.mod-card-head h3{margin:0; font-size:15px;}
.chat-list{max-height:520px; overflow-y:auto;}
.chat-row{
  display:flex; align-items:flex-start; gap:10px;
  padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.04);
  transition:background .1s;
}
.chat-row:hover{background:rgba(255,255,255,.03);}
.chat-row-av{font-size:20px; flex-shrink:0; line-height:1; margin-top:2px;}
.chat-row-body{flex:1; min-width:0;}
.chat-row-meta{font-size:11px; color:var(--text-dim); margin-bottom:3px; display:flex; gap:6px; flex-wrap:wrap;}
.chat-row-text{font-size:13px; color:var(--text); line-height:1.5; word-break:break-word;}
.chat-row-actions{display:flex; gap:6px; flex-shrink:0; align-items:flex-start;}
.btn-icon{
  background:transparent; border:1px solid rgba(255,255,255,0.1); border-radius:6px;
  color:var(--text-dim); padding:4px 8px; font-size:12px; cursor:pointer;
  transition:border-color .15s,color .15s;
}
.btn-icon:hover{border-color:var(--orange); color:var(--orange);}
.btn-icon.mute-btn:hover{border-color:#FFA500; color:#FFA500;}
.empty-hint{padding:28px; text-align:center; color:var(--text-dim); font-size:13px;}

/* Right column */
.side-card{background:var(--card); border:1px solid rgba(255,255,255,0.06); border-radius:var(--radius); margin-bottom:16px;}
.side-card-head{padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.06);}
.side-card-head h3{margin:0; font-size:14px;}
.side-card-body{padding:14px 16px;}

.word-list{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; min-height:30px;}
.word-tag{
  background:rgba(255,107,74,.12); border:1px solid rgba(255,107,74,.25);
  border-radius:6px; padding:3px 10px; font-size:12px; color:#FF9B7A;
  display:flex; align-items:center; gap:6px; font-family:'JetBrains Mono',monospace;
}
.word-tag button{
  background:transparent; border:none; color:inherit; cursor:pointer;
  font-size:14px; line-height:1; padding:0; opacity:.7;
}
.word-tag button:hover{opacity:1;}
.word-input-row{display:flex; gap:8px;}
.word-input{
  flex:1; background:var(--bg-alt); border:1px solid rgba(255,255,255,0.1);
  border-radius:7px; padding:8px 10px; color:var(--text); font-size:13px; outline:none;
}
.word-input:focus{border-color:#7C3AED;}

.mute-list{display:flex; flex-direction:column; gap:8px; margin-bottom:12px; min-height:30px;}
.mute-row{
  background:var(--bg-alt); border-radius:8px; padding:8px 10px;
  display:flex; justify-content:space-between; align-items:center; gap:8px;
}
.mute-info{min-width:0;}
.mute-email{font-size:12px; color:var(--text); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.mute-until{font-size:11px; color:var(--text-dim); margin-top:2px;}

/* Mute modal */
.mute-modal-bg{
  position:fixed; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(6px);
  z-index:500; display:flex; align-items:center; justify-content:center;
}
.mute-modal{
  background:#1A1428; border:1px solid rgba(255,255,255,.1);
  border-radius:14px; padding:24px; width:min(360px,92vw);
}
.mute-modal h3{margin:0 0 16px; font-size:16px;}
.mute-modal .form-group{margin-bottom:12px;}
.mute-modal .form-label{display:block; font-size:11px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.4px; margin-bottom:5px;}
.mute-modal input, .mute-modal select{
  width:100%; box-sizing:border-box;
  background:var(--bg-alt); border:1px solid rgba(255,255,255,.1);
  border-radius:7px; padding:9px 11px; color:var(--text); font-size:13px; outline:none;
}
.mute-modal input:focus, .mute-modal select:focus{border-color:#7C3AED;}
.mute-modal-btns{display:flex; gap:8px; margin-top:16px;}

.form-msg{font-size:12px; padding:4px 10px; border-radius:5px; margin-top:6px;}
.form-msg.ok{background:rgba(198,255,61,.12); color:var(--lime);}
.form-msg.err{background:rgba(255,107,74,.12); color:var(--orange);}
</style>

<p class="admin-hint">Chat-Nachrichten moderieren, verbotene Wörter verwalten und Nutzer stummschalten.</p>

<div class="mod-grid">

  <!-- Left: Chat messages -->
  <div class="mod-card">
    <div class="mod-card-head">
      <h3>💬 Letzte Nachrichten</h3>
      <button class="btn btn-secondary" onclick="loadMessages()" style="font-size:12px;padding:6px 12px;">↺ Aktualisieren</button>
    </div>
    <div class="chat-list" id="chatList">
      <div class="empty-hint">Lade…</div>
    </div>
  </div>

  <!-- Right: Word list + Muted users -->
  <div>

    <!-- Banned words -->
    <div class="side-card">
      <div class="side-card-head"><h3>🚫 Verbotene Wörter</h3></div>
      <div class="side-card-body">
        <div class="word-list" id="wordList"></div>
        <div class="word-input-row">
          <input id="newWord" class="word-input" type="text" placeholder="Neues Wort…" maxlength="60"
                 onkeydown="if(event.key==='Enter') addWord()">
          <button class="btn btn-primary" onclick="addWord()" style="white-space:nowrap">+ Hinzufügen</button>
        </div>
        <div id="wordMsg" class="form-msg" style="display:none"></div>
      </div>
    </div>

    <!-- Muted users -->
    <div class="side-card">
      <div class="side-card-head"><h3>🔇 Stummgeschaltete Nutzer</h3></div>
      <div class="side-card-body">
        <div class="mute-list" id="muteList"><div style="font-size:12px;color:var(--text-dim)">Niemand stummgeschaltet.</div></div>
        <div id="muteMsg" class="form-msg" style="display:none"></div>
      </div>
    </div>

    <!-- Moderators -->
    <div class="side-card">
      <div class="side-card-head"><h3>🛡 Moderatoren</h3></div>
      <div class="side-card-body">
        <div id="modList" style="margin-bottom:12px;display:flex;flex-direction:column;gap:6px;">
          <div style="font-size:12px;color:var(--text-dim)">Lade…</div>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px;">Nutzer suchen &amp; Rolle setzen</div>
        <input id="modSearch" class="word-input" type="text" placeholder="Name oder E-Mail…"
               oninput="searchUsers(this.value)" autocomplete="off">
        <div id="modSearchResults" style="margin-top:6px;display:flex;flex-direction:column;gap:4px;"></div>
        <div id="modMsg" class="form-msg" style="display:none"></div>
      </div>
    </div>

  </div>
</div>

<!-- Mute modal -->
<div class="mute-modal-bg" id="muteModal" style="display:none" onclick="if(event.target===this) closeMuteModal()">
  <div class="mute-modal">
    <h3>🔇 Nutzer stummschalten</h3>
    <input type="hidden" id="muteUserId">
    <div class="form-group">
      <label class="form-label">Nutzer</label>
      <input id="muteUserEmail" type="text" readonly style="opacity:.7">
    </div>
    <div class="form-group">
      <label class="form-label">Dauer</label>
      <select id="muteDuration">
        <option value="10">10 Minuten</option>
        <option value="30">30 Minuten</option>
        <option value="60" selected>1 Stunde</option>
        <option value="360">6 Stunden</option>
        <option value="1440">24 Stunden</option>
        <option value="10080">7 Tage</option>
        <option value="525600">Dauerhaft (1 Jahr)</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Grund (optional)</label>
      <input id="muteReason" type="text" placeholder="Regelverstoß…" maxlength="100">
    </div>
    <div class="mute-modal-btns">
      <button class="btn btn-primary" onclick="confirmMute()">Stummschalten</button>
      <button class="btn btn-secondary" onclick="closeMuteModal()">Abbrechen</button>
    </div>
  </div>
</div>

<script>
const AVATARS = {snake:'🐍',alien:'👾',rocket:'🚀',bomb:'💣',dice:'🎲',joker:'🃏',puzzle:'🧩',lightning:'⚡',ghost:'👻',trophy:'🏆'};
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const av  = a => AVATARS[a] || '👤';

function fmtDate(iso){ return new Date(iso).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }

// ===== MESSAGES =====
async function loadMessages(){
  const res  = await fetch('api/moderation.php?action=messages');
  const data = await res.json();
  const list = document.getElementById('chatList');
  if(!data.length){ list.innerHTML = '<div class="empty-hint">Keine Nachrichten.</div>'; return; }
  list.innerHTML = data.map(m => `
    <div class="chat-row" id="mrow-${esc(m.id)}">
      <div class="chat-row-av">${av(m.avatar)}</div>
      <div class="chat-row-body">
        <div class="chat-row-meta">
          <strong>${esc(m.username)}</strong>
          <span>${fmtDate(m.created_at)}</span>
        </div>
        <div class="chat-row-text">${esc(m.message)}</div>
      </div>
      <div class="chat-row-actions">
        <button class="btn-icon mute-btn" title="Stummschalten"
                onclick="openMuteModal('${esc(m.user_id)}','${esc(m.username)}')">🔇</button>
        <button class="btn-icon" title="Löschen"
                onclick="deleteMessage('${esc(m.id)}', this)">🗑</button>
      </div>
    </div>
  `).join('');
}

async function deleteMessage(id, btn){
  if(!confirm('Nachricht löschen?')) return;
  btn.disabled = true;
  const res = await fetch('api/moderation.php?action=message&id=' + encodeURIComponent(id), {method:'DELETE'});
  if(res.ok){
    const row = document.getElementById('mrow-' + id);
    if(row) row.remove();
  } else {
    btn.disabled = false;
    alert('Fehler beim Löschen');
  }
}

// ===== WORDS =====
async function loadWords(){
  const res  = await fetch('api/moderation.php?action=words');
  const data = await res.json();
  const list = document.getElementById('wordList');
  if(!data.length){ list.innerHTML = '<span style="font-size:12px;color:var(--text-dim)">Keine Wörter.</span>'; return; }
  list.innerHTML = data.map(w => `
    <span class="word-tag">
      ${esc(w.word)}
      <button title="Entfernen" onclick="removeWord('${esc(w.word)}', this)">✕</button>
    </span>
  `).join('');
}

async function addWord(){
  const input = document.getElementById('newWord');
  const word  = input.value.trim().toLowerCase();
  const msg   = document.getElementById('wordMsg');
  msg.style.display = 'none';
  if(!word || word.length < 2){ showWordMsg('Mindestens 2 Zeichen.','err'); return; }
  const res  = await fetch('api/moderation.php?action=words', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({word})
  });
  if(res.ok){ input.value = ''; loadWords(); showWordMsg('Wort hinzugefügt.','ok'); }
  else { const j = await res.json(); showWordMsg(j.error || 'Fehler','err'); }
}

async function removeWord(word, btn){
  btn.disabled = true;
  const res = await fetch('api/moderation.php?action=words&word=' + encodeURIComponent(word), {method:'DELETE'});
  if(res.ok) loadWords();
  else { btn.disabled = false; showWordMsg('Fehler beim Löschen','err'); }
}

function showWordMsg(text, type){
  const el = document.getElementById('wordMsg');
  el.textContent = text; el.className = 'form-msg ' + type; el.style.display = '';
  setTimeout(()=>el.style.display='none', 3000);
}

// ===== MUTES =====
async function loadMutes(){
  const res  = await fetch('api/moderation.php?action=mutes');
  const data = await res.json();
  const list = document.getElementById('muteList');
  const active = data.filter(m => new Date(m.muted_until) > new Date());
  if(!active.length){ list.innerHTML = '<div style="font-size:12px;color:var(--text-dim)">Niemand stummgeschaltet.</div>'; return; }
  list.innerHTML = active.map(m => `
    <div class="mute-row">
      <div class="mute-info">
        <div class="mute-email">${esc(m.email)}</div>
        <div class="mute-until">bis ${fmtDate(m.muted_until)}${m.reason?' · '+esc(m.reason):''}</div>
      </div>
      <button class="btn-icon" title="Stummschaltung aufheben"
              onclick="unmute('${esc(m.user_id)}', this)">✕</button>
    </div>
  `).join('');
}

function openMuteModal(userId, username){
  document.getElementById('muteUserId').value     = userId;
  document.getElementById('muteUserEmail').value  = username;
  document.getElementById('muteReason').value     = '';
  document.getElementById('muteModal').style.display = 'flex';
}
function closeMuteModal(){ document.getElementById('muteModal').style.display = 'none'; }

async function confirmMute(){
  const userId  = document.getElementById('muteUserId').value;
  const minutes = parseInt(document.getElementById('muteDuration').value);
  const reason  = document.getElementById('muteReason').value.trim();
  const res = await fetch('api/moderation.php?action=mutes', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({user_id:userId, minutes, reason})
  });
  closeMuteModal();
  if(res.ok){ loadMutes(); showMuteMsg('Nutzer stummgeschaltet.','ok'); }
  else       { showMuteMsg('Fehler','err'); }
}

async function unmute(userId, btn){
  btn.disabled = true;
  const res = await fetch('api/moderation.php?action=mutes&user_id=' + encodeURIComponent(userId), {method:'DELETE'});
  if(res.ok) loadMutes();
  else { btn.disabled = false; }
}

function showMuteMsg(text, type){
  const el = document.getElementById('muteMsg');
  el.textContent = text; el.className = 'form-msg ' + type; el.style.display = '';
  setTimeout(()=>el.style.display='none', 3000);
}

// ===== MODERATORS =====
const ROLE_LABELS = {user:'Nutzer', moderator:'🛡 Moderator', admin:'⚡ Admin'};
const ROLE_COLORS = {user:'var(--text-dim)', moderator:'#A78BFA', admin:'var(--lime)'};

async function loadModerators(){
  const res  = await fetch('api/moderation.php?action=moderators');
  const data = await res.json();
  const list = document.getElementById('modList');
  if(!data.length){ list.innerHTML = '<div style="font-size:12px;color:var(--text-dim)">Keine Moderatoren.</div>'; return; }
  list.innerHTML = data.map(u => `
    <div class="mute-row">
      <div class="mute-info">
        <div class="mute-email">${esc(u.display_name || u.email || u.id)}</div>
        <div class="mute-until" style="color:${ROLE_COLORS[u.role]||'var(--text-dim)'}">${ROLE_LABELS[u.role]||u.role}</div>
      </div>
      ${u.role !== 'admin' ? `<button class="btn-icon" title="Moderator entfernen"
        onclick="setRole('${esc(u.id)}','user',this)">✕</button>` : ''}
    </div>
  `).join('');
}

let searchTimer = null;
function searchUsers(q){
  clearTimeout(searchTimer);
  if(q.length < 2){ document.getElementById('modSearchResults').innerHTML=''; return; }
  searchTimer = setTimeout(async () => {
    const res  = await fetch('api/moderation.php?action=search_users&q=' + encodeURIComponent(q));
    const data = await res.json();
    const el   = document.getElementById('modSearchResults');
    if(!data.length){ el.innerHTML = '<div style="font-size:12px;color:var(--text-dim)">Keine Ergebnisse.</div>'; return; }
    el.innerHTML = data.map(u => `
      <div class="mute-row">
        <div class="mute-info">
          <div class="mute-email">${esc(u.display_name || u.email || u.id)}</div>
          <div class="mute-until" style="color:${ROLE_COLORS[u.role]||'var(--text-dim)'}">${ROLE_LABELS[u.role]||u.role}</div>
        </div>
        <div style="display:flex;gap:4px">
          ${u.role !== 'moderator' ? `<button class="btn btn-primary" style="font-size:11px;padding:4px 8px"
            onclick="setRole('${esc(u.id)}','moderator',this)">🛡 Mod</button>` : ''}
          ${u.role !== 'admin' ? `<button class="btn btn-secondary" style="font-size:11px;padding:4px 8px"
            onclick="setRole('${esc(u.id)}','user',this)">Nutzer</button>` : ''}
        </div>
      </div>
    `).join('');
  }, 350);
}

async function setRole(userId, role, btn){
  btn.disabled = true;
  const res = await fetch('api/moderation.php?action=set_role', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({user_id:userId, role})
  });
  btn.disabled = false;
  if(res.ok){
    loadModerators();
    showModMsg(role==='moderator' ? '🛡 Moderator gesetzt.' : 'Rolle zurückgesetzt.', 'ok');
    document.getElementById('modSearch').value = '';
    document.getElementById('modSearchResults').innerHTML = '';
  } else {
    showModMsg('Fehler','err');
  }
}

function showModMsg(text, type){
  const el = document.getElementById('modMsg');
  el.textContent = text; el.className = 'form-msg ' + type; el.style.display = '';
  setTimeout(()=>el.style.display='none', 3000);
}

loadMessages();
loadWords();
loadMutes();
loadModerators();
</script>

<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
