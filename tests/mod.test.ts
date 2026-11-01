import {expect,mock,test} from 'claude-code/testing';
const session={surface:'terminal',isInteractive:true,cwd:'/work'} as const;
const band={component:'AbovePrompt',surface:'terminal',props:{bodyColumns:80,maxRows:8},viewport:{columns:80,rows:30,isFullscreen:true}} as const;
function world(on:any,initial='custom:living-themes:koi-pond'){
  const store=new Map();let theme=initial;const commands:string[]=[];
  on('env.get',(_:any,e:any)=>({value:e.name==='CLAUDE_CONFIG_DIR'?'/test/config':e.name==='HOME'?'/test':undefined}));
  on('fs.exists',(_:any,e:any)=>({value:store.has(e.path)}));on('fs.read',(_:any,e:any)=>({value:store.get(e.path)}));
  on('process.run',(_:any,e:any)=>{store.set(e.argv[2]+'/'+e.argv[3]+'.json',e.init.stdin);return{value:{exitCode:0,stdout:'',stderr:''}};});
  on('config.list',()=>({value:[{key:'theme',value:theme}]}));on('config.set',(_:any,e:any)=>{theme=e.value;return{value:e.value};});
  on('session.id',()=>({value:'test-session'}));on('session.start',()=>({cwd:'/work'}));on('session.end',()=>({sessionId:'test-session'}));
  on('command.register',(_:any,e:any)=>{commands.push(e.name);return{value:{command:e.name}};});
  for(const event of ['ui.invalidate','ui.close','ui.toast'])on(event,()=>({value:undefined}));
  on('ui.open',()=>({value:{isPlaced:true}}));on('ui.render',()=>({type:'Text',children:['Other mod content']}));
  const clock=mock.clock(on,{now:10000});return{store,commands,clock,pick:(value:string)=>{theme=value;}};
}
function text(node:any):string{return typeof node==='string'?node:(node?.children??[]).map(text).join('');}
test('native /theme remains untouched; no strip is drawn over another mod',async($,on)=>{
  const w=world(on);await $.session.start(session);expect(w.commands).toEqual(['living']);
  expect(text(await $.ui.render(band))).toBe('Other mod content');
  const status=JSON.parse((await $.command.run({command:'living',args:'status'})).text!);expect(status.scene).toBe('koi-pond');
});
test('native controls mount and change motion, visibility, brightness and intensity',async($,on)=>{
  world(on);await $.session.start(session);await $.command.run({command:'living',args:''});
  const pane=await $.ui.mount({plugin:'living-themes',component:'Pane',surface:'terminal',requestId:'living-controls',props:{bodyColumns:100},viewport:{columns:120,rows:45,isFullscreen:true}});
  expect(text(await pane.drawn())).toContain('LIVING THEMES');
  await pane.press({key:'motion'});await pane.press({key:'visibility'});await pane.press({key:'brighter'});await pane.press({key:'calmer'});
  const status=JSON.parse((await $.command.run({command:'living',args:'status'})).text!);
  expect(status.paused).toBe(true);expect(status.hidden).toBe(true);expect(Math.round(status.appearance.brightness*100)).toBe(90);
  await pane.press({key:'close'});await pane.unmount();
});
test('direct appearance commands clamp values and preserve native content',async($,on)=>{
  world(on);await $.session.start(session);
  await $.command.run({command:'living',args:'brightness 5'});await $.command.run({command:'living',args:'intensity 100'});
  const status=JSON.parse((await $.command.run({command:'living',args:'status'})).text!);
  expect(status.appearance.brightness).toBe(.2);expect(status.appearance.intensity).toBe(1);
  expect(text(await $.ui.render(band))).toBe('Other mod content');
});
test('clear keeps the preference poll; a real exit stops it',async($,on)=>{
  const w=world(on);await $.session.start(session);await $.session.end({reason:'clear'});
  w.pick('custom:living-themes:jellyfish');await w.clock.advance(1100);
  expect(JSON.parse((await $.command.run({command:'living',args:'status'})).text!).scene).toBe('jellyfish');
  await $.session.end({reason:'prompt_input_exit'});w.pick('dark');await w.clock.advance(2100);
  expect(JSON.parse((await $.command.run({command:'living',args:'status'})).text!).scene).toBe('jellyfish');
});
test('non-interactive sessions do not register UI or write preferences',async($,on)=>{
  const w=world(on);await $.session.start({...session,isInteractive:false});expect(w.commands).toEqual([]);expect(w.store.size).toBe(0);
});
