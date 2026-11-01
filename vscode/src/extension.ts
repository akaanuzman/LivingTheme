import * as vscode from 'vscode';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {Session,type SavedSession} from './sessions.ts';
import {configDirectory,stateDirectory,readJSON,readPreferences,updateControl} from './preferences.ts';

const VIEW='livingThemes.terminal';
class LivingTerminal implements vscode.WebviewViewProvider,vscode.Disposable {
  private view:vscode.WebviewView|undefined;
  private ready=false;
  private active:string|undefined;
  readonly sessions=new Map<string,Session>();
  private routes=new Map<string,vscode.Disposable>();
  private poll:ReturnType<typeof setInterval>;
  private lastPreferences='';
  private focusWaiters=new Map<string,(focused:boolean)=>void>();
  private inspections=new Map<string,(result:any)=>void>();
  private root=stateDirectory();
  private disposing=false;
  constructor(private context:vscode.ExtensionContext){
    const saved=context.workspaceState.get<SavedSession[]>('sessions',[]);
    for(const item of saved.slice(0,12))if(typeof item.cwd==='string'&&fs.existsSync(item.cwd)&&/^[a-f\d-]{36}$/.test(item.id)){const s=new Session(item);this.sessions.set(s.id,s);}
    this.active=context.workspaceState.get<string>('active');
    this.poll=setInterval(()=>this.refresh(),1000);
    context.subscriptions.push(vscode.extensions.onDidChange(()=>this.registerRoutes()));
  }
  resolveWebviewView(view:vscode.WebviewView){
    this.view=view;this.ready=false;
    view.webview.options={enableScripts:true,localResourceRoots:[vscode.Uri.joinPath(this.context.extensionUri,'media')]};
    const resource=(name:string)=>view.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri,'media',name)).toString();
    const nonce=crypto.randomBytes(24).toString('base64');
    view.webview.html=`<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${view.webview.cspSource} data:; font-src ${view.webview.cspSource}; style-src ${view.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'"><link rel="stylesheet" href="${resource('xterm.css')}"><link rel="stylesheet" href="${resource('style.css')}"></head><body data-capture="${this.context.extensionMode===vscode.ExtensionMode.Test}"><canvas id="world" aria-hidden="true"></canvas><div id="scrim" aria-hidden="true"></div><header><div id="tabs" role="tablist" aria-label="Claude oturumları"></div><button id="new" title="Yeni Claude oturumu">＋</button><div class="spacer"></div><span id="theme" title="Claude Code’da /theme yazarak değiştir">Living Terminal</span><button id="settings" title="Sahne ayarları">☷</button></header><main id="terminals"></main><section id="empty"><div class="mark">✳</div><small>LIVING THEMES</small><h1>Çalışma alanın<br>biraz canlansın.</h1><p>Gerçek Claude Code. Yaşayan bir arka plan.</p><div><button id="start" class="primary">Yeni Claude oturumu</button><button id="resume">Konuşmaya devam et</button></div><p class="hint">Tema seçmek için Claude Code’da <kbd>/theme</kbd> yaz.</p></section><aside id="controls" hidden><h2>Canlı sahne</h2><label>Parlaklık <input id="brightness" type="range" min="20" max="100" value="80"></label><label>Hareket <input id="intensity" type="range" min="0" max="100" value="65"></label><div><button id="pause">Duraklat</button><button id="hide">Gizle</button></div><p>Tema seçimi: <kbd>/theme</kbd></p></aside><div id="notice" role="status" hidden></div><script nonce="${nonce}" src="${resource('webview.js')}"></script></body></html>`;
    view.webview.onDidReceiveMessage(message=>this.message(message).catch(error=>this.notice(error instanceof Error?error.message:'İşlem tamamlanamadı.')));
    view.onDidChangeVisibility(()=>{this.post({type:'visibility',visible:view.visible});if(view.visible)this.refresh(true);});
    view.onDidDispose(()=>{this.ready=false;this.view=undefined;for(const s of this.sessions.values())s.ack(s.pending);});
  }
  private post(message:unknown){if(this.ready&&this.view)this.view.webview.postMessage(message);}
  private notice(text:string){this.post({type:'notice',text});}
  private persist(){if(this.disposing)return;void this.context.workspaceState.update('sessions',[...this.sessions.values()].map(s=>s.saved()));void this.context.workspaceState.update('active',this.active);}
  private list(){return [...this.sessions.values()].map(s=>({...s.saved(),state:s.state}));}
  private announce(){this.post({type:'sessions',sessions:this.list(),active:this.active});this.persist();}
  private async message(m:any){
    if(!m||typeof m.type!=='string')return;
    if(m.type==='ready'){
      this.ready=true;this.announce();this.refresh(true);
      this.post({type:'font',size:vscode.workspace.getConfiguration('livingThemes').get('fontSize',14)});
      for(const s of this.sessions.values()){this.post({type:'snapshot',id:s.id,data:await s.snapshot()});s.ack(s.pending);}
      if(this.active)this.post({type:'focus',id:this.active});
      return;
    }
    if(m.type==='new'){await this.create(undefined,false);return;}
    if(m.type==='copy'&&typeof m.text==='string'&&m.text.length<=1048576){await vscode.env.clipboard.writeText(m.text);return;}
    if(m.type==='resume'){await this.create(undefined,true);return;}
    if(m.type==='control'&&typeof m.action==='string'){updateControl(this.root,m.action,m.value);this.refresh(true);return;}
    if(m.type==='focusAck'&&typeof m.requestId==='string'){this.focusWaiters.get(m.requestId)?.(m.focused===true);return;}
    if(m.type==='inspection'&&this.context.extensionMode===vscode.ExtensionMode.Test){this.inspections.get(m.requestId)?.(m);return;}
    if(typeof m.id!=='string')return;
    const s=this.sessions.get(m.id);if(!s)return;
    if(m.type==='paste'){this.post({type:'pasteData',id:s.id,data:(await vscode.env.clipboard.readText()).slice(0,1048576)});return;}
    if(m.type==='input'&&typeof m.data==='string')s.input(m.data);
    else if(m.type==='resize')s.resize(m.cols,m.rows);
    else if(m.type==='ack'&&Number.isFinite(m.bytes)&&m.bytes>=0)s.ack(Math.min(m.bytes,1048576));
    else if(m.type==='select'){this.active=s.id;this.announce();}
    else if(m.type==='close')await this.close(s);
    else if(m.type==='restart'&&s.state!=='running')await this.start(s,true);
  }
  async show(){await vscode.commands.executeCommand(VIEW+'.focus');this.view?.show(false);}
  private async chooseFolder(cwd?:string):Promise<string|undefined>{
    if(cwd&&path.isAbsolute(cwd)&&fs.existsSync(cwd)&&fs.statSync(cwd).isDirectory())return cwd;
    const folders=vscode.workspace.workspaceFolders??[];
    if(folders.length===1)return folders[0].uri.fsPath;
    if(folders.length>1){const chosen=await vscode.window.showWorkspaceFolderPick({placeHolder:'Claude hangi projede çalışsın?'});return chosen?.uri.fsPath;}
    return (await vscode.window.showOpenDialog({canSelectFolders:true,canSelectFiles:false,canSelectMany:false,openLabel:'Bu projede başlat'}))?.[0].fsPath;
  }
  async create(cwd?:string,resume=false){
    if(!vscode.workspace.isTrusted)throw new Error('Claude başlatmak için projeye güven vermelisin.');
    if(vscode.env.remoteName)throw new Error('Bu sürüm yerel macOS projeleri içindir.');
    const folder=await this.chooseFolder(cwd);if(!folder)return;
    if(this.sessions.size>=12)throw new Error('En fazla 12 oturum açılabilir. Önce bir oturumu kapat.');
    const s=new Session({cwd:folder,name:path.basename(folder)||'Claude'});this.sessions.set(s.id,s);this.active=s.id;
    await this.show();this.announce();await this.start(s,resume);
  }
  private executable(){
    const custom=vscode.workspace.getConfiguration('livingThemes').get<string>('claudePath','');
    const candidates=custom?[custom]:[...(process.env.PATH??'').split(path.delimiter).map(dir=>path.join(dir,'claude')),'/opt/homebrew/bin/claude',path.join(os.homedir(),'.local/bin/claude')];
    for(const candidate of candidates)try{if(path.isAbsolute(candidate)){fs.accessSync(candidate,fs.constants.X_OK);return candidate;}}catch{}
    throw new Error('Claude Code bulunamadı. Living Themes ayarından Claude executable yolunu seç.');
  }
  private async start(s:Session,resume:boolean){
    try{
      const args=resume?['--resume',...(s.claudeSessionId?[s.claudeSessionId]:[])]:[];
      const env=Object.fromEntries(Object.entries(process.env).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
      s.onData=data=>{if(this.ready)this.post({type:'data',id:s.id,data});else s.ack(data.length);};
      s.onExit=()=>{this.routes.get(s.id)?.dispose();this.routes.delete(s.id);this.announce();};
      s.start(this.executable(),args,env);
      this.announce();void this.registerRoutes();this.post({type:'focus',id:s.id});
    }catch(error){s.state='exited';this.announce();throw error;}
  }
  private async close(s:Session){
    if(s.state==='running'){
      const choice=await vscode.window.showWarningMessage(`“${s.name}” Claude oturumu kapatılsın mı? Çalışan işlem duracak.`,{modal:true},'Oturumu kapat');
      if(choice!=='Oturumu kapat')return;
    }
    this.routes.get(s.id)?.dispose();this.routes.delete(s.id);s.close();this.sessions.delete(s.id);
    if(this.active===s.id)this.active=this.sessions.keys().next().value;this.announce();
  }
  private refresh(force=false){
    const state=readPreferences(this.root),serialized=JSON.stringify(state);
    if(force||serialized!==this.lastPreferences){this.lastPreferences=serialized;this.post({type:'preferences',...state});}
    for(const s of this.sessions.values()){
      const instance=readJSON(path.join(this.root,`instance-${s.id}.json`));
      if(instance?.sessionId&&/^[a-f\d-]{36}$/.test(instance.sessionId)&&s.claudeSessionId!==instance.sessionId){s.claudeSessionId=instance.sessionId;this.persist();}
    }
    void this.registerRoutes();
  }
  private registering=false;
  private async registerRoutes(){
    if(this.registering||this.disposing)return;this.registering=true;
    try{
      const extension=vscode.extensions.getExtension('dev-island-local.terminal-router');if(!extension)return;
      const api=await extension.activate();if(typeof api?.registerExternalTerminal!=='function')return;
      for(const s of this.sessions.values())if(s.state==='running'&&s.process&&!this.routes.has(s.id)){
        this.routes.set(s.id,api.registerExternalTerminal({id:s.id,processID:s.process.pid,name:s.name,isAlive:()=>s.state==='running',focus:()=>this.focusSession(s.id)}));
      }
    }catch{/* Dev Island is optional; terminal execution remains available. */}finally{this.registering=false;}
  }
  private async focusSession(id:string):Promise<boolean>{
    const s=this.sessions.get(id);if(!s||s.state!=='running')return false;
    this.active=id;await this.show();this.announce();
    const requestId=crypto.randomUUID();
    return new Promise(resolve=>{const timer=setTimeout(()=>{this.focusWaiters.delete(requestId);resolve(false);},1200);this.focusWaiters.set(requestId,focused=>{clearTimeout(timer);this.focusWaiters.delete(requestId);resolve(focused&&this.active===id&&this.view?.visible===true);});this.post({type:'focus',id,requestId});});
  }
  dispose(){this.persist();this.disposing=true;clearInterval(this.poll);for(const route of this.routes.values())route.dispose();for(const s of this.sessions.values())s.close();}
  diagnostics(){return {sessions:this.list(),visible:this.view?.visible??false,ready:this.ready};}
  testInput(id:string,data:string){this.sessions.get(id)?.input(data);}
  testSnapshot(id:string){return this.sessions.get(id)?.snapshot()??Promise.resolve('');}
  inspect(capture=false){const requestId=crypto.randomUUID();return new Promise<any>((resolve,reject)=>{const timer=setTimeout(()=>{this.inspections.delete(requestId);reject(new Error('Webview inspection timeout'));},10000);this.inspections.set(requestId,result=>{clearTimeout(timer);this.inspections.delete(requestId);resolve(result);});this.post({type:'inspect',requestId,capture});});}
}
export function activate(context:vscode.ExtensionContext){
  const provider=new LivingTerminal(context);context.subscriptions.push(provider);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(VIEW,provider,{webviewOptions:{retainContextWhenHidden:true}}));
  context.subscriptions.push(vscode.commands.registerCommand('livingThemes.open',()=>provider.show()));
  context.subscriptions.push(vscode.commands.registerCommand('livingThemes.new',(arg?:{cwd?:string})=>provider.create(arg?.cwd)));
  context.subscriptions.push(vscode.commands.registerCommand('livingThemes.resume',()=>provider.create(undefined,true)));
  return {diagnostics:()=>provider.diagnostics(),...(context.extensionMode===vscode.ExtensionMode.Test?{testing:{create:(cwd:string)=>provider.create(cwd),input:(id:string,data:string)=>provider.testInput(id,data),snapshot:(id:string)=>provider.testSnapshot(id),inspect:(capture=false)=>provider.inspect(capture),focus:(id:string)=>(provider as any).focusSession(id),dispose:()=>provider.dispose()}}:{})};
}
