#!/usr/bin/env python3
"""Install/remove one marked zsh block; preserve other settings and a private backup."""
import argparse,os,stat,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
BEGIN='# >>> Living Themes: claude >>>'
END='# <<< Living Themes: claude <<<'
parser=argparse.ArgumentParser()
parser.add_argument('--rc',type=Path,default=Path(os.environ.get('ZDOTDIR',str(Path.home())))/'.zshrc')
parser.add_argument('--remove',action='store_true')
args=parser.parse_args()
rc=args.rc.expanduser().resolve()
original=rc.read_text() if rc.exists() else ''
if original.count(BEGIN)!=original.count(END) or original.count(BEGIN)>1:
 sys.exit('Living Themes işaretleri bozuk; kabuk ayarı değiştirilmedi.')
start=original.find(BEGIN);stop=original.find(END)
if start>=0 and (stop<start or (start>0 and original[start-1]!='\n')):sys.exit('Living Themes bloğu tanınamadı; kabuk ayarı değiştirilmedi.')
if start>=0:
 stop+=len(END)
 if original[stop:stop+1]=='\n':stop+=1
 before,after=original[:start],original[stop:]
else:before,after=original,''
if args.remove:
 updated=before+after if start>=0 else original
else:
 import shlex
 source=ROOT/'terminal/shell/claude.zsh'
 if not source.is_file() or not (ROOT/'terminal/dist/route-command.cjs').is_file():sys.exit('Önce terminal/ altında npm run build çalıştır.')
 quoted=shlex.quote(str(source))
 block=f'{BEGIN}\nif [[ -o interactive && -r {quoted} ]]; then\n  source {quoted}\nfi\n{END}\n'
 updated=before+('' if not before or before.endswith('\n') else '\n')+block+after
if updated==original:print('Kabuk bağlantısı zaten güncel.');sys.exit(0)
backup=rc.with_name(rc.name+'.living-themes-backup')
if rc.exists() and not backup.exists():
 with backup.open('x') as f:f.write(original)
 backup.chmod(0o600)
mode=stat.S_IMODE(rc.stat().st_mode) if rc.exists() else 0o600
temporary=rc.with_name(rc.name+'.living-themes-new')
created=False
try:
 handle=temporary.open('x');created=True
 with handle as f:f.write(updated)
 temporary.chmod(mode)
 os.replace(temporary,rc)
finally:
 if created and temporary.exists():temporary.unlink()
print(('Kaldırıldı: ' if args.remove else 'Kuruldu: ')+str(rc))
if not args.remove:print('Yeni bir terminalde claude → /theme. Mevcut zsh için: source '+str(rc))
