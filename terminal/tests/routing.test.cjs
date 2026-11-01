const {test}=require('node:test');
const assert=require('node:assert/strict');
const {shouldWrap}=require('../dist/routing.cjs');
const tty={stdinTTY:true,stdoutTTY:true};
test('normal claude, prompts and resume/continue use the live terminal',()=>{
  for(const args of [[],['--resume'],['-r','session-id'],['--continue'],['-c'],['Merhaba dünya'],['--model','opus','selam'],['--','plugin'],['--system-prompt','--print'],['--plugin-dir','mcp','--continue']])assert.equal(shouldWrap(args,tty),true,JSON.stringify(args));
});
test('print, SDK, help, version, accessibility and background/desktop modes keep native CLI',()=>{
  for(const args of [['-p','merhaba'],['--print','merhaba'],['-pmerhaba'],['-cp'],['--output-format=stream-json'],['--sdk-url','ws://localhost:1'],['--help'],['-v'],['--version'],['--bg'],['--desktop'],['--cloud'],['--ax-screen-reader'],['--safe-mode'],['--bare']])assert.equal(shouldWrap(args,tty),false,JSON.stringify(args));
});
test('all known management commands bypass animation even in a TTY',()=>{
  for(const command of 'agents attach auth auto-mode doctor gateway import install logs mcp plugin plugins purge respawn rm setup-token stop kill ultrareview update upgrade remote-control web'.split(' '))assert.equal(shouldWrap([command,'--help'],tty),false,command);
  assert.equal(shouldWrap(['plugin','list'],tty),false);
  assert.equal(shouldWrap(['--settings','settings.json','mcp','list'],tty),false);
});
test('redirection, pipelines, nested Claude and explicit opt-out bypass animation',()=>{
  for(const context of [{...tty,stdinTTY:false},{...tty,stdoutTTY:false},{...tty,surface:'terminal'},{...tty,surface:'vscode'},{...tty,disabled:'1'}])assert.equal(shouldWrap([],context),false);
});
