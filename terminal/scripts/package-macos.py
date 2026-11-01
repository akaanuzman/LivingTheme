#!/usr/bin/env python3
"""Build a self-contained Mac arm64 archive including source and native runtime."""
from pathlib import Path
import json,sys,zipfile,os
root=Path(__file__).resolve().parents[2]
version=json.loads((root/'package.json').read_text())['version']
output=Path(sys.argv[1] if len(sys.argv)>1 else root/f'Living-Themes-Terminal-{version}-Mac-arm64.zip').resolve()
output.parent.mkdir(parents=True,exist_ok=True)
files=[root/name for name in ['LICENSE','README.md','README.tr.md','package.json','tsconfig.json','.gitignore']]
for folder in ['assets','.claude-plugin','hooks','lib','themes','src','shared','scripts','tests','docs','plugin']:
 files.extend(p for p in (root/folder).rglob('*') if p.is_file() and not any(part in p.parts for part in ['types','__pycache__','.DS_Store']))
for folder in ['src','tests','scripts','bin','dist','shell']:
 files.extend(p for p in (root/'terminal'/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
files.extend(root/'terminal'/name for name in ['package.json','package-lock.json'])
for folder in ['@xterm/headless','node-pty/lib','node-pty/prebuilds/darwin-arm64']:
 files.extend(p for p in (root/'terminal/node_modules'/folder).rglob('*') if p.is_file())
files.extend(root/'terminal/node_modules/node-pty'/name for name in ['package.json','LICENSE'])
assert (root/'terminal/node_modules/node-pty/prebuilds/darwin-arm64/pty.node').exists(), 'Mac arm64 native dependency is missing'
temporary=output.with_suffix('.tmp')
try:
 with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED) as archive:
  for source in sorted(set(files)):
   if source.is_file():archive.write(source,Path('LivingThemes')/source.relative_to(root))
  assert archive.testzip() is None
 os.replace(temporary,output)
finally:
 if temporary.exists():temporary.unlink()
print(f'{len(set(files))} files, {output.stat().st_size} bytes: {output}')
