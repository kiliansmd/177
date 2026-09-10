import {QUESTIONS,followup,selected,normalizeAnswers,allQuestions,isComplete,profile,startMessage,whatsappUrl,normalizePhone} from './challenge-model.js';

const $=selector=>document.querySelector(selector);
const root=$('#challenge-app');
const storageKey='performance-gym:challenge:v1';
const config=JSON.parse($('#challenge-config').textContent);
const demo=config.demo_enabled===true;
const demoQRText='DEMO | 17/7 Gym | 30 Tage kostenlos. Kein WhatsApp-Start.';
let answers={}, step=0, resultVisible=false, renderVersion=0, qrModule, qrAttempts=0;
try {
  const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');
  if(saved&&Date.now()-saved.updatedAt<24*60*60*1000){
    answers=normalizeAnswers(saved.answers);
    step=Math.max(0,Math.min(4,Number.isInteger(saved.step)?saved.step:0));
    resultVisible=saved.result===true&&isComplete(answers);
  }
}catch{/* Storage is optional, including private browsing. */}

const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validAt=index=>index<4?!!selected(QUESTIONS[index],answers[QUESTIONS[index].id]):answers.focusQuestion===followup(answers).id&&!!selected(followup(answers),answers.focus);
const canVisit=index=>Array.from({length:index},(_,i)=>i).every(validAt);
while(step>0&&!canVisit(step))step--;
const save=()=>{try{sessionStorage.setItem(storageKey,JSON.stringify({answers,step,result:resultVisible,updatedAt:Date.now()}));}catch{}};
const moveFocus=element=>{element.focus({preventScroll:true});element.closest('.challenge-panel,.challenge-result')?.scrollIntoView({behavior:'smooth',block:'start'});};
const animate=element=>element.animate?.([{opacity:.3,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:330,easing:'cubic-bezier(.22,1,.36,1)'});
const loadQR=()=>{
  if(qrModule)return qrModule;
  // A failed ES-module fetch is cached by browsers; retry with a fresh local URL.
  const suffix=qrAttempts++?'?retry='+qrAttempts:'';
  qrModule=import('./vendor/qrcodegen-1.8.0.js'+suffix).catch(error=>{qrModule=null;throw error;});
  return qrModule;
};

function summary(){
  $('#challenge-answer-summary').innerHTML=allQuestions(answers).map((q,i)=>{
    const option=selected(q,answers[i<4?q.id:'focus']);
    return `<div class="challenge-answer"><span>${escapeHTML(q.tag)}</span><button type="button" data-challenge-edit="${i}" ${option?'':'disabled'} aria-label="${escapeHTML(q.tag)} ändern${option?': '+escapeHTML(option.label):''}">${option?escapeHTML(option.short):'Noch offen'}</button></div>`;
  }).join('');
}

function showStep(index,{focus=true,persist=true}={}){
  if(!canVisit(index))return;
  renderVersion++;step=index;resultVisible=false;
  $('#challenge-dialog').hidden=false;$('#challenge-result').hidden=true;
  const question=allQuestions(answers)[step], key=step<4?question.id:'focus';
  $('#challenge-counter').textContent=`Frage ${step+1} von 5`;
  $('#challenge-progress').value=step+1;
  $('#challenge-progress').setAttribute('aria-valuetext',`Frage ${step+1} von 5: ${question.tag}`);
  $('#challenge-question').innerHTML=`<p class="challenge-question-tag">${escapeHTML(question.tag)}</p><h3 id="challenge-question-title" tabindex="-1">${escapeHTML(question.title)}</h3><p class="challenge-question-intro" id="challenge-question-note">${escapeHTML(question.note)}</p><fieldset class="challenge-options" aria-labelledby="challenge-question-title" aria-describedby="challenge-question-note"><legend class="sr-only">${escapeHTML(question.title)}</legend>${question.options.map((option,i)=>`<label class="challenge-option"><input type="radio" name="${key}" value="${option.id}" ${answers[key]===option.id?'checked':''} required><span class="challenge-option-body"><span class="challenge-option-index" aria-hidden="true">0${i+1}</span><span><strong>${escapeHTML(option.label)}</strong><small>${escapeHTML(option.detail)}</small></span><span class="challenge-option-check" aria-hidden="true">✓</span></span></label>`).join('')}</fieldset>`;
  $('#challenge-back').hidden=step===0;
  $('#challenge-next').disabled=!validAt(step);
  $('#challenge-next').innerHTML=step===4?'Zum kostenlosen Start <span aria-hidden="true">↗</span>':'Weiter <span aria-hidden="true">→</span>';
  summary();
  if(persist)save();
  if(focus){animate($('#challenge-question'));moveFocus($('#challenge-question-title'));}
  // The QR library arrives while the last question is being answered, never on marketing pages.
  if(step>=3&&(demo||normalizePhone(config.whatsapp_number)))loadQR().catch(()=>{});
}

async function drawQR(url,version,selector='#challenge-qr'){
  const container=$(selector);container.replaceChildren();
  const status=document.createElement('p');status.textContent='QR-Code wird vorbereitet …';container.append(status);
  try {
    const {qrcodegen}=await loadQR();
    if(version!==renderVersion||!resultVisible)return;
    const qr=qrcodegen.QrCode.encodeText(url,qrcodegen.QrCode.Ecc.MEDIUM);
    const border=4, size=qr.size+border*2, segments=[];
    for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.getModule(x,y))segments.push(`M${x+border},${y+border}h1v1h-1z`);
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox',`0 0 ${size} ${size}`);svg.setAttribute('width','256');svg.setAttribute('height','256');
    svg.setAttribute('role','img');svg.setAttribute('aria-label',selector==='#challenge-demo-qr'?'Demo-QR-Code mit Beispielhinweis, ohne WhatsApp-Verbindung':'QR-Code: WhatsApp mit deinem vorbereiteten Challenge-Profil öffnen');svg.setAttribute('shape-rendering','crispEdges');
    const background=document.createElementNS(ns,'rect');background.setAttribute('width',String(size));background.setAttribute('height',String(size));background.setAttribute('fill','#fff');
    const path=document.createElementNS(ns,'path');path.setAttribute('d',segments.join(''));path.setAttribute('fill','#000');
    svg.append(background,path);container.replaceChildren(svg);
  }catch{
    if(version!==renderVersion||!resultVisible)return;
    const box=document.createElement('div'),text=document.createElement('p'),retry=document.createElement('button');
    text.textContent=selector==='#challenge-demo-qr'?'Der Beispielcode konnte nicht geladen werden. Du kannst den Demo-Start trotzdem ausprobieren.':'Der QR-Code konnte nicht geladen werden. Der WhatsApp-Button funktioniert weiterhin.';
    retry.type='button';retry.textContent='QR-Code erneut laden';retry.addEventListener('click',()=>drawQR(url,version,selector));box.append(text,retry);container.replaceChildren(box);
  }
}

