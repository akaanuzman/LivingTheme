import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { THEMES,findTheme,themeJSON,themeValue } from '../lib/catalog.js';
import { renderScene,frameText,rowRuns } from '../lib/scenes.js';

test('48 distinct themes, exact native theme files, explicit slug ownership',async()=>{
  assert.equal(THEMES.length,48);assert.equal(new Set(THEMES.map(t=>t.id)).size,48);
  for(const theme of THEMES){
    assert.deepEqual(JSON.parse(await readFile(new URL('../themes/'+theme.id+'.json',import.meta.url))),themeJSON(theme));
    assert.equal(findTheme(themeValue(theme.id)),theme);
    for(const color of Object.values(theme.palette))assert.match(color,/^#[a-f0-9]{6}$/i);
  }
  assert.equal(findTheme('custom:other:claude-ember'),undefined);
  assert.equal(findTheme('dark'),undefined);
});
for(const theme of THEMES.slice(0,24))test(`${theme.name}: deterministic, animated, bounded ASCII at narrow/wide sizes`,()=>{
  for(const [width,height] of [[1,1],[8,1],[20,2],[80,4],[140,4],[240,12]]){
    const frame=renderScene(theme,width,height,12.3);
    assert.equal(frame.rows.length,height);
    for(const row of frame.rows){assert.equal(row.length,width);for(const cell of row)assert.match(cell.char,/^[\x20-\x7e]$/);}
    assert.deepEqual(frame,renderScene(theme,width,height,12.3));
    assert.deepEqual(frame.rows.map(row=>rowRuns(row).map(r=>r.text).join('')),frameText(frame).split('\n'));
  }
  assert.notEqual(frameText(renderScene(theme,120,4,1)),frameText(renderScene(theme,120,4,20)),theme.id+' must visibly animate');
  const invalid=renderScene(theme,NaN,Infinity,NaN);assert.equal(invalid.width,1);assert.equal(invalid.height,1);
});
test('legacy strip engine retains its 24 original compositions',()=>{
  assert.equal(new Set(THEMES.slice(0,24).map(t=>frameText(renderScene(t,120,4,12)))).size,24);
});
