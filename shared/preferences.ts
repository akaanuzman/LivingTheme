import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {findTheme} from '../src/catalog.ts';
import {motionOf} from '../src/controller.ts';
export const configDirectory=()=>process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude');
export const stateDirectory=(config=configDirectory())=>path.join(config,'plugins/living-themes/state-v1');
export function readJSON(file:string):any {try{if(fs.statSync(file).size>8192)return undefined;return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return undefined;}}
export function writeRecord(root:string,key:string,data:unknown){
  if(!['motion.v1','selection.v1','appearance.v1'].includes(key))throw new Error('Unknown preference');
  fs.mkdirSync(root,{recursive:true,mode:0o700});
  if(fs.lstatSync(root).isSymbolicLink())throw new Error('Preference directory is a symlink');
  const temporary=path.join(root,`.write-${crypto.randomUUID()}`);
  try{fs.writeFileSync(temporary,JSON.stringify(data),{mode:0o600,flag:'wx'});fs.renameSync(temporary,path.join(root,key+'.json'));}
  finally{try{fs.unlinkSync(temporary);}catch{}}
}
export function readPreferences(root=stateDirectory()){
  const selection=readJSON(path.join(root,'selection.v1.json'));
  const theme=typeof selection?.value==='string'?findTheme(selection.value):undefined;
  const motion=motionOf(readJSON(path.join(root,'motion.v1.json')),Date.now());
  const appearance=readJSON(path.join(root,'appearance.v1.json'));
  const bounded=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
  return {themeId:theme?.id??null,motion,appearance:{brightness:bounded(appearance?.brightness,.8),intensity:bounded(appearance?.intensity,.65)}};
}
export function updateControl(root:string,action:string,value?:number){
  const preferences=readPreferences(root),m=preferences.motion,now=Date.now();
  if(action==='pause'&&!m.paused){m.elapsedMs+=Math.max(0,now-m.startedAt);m.paused=true;}
  else if(action==='resume'&&m.paused){m.startedAt=now;m.paused=false;}
  else if(action==='hide')m.hidden=true;
  else if(action==='show')m.hidden=false;
  else if((action==='brightness'||action==='intensity')&&typeof value==='number'&&Number.isFinite(value)){
    preferences.appearance[action]=Math.max(0,Math.min(1,value));writeRecord(root,'appearance.v1',preferences.appearance);return;
  }else return;
  writeRecord(root,'motion.v1',m);
}