function showResult({focus=true,persist=true}={}){
  const p=profile(answers);if(!p){showStep(0);return;}
  resultVisible=true;const version=++renderVersion;
  $('#challenge-dialog').hidden=true;$('#challenge-result').hidden=false;
  $('#challenge-result-title').textContent=p.title;
  $('#challenge-profile-data').innerHTML=p.rows.map(([key,value])=>`<div><dt>${escapeHTML(key)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('');
  $('#challenge-weekly-time').textContent=p.weeklyMinutes.join('–')+' Min.';
  const url=demo?'':whatsappUrl(answers,config);
  $('#challenge-result').classList.toggle('is-demo',demo);
  $('#challenge-demo').hidden=!demo;
  $('#challenge-demo-chat').hidden=true;
  $('#challenge-demo-start').setAttribute('aria-expanded','false');
  $('#challenge-ready').hidden=!url;$('#challenge-unconfigured').hidden=!!url||demo;
  if(demo){
    $('#challenge-result-intro').textContent='Dein Profil ist fertig. Entdecke jetzt, wie deine kostenlose 30-Tage-Challenge in WhatsApp starten würde.';
    $('#challenge-connect-title').textContent='Dein Start. 30 Tage für dich.';
    $('#challenge-demo-message').textContent=startMessage(answers,config.message_keyword);
    $('#challenge-demo-welcome').textContent=`Willkommen bei deiner kostenlosen 30-Tage-Challenge! Dein Fokus: ${p.goal.short}. Du möchtest ${p.frequency.short} mit jeweils ${p.time.short} aktiv werden. Genau diesen Rhythmus nehmen wir für deinen Start mit.`;
    drawQR(demoQRText,version,'#challenge-demo-qr');
  }
  $('#challenge-open-status').hidden=true;
  $('#challenge-copy-status').textContent='';$('#challenge-profile-copy-status').textContent='';
  $('#challenge-copy-fallback').hidden=true;$('#challenge-profile-copy-fallback').hidden=true;
  if(url){
    $('#challenge-whatsapp').href=url;$('#challenge-number').textContent='+'+normalizePhone(config.whatsapp_number);
    $('#challenge-message-preview').textContent=startMessage(answers,config.message_keyword);
    drawQR(url,version);
  }else{
    $('#challenge-whatsapp').removeAttribute('href');$('#challenge-qr').replaceChildren();
  }
  if(persist)save();
  if(focus){animate($('#challenge-result'));moveFocus($('#challenge-result-title'));}
}

$('#challenge-form').addEventListener('change',event=>{
  const input=event.target;if(!input.matches('input[type=radio]'))return;
  const question=allQuestions(answers)[step];if(!selected(question,input.value))return;
  if(step===4){answers.focusQuestion=question.id;answers.focus=input.value;}else answers[question.id]=input.value;
  answers=normalizeAnswers(answers);
  $('#challenge-next').disabled=!validAt(step);summary();save();
});
$('#challenge-form').addEventListener('submit',event=>{
  event.preventDefault();if(!validAt(step))return;
  if(step<4)showStep(step+1);else showResult();
});
$('#challenge-back').addEventListener('click',()=>showStep(Math.max(0,step-1)));
root.addEventListener('click',event=>{
  const edit=event.target.closest('[data-challenge-edit]');if(!edit||edit.disabled)return;
  const index=Number(edit.dataset.challengeEdit);if(Number.isInteger(index)&&index>=0&&index<=4)showStep(index);
});
$('#challenge-reset').addEventListener('click',()=>{
  answers={};step=0;resultVisible=false;
  try{sessionStorage.removeItem(storageKey);}catch{}
  showStep(0,{persist:false});
});
async function copyText(text,status,fallback){
  try{await navigator.clipboard.writeText(text);status.textContent='Kopiert. Du kannst den Text jetzt einfügen.';fallback.hidden=true;}
  catch{fallback.hidden=false;fallback.value=text;fallback.focus();fallback.select();status.textContent='Bitte kopiere den markierten Text mit der Kopierfunktion deines Geräts.';}
}
$('#challenge-copy').addEventListener('click',()=>copyText(whatsappUrl(answers,config),$('#challenge-copy-status'),$('#challenge-copy-fallback')));
$('#challenge-copy-profile').addEventListener('click',()=>copyText(startMessage(answers,config.message_keyword),$('#challenge-profile-copy-status'),$('#challenge-profile-copy-fallback')));
$('#challenge-whatsapp').addEventListener('click',()=>{$('#challenge-open-status').hidden=false;});
$('#challenge-demo-start').addEventListener('click',()=>{
  if(!demo||!resultVisible||!isComplete(answers))return;
  $('#challenge-demo-chat').hidden=false;
  $('#challenge-demo-start').setAttribute('aria-expanded','true');
  animate($('#challenge-demo-chat'));
  $('#challenge-demo-chat-title').focus({preventScroll:true});
  $('#challenge-demo-chat').scrollIntoView({behavior:'smooth',block:'start'});
});
$('#challenge-demo-close').addEventListener('click',()=>{
  $('#challenge-demo-chat').hidden=true;
  $('#challenge-demo-start').setAttribute('aria-expanded','false');
  $('#challenge-demo-start').focus({preventScroll:true});
  $('#challenge-demo-start').scrollIntoView({behavior:'smooth',block:'center'});
});
const compact=matchMedia('(max-width:800px)');$('#challenge-summary').open=!compact.matches;
compact.addEventListener('change',event=>$('#challenge-summary').open=!event.matches);
$('#challenge-fallback').hidden=true;root.hidden=false;
if(resultVisible)showResult({focus:false,persist:false});else showStep(step,{focus:false,persist:false});
