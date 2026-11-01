const vscode=require('vscode');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const net=require('node:net');
const reportDir=process.env.LIVING_THEMES_REPORT_DIR;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(action,predicate,timeout=20000){const end=Date.now()+timeout;let value;while(Date.now()<end){value=await action();if(predicate(value))return value;await sleep(150);}throw new Error('Timed out: '+String(value).slice(-1000));}
async function run(){
  const checks=[],report={checks,passed:0};let api;
  fs.mkdirSync(reportDir,{recursive:true});
  const state=path.join(process.env.CLAUDE_CONFIG_DIR||path.join(require('node:os').homedir(),'.claude'),'plugins/living-themes/state-v1');
  const saved=new Map(['selection.v1','motion.v1','appearance.v1'].map(key=>{const p=path.join(state,key+'.json');return[p,fs.existsSync(p)?fs.readFileSync(p):undefined];}));
  try{
    api=await vscode.extensions.getExtension('living-themes-local.living-terminal').activate();assert.ok(api.testing);
    await vscode.commands.executeCommand('livingThemes.open');await until(()=>api.diagnostics(),d=>d.ready);
    await vscode.commands.executeCommand('workbench.action.toggleMaximizedPanel');
    const cwd=vscode.workspace.workspaceFolders[0].uri.fsPath;await api.testing.create(cwd);
    const id=api.diagnostics().sessions[0].id;
    let screen=await until(()=>api.testing.snapshot(id),s=>/Claude Code|trust|login/i.test(s));
    if(/trust this folder|trust the files|Yes, I trust/i.test(screen)){api.testing.input(id,'\r');await sleep(1000);}
    screen=await api.testing.snapshot(id);
    if(/Make auto mode your default/i.test(screen)){api.testing.input(id,'\x1b[B\r');await sleep(1000);}
    api.testing.input(id,'/living status\r');await until(()=>api.testing.snapshot(id),s=>s.includes('sharedTheme'));
    checks.push('Real Claude process starts in the VS Code webview with the installed v0.2 bridge.');
    api.testing.input(id,'/theme\r');await until(()=>api.testing.snapshot(id),s=>s.includes('Choose the text style'));
    api.testing.input(id,'\x1b[H'+'\x1b[B'.repeat(17)+'\r');
    await until(()=>api.testing.inspect(),s=>s.themeId==='koi-pond'&&s.width>500&&s.height>250);
    checks.push('Native /theme selects Koi Pond and the full viewport changes.');
    api.testing.input(id,'Yalnızca "Living Terminal hazır." yaz. Dosya okuma, araç kullanma veya değişiklik yapma.\r');
    screen=await until(()=>api.testing.snapshot(id),s=>(s.match(/Living Terminal hazır/g)||[]).length>=2,45000);
    checks.push('An actual Claude response is rendered over the living scene.');
    let capture=await api.testing.inspect(true);assert.ok(capture.png?.startsWith('data:image/png;base64,'));
    fs.writeFileSync(path.join(reportDir,'Living-Terminal-Koi-Pond.png'),Buffer.from(capture.png.split(',')[1],'base64'));
    for(let i=0;i<12;i++){const frame=await api.testing.inspect(true);fs.writeFileSync(path.join(reportDir,`frame-${String(i).padStart(2,'0')}.png`),Buffer.from(frame.png.split(',')[1],'base64'));await sleep(150);}
    await api.testing.create(cwd);const second=api.diagnostics().sessions.find(s=>s.id!==id).id;
    await until(()=>api.testing.snapshot(second),s=>s.includes('Claude Code'));await sleep(800);
    api.testing.input(id,'/living pause\r');await until(()=>api.testing.inspect(),s=>s.paused===true);
    checks.push('A second real session shares the scene and pause preference.');
    const routerApi=await vscode.extensions.getExtension('dev-island-local.terminal-router').activate();await routerApi.refresh();
    await until(()=>JSON.parse(fs.readFileSync(routerApi.registryPath)),r=>r.terminals.some(t=>t.id===id));
    const registry=JSON.parse(fs.readFileSync(routerApi.registryPath));const target=registry.terminals.find(t=>t.id===id);
    const reply=await new Promise((resolve,reject)=>{const socket=net.createConnection(registry.socketPath);let text='';socket.setTimeout(5000,()=>{socket.destroy();reject(new Error('Routing timeout'));});socket.on('error',reject);socket.on('connect',()=>socket.write(JSON.stringify({version:1,action:'focus',requestID:'living-v2-acceptance',windowID:registry.windowID,terminalID:target.id,processID:target.processID,token:registry.token})+'\n'));socket.on('data',data=>{text+=data;if(text.includes('\n')){socket.end();resolve(JSON.parse(text.split('\n')[0]));}});});
    assert.equal(reply.ok,true);checks.push('Dev Island authenticated routing focuses the exact custom PTY and acknowledges input focus.');
    api.testing.input(id,'/living resume\r');await until(()=>api.testing.inspect(),s=>!s.paused);
    for(const [down,theme,name] of [[16,'jellyfish','Jellyfish'],[12,'cloud-drift','Cloud-Drift']]){
      api.testing.input(id,'/theme\r');await until(()=>api.testing.snapshot(id),s=>s.includes('Choose the text style'));api.testing.input(id,'\x1b[H'+'\x1b[B'.repeat(down)+'\r');
      await until(()=>api.testing.inspect(),s=>s.themeId===theme);capture=await api.testing.inspect(true);fs.writeFileSync(path.join(reportDir,`Living-Terminal-${name}.png`),Buffer.from(capture.png.split(',')[1],'base64'));
    }
    checks.push('Jellyfish and Cloud Drift are captured from the same live terminal, with real conversation content.');
    report.passed=checks.length;report.status='passed';report.viewport={width:capture.width,height:capture.height};
  }catch(error){report.status='failed';report.error=String(error?.stack||error);if(api?.testing){try{const capture=await api.testing.inspect(true);if(capture.png)fs.writeFileSync(path.join(reportDir,'failure-panel.png'),Buffer.from(capture.png.split(',')[1],'base64'));report.terminal=await api.testing.snapshot(api.diagnostics().sessions[0]?.id);}catch{}}throw error;}
  finally{
    if(api?.testing)api.testing.dispose();
    for(const [file,content] of saved){if(content)fs.writeFileSync(file,content,{mode:0o600});else try{fs.unlinkSync(file);}catch{}}
    fs.writeFileSync(path.join(reportDir,'integration-report.json'),JSON.stringify(report,null,2));
  }
}
module.exports={run};
