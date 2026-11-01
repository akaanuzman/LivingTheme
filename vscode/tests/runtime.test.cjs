const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Session}=require('./session-runtime.cjs');
const {readPreferences,writeRecord,updateControl}=require('./preferences-runtime.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('actual PTY input, UTF-8, resize, snapshot, output acknowledgements and explicit close',async()=>{
  const session=new Session({cwd:os.tmpdir()});let output='';session.onData=data=>{output+=data;session.ack(data.length);};
  try{
    session.start('/bin/cat',[],{...process.env});session.resize(70,22);session.input('Türkçe: ıİşŞçÇöÖüÜğĞ\r');
    for(let i=0;i<30&&!output.includes('Türkçe');i++)await delay(30);
    assert.match(output,/Türkçe/);const snapshot=await session.snapshot();assert.match(snapshot,/Türkçe/);assert.equal(session.terminal.cols,70);assert.equal(session.terminal.rows,22);
    assert.equal(session.state,'running');assert.equal(session.pending,0);
  }finally{session.close();}assert.equal(session.state,'exited');
});
test('preferences synchronize through atomic files, appearance and paused time are preserved',()=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'living-v2-prefs-')),root=path.join(parent,'plugins/living-themes/state-v1');
  try{
    writeRecord(root,'selection.v1',{value:'custom:living-themes:koi-pond'});assert.equal(readPreferences(root).themeId,'koi-pond');
    updateControl(root,'pause');updateControl(root,'hide');updateControl(root,'brightness',.4);updateControl(root,'intensity',.2);
    const state=readPreferences(root);assert.equal(state.motion.paused,true);assert.equal(state.motion.hidden,true);assert.equal(state.appearance.brightness,.4);assert.equal(state.appearance.intensity,.2);
    assert.equal(fs.statSync(path.join(root,'motion.v1.json')).mode&0o777,0o600);assert.throws(()=>writeRecord(root,'../settings',{}));
    writeRecord(root,'selection.v1',{value:'dark'});assert.equal(readPreferences(root).themeId,null);
  }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
test('restored metadata does not start a process; resume ID is kept',()=>{
  const s=new Session({id:'existing',cwd:os.tmpdir(),name:'Project',claudeSessionId:'previous'});
  assert.equal(s.state,'interrupted');assert.equal(s.process,undefined);assert.equal(s.saved().claudeSessionId,'previous');s.close();
});
test('output backpressure pauses a flooded producer and acknowledgements release it',()=>{
  const s=new Session({cwd:os.tmpdir()});let paused=0,resumed=0;
  s.state='running';s.process={pause:()=>paused++,resume:()=>resumed++,kill:()=>{}};
  s.queue='x'.repeat(270000);s.flush();assert.equal(paused,1);s.ack(270000);assert.equal(resumed,1);s.close();
});
