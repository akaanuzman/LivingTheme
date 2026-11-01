import { stripTypeScriptTypes } from 'node:module';
import { readdir, readFile, mkdir, writeFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const folder of ['src','hooks']) {
  await mkdir(resolve(root,folder==='src'?'lib':'hooks'),{recursive:true});
  for(const name of await readdir(resolve(root,folder))) {
    if(!name.endsWith('.ts'))continue;
    const input=await readFile(resolve(root,folder,name),'utf8');
    const js=stripTypeScriptTypes(input,{mode:'strip'}).replaceAll('../src/','../lib/').replace(/(from\s+['"][^'"]+)\.ts(['"])/g,'$1.js$2');
    await writeFile(resolve(root,folder==='src'?'lib':'hooks',name.replace(/\.ts$/,'.js')),js);
  }
}
const {THEMES,themeJSON}=await import('../lib/catalog.js?build='+Date.now());
await mkdir(resolve(root,'themes'),{recursive:true});
for(const t of THEMES) await writeFile(resolve(root,'themes',t.id+'.json'),JSON.stringify(themeJSON(t),null,2)+'\n');
// Keep Claude’s installed plugin small; native PTY dependencies and terminal
// development sources stay in the project rather than Claude’s plugin cache.
await mkdir(resolve(root,'plugin/.claude-plugin'),{recursive:true});
await mkdir(resolve(root,'plugin/scripts'),{recursive:true});
for(const folder of ['hooks','lib','themes'])await cp(resolve(root,folder),resolve(root,'plugin',folder),{recursive:true});
for(const name of ['plugin.json','icon.png'])await cp(resolve(root,'.claude-plugin',name),resolve(root,'plugin/.claude-plugin',name));
for(const name of ['README.md','README.tr.md','LICENSE'])await cp(resolve(root,name),resolve(root,'plugin',name));
await mkdir(resolve(root,'plugin/docs'),{recursive:true});
for(const name of ['Living-Themes-48-Galeri.html','Living-Themes-48-Galeri.tr.html','VALIDATION.md'])await cp(resolve(root,'docs',name),resolve(root,'plugin/docs',name));
await cp(resolve(root,'docs/gallery'),resolve(root,'plugin/docs/gallery'),{recursive:true});
await cp(resolve(root,'assets'),resolve(root,'plugin/assets'),{recursive:true});
await cp(resolve(root,'scripts/state.sh'),resolve(root,'plugin/scripts/state.sh'));
console.log(`Built JavaScript and ${THEMES.length} Claude Code themes.`);
