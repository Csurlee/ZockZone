<?php
require_once __DIR__ . '/includes/auth_guard.php';
$pageTitle = 'Meldungen';
$activeNav = 'reports';
require __DIR__ . '/includes/layout_top.php';
?>
<p class="admin-hint">Hier landen alle Meldungen vom Knopf „🐞 Problem melden“ auf der ZockZone. Neueste zuerst.</p>
<div class="toolbar">
  <button class="btn btn-sm" data-filter="neu">Offen</button>
  <button class="btn btn-sm" data-filter="erledigt">Erledigt</button>
  <button class="btn btn-sm" data-filter="alle">Alle</button>
  <button class="btn btn-sm" id="reloadBtn">↻ Neu laden</button>
  <span id="reportCount" class="admin-hint" style="margin:0 0 0 auto"></span>
</div>
<div id="reportList"><p>Lade…</p></div>

<style>
  .report-card{background:var(--card,#1A1428); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:14px 16px; margin-bottom:12px;}
  .report-card.done{opacity:.6;}
  .report-head{display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:6px;}
  .report-title{font-weight:700; font-size:1.05rem;}
  .report-meta{font-size:.8rem; opacity:.7; display:flex; gap:12px; flex-wrap:wrap; margin-bottom:8px;}
  .report-desc{white-space:pre-wrap; word-break:break-word; line-height:1.5;}
  .report-actions{display:flex; gap:8px; margin-top:10px;}
  .toolbar [data-filter].active{outline:2px solid var(--lime,#C6FF3D);}
</style>

<script>
let reports = [];
let filter = 'neu';
const IS_ADMIN = <?= json_encode(($_SESSION['zz_admin_role'] ?? '') === 'admin') ?>;

function fmtTime(iso){
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString('de-DE', {dateStyle:'medium', timeStyle:'short'});
}

function render(){
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  const list = reports.filter(r => filter === 'alle' || r.status === filter);
  const open = reports.filter(r => r.status === 'neu').length;
  document.getElementById('reportCount').textContent = `${open} offen · ${reports.length} insgesamt`;
  const el = document.getElementById('reportList');
  if(!list.length){ el.innerHTML = '<p class="admin-hint">Keine Meldungen 🎉</p>'; return; }
  // Alle Texte von Besuchern werden mit escapeHtml entschärft (Schutz vor eingeschleustem Code)
  el.innerHTML = list.map(r => `
    <div class="report-card ${r.status === 'erledigt' ? 'done' : ''}">
      <div class="report-head">
        <span class="badge ${r.status === 'erledigt' ? 'badge-ok' : 'badge-warn'}">${r.status === 'erledigt' ? 'Erledigt' : 'Neu'}</span>
        <span class="report-title">${escapeHtml(r.title)}</span>
      </div>
      <div class="report-meta">
        <span>🕐 ${escapeHtml(fmtTime(r.time))}</span>
        ${r.game ? `<span>🎮 ${escapeHtml(r.game)}</span>` : ''}
        ${r.name ? `<span>👤 ${escapeHtml(r.name)}</span>` : '<span>👤 Gast</span>'}
        ${r.lang ? `<span>🌐 ${escapeHtml(r.lang.toUpperCase())}</span>` : ''}
        ${r.ua ? `<span title="${escapeHtml(r.ua).replace(/"/g,'&quot;')}">💻 ${escapeHtml(shortUa(r.ua))}</span>` : ''}
      </div>
      <div class="report-desc">${escapeHtml(r.description)}</div>
      <div class="report-actions">
        ${r.status === 'erledigt'
          ? `<button class="btn btn-sm" data-act="open" data-id="${r.id}">↩ Wieder öffnen</button>`
          : `<button class="btn btn-sm btn-primary" data-act="done" data-id="${r.id}">✔ Erledigt</button>`}
        ${IS_ADMIN ? `<button class="btn btn-sm btn-danger" data-act="delete" data-id="${r.id}">🗑 Löschen</button>` : ''}
      </div>
    </div>`).join('');
}

function shortUa(ua){
  const b = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return b + (os ? ' · ' + os : '');
}

async function load(){
  const data = await apiCall('GET', 'api/reports.php');
  if(Array.isArray(data)){ reports = data; render(); }
}

document.addEventListener('click', async e => {
  const f = e.target.closest('[data-filter]');
  if(f){ filter = f.dataset.filter; render(); return; }
  if(e.target.id === 'reloadBtn'){ load(); return; }
  const b = e.target.closest('[data-act]');
  if(!b) return;
  const { act, id } = b.dataset;
  if(act === 'delete' && !confirm('Diese Meldung wirklich löschen?')) return;
  const res = await apiCall('POST', 'api/reports.php', { id, action: act });
  if(res) load();
});

load();
</script>
<?php require __DIR__ . '/includes/layout_bottom.php'; ?>
