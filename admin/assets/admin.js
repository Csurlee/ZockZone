function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

async function apiCall(method, url, body){
  try{
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if(!res.ok){
      alert('Fehler: ' + (data?.error || res.status));
      return null;
    }
    return data;
  } catch(e){
    alert('Netzwerkfehler: ' + e.message);
    return null;
  }
}
