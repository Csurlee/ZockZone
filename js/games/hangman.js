import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Fehler','hangErr']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='420px';
  const wordEl=document.createElement('div');
  wordEl.style.cssText='font-family:"JetBrains Mono"; font-size:26px; letter-spacing:6px; text-align:center; margin:10px 0;';
  const figureEl=document.createElement('div');
  figureEl.style.cssText='font-size:40px; text-align:center;';
  const kbDiv=document.createElement('div');
  kbDiv.style.cssText='display:flex; flex-wrap:wrap; gap:6px; justify-content:center; max-width:400px;';
  wrap.append(figureEl, wordEl);
  playerBody.append(scoreEl, wrap, kbDiv, mkHint('Errate das Wort, bevor du 6 Fehler machst.'));
  const over=overMsg(wrap,'',start);
  const WORDS=['COMPUTER','GITARRE','ELEFANT','FENSTER','JOGHURT','REGENBOGEN','TASTATUR','SCHILDKROETE','FUSSBALL','VULKAN'];
  const STAGES=['🙂','😐','😕','😟','😨','😰','💀'];
  let word, guessed, errors;
  function start(){
    word=WORDS[Math.floor(Math.random()*WORDS.length)];
    guessed=new Set(); errors=0;
    document.getElementById('hangErr').textContent='0/6';
    figureEl.textContent=STAGES[0];
    over.classList.remove('show');
    renderWord(); renderKb();
  }
  function renderWord(){
    wordEl.textContent = word.split('').map(l=>guessed.has(l)?l:'_').join(' ');
  }
  function renderKb(){
    kbDiv.innerHTML='';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l=>{
      const b=document.createElement('button');
      b.textContent=l;
      const used=guessed.has(l);
      b.disabled=used;
      b.style.cssText=`width:30px;height:34px;border-radius:6px;border:none;font-weight:700;cursor:pointer;background:${used?'#3a2f5c':'var(--card)'};color:${used?'#6b6285':'#fff'};`;
      b.onclick=()=>guess(l);
      kbDiv.appendChild(b);
    });
  }
  function guess(l){
    guessed.add(l);
    if(!word.includes(l)){
      errors++;
      document.getElementById('hangErr').textContent=errors+'/6';
      figureEl.textContent=STAGES[Math.min(errors,6)];
      if(errors>=6){
        over.querySelector('div').textContent='Verloren! Das Wort war: '+word;
        over.classList.add('show');
        renderWord(); renderKb();
        return;
      }
    }
    renderWord(); renderKb();
    if(word.split('').every(l=>guessed.has(l))){
      over.querySelector('div').textContent='Richtig erraten! 🎉';
      over.classList.add('show');
    }
  }
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
