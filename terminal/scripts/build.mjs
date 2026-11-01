import {build} from 'esbuild';
import {mkdirSync,chmodSync,existsSync,writeFileSync} from 'node:fs';
mkdirSync(new URL('../dist/',import.meta.url),{recursive:true});
for(const [entry,out] of [['main.ts','living.cjs'],['compositor.ts','compositor.cjs'],['routing.ts','routing.cjs'],['route-command.ts','route-command.cjs']]) await build({entryPoints:[new URL('../src/'+entry,import.meta.url).pathname],outfile:new URL('../dist/'+out,import.meta.url).pathname,bundle:true,platform:'node',format:'cjs',target:'node24',external:['node-pty','@xterm/headless']});
const helper=new URL('../node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper',import.meta.url);
if(existsSync(helper))chmodSync(helper,0o755);

const {THEMES}=await import('../../src/catalog.ts');
writeFileSync(new URL('../dist/themes.json',import.meta.url),JSON.stringify(THEMES,null,2)+'\n');
