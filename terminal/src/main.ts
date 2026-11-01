import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node-pty';
import {Terminal} from '@xterm/headless';
import {composeFrame,frameDifference,type PaintCell} from './compositor.ts';
import {THEMES} from '../../src/catalog.ts';
import {elapsed} from '../../src/controller.ts';
import {readPreferences,readJSON,stateDirectory} from '../../shared/preferences.ts';

const argumentsLeft=process.argv.slice(2);
function take(flag:string):string|undefined{const i=argumentsLeft.indexOf(flag);if(i<0)return;const value=argumentsLeft[i+1];if(!value||value.startsWith('--'))throw Error(flag+' needs a value');argumentsLeft.splice(i,2);return value;}
function which(name:string){
  const paths=name.includes('/')?[path.resolve(name)]:(process.env.PATH??'').split(path.delimiter).map(p=>path.join(p,name));
  return paths.find(p=>{try{fs.accessSync(p,fs.constants.X_OK);return fs.statSync(p).isFile();}catch{return false;}});
}
const fpsInput=take('--living-fps'),fps=fpsInput?Number(fpsInput):10;
if(!Number.isFinite(fps)||fps<1||fps>30)throw Error('--living-fps must be 1..30');
let forcedTheme=take('--living-theme');
if(forcedTheme&&!THEMES.some(t=>t.id===forcedTheme))throw Error('Unknown Living theme: '+forcedTheme);
if(argumentsLeft.includes('--living-list')){console.log(THEMES.map(t=>`${t.id.padEnd(20)} ${t.name}`).join('\n'));process.exit(0);}
const executable=which(take('--living-claude')??process.env.LIVING_CLAUDE_BIN??'claude');
if(argumentsLeft.includes('--living-help')){
  console.log('Living Themes — terminalin tamamında canlı sahneler\n\nliving [Claude Code arguments]\nliving --living-theme koi-pond\nliving --living-fps 15 --resume\nliving --living-list\nliving --living-doctor\n\nClaude içinde /theme → Living · … seç. /living ile parlaklık ve hareketi yönet.\nMevcut konuşmalar için Claude’un --resume veya /resume akışını kullan.');process.exit(0);
}
if(argumentsLeft.includes('--living-doctor')){console.log(JSON.stringify({claude:executable??null,node:process.version,platform:process.platform,architecture:process.arch,tty:!!process.stdout.isTTY,preferences:stateDirectory()},null,2));process.exit(executable?0:1);}
if(!executable){console.error('Claude Code bulunamadı. PATH’e ekle veya --living-claude /tam/yol/claude kullan.');process.exit(1);}
if(!process.stdin.isTTY||!process.stdout.isTTY){console.error('Living Themes etkileşimli bir terminal gerektirir. Betik çıktısı için doğrudan claude kullan.');process.exit(1);}
if(process.env.LIVING_THEMES_SURFACE==='terminal'){console.error('Living Themes zaten bu terminalde çalışıyor.');process.exit(1);}
const root=stateDirectory(),instance=crypto.randomUUID();
let columns=Math.max(2,process.stdout.columns||80),rows=Math.max(2,process.stdout.rows||24);
const emulator=new Terminal({cols:columns,rows,allowProposedApi:true,scrollback:3000,convertEol:false});
let preferences=readPreferences(root),selectionSignature=JSON.stringify(readJSON(path.join(root,'selection.v1.json')));
if(!selectionSignature&&!forcedTheme)forcedTheme='claude-ember';
let cachedRows:PaintCell[][]=[],dirty=true,backpressure=false,finished=false,cursorVisible=true;
let lastModes='',lastFrameTime=-1;
const noMotion=process.env.LIVING_THEMES_REDUCE_MOTION==='1';
const child=spawn(executable,argumentsLeft,{name:'xterm-256color',cols:columns,rows,cwd:process.cwd(),env:{...process.env,TERM:'xterm-256color',COLORTERM:'truecolor',LIVING_THEMES_SURFACE:'terminal',LIVING_THEMES_INSTANCE:instance} as Record<string,string>});
function enter(){process.stdout.write('\x1b[?1049h\x1b[?7l\x1b[?25l\x1b[2J');process.stdin.setRawMode(true);process.stdin.resume();cachedRows=[];dirty=true;lastModes='';}
function leave(){try{process.stdin.setRawMode(false);}catch{}process.stdout.write('\x1b[0m\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?1004l\x1b[?2004l\x1b[?1l\x1b>\x1b[?7h\x1b[?25h\x1b[?1049l');}
function finish(code=0){if(finished)return;finished=true;clearInterval(frameTimer);clearInterval(pollTimer);try{child.kill();}catch{}emulator.dispose();process.stdin.pause();leave();try{fs.unlinkSync(path.join(root,'instance-'+instance+'.json'));}catch{}process.exitCode=code;}
function draw(){
  if(finished||backpressure)return;
  const time=noMotion?0:elapsed(preferences.motion,Date.now());
  const animated=!preferences.motion.paused&&!preferences.motion.hidden&&!noMotion;
  if(!dirty&&!animated&&lastFrameTime>=0)return;
  const frame=composeFrame(emulator,{themeId:forcedTheme??preferences.themeId,time,brightness:preferences.appearance.brightness,intensity:preferences.appearance.intensity,hidden:preferences.motion.hidden});
  let output='\x1b[?25l';
  const modes=emulator.modes;
  const mouse=modes.mouseTrackingMode==='none'?0:modes.mouseTrackingMode==='any'?1003:modes.mouseTrackingMode==='drag'?1002:1000;
  const controls=`\x1b[?2004${modes.bracketedPasteMode?'h':'l'}\x1b[?1004${modes.sendFocusMode?'h':'l'}\x1b[?1${modes.applicationCursorKeysMode?'h':'l'}${modes.applicationKeypadMode?'\x1b=':'\x1b>'}\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006${mouse?'h':'l'}${mouse?'\x1b[?'+mouse+'h':''}`;
  if(controls!==lastModes){output+=controls;lastModes=controls;}
  output+=frameDifference(frame,cachedRows);
  cachedRows=frame;dirty=false;lastFrameTime=time;
  const b=emulator.buffer.active;
  output+=`\x1b[${Math.min(rows,b.cursorY+1)};${Math.min(columns,b.cursorX+1)}H\x1b[0m`+(cursorVisible?'\x1b[?25h':'');
  if(!process.stdout.write(output)){backpressure=true;child.pause();}
}
// Observe the cursor mode without suppressing the terminal's own parser.
for(const [final,visible] of [['h',true],['l',false]] as const)emulator.parser.registerCsiHandler({prefix:'?',final},params=>{if(params.includes(25))cursorVisible=visible;return false;});
let queued=0,parsePaused=false;
child.onData(data=>{
  queued+=Buffer.byteLength(data);if(queued>1024*1024&&!parsePaused){parsePaused=true;child.pause();}
  emulator.write(data,()=>{queued-=Buffer.byteLength(data);dirty=true;if(parsePaused&&queued<128*1024){parsePaused=false;if(!backpressure)child.resume();}});
});
emulator.onData(data=>{if(!finished)child.write(data);});
emulator.onTitleChange(title=>{if(!finished)process.stdout.write('\x1b]0;'+title.replace(/[\x00-\x1f\x7f]/g,'').slice(0,180)+'\x07');});
process.stdout.on('drain',()=>{backpressure=false;if(!parsePaused)child.resume();dirty=true;});
// A terminal read may split a pasted UTF-8 character between chunks.
process.stdin.setEncoding('utf8');
process.stdin.on('data',data=>{if(!finished)child.write(data.toString());});
process.stdout.on('resize',()=>{
  columns=Math.max(2,process.stdout.columns||80);rows=Math.max(2,process.stdout.rows||24);
  emulator.resize(columns,rows);child.resize(columns,rows);cachedRows=[];dirty=true;
});
process.on('SIGTERM',()=>finish(143));process.on('SIGHUP',()=>finish(129));process.on('SIGINT',()=>{if(!finished)child.write('\x03');});
process.on('uncaughtException',error=>{finish(1);console.error(error.message);});
process.on('unhandledRejection',error=>{finish(1);console.error(error);});
process.on('exit',()=>{if(!finished){try{child.kill();}catch{}leave();}});
const frameTimer=setInterval(draw,1000/fps);
const pollTimer=setInterval(()=>{
  const next=JSON.stringify(readJSON(path.join(root,'selection.v1.json')));
  if(next!==selectionSignature){forcedTheme=undefined;selectionSignature=next;}
  const updated=readPreferences(root);
  if(!readJSON(path.join(root,'motion.v1.json')))updated.motion=preferences.motion;
  if(JSON.stringify(updated)!==JSON.stringify(preferences)){preferences=updated;dirty=true;}
},500);
child.onExit(({exitCode})=>finish(exitCode));
enter();draw();
