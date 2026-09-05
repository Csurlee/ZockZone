import { hud, overMsg, mkHint, mkButton, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['Versuch','wrdTry']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='340px';
  const boardDiv=document.createElement('div');
  boardDiv.style.cssText='display:flex; flex-direction:column; gap:6px; align-items:center;';
  const inputRow=document.createElement('div');
  inputRow.style.cssText='display:flex; gap:8px; justify-content:center;';
  const input=document.createElement('input');
  input.maxLength=5; input.style.cssText='width:140px;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#241D3B;color:#fff;font-family:"JetBrains Mono";text-transform:uppercase;text-align:center;font-size:16px;';
  const submitBtn=mkButton('Raten');
  inputRow.append(input, submitBtn);
  wrap.appendChild(boardDiv);
  playerBody.append(scoreEl, wrap, inputRow, mkHint('5-Buchstaben-Wort erraten. Grün = richtig & richtige Position, Gelb = im Wort, aber falsche Position.'));
  const over=overMsg(wrap,'',start);
  const WORDS=['MAUER','KREIS','TIGER','BLUME','PFERD','SONNE','WOLKE','STERN','APFEL','TRAUM'];
  let word, tries, guesses;
  function start(){
    word=WORDS[Math.floor(Math.random()*WORDS.length)];
    tries=0; guesses=[];
    document.getElementById('wrdTry').textContent='0/6';
    over.classList.remove('show');
    input.disabled=false; submitBtn.disabled=false;
    render();
  }
  function render(){
    boardDiv.innerHTML='';
    guesses.forEach(g=>{
      const row=document.createElement('div');
      row.style.cssText='display:flex; gap:6px;';
      g.forEach(({l,state})=>{
        const cell=document.createElement('div');
        const bg = state==='hit' ? '#16A34A' : state==='near' ? '#F59E0B' : '#3a2f5c';
        cell.style.cssText=`width:44px;height:44px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;background:${bg};font-family:"JetBrains Mono";`;
        cell.textContent=l;
        row.appendChild(cell);
      });
      boardDiv.appendChild(row);
    });
  }
  function submit(){
    const guess=input.value.toUpperCase();
    if(guess.length!==5) return;
    tries++;
    document.getElementById('wrdTry').textContent=tries+'/6';
    const wLetters=word.split('');
    const guessLetters=guess.split('');
    const states=new Array(5).fill('miss');
    const remaining=[...wLetters];
    guessLetters.forEach((l,i)=>{
      if(l===wLetters[i]){ states[i]='hit'; remaining[i]=null; }
    });
    guessLetters.forEach((l,i)=>{
      if(states[i]==='hit') return;
      const idx=remaining.indexOf(l);
      if(idx!==-1){ states[i]='near'; remaining[idx]=null; }
    });
    const result=guessLetters.map((l,i)=>({l, state: states[i]}));
    guesses.push(result);
    render();
    input.value='';
    if(guess===word){
      input.disabled=true; submitBtn.disabled=true;
      over.querySelector('div').textContent='Richtig! 🎉 ('+tries+' Versuche)';
      over.classList.add('show');
    } else if(tries>=6){
      input.disabled=true; submitBtn.disabled=true;
      over.querySelector('div').textContent='Verloren! Das Wort war: '+word;
      over.classList.add('show');
    }
  }
  submitBtn.onclick=submit;
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
