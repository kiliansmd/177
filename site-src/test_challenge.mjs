import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTIONS,followup,normalizeAnswers,profile,isComplete,startMessage,whatsappUrl,normalizePhone} from '../assets/challenge-model.js';

test('all 324 valid paths preserve preferences and compute the exact weekly budget',()=>{
  let count=0;
  for(const goal of QUESTIONS[0].options)for(const exp of QUESTIONS[1].options)
  for(const time of QUESTIONS[2].options)for(const frequency of QUESTIONS[3].options){
    const base={goal:goal.id,experience:exp.id,time:time.id,frequency:frequency.id};const q=followup(base);
    for(const option of q.options){
      const a={...base,focusQuestion:q.id,focus:option.id};const p=profile(a);
      assert.ok(isComplete(a));assert.equal(p.goal.id,goal.id);assert.equal(p.extra.id,option.id);
      assert.deepEqual(p.weeklyMinutes,time.minutes.map(n=>n*frequency.count));
      const url=new URL(whatsappUrl(a,{whatsapp_number:'12025550123'}));
      assert.equal(url.origin,'https://wa.me');assert.equal(url.searchParams.get('text'),startMessage(a));count++;
    }
  }
  assert.equal(count,324);
});
test('experience and goal produce the correct adaptive follow-up',()=>{
  assert.equal(followup({experience:'beginner',goal:'strength'}).id,'entry');
  assert.equal(followup({experience:'returning',goal:'endurance'}).id,'restart');
  assert.equal(followup({experience:'regular',goal:'strength'}).id,'strength_focus');
  assert.equal(followup({experience:'regular',goal:'endurance'}).id,'endurance_focus');
  assert.equal(followup({experience:'regular',goal:'balance'}).id,'setting');
});
test('editing an upstream answer removes a now-incompatible follow-up',()=>{
  const old={goal:'strength',experience:'regular',time:'medium',frequency:'three',focusQuestion:'strength_focus',focus:'weights'};
  const changed=normalizeAnswers({...old,experience:'beginner'});
  assert.equal(changed.goal,'strength');assert.equal(changed.time,'medium');
  assert.ok(!changed.focus&&!changed.focusQuestion);assert.equal(isComplete(changed),false);
});
test('malformed stored answers and unknown options never become profile content',()=>{
  for(const a of [null,false,[],{goal:'<script>bad</script>'},{focusQuestion:'entry',focus:'unknown'}])assert.equal(isComplete(normalizeAnswers(a)),false);
  assert.deepEqual(normalizeAnswers({goal:'strength',email:'private@example.com',phone:'secret',unknown:'unknown'}),{goal:'strength'});
});
test('missing or invalid recipient never generates a misleading WhatsApp link',()=>{
  const a={goal:'strength',experience:'regular',time:'medium',frequency:'three',focusQuestion:'strength_focus',focus:'weights'};
  for(const number of ['',null,'00001234','https://evil.example','12025550123?text=override'])assert.equal(whatsappUrl(a,{whatsapp_number:number}),'');
  assert.equal(whatsappUrl({}, {whatsapp_number:'12025550123'}),'');
  assert.equal(normalizePhone(' +1 (202) 555-0123 '),'12025550123');
});
test('the start message contains all answers but no invented subscription or success claim',()=>{
  const a={goal:'endurance',experience:'regular',time:'short',frequency:'four',focusQuestion:'endurance_focus',focus:'outside'};
  const message=startMessage(a,'30TAGE');assert.match(message,/30TAGE/);assert.match(message,/Ausdauer/);assert.match(message,/Regelmäßig/);assert.match(message,/10–15/);assert.match(message,/4 ×/);assert.match(message,/Draußen/);
  assert.equal(startMessage(a,'<script>bad</script>'),message);
});
