import {PEOPLE,invitationFromUrl,invitationUrl,invitationMessage,corporateMessage} from './growth-model.js';
const $=s=>document.querySelector(s);
async function copy(text,status,element){
 try{await navigator.clipboard.writeText(text);status.textContent='Kopiert. Du kannst den Text jetzt einfügen.';}
 catch{if(element.select){element.focus();element.select();}else{const range=document.createRange();range.selectNodeContents(element);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);}status.textContent='Bitte kopiere den markierten Text mit der Kopierfunktion deines Geräts.';}
}
const invitationForm=$('#invitation-form');
if(invitationForm){
 let link='',qrVersion=0,qrPromise,qrAttempts=0;
 const incoming=invitationFromUrl(location.href);
 if(incoming){$('#invitation-received').hidden=false;$('#invitation-greeting').textContent=PEOPLE[incoming.person].greeting;$('#invite-person').value=incoming.person;const a=$('#invitation-received a[href^="/contact/"]');const target=new URL(a.href);target.searchParams.set('einladung',incoming.ref);a.href=target.href;}
 async function draw(){
  if(!link)return;const version=++qrVersion,container=$('#invite-qr');container.textContent='QR-Code wird vorbereitet …';
  try{
   if(!qrPromise){const suffix=qrAttempts++?'?retry='+qrAttempts:'';qrPromise=import('./vendor/qrcodegen-1.8.0.js'+suffix).catch(e=>{qrPromise=null;throw e;});}
   const {qrcodegen}=await qrPromise;if(version!==qrVersion)return;
   const qr=qrcodegen.QrCode.encodeText(link,qrcodegen.QrCode.Ecc.MEDIUM),size=qr.size+8,segments=[];
   for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.getModule(x,y))segments.push(`M${x+4},${y+4}h1v1h-1z`);
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),rect=document.createElementNS(ns,'rect'),path=document.createElementNS(ns,'path');
   svg.setAttribute('viewBox',`0 0 ${size} ${size}`);svg.setAttribute('width','260');svg.setAttribute('height','260');svg.setAttribute('shape-rendering','crispEdges');svg.setAttribute('role','img');svg.setAttribute('aria-label','QR-Code zur persönlichen Einladung');rect.setAttribute('width',size);rect.setAttribute('height',size);rect.setAttribute('fill','#fff');path.setAttribute('d',segments.join(''));path.setAttribute('fill','#000');svg.append(rect,path);container.replaceChildren(svg);
  }catch{if(version!==qrVersion)return;container.textContent='Der QR-Code ist gerade nicht verfügbar. Dein Einladungslink funktioniert weiterhin. ';const retry=document.createElement('button');retry.type='button';retry.textContent='Erneut laden';retry.addEventListener('click',draw);container.append(retry);}
 }
 invitationForm.addEventListener('submit',e=>{e.preventDefault();if(!invitationForm.reportValidity())return;
  const bytes=crypto.getRandomValues(new Uint8Array(8)),ref=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
  link=invitationUrl(location.origin,$('#invite-person').value,ref);$('#invitation-link').value=link;$('#invite-whatsapp').href='https://wa.me/?text='+encodeURIComponent(invitationMessage(link));$('#invitation-result').hidden=false;$('#invite-status').textContent='';$('#invite-share').hidden=typeof navigator.share!=='function';
  $('#invitation-link').focus({preventScroll:true});$('#invitation-result').scrollIntoView({block:'start',behavior:'smooth'});if($('#invite-qr-details').open)draw();
 });
 $('#invite-person').addEventListener('change',()=>{link='';qrVersion++;$('#invitation-result').hidden=true;$('#invitation-link').value='';$('#invite-whatsapp').removeAttribute('href');$('#invite-qr').replaceChildren();});
 $('#invite-copy').addEventListener('click',()=>copy(link,$('#invite-status'),$('#invitation-link')));
 $('#invite-share').addEventListener('click',async()=>{try{await navigator.share({title:'Gemeinsam stärker. Bei 17/7.',text:'Ich würde das Gym gern mit dir kennenlernen.',url:link});$('#invite-status').textContent='Der Teilen-Dialog wurde geschlossen. Ob deine Einladung versendet wurde, siehst du in der gewählten App.';}catch(e){if(e.name!=='AbortError')$('#invite-status').textContent='Teilen ist gerade nicht verfügbar. Du kannst den Link kopieren.';}});
 $('#invite-qr-details').addEventListener('toggle',()=>{if($('#invite-qr-details').open&&link)draw();});
}
const corporateForm=$('#corporate-form');
if(corporateForm){
 let prepared=null;
 corporateForm.addEventListener('submit',e=>{e.preventDefault();$('#company').value=$('#company').value.trim();$('#company-email').value=$('#company-email').value.trim();$('#company-email').setCustomValidity(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('#company-email').value)?'':'Bitte gib eine vollständige E-Mail-Adresse an.');if(!corporateForm.reportValidity())return;prepared=corporateMessage(Object.fromEntries(new FormData(corporateForm)));if(!prepared)return;
  $('#corporate-preview').textContent=prepared.preview;$('#corporate-open').href=prepared.href;$('#corporate-prepared').hidden=false;$('#corporate-status').textContent='';$('#corporate-ready').focus({preventScroll:true});$('#corporate-prepared').scrollIntoView({block:'start',behavior:'smooth'});
 });
 const invalidate=()=>{$('#company-email').setCustomValidity('');prepared=null;$('#corporate-prepared').hidden=true;$('#corporate-open').href='mailto:info@performance-gym.de';$('#corporate-preview').textContent='';};
 corporateForm.addEventListener('input',invalidate);corporateForm.addEventListener('change',invalidate);
 $('#corporate-copy').addEventListener('click',()=>{if(prepared)copy(prepared.preview,$('#corporate-status'),$('#corporate-preview'));});
}
