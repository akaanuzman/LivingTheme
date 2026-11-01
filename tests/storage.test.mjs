import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const helper=fileURLToPath(new URL('../scripts/state.sh',import.meta.url));
function write(dir,key,value){return new Promise((resolve,reject)=>{
  const child=spawn('/bin/sh',[helper,dir,key],{stdio:['pipe','ignore','pipe']});
  child.on('error',reject);child.on('exit',code=>resolve(code));child.stdin.end(JSON.stringify(value));
});}
test('atomic preference writer preserves complete JSON across concurrent processes, private permissions, no temp debris',async()=>{
  const root=await mkdtemp(join(tmpdir(),'living-storage-'));const dir=join(root,'plugins/living-themes/state-v1');
  try {
    const values=Array.from({length:12},(_,i)=>({value:'custom:living-themes:aurora',source:'s'+i,changedAt:i}));
    assert.deepEqual(await Promise.all(values.map(v=>write(dir,'selection.v1',v))),values.map(()=>0));
    const current=JSON.parse(await readFile(join(dir,'selection.v1.json'),'utf8'));assert.ok(values.some(v=>v.source===current.source));
    assert.equal((await stat(dir)).mode&0o777,0o700);assert.equal((await stat(join(dir,'selection.v1.json'))).mode&0o777,0o600);
    assert.deepEqual(await readdir(dir),['selection.v1.json']);
    assert.equal(await write(dir,'../../settings',{bad:true}),2);
  }finally{await rm(root,{recursive:true,force:true});}
});
