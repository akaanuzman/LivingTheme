import * as pty from 'node-pty';
import {Terminal as HeadlessTerminal} from '@xterm/headless';
import {SerializeAddon} from '@xterm/addon-serialize';
import crypto from 'node:crypto';
export type SavedSession={id:string;name:string;cwd:string;claudeSessionId?:string};
export class Session {
  readonly id:string;
  readonly terminal:HeadlessTerminal;
  readonly serializer:SerializeAddon;
  process:pty.IPty|undefined;
  state:'running'|'exited'|'interrupted'='interrupted';
  name:string;
  cwd:string;
  claudeSessionId:string|undefined;
  pending=0;
  onData:(data:string)=>void=()=>{};
  onExit:()=>void=()=>{};
  private queue='';
  private flushTimer:ReturnType<typeof setTimeout>|undefined;
  constructor(saved:Partial<SavedSession>&{cwd:string}){
    this.id=saved.id??crypto.randomUUID();this.cwd=saved.cwd;this.name=saved.name??'Claude';this.claudeSessionId=saved.claudeSessionId;
    this.terminal=new HeadlessTerminal({cols:100,rows:30,scrollback:2000,allowProposedApi:true});
    this.serializer=new SerializeAddon();this.terminal.loadAddon(this.serializer as any);
  }
  start(executable:string,args:string[],env:Record<string,string>,cols=100,rows=30){
    if(this.state==='running')throw new Error('Session is already running');
    this.terminal.resize(cols,rows);
    this.process=pty.spawn(executable,args,{name:'xterm-256color',cols,rows,cwd:this.cwd,env:{...env,LIVING_THEMES_SURFACE:'vscode',LIVING_THEMES_INSTANCE:this.id,TERM:'xterm-256color',COLORTERM:'truecolor',TERM_PROGRAM:'vscode'}});
    this.state='running';
    this.process.onData(data=>{
      this.terminal.write(data);this.queue+=data;
      if(!this.flushTimer)this.flushTimer=setTimeout(()=>this.flush(),12);
    });
    this.process.onExit(()=>{this.flush();this.state='exited';this.onExit();});
  }
  flush(){if(this.flushTimer)clearTimeout(this.flushTimer);this.flushTimer=undefined;if(this.queue){const data=this.queue;this.queue='';this.pending+=data.length;if(this.pending>262144)this.process?.pause();this.onData(data);}}
  ack(bytes:number){this.pending=Math.max(0,this.pending-bytes);if(this.pending<65536&&this.state==='running')this.process?.resume();}
  resize(cols:number,rows:number){if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<2||cols>500||rows<2||rows>250)return;this.terminal.resize(cols,rows);if(this.state==='running')this.process?.resize(cols,rows);}
  input(data:string){if(this.state==='running'&&data.length<=65536)this.process?.write(data);}
  async snapshot():Promise<string>{await new Promise<void>(resolve=>this.terminal.write('',resolve));return this.serializer.serialize({scrollback:2000});}
  saved():SavedSession{return {id:this.id,name:this.name,cwd:this.cwd,...(this.claudeSessionId?{claudeSessionId:this.claudeSessionId}:{})};}
  close(){if(this.flushTimer)clearTimeout(this.flushTimer);if(this.state==='running'){try{this.process?.kill();}catch{}}this.state='exited';this.terminal.dispose();}
}
