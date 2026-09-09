'use strict';
(() => {
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const form=$('#membership-form'), service=$('#service-form');
 if(!form&&!service)return;
 let config,step=0,furthest=0,busy=false,connecting=false,initialized=false;
 const idempotency=crypto.randomUUID();
 const eur=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n/100);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dateText=s=>s?new Date(s+'T12:00:00').toLocaleDateString('de-DE'):'–';
 const val=name=>(form||service).elements[name]?.value?.trim()||'';
 const payload=()=>{const data=Object.fromEntries(new FormData(form||service));for(const name of ['sepa_consent','terms_consent','early_start_consent'])data[name]=Boolean(form?.elements[name]?.checked);return data;};
 const clearErrors=()=>{$('#join-error').hidden=true;$$('.field-error').forEach(e=>e.textContent='');$$('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));};
 const errors=(message,fields={})=>{
  $('#join-error').textContent=message;$('#join-error').hidden=false;
  let first;
  for(const [name,text]of Object.entries(fields)){
   const input=(form||service).elements[name],label=$('#error-'+name);
   if(label)label.textContent=text;
   if(input?.setAttribute){input.setAttribute('aria-invalid','true');if(label)input.setAttribute('aria-describedby',[...new Set([...(input.getAttribute('aria-describedby')||'').split(' ').filter(Boolean),label.id])].join(' '));first??=input;}
  }
  if(first){const section=first.closest('[data-step]');if(section)setStep(Number(section.dataset.step));first.focus();}
  else $('#join-error').scrollIntoView({behavior:'smooth',block:'center'});
 };
 const api=async(path,data,pdf=false)=>{
  const response=await fetch('/api/membership/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':config.csrf,'Idempotency-Key':idempotency},body:JSON.stringify(data),signal:AbortSignal.timeout(45000)});
  if(!response.ok){const error=await response.json();throw error;}
  return pdf?response.blob():response.json();
 };
 const download=blob=>{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Performance-Gym-Vertragsvorschau.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);};
 const receipt=(result,selector)=>{
  const link=$(selector);
  if(result.pdf_base64){const bytes=Uint8Array.from(atob(result.pdf_base64),c=>c.charCodeAt(0));link.href=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));link.download='Performance-Gym-'+result.id+'.pdf';}
  else link.href=result.pdf_url;
 };
 const selected=()=>config.plans.find(p=>p.id===val('plan'))||config.plans[0];
 const early=()=>Boolean(val('start_date'))&&new Date(val('start_date')+'T12:00:00')<new Date(config.today+'T12:00:00').getTime()+14*86400000;
 const summary=()=>{
  const p=selected();$('#summary-plan').textContent=p.name;$('#summary-price').textContent=eur(p.monthly);$('#summary-term').textContent=p.months+' '+(p.months===1?'Monat':'Monate');$('#summary-start').textContent=dateText(val('start_date'));$('#summary-total').textContent=eur(p.minimum);$('#summary-calculation').textContent=p.months+' × '+eur(p.monthly)+' + '+eur(p.band)+' E-Band';
  $('#early-start-box').hidden=!early();if(!early())form.elements.early_start_consent.checked=false;
 };
 const review=()=>{
  const p=selected();const iban=val('iban').replace(/\s/g,'').toUpperCase();
  $('#join-review').innerHTML=[
   ['Dein Tarif',0,`${esc(p.name)} · ${eur(p.monthly)} / Monat<br>Start: ${dateText(val('start_date'))}<br>${p.months} Monat(e) Erstlaufzeit`,`Kündigung: ${esc(p.notice)}<br>${esc(p.renewal)}`],
   ['Deine Angaben',1,`${esc(val('first_name'))} ${esc(val('last_name'))}<br>${esc(val('street'))}<br>${esc(val('postcode'))} ${esc(val('city'))}, ${esc(val('country'))}<br>${esc(val('email'))}<br>Geboren am ${dateText(val('birthdate'))}`,''],
   ['Deine Zahlung',2,`SEPA-Lastschrift<br>${esc(val('account_holder'))}<br>${esc(iban.slice(0,4))} ···· ···· ···· ${esc(iban.slice(-4))}`,'']
  ].map(([title,index,text,foot])=>`<section class="review-block"><header><h3>${title}</h3><button type="button" data-edit="${index}">Bearbeiten</button></header><p>${text}</p>${foot?'<p class="join-fine">'+foot+'</p>':''}</section>`).join('');
  $('#final-price').innerHTML=`<h3>${esc(p.name)} – deine Kosten</h3><dl><div><dt>Monatsbeitrag</dt><dd>${eur(p.monthly)}</dd></div><div><dt>E-Band, einmalig</dt><dd>${eur(p.band)}</dd></div><div><dt>Erstlaufzeit</dt><dd>${p.months} Monat(e)</dd></div><div class="minimum-line"><dt>Mindestbetrag der Erstlaufzeit</dt><dd>${eur(p.minimum)}</dd></div></dl><p>${p.months} × ${eur(p.monthly)} + ${eur(p.band)} E-Band. Keine Aufnahmegebühr.</p><p>${esc(p.notice)} ${esc(p.renewal)}</p><p>${esc(config.billing_notice)}</p>`;
  $('#final-notice').textContent=config.delivery==='browser'?'Öffentliche Demo: Deine Angaben werden nur zur PDF-Erzeugung übertragen. Es wird keine Anmeldung gespeichert, kein Vertrag geschlossen und keine E-Mail versendet.':config.mode==='live'?'Mit „Zahlungspflichtig bestellen“ schließt du die angezeigte Mitgliedschaft ab. Dein Vertrag wird als PDF bereitgestellt und an deine E-Mail-Adresse gesendet.':'Vorschau: Es wird kein Vertrag geschlossen, nichts abgebucht und keine E-Mail nach außen versendet. Deine Testunterlagen und E-Mails werden lokal erzeugt.';
  $$('[data-edit]').forEach(button=>button.addEventListener('click',()=>setStep(Number(button.dataset.edit))));
 };
 function setStep(next){
  step=next;furthest=Math.max(furthest,next);
  $$('.join-step').forEach(e=>e.hidden=Number(e.dataset.step)!==next);
  $$('[data-step-link]').forEach(button=>{const index=Number(button.dataset.stepLink);button.disabled=index>furthest;button.parentElement.classList.toggle('is-done',index<next);if(index===next)button.parentElement.setAttribute('aria-current','step');else button.parentElement.removeAttribute('aria-current');});
  $('#join-back').hidden=next===0;$('#join-next').hidden=next===3;$('#join-submit').hidden=next!==3;
  $('#join-next').textContent=['Weiter zu deinen Daten →','Weiter zur Zahlung →','Alles prüfen →'][next]||'';
  if(next===2&&!val('account_holder'))form.elements.account_holder.value=(val('first_name')+' '+val('last_name')).trim();
  if(next===3)review();
  const current=$(`.join-step[data-step="${next}"]`);current.animate?.([{opacity:.35,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});
  const title=current.querySelector('h2');title.tabIndex=-1;title.focus({preventScroll:true});$('.join-main').scrollIntoView({behavior:'smooth',block:'start'});
 }
 const validIban=value=>{
  const iban=value.replace(/\s/g,'').toUpperCase();
  if(!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban))return false;
  const moved=iban.slice(4)+iban.slice(0,4);let remainder=0;
  for(const char of moved){const digits=/[A-Z]/.test(char)?String(char.charCodeAt(0)-55):char;for(const digit of digits)remainder=(remainder*10+Number(digit))%97;}
  return remainder===1;
 };
 const validate=()=>{
  clearErrors();const fields={};
  const root=form?$(`.join-step[data-step="${step}"]`):service;
  root.querySelectorAll('input,select,textarea').forEach(input=>{
   if(input.required&&!input.value.trim())fields[input.name]='Bitte ausfüllen.';
   else if(!input.checkValidity()){
    const validity=input.validity;
    fields[input.name]=validity.valueMissing?'Bitte ausfüllen.':
     validity.typeMismatch&&input.type==='email'?'Bitte eine vollständige E-Mail-Adresse eingeben.':
     validity.rangeUnderflow&&input.type==='date'?`Bitte ein Datum ab ${dateText(input.min)} wählen.`:
     validity.rangeOverflow&&input.type==='date'?`Bitte ein Datum bis ${dateText(input.max)} wählen.`:'Bitte die Eingabe prüfen.';
   }
  });
  if(form&&step===1&&val('birthdate')){
   const born=new Date(val('birthdate')+'T12:00:00'),today=new Date(config.today+'T12:00:00');let age=today.getFullYear()-born.getFullYear();if(today.getMonth()<born.getMonth()||(today.getMonth()===born.getMonth()&&today.getDate()<born.getDate()))age--;
   if(age<18||age>110)fields.birthdate='Online ab 18. Für eine Anmeldung unter 18 hilft dir unser Team im Studio.';
  }
  if(form&&step===2){if(!validIban(val('iban')))fields.iban='Bitte prüfe deine IBAN.';if(!form.elements.sepa_consent.checked)fields.sepa_consent='Bitte das Mandat bestätigen.';}
  if(form&&step===3){if(!form.elements.terms_consent.checked)fields.terms_consent='Bitte ausdrücklich bestätigen.';if(early()&&!form.elements.early_start_consent.checked)fields.early_start_consent='Bitte den vorzeitigen Start bestätigen oder den Termin ändern.';}
  if(service&&val('termination')==='extraordinary'&&!val('reason'))fields.reason='Bitte den Grund deiner außerordentlichen Kündigung angeben.';
  if(Object.keys(fields).length){errors('Bitte prüfe die markierten Angaben.',fields);return false;}return true;
 };
 const submit=async event=>{
  event.preventDefault();if(busy||!config)return;
  if(form&&step<3){if(validate())setStep(step+1);return;}
  if(!validate())return;
  const submission=payload();
  busy=true;const button=form?$('#join-submit'):$('#service-submit'),original=button.textContent;
  const controls=[...(form||service).querySelectorAll('input,select,textarea,button'),...$$('[data-step-link]')].map(element=>[element,element.disabled]);
  controls.forEach(([element])=>element.disabled=true);button.textContent='Unterlagen werden erstellt …';(form||service).setAttribute('aria-busy','true');
  try{
   const result=await api(form?'submit':'service',submission);
   if(form){
    form.hidden=true;$('.join-progress').hidden=true;$('#join-success').hidden=false;
    $('#success-title').textContent=result.mode==='preview'?'Deine Testanmeldung ist bereit.':'Willkommen in deinem Gym.';
    $('#success-message').textContent=result.delivery==='browser'?'Deine PDF-Vorschau ist bereit. Es wurde kein Vertrag geschlossen, keine Anmeldung gespeichert und keine E-Mail verschickt. Lade dein Testdokument jetzt herunter.':result.mode==='preview'?'Dein PDF und die E-Mails mit Anhang wurden lokal erstellt. Es wurde kein Vertrag geschlossen und keine E-Mail nach außen versendet.':result.email_status==='sent'?'Deine Mitgliedschaft ist erfasst. Der E-Mail-Dienst hat die Nachrichten mit deinem PDF-Vertrag angenommen.':'Deine Mitgliedschaft ist erfasst. Der E-Mail-Versand steht noch aus. Dein PDF kannst du bereits hier herunterladen. Bitte kontaktiere das Studio, falls die E-Mail nicht ankommt.';
    $('#success-id').textContent=result.id;receipt(result,'#success-pdf');
    $('#success-next-text').textContent=result.mode==='preview'?'Die Vorschau endet hier. Im Livebetrieb erhältst du deine Vertragsunterlagen per E-Mail und klärst die Ausgabe deines E-Bands mit dem Team im Studio.':'Für die Ausgabe deines E-Bands melde dich bei deinem ersten Besuch beim Team. Deine Vertragsunterlagen kannst du digital mitbringen.';
    $('#join-success').focus();$('#join-success').scrollIntoView({behavior:'smooth',block:'start'});
   }else{
    service.hidden=true;$('#service-success').hidden=false;$('#service-message').textContent=result.delivery==='browser'?'Deine Testbestätigung ist bereit. Es wurde keine Erklärung gespeichert oder an das Studio versendet.':result.mode==='preview'?'Die Testerklärung und ihre Bestätigung wurden lokal erzeugt. Es wurde keine tatsächliche Kündigung oder Widerrufserklärung an das Studio versendet.':result.email_status==='sent'?'Deine Erklärung ist eingegangen. Der E-Mail-Dienst hat die Bestätigung angenommen.':'Deine Erklärung ist eingegangen. Der E-Mail-Versand steht noch aus; deine Bestätigung kannst du hier herunterladen.';
    $('#service-reference').textContent='Vorgangsnummer: '+result.id;receipt(result,'#service-pdf');$('#service-success').focus();
   }
  }catch(error){errors(error.error||'Die Verbindung wurde unterbrochen. Bitte erneut versuchen. Dieselbe Anmeldung wird nicht doppelt angelegt.',error.fields);}
  finally{busy=false;controls.forEach(([element,disabled])=>element.disabled=disabled);button.textContent=original;(form||service).removeAttribute('aria-busy');}
 };
 (form||service).addEventListener('submit',submit);
 // Clear only the edited error; keep hints and the other fields' feedback intact.
 (form||service).addEventListener('input',event=>{
  const input=event.target;
  if(input.getAttribute('aria-invalid')!=='true')return;
  input.removeAttribute('aria-invalid');const label=$('#error-'+input.name);if(label)label.textContent='';
  if(!(form||service).querySelector('[aria-invalid="true"]'))$('#join-error').hidden=true;
 });
 if(form){
  const costs=$('#summary-breakdown'),compact=matchMedia('(max-width:950px)');
  costs.open=!compact.matches;
  compact.addEventListener('change',event=>costs.open=!event.matches);
  $('#join-next').addEventListener('click',()=>{if(validate())setStep(step+1);});$('#join-back').addEventListener('click',()=>{clearErrors();setStep(step-1);});
  $$('[data-step-link]').forEach(button=>button.addEventListener('click',()=>{const next=Number(button.dataset.stepLink);if(next<=step||validate())setStep(next);}));
  form.addEventListener('change',()=>{if(config)summary();});
  $('#iban').addEventListener('blur',()=>{$('#iban').value=val('iban').replace(/\s/g,'').toUpperCase().match(/.{1,4}/g)?.join(' ')||'';});
  $('#preview-contract').addEventListener('click',async()=>{const button=$('#preview-contract');button.disabled=true;try{download(await api('preview',payload(),true));}catch(error){errors(error.error||'Die PDF konnte nicht erstellt werden.',error.fields);}finally{button.disabled=false;}});
 }
 const connect=()=>{
 if(connecting)return;
 connecting=true;$('#join-retry').disabled=true;$('#join-mode').textContent='Verbindung wird hergestellt …';
 return fetch('/api/membership/config',{cache:'no-store',signal:AbortSignal.timeout(12000)}).then(async response=>{if(!response.ok)throw Error();return response.json();}).then(data=>{
  config=data;const live=config.mode==='live';$('#join-mode').textContent=config.delivery==='browser'?'Öffentliche Demo · Bitte nur Testdaten verwenden. Kein Vertrag, keine Abbuchung, keine Speicherung der Anmeldung und kein E-Mail-Versand.':live?'':'Lokale Vorschau · Bitte nur Testdaten verwenden. Es entstehen kein Vertrag, keine Abbuchung und kein externer E-Mail-Versand.';
  $('#join-connection').hidden=true;
  if(form){
   $('#join-intro-note').textContent=live?'Vier Schritte · Kein Benutzerkonto nötig':config.delivery==='browser'?'Öffentliche Demo · Bitte nur Testdaten verwenden':'Lokale Vorschau · Bitte nur Testdaten verwenden';
   const incoming=new URLSearchParams(location.search).get('tarif');if(!initialized&&config.plans.some(p=>p.id===incoming))form.elements.plan.value=incoming;
   $('#start_date').min=config.today;$('#start_date').max=config.latest_start;if(!val('start_date'))$('#start_date').value=config.today;
   $('#birthdate').max=config.today;$('#sepa-text').textContent=config.sepa_text;$('#creditor-id').textContent=config.creditor_id;$('#billing-notice').textContent=config.billing_notice;$('#early-start-text').textContent=config.early_start_text;
   if(live){$('#sepa-label').textContent='Ich erteile das oben aufgeführte SEPA-Lastschriftmandat.';$('#terms-label').textContent='Ich akzeptiere die verlinkten Vertragsbedingungen und habe die Widerrufsinformation zur Kenntnis genommen.';$('#iban-hint').textContent='Deine IBAN wird geprüft und verschlüsselt gespeichert.';$('#join-submit').textContent='Zahlungspflichtig bestellen';}
   $('#legal-documents').innerHTML=config.documents.length?config.documents.map(key=>`<a href="/api/membership/document/${key}" target="_blank" rel="noopener">${key==='contract_terms_pdf'?'Vertragsbedingungen / AGB':'Widerrufsinformation'} als PDF ↓</a>`).join(''):'Die freigegebenen Vertragsbedingungen und Widerrufsinformationen werden vor dem Livegang ergänzt. Diese Vorschau ist kein verbindliches Vertragsangebot.';
   $('#join-next').disabled=false;summary();
  }else{if(config.delivery==='browser'){const intro=$('.page-head .lead');if(intro)intro.textContent='Teste hier die digitale Erklärung. Du erhältst eine PDF-Vorschau; es wird nichts an das Studio übermittelt.';$('#service-success h2').textContent='Deine Testbestätigung ist bereit.';}$('#service-submit').disabled=false;if(!live)$('#service-submit').textContent=val('kind')==='withdrawal'?'Test-Widerruf bestätigen':'Test-Kündigung bestätigen';}
  initialized=true;
 }).catch(()=>{ $('#join-mode').textContent='Die Verbindung konnte nicht hergestellt werden. Versuche es erneut oder sprich direkt mit unserem Team. Deine bisherigen Eingaben bleiben erhalten.';$('#join-connection').hidden=false;
 }).finally(()=>{connecting=false;$('#join-retry').disabled=false;});
 };
 $('#join-retry').addEventListener('click',()=>connect()?.then(()=>{if(config)(form?$('#join-next'):$('#service-submit')).focus({preventScroll:true});}));
 connect();
})();
