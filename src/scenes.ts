import type { Theme } from './catalog.ts';
export type Cell = { char: string; color: string };
export type Frame = { width: number; height: number; rows: Cell[][] };
const mod = (n: number, d: number) => ((n % d) + d) % d;
const hash = (n: number) => mod(Math.sin(n * 127.1 + 31.7) * 43758.5453, 1);
const glyphs = '.:+*#';

/** Stateless scenes: resizing preserves time and never rerolls the particle field. */
export function renderScene(theme: Theme, width: number, height: number, seconds: number): Frame {
  const w = Math.max(1, Math.min(240, Math.floor(Number.isFinite(width) ? width : 1)));
  const h = Math.max(1, Math.min(12, Math.floor(Number.isFinite(height) ? height : 1)));
  const t = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const p = theme.palette;
  const rows: Cell[][] = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: ' ', color: p.muted })));
  const put = (x: number, y: number, char: string, color = p.accent) => {
    const xx = Math.floor(x), yy = Math.floor(y);
    if (xx >= 0 && xx < w && yy >= 0 && yy < h) rows[yy]![xx] = { char: char[0] ?? ' ', color };
  };
  const text = (x: number, y: number, chars: string, color = p.accent) => [...chars].forEach((c, i) => { if(c !== ' ') put(x+i,y,c,color); });
  const sprite = (x: number, y: number, art: string[], color = p.accent) => art.forEach((line, j) => text(x,y+j,line,color));
  const stars = (count: number, color = p.muted) => { for(let i=0;i<count;i++) put(hash(i+17)*w, hash(i+97)*h, hash(i+3+t*.08)>.78?'*':'.', color); };
  const water = (y: number, speed = 1) => { for(let x=0;x<w;x++) if(Math.sin(x*.39-t*speed)>.1) put(x,y,Math.sin(x*.39-t*speed)>.8?'~':'_',p.muted); };
  const drift = (i: number, speed: number, size = 8) => mod(hash(i+4)*(w+size)+t*speed,w+size)-size;
  switch(theme.id) {
    case 'claude-ember': {
      stars(Math.ceil(w/7)); const x=w*.68, cy=(h-1)/2;
      for(let y=0;y<h;y++) for(let dx=-8;dx<=8;dx++) {
        const dy=(y-cy)*2, r=Math.hypot(dx,dy), ray=Math.abs(dx)<2||Math.abs(dy)<1||Math.abs(Math.abs(dx)-Math.abs(dy))<1;
        if(ray && r<6.5+Math.sin(t*1.7)*1.2) put(x+dx,y,r<2?'#':r<4?'*':'+',r<3?p.glow:p.accent);
      } break;
    }
    case 'cloud-drift': {
      for(let i=0;i<Math.ceil(w/22)+1;i++) sprite(drift(i,1.1+i%3*.3,14),hash(i+42)*Math.max(1,h-1),['  .--.','_(    )_'],i%2?p.secondary:p.accent);
      put(w*.85,0,'o',p.glow); break;
    }
    case 'honu-lagoon': {
      water(h-1,.7);
      for(let i=0;i<Math.ceil(w/30);i++) { const x=drift(i,1.8,10), y=mod(i,h>2?h-1:1); text(x,y,['<o[##]o>',' o[##]o>'][Math.floor(t*2+i)%2]!,i%2?p.secondary:p.accent); }
      for(let i=0;i<5;i++) put(hash(i+10)*w,h-1,'Y',p.secondary);
      break;
    }
    case 'koi-pond': {
      for(let i=0;i<Math.ceil(w/23);i++) { const x=drift(i,i%2?-1.6:1.3,10), y=mod(i,h);text(x,y,i%2?'<\'=><':'><=\'>',i%2?p.accent:p.secondary); }
      for(let i=0;i<3;i++) {const phase=mod(t*.7+i,3);text(hash(i+55)*w,hash(i+32)*h,phase<1?'(.)':phase<2?'( . )':'(  .  )',p.muted);} break;
    }
    case 'jellyfish': {
      stars(Math.ceil(w/15));
      for(let i=0;i<Math.ceil(w/24);i++) {const x=hash(i+3)*w+Math.sin(t*.6+i)*2,y=mod(hash(i+1)*(h+3)-t*.35,h+3)-3;sprite(x,y,[' .-. ','(o.o)',Math.sin(t*2+i)>0?' )|( ':' (|) '],i%2?p.secondary:p.accent);} break;
    }
    case 'paper-boats': {
      water(h-1,1.5);for(let i=0;i<Math.ceil(w/27);i++){const y=Math.max(0,h-3)+Math.round(Math.sin(t+i)*.35);sprite(drift(i,1.2,10),y,['  /|',' /_|_','\\____/'],i%2?p.secondary:p.accent);}break;
    }
    case 'fireflies': {
      for(let x=0;x<w;x++) put(x,h-1,x%3===0?'|':x%3===1?'/':'\\',p.muted);
      for(let i=0;i<Math.ceil(w/5);i++){const glow=Math.sin(t*1.8+i*2.3);if(glow>-.2)put(hash(i+2)*w+Math.sin(t*.4+i)*2,hash(i+8)*Math.max(1,h-1),glow>.85?'*':'.',glow>.6?p.glow:p.accent);}break;
    }
    case 'moonlit': {
      stars(Math.ceil(w/5));sprite(w*.78,0,[' _ )','(  )',' \\_'],p.glow);for(let i=0;i<3;i++)text(drift(i,.6,15),mod(i+1,h),'__...___',p.muted);break;
    }
    case 'sakura-rain': {
      text(1,0,'__//___/___',p.muted);for(let i=0;i<Math.ceil(w/6);i++){const y=mod(hash(i+2)*h+t*.55,h);put(mod(hash(i+13)*w+Math.sin(t+i)*2,w),y,Math.sin(t*2+i)>0?'*':"'",i%3?p.accent:p.glow);}break;
    }
    case 'bamboo-mist': {
      for(let i=0;i<Math.ceil(w/13);i++){const x=hash(i+32)*w;for(let y=0;y<h;y++){text(x,y,y%2?'||':'[]',p.secondary);if(y%2===0)text(x+2,y,i%2?'/':'\\',p.accent);}}
      for(let i=0;i<5;i++)text(drift(i,1,18),mod(i,h),'...   .....',p.muted);break;
    }
    case 'autumn-creek': {
      for(let y=0;y<h;y++)water(y,1+y*.4);
      for(let i=0;i<Math.ceil(w/13);i++)text(drift(i,2.1,5),mod(i,h),Math.sin(t+i)>0?'<*>':'<+>',i%2?p.accent:p.secondary);break;
    }
    case 'snow-cabin': {
      for(let i=0;i<Math.ceil(w/6);i++)put(mod(hash(i+71)*w+Math.sin(t*.5+i),w),mod(hash(i+3)*h+t*.55,h),i%3?'.':'*',p.secondary);
      const x=w*.67;sprite(x,h-3,[' /\\_','/[]|\\','|_#_|'],p.accent);put(x+4,mod(-t*.7,h),'~',p.muted);text(0,h-1,'_'.repeat(w),p.muted);break;
    }
    case 'aurora': {
      stars(Math.ceil(w/10));for(let x=0;x<w;x++){const a=Math.sin(x*.09+t*.3),b=Math.sin(x*.17-t*.2);const y=(a*.5+.5)*(h-1);put(x,y,b>.4?'|':':',b>0?p.accent:p.secondary);if(h>2)put(x,Math.min(h-1,y+1),'.',p.muted);}break;
    }
    case 'saturn-rings': {
      stars(Math.ceil(w/12));const cx=w*.55,cy=(h-1)/2;
      for(let a=0;a<6.28;a+=.09){const x=Math.cos(a)*13,y=Math.sin(a)*.7+Math.cos(a)*.09;put(cx+x,cy+y,Math.sin(a*4+t)>0?'=':'-',p.secondary);}
      sprite(cx-3,Math.max(0,Math.floor(cy)-1),[' .---.','(:::::)',' `---\''],p.accent);for(let i=0;i<4;i++){const a=t*.3+i*1.57;put(cx+Math.cos(a)*13,cy+Math.sin(a)*.7+Math.cos(a)*1.17,'*',p.glow);}break;
    }
    case 'meteor-shower': {
      stars(Math.ceil(w/5));for(let i=0;i<4;i++){const phase=mod(t*.32+i*.27,1),x=phase*(w+12)-12,y=phase*(h+2)-2;text(x,y,'---*',p.glow);}break;
    }
    case 'nebula': {
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=Math.sin(x*.13+t*.3)+Math.cos(x*.05-y*.9-t*.45)+Math.sin(y*1.5+t*.2);if(n>.05)put(x,y,glyphs[Math.min(4,Math.floor((n+.1)*1.4))]!,n>1.6?p.accent:n>.7?p.secondary:p.muted);}break;
    }
    case 'lunar-horizon': {
      stars(Math.ceil(w/9));for(let x=0;x<w;x++){const y=h-1-Math.round((Math.sin(x*.06)+1)*.3);put(x,y,'_',p.secondary);if(x%13===0)text(x,y,'( )',p.muted);}
      put(w*.73,Math.max(0,(h-2)*(1+Math.sin(t*.15))*.5),'O',p.glow);break;
    }
    case 'solar-flare': {
      for(let x=0;x<w;x++){const y=h-1-Math.abs(Math.sin(x*.18+t*.9)*Math.sin(x*.05-t*.4))*(h-1);for(let yy=Math.floor(y);yy<h;yy++)put(x,yy,yy===Math.floor(y)?'^':':',yy===Math.floor(y)?p.glow:p.accent);}
      for(let i=0;i<3;i++){const x=hash(i+19)*w;put(x+Math.sin(t+i)*3,mod(-t+i,h),'+',p.secondary);}break;
    }
    case 'neon-tokyo': {
      for(let x=0;x<w;x+=9){const top=Math.floor(hash(x+2)*Math.max(1,h-1));for(let y=top;y<h;y++)text(x,y,y===top?'._.':y%2?'|:|':'|#|',x%2?p.secondary:p.muted);}
      for(let i=0;i<Math.ceil(w/8);i++)put(hash(i+27)*w,mod(t*2+hash(i+6)*h,h),'/',p.secondary);
      text(w*.4,1,Math.sin(t*2)>.1?'[ RAMEN ]':'[ R M N ]',p.accent);break;
    }
    case 'matrix-rain': {
      for(let x=1;x<w;x+=4){const speed=.7+hash(x+2)*1.8,head=mod(t*speed+hash(x+1)*h,h);for(let y=0;y<h;y++){const tail=mod(head-y,h);if(tail<h*.65)put(x,y,'01:=+<>[]'[Math.floor(hash(x+y+Math.floor(t*speed))*9)]!,tail<1?p.glow:tail<2?p.accent:p.muted);}}break;
    }
    case 'synthwave-road': {
      const cx=w/2;text(cx-3,0,'-=(@)=-',p.accent);
      for(let y=1;y<h;y++){const spread=y*w/(h*2);put(cx-spread,y,'/',p.secondary);put(cx+spread,y,'\\',p.secondary);for(let x=Math.ceil(cx-spread)+1;x<cx+spread;x++)if(mod(y+t*1.5,2)<.7)put(x,y,'_',p.muted);put(cx,y,mod(y+t*2,2)<1?'|':':',p.glow);}break;
    }
    case 'clockwork-garden': {
      for(let i=0;i<Math.ceil(w/22);i++){const x=hash(i+11)*w; sprite(x,0,[' _|_','-(o)-',' /|\\'],p.accent);const a=Math.floor(t*2+i)%4;text(x+1,1,[' | ',' / ',' - ',' \\'][a]!,p.glow);text(x+6,h-1,'/v\\',p.secondary);}break;
    }
    case 'crystal-cave': {
      for(let i=0;i<Math.ceil(w/13);i++){const x=hash(i+50)*w;sprite(x,h-3,[' /\\','/::\\','\\__/'],i%2?p.secondary:p.accent);if(Math.sin(t*1.2+i)>0.7)put(x+1,h-2,'*',p.glow);}break;
    }
    case 'lava-forge': {
      for(let x=0;x<w;x++){put(x,h-1,Math.sin(x*.3-t*1.5)>.2?'~':'=',p.accent);if(x%7===0)text(x,h-2,'[_]',p.muted);}
      for(let i=0;i<Math.ceil(w/10);i++){const rise=mod(t*.8+hash(i+9)*h,h);put(hash(i+41)*w+Math.sin(t+i),h-1-rise,rise<1?'+':"'",rise<2?p.glow:p.secondary);}break;
    }
  }
  return { width:w,height:h,rows };
}
export function frameText(frame: Frame): string { return frame.rows.map(row=>row.map(c=>c.char).join('')).join('\n'); }
export function rowRuns(row: Cell[]): { text: string; color: string }[] {
  const runs: { text: string; color: string }[] = [];
  for(const c of row){const last=runs.at(-1);if(last?.color===c.color)last.text+=c.char;else runs.push({text:c.char,color:c.color});}
  return runs;
}
