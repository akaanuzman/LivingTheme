import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {WebglAddon} from '@xterm/addon-webgl';
import {THEMES} from '../../src/catalog.ts';
import {paintWorld} from './world.ts';
declare function acquireVsCodeApi():{postMessage(message:unknown):void;getState():any;setState(state:unknown):void};
const api=acquireVsCodeApi();
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
type Tab={id:string;name:string;cwd:string;state:string;claudeSessionId?:string};
type Surface={term:Terminal;fit:FitAddon;container:HTMLElement;overlay:HTMLElement};
const surfaces=new Map<string,Surface>();
let tabs:Tab[]=[],active:string|undefined,fontSize=14,hostVisible=true;
let preferences={themeId:null as string|null,motion:{paused:false,hidden:false,elapsedMs:0,startedAt:Date.now()},appearance:{brightness:.8,intensity:.65}};
const canvas=$<HTMLCanvasElement>('world'),ctx=canvas.getContext('2d',{alpha:false})!;
let width=1,height=1,raf=0,lastFrame=0,noticeTimer=0;
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const send=(message:unknown)=>api.postMessage(message);
function palette(){return (THEMES.find(t=>t.id===preferences.themeId)??THEMES.find(t=>t.id==='koi-pond')!).palette;}
function terminalTheme(){const p=palette();return {background:'#00000000',foreground:p.text,cursor:p.accent,cursorAccent:p.bg,selectionBackground:p.muted+'cc',black:p.bg,brightBlack:p.muted,white:p.text,brightWhite:'#ffffff',red:'#efa0a0',brightRed:'#ffc2b5',green:'#9bccab',brightGreen:'#b4ecc5',yellow:'#decb91',brightYellow:'#f7dfa6',blue:p.secondary,brightBlue:p.glow,magenta:p.accent,brightMagenta:p.glow,cyan:p.secondary,brightCyan:p.glow};}
function addSurface(tab:Tab){
  const container=document.createElement('section');container.className='terminal-session';container.id='session-'+tab.id;container.setAttribute('role','tabpanel');
  const mount=document.createElement('div');mount.className='xterm-mount';container.append(mount);
  const overlay=document.createElement('div');overlay.className='restart';overlay.hidden=true;container.append(overlay);$('terminals').append(container);
  const term=new Terminal({allowTransparency:true,fontFamily:'"SFMono-Regular", Menlo, Monaco, monospace',fontSize,lineHeight:1.25,cursorBlink:true,scrollback:2000,theme:terminalTheme(),macOptionIsMeta:true,minimumContrastRatio:4.5});
  const fit=new FitAddon();term.loadAddon(fit);term.open(mount);
  try{const gl=new WebglAddon(document.body.dataset.capture==='true');gl.onContextLoss(()=>gl.dispose());term.loadAddon(gl);}catch{/* The DOM renderer remains functional. */}
  term.onData(data=>{for(let i=0;i<data.length;i+=16384)send({type:'input',id:tab.id,data:data.slice(i,i+16384)});});
  term.onResize(({cols,rows})=>send({type:'resize',id:tab.id,cols,rows}));
  term.attachCustomKeyEventHandler(event=>{
    if(event.type!=='keydown')return true;
    if(event.metaKey&&event.key.toLowerCase()==='c'){if(term.hasSelection())send({type:'copy',text:term.getSelection()});return false;}
    if(event.metaKey&&event.key.toLowerCase()==='v'){send({type:'paste',id:tab.id});return false;}
    if(event.metaKey&&event.key.toLowerCase()==='a'){term.selectAll();return false;}
    return true;
  });
  surfaces.set(tab.id,{term,fit,container,overlay});
}
function layout(){
  for(const [id,surface]of surfaces){const selected=id===active;surface.container.classList.toggle('active',selected);if(selected){try{surface.fit.fit();}catch{}}}
  sizeWorld();
}
function renderTabs(){
  for(const tab of tabs)if(!surfaces.has(tab.id))addSurface(tab);
  for(const [id,surface]of surfaces)if(!tabs.some(t=>t.id===id)){surface.term.dispose();surface.container.remove();surfaces.delete(id);}
  $('tabs').replaceChildren();
  for(const tab of tabs){
    const button=document.createElement('button');button.className='tab'+(tab.id===active?' selected':'');button.setAttribute('role','tab');button.setAttribute('aria-selected',String(tab.id===active));button.title=tab.cwd;
    const dot=document.createElement('span');dot.className='status '+(tab.state==='running'?'running':'');
    const name=document.createElement('span');name.textContent=tab.name;
    const close=document.createElement('span');close.className='close';close.textContent='×';close.title='Oturumu kapat';close.setAttribute('role','button');close.tabIndex=0;
    const closeTab=(event:Event)=>{event.stopPropagation();send({type:'close',id:tab.id});};close.onclick=closeTab;close.onkeydown=event=>{if(event.key==='Enter')closeTab(event);};
    button.append(dot,name,close);button.onclick=()=>{active=tab.id;send({type:'select',id:active});renderTabs();surfaces.get(tab.id)?.term.focus();};$('tabs').append(button);
    const surface=surfaces.get(tab.id)!;surface.overlay.hidden=tab.state==='running';surface.overlay.replaceChildren();
    if(tab.state!=='running'){
      const title=document.createElement('h2');title.textContent=tab.state==='interrupted'?'Oturum yeniden bağlanmayı bekliyor.':'Claude oturumu tamamlandı.';
      const sub=document.createElement('p');sub.textContent=tab.claudeSessionId?'Aynı konuşmaya devam edebilirsin.':'Claude’un konuşma seçicisiyle devam edebilirsin.';
      const resume=document.createElement('button');resume.className='primary';resume.textContent='Konuşmaya devam et';resume.onclick=()=>send({type:'restart',id:tab.id});surface.overlay.append(title,sub,resume);
    }
  }
  $('empty').hidden=tabs.length>0;layout();schedule();
}
function updatePreferences(){
  const selected=THEMES.find(t=>t.id===preferences.themeId);
  $('theme').textContent=selected?selected.name:'Living Terminal';
  $('pause').textContent=preferences.motion.paused?'Devam et':'Duraklat';$('hide').textContent=preferences.motion.hidden?'Göster':'Gizle';
  for(const field of ['brightness','intensity'] as const){const slider=$<HTMLInputElement>(field);if(document.activeElement!==slider)slider.value=String(Math.round(preferences.appearance[field]*100));}
  document.documentElement.style.setProperty('--accent',palette().accent);
  $('scrim').style.opacity=String(.84-preferences.appearance.brightness*.63);
  for(const surface of surfaces.values())surface.term.options.theme=terminalTheme();
  schedule();
}
function sizeWorld(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);width=Math.max(1,rect.width);height=Math.max(1,rect.height);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
function draw(){
  if(preferences.motion.hidden||(tabs.length>0&&!preferences.themeId)){ctx.fillStyle='#172222';ctx.fillRect(0,0,width,height);return;}
  const m=preferences.motion,seconds=tabs.length?(m.elapsedMs+(m.paused?0:Math.max(0,Date.now()-m.startedAt)))/1000:performance.now()/1000;
  paintWorld(ctx,width,height,preferences.themeId??'koi-pond',reduceMotion.matches?0:seconds,preferences.appearance.intensity);
}
function schedule(){
  cancelAnimationFrame(raf);draw();
  if(document.hidden||!hostVisible||preferences.motion.paused||preferences.motion.hidden||reduceMotion.matches)return;
  const frame=(stamp:number)=>{if(document.hidden||!hostVisible)return;if(stamp-lastFrame>=1000/30){draw();lastFrame=stamp;}raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);
}
function focus(id:string,requestId?:string){
  active=id;renderTabs();const surface=surfaces.get(id);surface?.term.focus();
  requestAnimationFrame(()=>{if(requestId)send({type:'focusAck',requestId,focused:document.hasFocus()&&!!surface?.term.textarea&&document.activeElement===surface.term.textarea});});
}
window.addEventListener('message',event=>{
  const m=event.data;if(!m||typeof m.type!=='string')return;
  if(m.type==='sessions'){tabs=m.sessions;active=m.active??tabs[0]?.id;renderTabs();}
  else if(m.type==='data'){
    const surface=surfaces.get(m.id);if(surface)surface.term.write(m.data,()=>send({type:'ack',id:m.id,bytes:m.data.length}));else send({type:'ack',id:m.id,bytes:m.data.length});
  }
  else if(m.type==='snapshot'){const s=surfaces.get(m.id);s?.term.reset();s?.term.write(m.data);}
  else if(m.type==='preferences'){preferences=m;updatePreferences();}
  else if(m.type==='font'){fontSize=m.size;for(const s of surfaces.values())s.term.options.fontSize=fontSize;layout();}
  else if(m.type==='visibility'){hostVisible=m.visible;if(hostVisible)layout();schedule();}
  else if(m.type==='focus')focus(m.id,m.requestId);
  else if(m.type==='pasteData')surfaces.get(m.id)?.term.paste(m.data);
  else if(m.type==='notice'){$('notice').textContent=m.text;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=window.setTimeout(()=>$('notice').hidden=true,6000);}
  else if(m.type==='inspect'&&document.body.dataset.capture==='true'){
    const response:any={type:'inspection',requestId:m.requestId,width,height,themeId:preferences.themeId,active,visible:hostVisible,paused:preferences.motion.paused,surfaces:surfaces.size};
    if(m.capture){
      draw();const exported=document.createElement('canvas');exported.width=canvas.width;exported.height=canvas.height;const output=exported.getContext('2d')!;output.drawImage(canvas,0,0);
      const dpr=canvas.width/width;output.scale(dpr,dpr);
      const gradient=output.createLinearGradient(0,0,width,height);gradient.addColorStop(0,'#070e12ee');gradient.addColorStop(.42,'#0a1219d9');gradient.addColorStop(.8,'#0a121966');gradient.addColorStop(1,'#0a121922');output.globalAlpha=Number($('scrim').style.opacity);output.fillStyle=gradient;output.fillRect(0,0,width,height);output.globalAlpha=1;
      const surface=surfaces.get(active??'');if(surface){for(const rendered of surface.container.querySelectorAll('canvas')){const box=rendered.getBoundingClientRect();if(box.width&&box.height)output.drawImage(rendered,box.x,box.y,box.width,box.height);}}
      output.fillStyle='#101817dd';output.fillRect(0,0,width,35);output.font='12px -apple-system, sans-serif';output.fillStyle='#dae6e0';output.fillText(tabs.find(tab=>tab.id===active)?.name??'Living Terminal',18,22);output.fillStyle=palette().accent;output.textAlign='right';output.fillText(THEMES.find(theme=>theme.id===preferences.themeId)?.name??'Living Terminal',width-20,22);
      response.png=exported.toDataURL('image/png');
    }
    send(response);
  }
});
$('new').onclick=$('start').onclick=()=>send({type:'new'});$('resume').onclick=()=>send({type:'resume'});
$('settings').onclick=()=>{$('controls').hidden=!$('controls').hidden;};
$('pause').onclick=()=>send({type:'control',action:preferences.motion.paused?'resume':'pause'});
$('hide').onclick=()=>send({type:'control',action:preferences.motion.hidden?'show':'hide'});
for(const field of ['brightness','intensity']as const){let timer=0;$<HTMLInputElement>(field).oninput=()=>{clearTimeout(timer);const value=Number($<HTMLInputElement>(field).value)/100;preferences.appearance[field]=value;updatePreferences();timer=window.setTimeout(()=>send({type:'control',action:field,value}),150);};}
new ResizeObserver(layout).observe($('terminals'));
document.addEventListener('visibilitychange',schedule);reduceMotion.addEventListener('change',schedule);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('controls').hidden){$('controls').hidden=true;event.preventDefault();surfaces.get(active??'')?.term.focus();}});
sizeWorld();send({type:'ready'});
