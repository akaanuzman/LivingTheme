import json,sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
scenes=json.load(sys.stdin)
names=json.loads((root/'shared/gallery-names.tr.json').read_text())
assert set(names)=={s['theme']['id'] for s in scenes}
(root/'assets').mkdir(exist_ok=True)
groups={'Video esintileri':'Video inspirations','Sakin doğa':'Quiet nature','Uzay':'Space','Şehir ve fantastik':'Cities and fantasy','Okyanusun derinlikleri':'Ocean depths','Gökyüzü masalları':'Sky tales','Saklı dünyalar':'Hidden worlds','Kozmik oyun alanı':'Cosmic playground'}
font=lambda size:ImageFont.truetype('/System/Library/Fonts/SFNS.ttf',size)
mono=ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',7)
for lang in ['en','tr']:
 im=Image.new('RGB',(1632,3834),'#10151c');draw=ImageDraw.Draw(im)
 draw.text((25,23),'LIVING THEMES · '+('ENGLISH' if lang=='en' else 'TÜRKÇE'),fill='#a9b4bd',font=font(15))
 draw.text((25,52),'48 living worlds.' if lang=='en' else '48 canlı dünya.',fill='#e7ecf2',font=font(40))
 draw.text((25,109),'Claude Code /theme · Full-terminal animated ASCII scenes' if lang=='en' else 'Claude Code /theme · Tüm terminali kaplayan canlı ASCII sahneleri',fill='#9daebb',font=font(18))
 for i,scene in enumerate(scenes):
  ox=18+(i%4)*404;oy=160+(i//4)*304
  for n,c in enumerate(scene['cells']):
   x=ox+(n%96)*4;y=oy+(n//96)*8
   draw.rectangle((x,y,x+3,y+7),fill=tuple(c['bg']))
   if c['char']!=' ':draw.text((x,y-1),c['char'],fill=tuple(c['fg']),font=mono)
  draw.text((ox,oy+261),(scene['theme']['name'] if lang=='en' else names[scene['theme']['id']]),fill='#e7ecf2',font=font(15))
  g=scene['theme']['group'];draw.text((ox,oy+282),groups[g] if lang=='en' else g,fill='#9daebb',font=font(12))
 im.save(root/'assets'/('living-themes-overview.en.png' if lang=='en' else 'living-themes-overview.tr.png'))
 if lang=='en':im.save(root/'assets/living-themes-overview.png')
