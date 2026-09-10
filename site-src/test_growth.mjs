import test from 'node:test';
import assert from 'node:assert/strict';
import {invitationFromUrl,invitationUrl,invitationMessage,corporateMessage,PEOPLE} from '../assets/growth-model.js';
const ref='1234567890abcdef';
test('every invitation type roundtrips without contact details or account claims',()=>{
 for(const person of Object.keys(PEOPLE)){
  const url=invitationUrl('https://177.meindigitalerbetrieb.de/',person,ref),parsed=new URL(url);
  assert.deepEqual(invitationFromUrl(url),{person,ref});assert.equal(parsed.origin,'https://177.meindigitalerbetrieb.de');assert.equal(parsed.pathname,'/gemeinsam-starten/');assert.equal(parsed.hash,'#einladung-erhalten');assert.deepEqual([...parsed.searchParams.keys()],['person','ref']);
  assert.ok(invitationMessage(url).includes(url));
 }
});
test('invalid or injected invitation values never become a valid invitation',()=>{
 for(const url of ['https://example.com/?person=mum&ref=bad','https://example.com/?person=__proto__&ref='+ref,'https://example.com/?person=%3Cscript%3E&ref='+ref,'https://example.com/?person=friend&ref='+ref+'%0A'])assert.equal(invitationFromUrl(url),null);
 assert.throws(()=>invitationUrl('javascript:alert(1)','mum',ref));assert.throws(()=>invitationUrl('https://example.com','invalid',ref));
});
test('corporate email preserves all selected options and exact Unicode content',()=>{
 for(const size of ['Unter 5','5–10','11–25','26–50','Mehr als 50'])for(const interest of ['Firmenfitness','30-Tage-Challenge','Gesundheitsaktion','Unternehmenscode']){
  const data={company:'Müller & Söhne',email:'test@example.com',size,interest,message:'Gemeinsam & persönlich? Sehr gern!'},m=corporateMessage(data),url=new URL(m.href);
  assert.equal(url.protocol,'mailto:');assert.equal(url.pathname,'info@performance-gym.de');assert.equal(url.searchParams.get('body'),m.body);assert.ok(m.body.includes(size));assert.ok(m.body.includes(interest));assert.ok(m.body.includes(data.message));
 }
});
test('empty, malformed and unrecognized corporate details cannot prepare an email',()=>{
 const valid={company:'Test GmbH',email:'test@example.com',size:'5–10',interest:'Firmenfitness'};
 for(const bad of [{company:'   '},{email:'test@'},{email:'test@local'},{size:'500% Rabatt'},{interest:'kostenlos'}])assert.equal(corporateMessage({...valid,...bad}),null);
 const m=corporateMessage({...valid,company:'Test\r\nBcc: nope@example.com'});assert.ok(!/[\r\n]/.test(m.subject));assert.equal(new URL(m.href).searchParams.has('bcc'),false);
});
