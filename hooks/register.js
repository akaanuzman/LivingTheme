                                                              
import { Controller,           } from '../lib/controller.js';
import {THEMES} from '../lib/catalog.js';

const PANE='living-controls';
function hostOf($                 , dataRoot        )       {
  return {
    readTheme: async () => {
      const row=(await $.config.list()).find(row=>row.key==='theme');
      return typeof row?.value==='string'?row.value:'dark';
    },
    setTheme: value => $.config.set({key:'theme',value}),
    get:async key=>{
      const path=dataRoot+'/'+key+'.json';
      return await $.fs.exists(path)?JSON.parse(await $.fs.read(path)):undefined;
    },
    set:async(key,value)=>{
      const result=await $.process.run(['/bin/sh',$.plugin.root+'/scripts/state.sh',dataRoot,key],{stdin:JSON.stringify(value),timeoutMs:3000});
      if(result.exitCode!==0)throw new Error('Living Themes preference write failed');
    },
    now:()=>$.clock.now(), invalidate:()=>$.ui.invalidate('ui.render'),
  };
}
export function register(on    ) {
  let dataRoot='';
  let controller=new Controller('local');
  let pollTimer                 ;
  let issue='';
  let pollCount=0;
  let instanceKey='';
  let lastSessionID='';
  const stop=()=>{pollTimer?.cancel();pollTimer=undefined;};
  on('session.start',async($,e,next)=>{
    if(!e.isInteractive || e.surface!=='terminal')return next(e);
    stop();
    controller=new Controller(await $.session.id());
    const config=(await $.env.get('CLAUDE_CONFIG_DIR')) || (await $.env.get('HOME'))+'/.claude';
    dataRoot=config+'/plugins/living-themes/state-v1';
    const host=hostOf($,dataRoot);
    const instance=await $.env.get('LIVING_THEMES_INSTANCE');
    instanceKey=typeof instance==='string'&&/^[a-f\d-]{36}$/.test(instance)?'instance-'+instance:'';
    if(instanceKey){lastSessionID=await $.session.id();await host.set(instanceKey,{sessionId:lastSessionID,cwd:await $.session.cwd()});}
    try{await controller.start(host);}catch{issue='Ortak tercih okunamadı. /living ile durumu incele.';}
    pollTimer=$.clock.every(1000,async()=>{
      pollCount++;
      try{
        await controller.poll(hostOf($,dataRoot));
        if(instanceKey){const sid=await $.session.id();if(sid!==lastSessionID){await hostOf($,dataRoot).set(instanceKey,{sessionId:sid,cwd:await $.session.cwd()});lastSessionID=sid;}}
        issue='';
      }catch{issue='Ortak tercih geçici olarak okunamıyor; son görünüm korunuyor.';}
    });
    await $.command.register({name:'living',description:'Canlı Terminal: hareket, parlaklık ve görünürlük',argumentHint:'[pause|resume|hide|show|brightness 80|intensity 65|status]',immediate:true});
    return next(e);
  }).catch(($,e,next)=>next(e));

  on('session.end',($,e,next)=>{
    if(e.reason!=='clear' && e.reason!=='resume')stop();
    return next(e);
  });
  on('command.run',{command:'living'},async($,e)=>{
    const action=e.args.trim().toLowerCase();
    const adjustment=/^(brightness|intensity)\s+(\d{1,3})$/.exec(action);
    if(adjustment){await controller.adjust(hostOf($,dataRoot),adjustment[1]                            ,Number(adjustment[2])/100);$.ui.toast('Canlı Terminal görünümü güncellendi.');return {};}
    if(['pause','resume','hide','show'].includes(action)) {
      await controller.control(hostOf($,dataRoot),action                                  );
      $.ui.toast(action==='pause'?'Canlı sahne duraklatıldı.':action==='resume'?'Canlı sahne devam ediyor.':action==='hide'?'Canlı sahne gizlendi.':'Canlı sahne gösteriliyor.');
      return {};
    }
    if(action==='status') {
      return {text:JSON.stringify({scene:controller.theme?.id??null,localTheme:controller.observed,sharedTheme:controller.selection?.value??null,paused:controller.motion.paused,hidden:controller.motion.hidden,appearance:controller.appearance,palettePending:controller.palettePending,issue,pollCount})};
    }
    await $.ui.open({id:PANE,title:'Living Themes',focus:true,closeOnEscape:true,rows:12});
    return {};
  }).catch(($)=>{$.ui.toast('Living Themes kontrolü açılamadı. Diğer Claude Code özellikleri kullanılabilir.');return {};});

  on('ui.render',{component:'Pane'},async($,e,next)=>{
    if(e.requestId!==PANE)return next(e);
    const {Box,Text,Button}=$.ui.resolve(e);
    const m=controller.motion;
    return Box({flexDirection:'column',gap:1,children:[
      Text({weight:'semibold',color:'claude',children:[`LIVING THEMES / ${THEMES.length} canlı dünya`]}),
      Text({children:[controller.theme?`Sahne: ${controller.theme.name}`:'Başlamak için /theme → Living · … seç.']}),
      Text({dimColor:true,children:[controller.theme?.description??'Tema seçimi Claude Code’un mevcut /theme menüsündedir.']}),
      Text({children:[`Animasyon: ${m.paused?'duraklatıldı':'açık'}  ·  Sahne: ${m.hidden?'gizli':'görünür'}  ·  Tüm Canlı Terminal oturumları`]}),
      Text({dimColor:true,children:[(await $.env.get('LIVING_THEMES_SURFACE'))==='terminal'?'Tam ekran canlı tema etkin. Tema seçimi: /theme.':'Tam ekran sahne için yeni bir terminalde claude komutuyla aç.']}),
      ...(controller.palettePending?[Text({color:'warning',children:['Bu oturumda renkleri de eşlemek için /theme ile aynı temayı seç. Claude Code 2.1.308 özel temaları API ile değiştirmiyor.']})]:[]),
      ...(issue?[Text({color:'warning',children:[issue]})]:[]),
      Box({flexDirection:'row',gap:2,children:[
        Button({key:'motion',label:m.paused?'Devam et':'Duraklat',hotkey:'p',onPress:()=>controller.control(hostOf($,dataRoot),m.paused?'resume':'pause')}),
        Button({key:'visibility',label:m.hidden?'Göster':'Gizle',hotkey:'h',onPress:()=>controller.control(hostOf($,dataRoot),m.hidden?'show':'hide')}),
        Button({key:'close',label:'Kapat',hotkey:'q',onPress:()=>$.ui.close({id:PANE})}),
      ]}),
      Text({children:[`Parlaklık: %${Math.round(controller.appearance.brightness*100)}  ·  Hareket: %${Math.round(controller.appearance.intensity*100)}`]}),
      Box({flexDirection:'row',gap:2,children:[
        Button({key:'dimmer',label:'Parlaklık −',onPress:()=>controller.adjust(hostOf($,dataRoot),'brightness',controller.appearance.brightness-.1)}),
        Button({key:'brighter',label:'Parlaklık +',onPress:()=>controller.adjust(hostOf($,dataRoot),'brightness',controller.appearance.brightness+.1)}),
        Button({key:'calmer',label:'Hareket −',onPress:()=>controller.adjust(hostOf($,dataRoot),'intensity',controller.appearance.intensity-.1)}),
        Button({key:'livelier',label:'Hareket +',onPress:()=>controller.adjust(hostOf($,dataRoot),'intensity',controller.appearance.intensity+.1)}),
      ]}),
      Text({dimColor:true,children:['/theme: tema seç  ·  /living: kontroller  ·  Esc: kapat']}),
    ]});
  }).catch(($,e,next)=>next(e));
}
