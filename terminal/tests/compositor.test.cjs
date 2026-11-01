const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Terminal}=require('@xterm/headless');
const {sceneFrame,composeRows,composeFrame,frameDifference,indexed}=require('../dist/compositor.cjs');
const options={themeId:'koi-pond',time:18,brightness:.8,intensity:.65,hidden:false};
const write=(t,s)=>new Promise(resolve=>t.write(s,resolve));
const ids=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../dist/themes.json'),'utf8')).map(t=>t.id);
test('all 48 full-area worlds are distinct, bounded, and change with time at narrow and wide sizes',()=>{
  for(const [cols,rows] of [[48,18],[160,48]]){
    const hashes=new Set();
    for(const themeId of ids){
      const a=sceneFrame(cols,rows,{...options,themeId}),b=sceneFrame(cols,rows,{...options,themeId,time:35});
      assert.equal(a.length,cols*rows);assert.ok(a.some(c=>c.char.trim()),themeId);
      assert.ok(a.every(c=>c.fg.every(Number.isFinite)&&c.bg.every(Number.isFinite)),themeId);
      assert.ok(a.every(c=>/^[\x20-\x7e]$/.test(c.char)),themeId+' must paint one ASCII glyph per cell');
      const s=JSON.stringify(a);hashes.add(a.map(c=>c.char).join(''));assert.notEqual(s,JSON.stringify(b),themeId);
    }
    assert.equal(hashes.size,48);
  }
});
test('merging preserves Turkish and wide Unicode cells, RGB colors and diff backgrounds',async()=>{
  const t=new Terminal({cols:80,rows:24,allowProposedApi:true});
  await write(t,'\x1b[2J\x1b[4;7H\x1b[1;38;2;240;130;90mÇağrı: ığüşöç 🎨 世界\x1b[0m\x1b[6;1H\x1b[48;2;32;61;45m+ const sonuç = true;   \x1b[0m');
  const frame=composeRows(t,options),out=new Terminal({cols:80,rows:24,allowProposedApi:true});
  await write(out,'\x1b[?7l'+frame.map((r,i)=>`\x1b[${i+1};1H`+r).join(''));
  const row=out.buffer.active.getLine(3);assert.ok(row.translateToString().includes('Çağrı: ığüşöç 🎨 世界'));
  assert.equal(row.getCell(6).getFgColor(),(240<<16)+(130<<8)+90);assert.ok(row.getCell(6).isBold());
  assert.equal(out.buffer.active.getLine(5).getCell(22).getBgColor(),(32<<16)+(61<<8)+45);
  t.dispose();out.dispose();
});
test('blank screen has scenery at top, middle and bottom; hide and built-in theme clear all figures',async()=>{
  const t=new Terminal({cols:140,rows:42,allowProposedApi:true});
  const a=sceneFrame(140,42,{...options,themeId:'matrix-rain'});
  for(const [lo,hi] of [[0,14],[14,28],[28,42]])assert.ok(a.slice(lo*140,hi*140).some(c=>c.char.trim()));
  assert.ok(sceneFrame(140,42,{...options,hidden:true}).every(c=>c.char===' '));
  assert.ok(sceneFrame(140,42,{...options,themeId:null}).every(c=>c.char===' '));
  assert.equal(composeRows(t,options).length,42);t.dispose();
});
test('inverse, invisible, selection-style cells and quiet spaces remain readable',async()=>{
  const t=new Terminal({cols:80,rows:24,allowProposedApi:true});
  await write(t,'\x1b[3;1H\x1b[7mMENU OPTION\x1b[0m\x1b[4;1Halpha     omega\x1b[5;1H\x1b[8mSECRET\x1b[0m');
  const f=composeRows(t,{...options,themeId:'matrix-rain'}),out=new Terminal({cols:80,rows:24,allowProposedApi:true});
  await write(out,'\x1b[?7l'+f.map((r,i)=>`\x1b[${i+1};1H`+r).join(''));
  assert.equal(out.buffer.active.getLine(3).translateToString().slice(0,15),'alpha     omega');
  assert.ok(!out.buffer.active.getLine(4).translateToString().includes('SECRET'));
  assert.equal(out.buffer.active.getLine(2).getCell(0).getBgColor(),parseInt('d7f5df',16));
  assert.deepEqual(indexed(196),[255,0,0]);assert.deepEqual(indexed(244),[128,128,128]);
  t.dispose();out.dispose();
});
test('incremental painting matches a full frame across text edits and wide-cell removal',async()=>{
  const t=new Terminal({cols:100,rows:32,allowProposedApi:true});
  const out=new Terminal({cols:100,rows:32,allowProposedApi:true});
  await write(t,'\x1b[10;4HÇağrı 🎨 世界\x1b[14;2H\x1b[48;2;32;61;45m+ değişiklik    \x1b[0m');
  let old=composeFrame(t,options);
  await write(out,'\x1b[?7l'+frameDifference(old,[]));
  assert.equal(frameDifference(old,old),'');
  await write(t,'\x1b[10;4H\x1b[Kİkinci giriş');
  const next=composeFrame(t,{...options,time:18.1}),delta=frameDifference(next,old);
  await write(out,delta);
  const reference=new Terminal({cols:100,rows:32,allowProposedApi:true});
  await write(reference,'\x1b[?7l'+frameDifference(next,[]));
  for(let y=0;y<32;y++)for(let x=0;x<100;x++){
    const a=out.buffer.active.getLine(y).getCell(x),b=reference.buffer.active.getLine(y).getCell(x);
    assert.equal(a.getChars(),b.getChars(),`${x},${y}`);assert.equal(a.getFgColor(),b.getFgColor());assert.equal(a.getBgColor(),b.getBgColor());
  }
  assert.ok(delta.length<frameDifference(next,[]).length*.6);
  t.dispose();out.dispose();reference.dispose();
});
