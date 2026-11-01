import { findTheme } from './catalog.ts';
export type SharedSelection = { value: string; source: string; changedAt: number };
export type Motion = { paused: boolean; hidden: boolean; elapsedMs: number; startedAt: number };
export type Appearance = { brightness:number; intensity:number };
export type Host = {
  readTheme(): Promise<string>;
  setTheme(value: string): Promise<{ value?: unknown; deny?: string }>;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  now(): Promise<number>;
  invalidate(): void;
};
export const SELECTION_KEY = 'selection.v1';
export const MOTION_KEY = 'motion.v1';
export const APPEARANCE_KEY='appearance.v1';
export function appearanceOf(raw:unknown):Appearance {
  const object=raw as Partial<Appearance>|null;
  const bounded=(n:unknown,defaultValue:number)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(1,n)):defaultValue;
  return {brightness:bounded(object?.brightness,.8),intensity:bounded(object?.intensity,.65)};
}
export function selectionOf(raw: unknown): SharedSelection | undefined {
  if(!raw || typeof raw!=='object')return;
  const d=raw as Record<string,unknown>;
  if(typeof d.value==='string' && d.value.length<=256 && typeof d.source==='string' && typeof d.changedAt==='number' && Number.isFinite(d.changedAt))
    return {value:d.value,source:d.source,changedAt:d.changedAt};
}
export function motionOf(raw: unknown, now: number): Motion {
  const d=raw as Partial<Motion>|null;
  if(d && typeof d.paused==='boolean' && typeof d.hidden==='boolean' && typeof d.elapsedMs==='number' && Number.isFinite(d.elapsedMs) && d.elapsedMs>=0 && typeof d.startedAt==='number' && Number.isFinite(d.startedAt))return {...d} as Motion;
  return {paused:false,hidden:false,elapsedMs:0,startedAt:now};
}
export const elapsed = (m: Motion, now: number): number => (m.elapsedMs+(m.paused?0:Math.max(0,now-m.startedAt)))/1000;

/** Each session owns its observed value. Only a new local pick publishes, so a
 * refused custom palette never echoes over a newer remote scene selection. */
export class Controller {
  selection: SharedSelection | undefined;
  motion: Motion = {paused:false,hidden:false,elapsedMs:0,startedAt:0};
  observed: string | undefined;
  palettePending = false;
  appearance:Appearance={brightness:.8,intensity:.65};
  private busy = false;
  readonly source: string;
  constructor(source: string) { this.source=source; }
  get theme() {return this.selection ? findTheme(this.selection.value):undefined;}
  async start(host: Host): Promise<void> {
    if(this.observed!==undefined)return;
    this.observed=await host.readTheme();
    const now=await host.now();
    this.motion=motionOf(await host.get(MOTION_KEY),now);
    this.appearance=appearanceOf(await host.get(APPEARANCE_KEY));
    // A shared clock is initialized only when a scene first becomes active.
    const remote=selectionOf(await host.get(SELECTION_KEY));
    if(remote)await this.adopt(host,remote);
    else if(findTheme(this.observed))await this.publish(host,this.observed);
  }
  async publish(host: Host, value: string): Promise<void> {
    if(findTheme(value) && !await host.get(MOTION_KEY)) {
      this.motion={paused:false,hidden:false,elapsedMs:0,startedAt:await host.now()};
      await host.set(MOTION_KEY,this.motion);
    }
    const next={value,source:this.source,changedAt:await host.now()};
    await host.set(SELECTION_KEY,next);
    this.selection=next;
    this.palettePending=false;
    host.invalidate();
  }
  private async adopt(host: Host, selection: SharedSelection): Promise<void> {
    this.selection=selection;
    this.palettePending=selection.value!==this.observed;
    // 2.1.308 refuses custom slugs in $.config.set. Do not rewrite configuration
    // files or theme assets to pretend it supports them. Native picks remain intact.
    if(this.palettePending && !selection.value.startsWith('custom:')) {
      const result=await host.setTheme(selection.value);
      if(!result.deny){this.observed=selection.value;this.palettePending=false;}
    }
    host.invalidate();
  }
  async poll(host: Host): Promise<void> {
    if(this.busy)return;
    this.busy=true;
    try {
      await this.start(host);
      const local=await host.readTheme();
      if(local!==this.observed) {
        this.observed=local;
        await this.publish(host,local);
      } else {
        const remote=selectionOf(await host.get(SELECTION_KEY));
        if(remote && JSON.stringify(remote)!==JSON.stringify(this.selection))await this.adopt(host,remote);
      }
      const raw=await host.get(MOTION_KEY);
      if(raw){const motion=motionOf(raw,await host.now());if(JSON.stringify(motion)!==JSON.stringify(this.motion)){this.motion=motion;host.invalidate();}}
      const appearance=appearanceOf(await host.get(APPEARANCE_KEY));
      if(JSON.stringify(appearance)!==JSON.stringify(this.appearance)){this.appearance=appearance;host.invalidate();}
    } finally {this.busy=false;}
  }
  async control(host: Host, action: 'pause'|'resume'|'hide'|'show'): Promise<void> {
    const now=await host.now();
    const m=motionOf(await host.get(MOTION_KEY),now);
    if(action==='pause' && !m.paused){m.elapsedMs+=Math.max(0,now-m.startedAt);m.paused=true;}
    if(action==='resume' && m.paused){m.startedAt=now;m.paused=false;}
    if(action==='hide')m.hidden=true;
    if(action==='show')m.hidden=false;
    await host.set(MOTION_KEY,m);
    this.motion=m;
    host.invalidate();
  }
  async adjust(host:Host,key:'brightness'|'intensity',value:number){
    if(!Number.isFinite(value))return;
    const appearance=appearanceOf(await host.get(APPEARANCE_KEY));
    appearance[key]=Math.max(key==='brightness'?.2:0,Math.min(1,value));
    await host.set(APPEARANCE_KEY,appearance);this.appearance=appearance;host.invalidate();
  }
}
