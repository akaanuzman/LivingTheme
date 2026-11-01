import {build} from 'esbuild';
import {mkdir,copyFile,chmod} from 'node:fs/promises';
await mkdir('dist',{recursive:true});await mkdir('media',{recursive:true});
await chmod('node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper',0o755);
await Promise.all([
  build({entryPoints:['src/extension.ts'],bundle:true,platform:'node',format:'cjs',target:'node22',outfile:'dist/extension.cjs',external:['vscode','node-pty']}),
  build({entryPoints:['src/webview.ts'],bundle:true,platform:'browser',format:'iife',target:'chrome120',outfile:'media/webview.js'}),
  copyFile('node_modules/@xterm/xterm/css/xterm.css','media/xterm.css'),
  copyFile('../.claude-plugin/icon.png','media/icon.png'),
  copyFile('../LICENSE','LICENSE')
]);
await Promise.all([
  build({entryPoints:['src/sessions.ts'],bundle:true,platform:'node',format:'cjs',target:'node22',outfile:'tests/session-runtime.cjs',external:['node-pty']}),
  build({entryPoints:['src/preferences.ts'],bundle:true,platform:'node',format:'cjs',target:'node22',outfile:'tests/preferences-runtime.cjs'})
]);
