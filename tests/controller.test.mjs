import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Controller,elapsed,MOTION_KEY,SELECTION_KEY,selectionOf,motionOf } from '../lib/controller.js';
import { themeValue } from '../lib/catalog.js';
function world() {
  let now=10000;const store=new Map();let writes=0;
  const make=(initial='dark')=>{
    let local=initial;let attempts=0;
    const host={readTheme:async()=>local,setTheme:async value=>{attempts++;if(value.startsWith('custom:'))return{deny:'built-in only'};local=value;return{value};},get:async key=>store.get(key),set:async(key,value)=>{writes++;store.set(key,structuredClone(value));},now:async()=>now,invalidate:()=>{}};
    return {host,pick:value=>{local=value;},local:()=>local,attempts:()=>attempts};
  };
  return {make,store,advance:ms=>{now+=ms;},writes:()=>writes};
}
test('two sessions follow native picks, no echo, explicit pending custom palette',async()=>{
  const w=world(),a=w.make(),b=w.make(),ca=new Controller('a'),cb=new Controller('b');
  await ca.start(a.host);await cb.start(b.host);assert.equal(w.store.size,0);
  a.pick(themeValue('jellyfish'));await ca.poll(a.host);await cb.poll(b.host);
  assert.equal(cb.theme.id,'jellyfish');assert.equal(cb.palettePending,true);assert.equal(b.attempts(),0);
  const writes=w.writes();for(let i=0;i<5;i++){await cb.poll(b.host);await ca.poll(a.host);}
  assert.equal(w.writes(),writes,'a stale local theme must never overwrite the global scene');
  b.pick(themeValue('koi-pond'));await cb.poll(b.host);await ca.poll(a.host);assert.equal(ca.theme.id,'koi-pond');
  a.pick('light');await ca.poll(a.host);await cb.poll(b.host);
  assert.equal(cb.theme,undefined);assert.equal(b.local(),'light');assert.equal(cb.palettePending,false);
});
test('joining adopts shared scene; picking matching palette clears pending',async()=>{
  const w=world(),a=w.make(themeValue('aurora')),ca=new Controller('a');await ca.start(a.host);
  const b=w.make(),cb=new Controller('b');await cb.start(b.host);
  assert.equal(cb.theme.id,'aurora');assert.equal(cb.palettePending,true);
  b.pick(themeValue('aurora'));await cb.poll(b.host);assert.equal(cb.palettePending,false);
});
test('pause/resume/hide are shared and preserve exact animation time',async()=>{
  const w=world(),a=w.make(themeValue('aurora')),b=w.make(),ca=new Controller('a'),cb=new Controller('b');
  await ca.start(a.host);await cb.start(b.host);w.advance(3500);await ca.control(a.host,'pause');await cb.poll(b.host);
  assert.equal(elapsed(cb.motion,999999),3.5);w.advance(6000);await cb.control(b.host,'resume');await ca.poll(a.host);
  assert.equal(elapsed(ca.motion,19500),3.5);w.advance(1000);assert.equal(elapsed(ca.motion,20500),4.5);
  await ca.control(a.host,'hide');await cb.poll(b.host);assert.equal(cb.motion.hidden,true);
  await cb.control(b.host,'show');await ca.poll(a.host);assert.equal(ca.motion.hidden,false);
});
test('foreign custom themes hide scene without altering them',async()=>{
  const w=world(),a=w.make(themeValue('aurora')),b=w.make(),ca=new Controller('a'),cb=new Controller('b');await ca.start(a.host);await cb.start(b.host);
  a.pick('custom:my-editor');await ca.poll(a.host);await cb.poll(b.host);
  assert.equal(cb.theme,undefined);assert.equal(cb.selection.value,'custom:my-editor');assert.equal(b.local(),'dark');
});
test('corrupt stores are ignored; read failures do not erase the selected scene',async()=>{
  assert.equal(selectionOf({value:1}),undefined);assert.equal(selectionOf({value:'dark',source:'x',changedAt:NaN}),undefined);
  assert.deepEqual(motionOf({paused:'yes'},12),{paused:false,hidden:false,elapsedMs:0,startedAt:12});
  const w=world(),a=w.make(themeValue('aurora')),ca=new Controller('a');await ca.start(a.host);
  await assert.rejects(ca.poll({...a.host,get:async()=>{throw new Error('unavailable');}}));assert.equal(ca.theme.id,'aurora');
  await ca.poll(a.host);assert.equal(ca.theme.id,'aurora');
});
