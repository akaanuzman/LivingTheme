const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const pty=require('node-pty');
const root=path.resolve(__dirname,'../..');
const source='source "$1"; shift; claude "$@"';
function fixture(){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'living shell ')),bin=path.join(folder,'bin');fs.mkdirSync(bin);
  const log=path.join(folder,'calls.jsonl');
  fs.writeFileSync(path.join(bin,'claude'),`#!${process.execPath}\nconst fs=require('node:fs');const call={args:process.argv.slice(2),surface:process.env.LIVING_THEMES_SURFACE||null};fs.appendFileSync(process.env.LIVING_TEST_CALLS,JSON.stringify(call)+'\\n');console.log('NATIVE OUTPUT');setTimeout(()=>process.exit(37),220);\n`,{mode:0o755});
  const env={...process.env,PATH:bin+path.delimiter+process.env.PATH,CLAUDE_CONFIG_DIR:folder,LIVING_TEST_CALLS:log};delete env.LIVING_THEMES_SURFACE;
  return {folder,log,env,args:args=>['-dfc',source,'test',path.join(root,'terminal/shell/claude.zsh'),...args],calls:()=>fs.readFileSync(log,'utf8').trim().split('\n').map(JSON.parse)};
}
function runTTY(f,args){return new Promise((resolve,reject)=>{
  const child=pty.spawn('/bin/zsh',f.args(args),{cols:90,rows:26,cwd:f.folder,env:f.env}),chunks=[];
  const timeout=setTimeout(()=>{child.kill();reject(Error('zsh integration timed out'));},5000);
  child.onData(data=>chunks.push(data));child.onExit(({exitCode})=>{clearTimeout(timeout);resolve({exitCode,output:chunks.join('')});});
});}
test('interactive claude and --resume activate the real compositor exactly once and preserve exit status',async()=>{
  for(const args of [[],['--resume','session with spaces']]){
    const f=fixture();try{const result=await runTTY(f,args);assert.equal(result.exitCode,37);assert.ok(result.output.includes('\x1b[?1049h'));assert.ok(result.output.includes('\x1b[?1049l'));assert.deepEqual(f.calls(),[{args,surface:'terminal'}]);}finally{fs.rmSync(f.folder,{recursive:true,force:true});}
  }
});
test('TTY print and management calls preserve argv, native output and exit status',async()=>{
  for(const args of [['-p','Türkçe $(literal) `literal`'],['plugin','list'],['--version']]){
    const f=fixture();try{const result=await runTTY(f,args);assert.equal(result.exitCode,37);assert.ok(!result.output.includes('\x1b[?1049h'));assert.deepEqual(result.output,'NATIVE OUTPUT\r\n');assert.deepEqual(f.calls(),[{args,surface:null}]);}finally{fs.rmSync(f.folder,{recursive:true,force:true});}
  }
});
test('piped zsh calls bypass animation without changing stdout',()=>{
  const f=fixture();try{const args=['--resume'];const result=spawnSync('/bin/zsh',f.args(args),{env:f.env,encoding:'utf8'});assert.equal(result.status,37);assert.equal(result.stdout,'NATIVE OUTPUT\n');assert.deepEqual(f.calls(),[{args,surface:null}]);}finally{fs.rmSync(f.folder,{recursive:true,force:true});}
});
test('shell installer is reversible, idempotent and keeps unrelated settings plus private backup',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'living install ')),rc=path.join(folder,'.zshrc'),original='# existing\nexport KEEP="merhaba dünya"\n';
  const run=(extra=[])=>spawnSync('python3',[path.join(root,'scripts/install-shell.py'),'--rc',rc,...extra],{encoding:'utf8'});
  try{
    fs.writeFileSync(rc,original,{mode:0o640});assert.equal(run().status,0);const installed=fs.readFileSync(rc,'utf8');assert.equal(run().status,0);assert.equal(fs.readFileSync(rc,'utf8'),installed);
    assert.equal(fs.readFileSync(rc+'.living-themes-backup','utf8'),original);assert.equal(fs.statSync(rc+'.living-themes-backup').mode&0o777,0o600);assert.equal(fs.statSync(rc).mode&0o777,0o640);
    fs.appendFileSync(rc,'export USER_ADDED=1\n');assert.equal(run(['--remove']).status,0);assert.equal(fs.readFileSync(rc,'utf8'),original+'export USER_ADDED=1\n');
    fs.writeFileSync(rc+'.living-themes-new','existing unrelated file');assert.notEqual(run().status,0);assert.equal(fs.readFileSync(rc+'.living-themes-new','utf8'),'existing unrelated file');assert.equal(fs.readFileSync(rc,'utf8'),original+'export USER_ADDED=1\n');
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
