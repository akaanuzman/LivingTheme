import { findTheme } from './catalog.js';
                                                                                   
                                                                                                
                                                                 
                    
                               
                                                                       
                                     
                                                  
                         
                     
  
export const SELECTION_KEY = 'selection.v1';
export const MOTION_KEY = 'motion.v1';
export const APPEARANCE_KEY='appearance.v1';
export function appearanceOf(raw        )            {
  const object=raw                            ;
  const bounded=(n        ,defaultValue       )=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(1,n)):defaultValue;
  return {brightness:bounded(object?.brightness,.8),intensity:bounded(object?.intensity,.65)};
}
export function selectionOf(raw         )                              {
  if(!raw || typeof raw!=='object')return;
  const d=raw                          ;
  if(typeof d.value==='string' && d.value.length<=256 && typeof d.source==='string' && typeof d.changedAt==='number' && Number.isFinite(d.changedAt))
    return {value:d.value,source:d.source,changedAt:d.changedAt};
}
export function motionOf(raw         , now        )         {
  const d=raw                        ;
  if(d && typeof d.paused==='boolean' && typeof d.hidden==='boolean' && typeof d.elapsedMs==='number' && Number.isFinite(d.elapsedMs) && d.elapsedMs>=0 && typeof d.startedAt==='number' && Number.isFinite(d.startedAt))return {...d}          ;
  return {paused:false,hidden:false,elapsedMs:0,startedAt:now};
}
export const elapsed = (m        , now        )         => (m.elapsedMs+(m.paused?0:Math.max(0,now-m.startedAt)))/1000;

/** Each session owns its observed value. Only a new local pick publishes, so a
 * refused custom palette never echoes over a newer remote scene selection. */
export class Controller {
  selection                             ;
  motion         = {paused:false,hidden:false,elapsedMs:0,startedAt:0};
  observed                    ;
  palettePending = false;
  appearance           ={brightness:.8,intensity:.65};
          busy = false;
           source        ;
  constructor(source        ) { this.source=source; }
  get theme() {return this.selection ? findTheme(this.selection.value):undefined;}
  async start(host      )                {
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
  async publish(host      , value        )                {
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
          async adopt(host      , selection                 )                {
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
  async poll(host      )                {
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
  async control(host      , action                                )                {
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
  async adjust(host     ,key                         ,value       ){
    if(!Number.isFinite(value))return;
    const appearance=appearanceOf(await host.get(APPEARANCE_KEY));
    appearance[key]=Math.max(key==='brightness'?.2:0,Math.min(1,value));
    await host.set(APPEARANCE_KEY,appearance);this.appearance=appearance;host.invalidate();
  }
}
