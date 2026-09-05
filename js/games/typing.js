import { hud, overMsg, mkHint, playerBody } from '../core.js';

export function build(){
  const scoreEl=hud(['WPM','typWpm'],['Fehler','typErr']);
  const wrap=document.createElement('div'); wrap.className='canvas-wrap'; wrap.style.width='100%'; wrap.style.maxWidth='440px';
  const textEl=document.createElement('div');
  textEl.style.cssText='font-family:"JetBrains Mono"; font-size:16px; line-height:1.6; background:#241D3B; padding:16px; border-radius:12px;';
  const input=document.createElement('textarea');
  input.rows=3;
  input.style.cssText='width:100%; margin-top:10px; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.15); background:#1D1730; color:#fff; font-family:"JetBrains Mono"; font-size:15px; resize:none; box-sizing:border-box;';
  wrap.append(textEl, input);
  playerBody.append(scoreEl, wrap, mkHint('Tippe den Text so schnell und genau wie möglich ab.'));
  const over=overMsg(wrap,'',start);
  const TEXTS=[
    'Der schnelle braune Fuchs springt über den faulen Hund.',
    'Programmieren macht Spaß wenn der Code endlich funktioniert.',
    'Ein guter Kaffee am Morgen macht den ganzen Tag besser.',
    'Die Sonne scheint und die Voegel singen im Garten.',
  ];
  let text, startTime, done;
  function start(){
    text=TEXTS[Math.floor(Math.random()*TEXTS.length)];
    textEl.textContent=text;
    input.value=''; input.disabled=false; startTime=null; done=false;
    document.getElementById('typWpm').textContent=0;
    document.getElementById('typErr').textContent=0;
    over.classList.remove('show');
    input.focus();
  }
  input.addEventListener('input', ()=>{
    if(done) return;
    if(!startTime) startTime=performance.now();
    const val=input.value;
    let errors=0;
    for(let i=0;i<val.length;i++) if(val[i]!==text[i]) errors++;
    document.getElementById('typErr').textContent=errors;
    if(val.length>=text.length){
      done=true; input.disabled=true;
      const minutes=(performance.now()-startTime)/60000;
      const wpm=Math.round((text.split(' ').length)/Math.max(minutes,0.01));
      document.getElementById('typWpm').textContent=wpm;
      over.querySelector('div').textContent=`Fertig! ${wpm} WPM, ${errors} Fehler.`;
      over.classList.add('show');
    }
  });
  window.__restartCurrent=start;
  start();
  return ()=>{};
}
