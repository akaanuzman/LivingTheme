import { THEMES, type Palette } from '../src/catalog.ts';

export interface Appearance { brightness:number; intensity:number }
const TAU=Math.PI*2;
const fract=(x:number)=>x-Math.floor(x);
const rnd=(n:number)=>fract(Math.sin(n*127.1+311.7)*43758.5453);
const wrap=(n:number,size:number)=>((n%size)+size)%size;
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a:string,b:string,t:number)=>{const c=(s:string,i:number)=>parseInt(s.slice(i,i+2),16);return '#'+[1,3,5].map(i=>Math.round(c(a,i)*(1-t)+c(b,i)*t).toString(16).padStart(2,'0')).join('');};

/** Canvas world coordinates are pixels. Objects retain their proportions as the
 * viewport changes; the world expands around them instead of stretching a strip. */
export function paintWorld(ctx:CanvasRenderingContext2D,w:number,h:number,id:string,time:number,intensity=.65):void {
  const theme=THEMES.find(t=>t.id===id)??THEMES[0];
  const p=theme.palette,t=time*(.3+clamp(intensity)*.9),scale=clamp(Math.min(w/1150,h/640),.55,1.65);
  const stepX=7.5*scale,stepY=10*scale;
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,mix(p.bg,p.secondary,.18));bg.addColorStop(.48,p.bg);bg.addColorStop(1,mix(p.bg,p.accent,.25));ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.font=`${9*scale}px Menlo, monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
  function char(x:number,y:number,g:string,color=p.accent,alpha=1){if(x< -stepX||x>w+stepX||y< -stepY||y>h+stepY)return;ctx.globalAlpha=clamp(alpha);ctx.fillStyle=color;ctx.fillText(g,x,y);}
  function glow(x:number,y:number,r:number,color:string,power=.2){ctx.globalAlpha=power;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalAlpha=1;}
  function mask(cx:number,cy:number,rx:number,ry:number,field:(x:number,y:number)=>number,color=p.accent,angle=0,alpha=1){
    const cos=Math.cos(angle),sin=Math.sin(angle),bound=Math.max(rx,ry)*1.4;
    const x0=Math.max(0,Math.floor((cx-bound)/stepX)),x1=Math.min(w/stepX,Math.ceil((cx+bound)/stepX));
    const y0=Math.max(0,Math.floor((cy-bound)/stepY)),y1=Math.min(h/stepY,Math.ceil((cy+bound)/stepY));
    for(let gy=y0;gy<y1;gy++)for(let gx=x0;gx<x1;gx++){
      const dx=gx*stepX-cx,dy=gy*stepY-cy,x=(dx*cos+dy*sin)/rx,y=(-dx*sin+dy*cos)/ry;
      const density=field(x,y);if(density<=0)continue;
      const glyph='.:;t%S#'[Math.min(6,Math.floor(density*6+rnd(gx+gy*47)*.7))]??'#';
      char(gx*stepX,gy*stepY,glyph,mix(color,p.glow,clamp(density-.55)*.7),alpha*(.6+density*.4));
    }
  }
  function stars(count=85){for(let i=0;i<count;i++){const a=.22+.65*(.5+.5*Math.sin(t*.55+i*2));char(rnd(i+1)*w,rnd(i+42)*h,rnd(i+9)>.92?'+':'.',i%4?p.secondary:p.glow,a);}}
  function grid(){ctx.globalAlpha=.06;ctx.strokeStyle=p.secondary;ctx.lineWidth=.5;ctx.beginPath();for(let x=0;x<w;x+=40*scale){ctx.moveTo(x,0);ctx.lineTo(x,h);}for(let y=0;y<h;y+=40*scale){ctx.moveTo(0,y);ctx.lineTo(w,y);}ctx.stroke();ctx.globalAlpha=1;}
  function water(){for(let y=0;y<h;y+=stepY*2)for(let x=0;x<w;x+=stepX*2){const n=Math.sin(x*.018+t*.4+y*.014)+Math.sin(y*.036-t*.35);if(n>.3)char(x,y,n>1.4?'~':'.',p.secondary,.10+n*.05);}}
  function ring(cx:number,cy:number,phase:number){const rx=(10+phase*120)*scale,ry=rx*.26;mask(cx,cy,rx,ry,(x,y)=>Math.abs(x*x+y*y-1)<.065?.6:0,p.secondary,0,(1-phase)*.6);}
  function cloud(cx:number,cy:number,size:number,color=p.secondary,alpha=.8){mask(cx,cy,size,size*.48,(x,y)=>{
    const a=Math.max(1-((x+.42)**2+(y+.05)**2)*3,1-((x-.1)**2+(y+.35)**2)*2.4,1-((x-.53)**2+(y+.05)**2)*4,1-(x*x*.6+(y-.3)**2*4));
    return y<.8&&a>0?clamp(a*.65+.2):0;
  },color,0,alpha);}
  function fish(cx:number,cy:number,size:number,angle:number,color=p.accent,phase=0){
    mask(cx,cy,size,size*.46,(x,y)=>{
      const body=1-x*x-y*y;
      const tail=x<-.7&&x>-1.32&&Math.abs(y-Math.sin(t*1.6+phase)*.1)<(-x-.63)*1.15;
      const fin=Math.abs(x+.13)<.35&&Math.abs(y)>.5&&Math.abs(y)<1.15-Math.abs(x+.13)*.5;
      if(tail||fin)return .55;if(body<=0)return 0;
      return clamp(.28+body*.65+.15*Math.sin(x*9+y*7+phase));
    },color,angle);
    const ex=cx+Math.cos(angle)*size*.56-Math.sin(angle)*(-size*.11),ey=cy+Math.sin(angle)*size*.56+Math.cos(angle)*(-size*.11);
    char(ex,ey,'o',p.bg);char(ex+scale,ey-scale,'.',p.glow);
  }
  function jelly(cx:number,cy:number,size:number,color=p.accent,phase=0){
    glow(cx,cy,size*1.7,color,.13);
    const pulse=1+Math.sin(t*.9+phase)*.08;
    mask(cx,cy,size*pulse,size*.8,(x,y)=>{if(y>.1||y< -1)return 0;const d=1-x*x-y*y;return d>0?clamp(.2+d*.65+.15*Math.cos(x*13)):0;},color);
    for(let k=0;k<7;k++)for(let y=0;y<size*2.3;y+=stepY){const x=cx+(k-3)*size*.2+Math.sin(y*.03+t*1.2+k+phase)*size*.12;char(x,cy+y,y%3?'|':':',k%2?p.secondary:color,.75-y/(size*4));}
  }
  function turtle(cx:number,cy:number,size:number,angle:number){
    mask(cx,cy,size,size*.76,(x,y)=>{
      const shell=1-x*x-y*y;
      const head=((x-1.05)/.42)**2+(y/.38)**2<1;
      const flipper=Math.abs(x)<.75&&Math.abs(y)>.55&&Math.abs(y)<1.4-Math.abs(x)*.5;
      if(head||flipper)return .7;if(shell>0)return .45+.35*Math.abs(Math.sin(x*8)*Math.cos(y*7));return 0;
    },p.accent,angle);
  }
  function leaves(count:number,color=p.accent){for(let i=0;i<count;i++){const x=wrap(rnd(i+33)*w+t*(7+rnd(i)*8)+Math.sin(t*.5+i)*20,w),y=wrap(rnd(i+87)*h+t*(5+rnd(i+6)*10),h);mask(x,y,9*scale,5*scale,(a,b)=>a*a+b*b<1?.7:0,color,Math.sin(t+i));}}
  function ridge(y:number,amplitude:number,color=p.muted){for(let x=0;x<w;x+=stepX){const yy=y+Math.sin(x*.007)*amplitude+Math.sin(x*.02+2)*amplitude*.25;char(x,yy,'_',color,.7);}}
  function tree(x:number,y:number,height:number){for(let yy=0;yy<height;yy+=stepY){const spread=(height-yy)*.27;for(let xx=-spread;xx<spread;xx+=stepX)char(x+xx,y-height+yy,yy<height*.8?'^':'|',p.muted,.8);}}
  function buildings(){for(let i=0;i<13;i++){const x=i*w/12,bw=55*scale,bh=(80+rnd(i+50)*190)*scale;for(let yy=h-bh;yy<h;yy+=stepY)for(let xx=x;xx<x+bw;xx+=stepX){const edge=xx<x+stepX||xx>x+bw-stepX||yy<h-bh+stepY;char(xx,yy,edge?'#':rnd(xx+yy)> .64?':':' ',edge?p.muted:p.secondary,edge?.6:.45);}}}

  grid();
  switch(id){
    case 'koi-pond': {
      water();glow(w*.75,h*.3,Math.max(w,h)*.7,p.secondary,.18);
      for(let i=0;i<9;i++)ring(rnd(i+12)*w,rnd(i+31)*h,fract(t*.08+i*.19));
      for(let i=0;i<5;i++){const x=w*(.12+rnd(i+11)*.78)+Math.sin(t*.11+i)*w*.06,y=h*(.15+rnd(i+24)*.7)+Math.cos(t*.12+i)*h*.08;fish(x,y,(57+rnd(i+9)*35)*scale,Math.sin(t*.09+i)*.5+(i%2?Math.PI:0),i%2?p.accent:p.glow,i);}
      for(let i=0;i<8;i++){const x=rnd(i+114)*w,y=rnd(i+211)*h;mask(x,y,30*scale,17*scale,(a,b)=>a*a+b*b<1&&!(a>0&&Math.abs(b)<a*.4)?.65:0,p.muted,.4);}
      break;
    }
    case 'jellyfish': {
      water();for(let i=0;i<6;i++){const x=w*(.12+rnd(i+15)*.8)+Math.sin(t*.13+i)*35*scale,y=wrap(h*(rnd(i+52))+h-t*(3+i*.4),h+180*scale)-70*scale;jelly(x,y,(30+rnd(i+9)*44)*scale,i%2?p.secondary:p.accent,i);}
      for(let i=0;i<50;i++)char(rnd(i+1)*w,wrap(rnd(i+83)*h-t*5,h),'o',p.secondary,.2);break;
    }
    case 'cloud-drift': {
      glow(w*.8,h*.2,220*scale,p.glow,.3);
      mask(w*.8,h*.22,42*scale,42*scale,(x,y)=>x*x+y*y<1?.85:0,p.glow);
      for(let layer=0;layer<3;layer++)for(let i=0;i<5;i++)cloud(wrap(i*w*.29+t*(4+layer*3),w+300*scale)-130*scale,h*(.2+layer*.29)+Math.sin(i)*45*scale,(70+layer*32)*scale,layer===0?p.muted:p.secondary,.4+layer*.15);
      break;
    }
    case 'honu-lagoon':{
      water();glow(w*.85,0,Math.max(w,h)*.9,p.secondary,.3);
      for(let i=0;i<5;i++)turtle(wrap(rnd(i+16)*w+t*(5+i),w+200*scale)-80*scale,h*(.13+rnd(i+7)*.74)+Math.sin(t*.12+i)*25*scale,(40+rnd(i+41)*30)*scale,.2*Math.sin(t*.1+i));
      for(let i=0;i<20;i++){const x=i*w/19;for(let y=0;y<55*scale;y+=stepY)char(x+Math.sin(y*.1+t*.3+i)*8*scale,h-y,y<stepY?'Y':'|',p.muted,.8);}break;
    }
    case 'claude-ember':{
      stars(80);glow(w*.77,h*.4,250*scale,p.accent,.25);
      mask(w*.77,h*.4,160*scale,160*scale,(x,y)=>{const r=Math.hypot(x,y),angle=Math.atan2(y,x);return r<.43+Math.abs(Math.cos(angle*6))*.57?clamp(1-r*.4):0;},p.accent,t*.04);
      for(let i=0;i<35;i++)char(rnd(i+21)*w,wrap(rnd(i+43)*h-t*(7+rnd(i)*8),h),i%3?'.':'+',p.glow,.5);break;
    }
    case 'paper-boats':{
      water();for(let i=0;i<6;i++){const cx=wrap(i*w*.23+t*6,w+200*scale)-80*scale,cy=h*(.18+rnd(i+29)*.66)+Math.sin(t*.7+i)*8*scale,s=(40+rnd(i+8)*26)*scale;
        mask(cx,cy,s,s*.65,(x,y)=>y>.15&&y<.7&&Math.abs(x)<1-(y-.15)*.5?.7:y<.1&&y> -1&&x<.05&&x>-(y+1)*.8?.85:0,p.accent,Math.sin(t*.6+i)*.07);ring(cx,cy+s*.5,fract(t*.07+i*.3));}break;
    }
    case 'fireflies':{
      for(let i=0;i<14;i++)tree(i*w/13,h*.92,(70+rnd(i+1)*180)*scale);
      for(let i=0;i<90;i++){const x=rnd(i+5)*w+Math.sin(t*.2+i)*22*scale,y=h*(.2+rnd(i+21)*.65)+Math.cos(t*.3+i)*18*scale,a=.5+.5*Math.sin(t*1.2+i*3);if(a>.65)glow(x,y,15*scale,p.glow,a*.15);char(x,y,a>.8?'*':'.',p.glow,a*.8);}break;
    }
    case 'moonlit':{
      stars(100);glow(w*.78,h*.23,150*scale,p.glow,.18);
      mask(w*.78,h*.23,57*scale,57*scale,(x,y)=>x*x+y*y<1&&((x-.38)**2+(y+.18)**2)>.85?.85:0,p.glow);
      for(let i=0;i<4;i++)cloud(wrap(i*w*.38+t*3,w+300)-150,h*(.3+i*.13),85*scale,p.muted,.6);
      ridge(h*.82,28*scale);for(let i=0;i<10;i++)tree(i*w/9,h,(45+rnd(i+9)*85)*scale);break;
    }
    case 'sakura-rain':{
      for(let branch=0;branch<5;branch++){const ax=w*.04,ay=h*.12,by=h*(.05+branch*.15);for(let x=0;x<w*.43;x+=stepX){const y=ay+(by-ay)*x/(w*.43)+Math.sin(x*.01)*20*scale;char(x,y,'#',p.muted,.7);if(rnd(x+branch)> .6)char(x+stepX,y-stepY,'*',p.accent,.8);}}
      leaves(65);glow(w*.15,h*.16,250*scale,p.accent,.15);break;
    }
    case 'bamboo-mist':{
      for(let i=0;i<22;i++){const x=rnd(i+1)*w;for(let y=0;y<h;y+=stepY){char(x+Math.sin(y*.003+t*.2)*3*scale,y,Math.floor(y/stepY)%8===0?'=':'|',i%2?p.secondary:p.muted,.65);if(Math.floor(y/stepY)%9===0)for(let k=1;k<7;k++)char(x+k*stepX,y-k*stepY*.4,'/',p.accent,.5);}}
      for(let i=0;i<5;i++)cloud(wrap(i*w*.29+t*5,w+400)-200,h*(.2+i*.17),180*scale,p.secondary,.1);break;
    }
    case 'autumn-creek':{
      water();for(let side=0;side<2;side++)for(let i=0;i<9;i++)mask(side?w-rnd(i+42)*w*.15:rnd(i+12)*w*.17,rnd(i+61)*h,45*scale,29*scale,(x,y)=>x*x+y*y<1?.6:0,p.muted);
      leaves(40,p.accent);for(let i=0;i<7;i++)ring(rnd(i+77)*w,rnd(i+31)*h,fract(t*.06+i*.21));break;
    }
    case 'snow-cabin':{
      stars(25);ridge(h*.8,18*scale,p.secondary);for(let i=0;i<10;i++)tree(rnd(i+1)*w,h*.82,(65+rnd(i+5)*110)*scale);
      const x=w*.76,y=h*.73;mask(x,y,82*scale,68*scale,(a,b)=>b>-.15&&b<.8&&Math.abs(a)<.75?.55:b<-.15&&b> -1&&Math.abs(a)<(b+1)*1.2?.8:0,p.secondary);
      mask(x,y+10*scale,14*scale,17*scale,(a,b)=>Math.abs(a)<1&&Math.abs(b)<1?.9:0,p.glow);
      for(let i=0;i<100;i++)char(wrap(rnd(i+2)*w+Math.sin(t*.2+i)*20,w),wrap(rnd(i+7)*h+t*(10+rnd(i)*14),h),i%5?'.':'*',p.text,.3+rnd(i+7)*.5);break;
    }
    case 'aurora':{
      stars(120);for(let x=0;x<w;x+=stepX){const center=h*(.2+.15*Math.sin(x*.003+t*.15)+.08*Math.sin(x*.008-t*.1));for(let dy=0;dy<h*.35;dy+=stepY){const a=Math.sin(Math.PI*dy/(h*.35))*.5;char(x,center+dy,dy<h*.12?'|':':',Math.sin(x*.006+t*.1)>0?p.accent:p.secondary,a);}}
      ridge(h*.9,20*scale);break;
    }
    case 'saturn-rings':{
      stars(110);const x=w*.73,y=h*.42,s=110*scale;
      mask(x,y,s*2,s*.65,(a,b)=>{const r=a*a+b*b;return r>.5&&r<1?.6:0;},p.secondary,-.23);
      mask(x,y,s,s,(a,b)=>{const q=1-a*a-b*b;return q>0?.4+q*.35+.15*Math.sin(b*18):0;},p.accent);
      for(let i=0;i<9;i++){const a=t*.06+i*TAU/9;char(x+Math.cos(a)*s*1.9,y+Math.sin(a)*s*.59-Math.cos(a)*s*.35,'*',p.glow,.9);}break;
    }
    case 'meteor-shower':{
      stars(170);for(let i=0;i<7;i++){const phase=fract(t*.035+i*.147),x=phase*(w+200)-100,y=phase*h*.6+rnd(i+53)*h*.3;for(let k=0;k<18;k++)char(x-k*stepX,y-k*stepY*.4,k===0?'*':'-',p.glow,(1-k/18)*.8);}ridge(h*.9,24*scale);break;
    }
    case 'nebula':{
      stars(80);for(let y=0;y<h;y+=stepY)for(let x=0;x<w;x+=stepX){const n=Math.sin(x*.007+t*.08)+Math.cos(y*.012-t*.11)+Math.sin(x*.004+y*.009+t*.08);if(n> .45)char(x,y,n>1.7?'%':n>1?':':'.',n>1.6?p.accent:p.secondary,clamp(n*.16));}glow(w*.8,h*.6,200*scale,p.accent,.15);break;
    }
    case 'lunar-horizon':{
      stars(100);ridge(h*.76,25*scale,p.secondary);for(let y=h*.79;y<h;y+=stepY)for(let x=0;x<w;x+=stepX)if(rnd(x+y*3)>.7)char(x,y,':',p.muted,.6);
      for(let i=0;i<9;i++)mask(rnd(i+3)*w,h*(.83+rnd(i+8)*.16),(20+rnd(i+22)*25)*scale,8*scale,(a,b)=>Math.abs(a*a+b*b-1)<.2?.6:0,p.secondary);
      mask(w*.72,h*(.26+.05*Math.sin(t*.03)),36*scale,36*scale,(a,b)=>a*a+b*b<1?.7:0,p.glow);break;
    }
    case 'solar-flare':{
      stars(40);const x=w*.8,y=h*.7,r=150*scale;glow(x,y,r*2.5,p.accent,.4);
      mask(x,y,r,r,(a,b)=>a*a+b*b<1?.5+.3*Math.sin(a*12+b*9+t*.5)**2:0,p.accent);
      for(let i=0;i<12;i++){const a=i*TAU/12+t*.025;for(let k=0;k<18;k++){const radius=r*(1+k*.035);char(x+Math.cos(a+Math.sin(k*.2+t*.2)*.07)*radius,y+Math.sin(a)*radius,':',p.glow,(1-k/18)*.7);}}break;
    }
    case 'neon-tokyo':{
      buildings();glow(w*.76,h*.6,230*scale,p.accent,.25);
      const labels=['RAMEN','24H','TOKYO'];for(let i=0;i<3;i++){const s=labels[i];for(let k=0;k<s.length;k++)char(w*(.16+i*.3)+k*stepX,h*(.32+i*.15),s[k],i%2?p.secondary:p.accent,.7+.2*Math.sin(t+i));}
      for(let i=0;i<150;i++){const x=rnd(i+2)*w,y=wrap(rnd(i+4)*h+t*80,h);char(x,y,'/',p.secondary,.2);}break;
    }
    case 'matrix-rain':{
      const glyphs='01ST#:=+<>[]';for(let x=0;x<w;x+=stepX*3){const head=wrap(t*(25+rnd(x)*30)+rnd(x+5)*h,h+180)-40;for(let k=0;k<18;k++){const y=wrap(head-k*stepY,h+180)-40;char(x,y,glyphs[Math.floor(rnd(x+k+Math.floor(t*2))*glyphs.length)],k===0?p.glow:p.accent,(1-k/18)*.8);}}break;
    }
    case 'synthwave-road':{
      stars(50);const cx=w*.6,hy=h*.45;
      mask(cx,hy-30*scale,85*scale,85*scale,(a,b)=>a*a+b*b<1&&Math.floor((b+1)*11)%3!==0?.8:0,p.accent);
      for(let y=hy;y<h;y+=stepY){const depth=(y-hy)/(h-hy),line=fract(depth-t*.12);for(let x=0;x<w;x+=stepX){const road=Math.abs((x-cx)/(w*(depth+.05)));if(Math.abs(fract(road*4)-.5)<.07||line<.04)char(x,y,'+',p.secondary,.25+depth*.3);}}break;
    }
    case 'clockwork-garden':{
      for(let i=0;i<8;i++){const x=rnd(i+7)*w,y=rnd(i+17)*h,r=(35+rnd(i+29)*55)*scale,a=t*.12*(i%2?1:-1);
        mask(x,y,r,r,(u,v)=>{const rr=Math.hypot(u,v),aa=Math.atan2(v,u)+a;return rr>.58&&rr<.85+Math.cos(aa*10)*.13?.7:rr<.15?.9:Math.abs(Math.sin(aa*3))<.12&&rr<.7?.5:0;},p.accent);
      }leaves(20,p.secondary);break;
    }
    case 'crystal-cave':{
      for(let i=0;i<14;i++){const x=rnd(i+9)*w,y=h*(.18+rnd(i+6)*.65),rx=(23+rnd(i+8)*38)*scale,ry=rx*(1.3+rnd(i)*1.3);
        mask(x,y,rx,ry,(a,b)=>Math.abs(a)+Math.abs(b)<1?.35+.35*(1-Math.abs(a))+.15*Math.sin(t*.3+i):0,i%2?p.secondary:p.accent,rnd(i+1)*.5-.25);if(Math.sin(t*.5+i)> .8)glow(x,y,rx*1.8,p.glow,.15);}
      break;
    }
    case 'lava-forge':{
      for(let y=0;y<h;y+=stepY)for(let x=0;x<w;x+=stepX){const flow=Math.sin(x*.009+t*.15)+Math.cos(y*.018-t*.3)+Math.sin((x+y)*.012);if(flow>.55)char(x,y,flow>1.8?'#':flow>1.2?'%':':',flow>1.8?p.glow:p.accent,.3+clamp(flow*.12));else if(rnd(x+y)> .8)char(x,y,'_',p.muted,.5);}
      for(let i=0;i<30;i++)char(rnd(i+33)*w+Math.sin(t+i)*10,wrap(rnd(i+43)*h-t*18,h),"'",p.glow,.7);break;
    }
    case 'whale-song':{
      water();
      for(let beam=0;beam<5;beam++)for(let y=0;y<h;y+=stepY*2){const x=w*(.12+beam*.21)+y*.18+Math.sin(t*.12+beam)*18*scale;char(x,y,':',p.secondary,.13*(1-y/h));}
      for(let i=0;i<3;i++){
        const x=w*(.24+i*.29)+Math.sin(t*.08+i)*w*.07,y=h*(.25+i*.25)+Math.cos(t*.11+i)*20*scale,s=(100-i*17)*scale,a=Math.sin(t*.09+i)*.12;
        mask(x,y,s,s*.35,(u,v)=>{const body=1-u*u-v*v;if(body>0)return .35+body*.5;return u<-.73&&u>-1.4&&Math.abs(v-Math.sin(t*.9+i)*.2)<(-u-.7)*1.5?.7:0;},i===1?p.secondary:p.accent,a);
        mask(x-s*.15,y+s*.22,s*.3,s*.17,(u,v)=>Math.abs(u)+Math.abs(v)<1?.65:0,p.secondary,-.35);
        char(x+s*.6,y-s*.04,'o',p.glow);for(let j=0;j<6;j++)char(x+s*(.15+j*.07),y+s*.17,'_',p.secondary,.7);
        for(let j=0;j<8;j++){const q=fract(t*.18+j*.125);char(x+s*.28+Math.sin(q*5+j)*s*.18,y-s*.28-q*s*.7,j%2?'.':"'",p.glow,(1-q)*.5);}
      }break;
    }
    case 'manta-ballet':{
      water();for(let i=0;i<4;i++){
        const x=w*(.18+rnd(i+14)*.65)+Math.sin(t*.08+i)*w*.08,y=h*(.14+i*.22)+Math.cos(t*.12+i)*25*scale,s=(85+rnd(i+23)*35)*scale,flap=Math.sin(t*.8+i)*.28;
        mask(x,y,s,s*.68,(u,v)=>{const wing=Math.abs(u),center=-.05+wing*flap;return wing<1&&Math.abs(v-center)<(1-wing)*.65?.35+(1-wing)*.5:Math.abs(u)<.13&&v>-.7&&v<.6?.8:0;},i%2?p.secondary:p.accent,Math.sin(t*.1+i)*.2);
        for(let k=0;k<18;k++)char(x+Math.sin(k*.18+t*.5+i)*s*.07,y+s*.26+k*stepY*.75,k%3?':':'|',p.secondary,.65-k*.025);
        char(x-s*.08,y-s*.19,'.',p.glow);char(x+s*.08,y-s*.19,'.',p.glow);
      }break;
    }
    case 'seahorse-reef':{
      water();for(let i=0;i<14;i++)for(let y=0;y<h*.28;y+=stepY)char(i*w/13+Math.sin(y*.03+t*.35+i)*12*scale,h-y,'|',p.muted,.8);
      for(let i=0;i<4;i++){
        const x=w*(.19+i*.22)+Math.sin(t*.2+i)*18*scale,y=h*(.24+rnd(i+12)*.35),s=(55+rnd(i+7)*20)*scale;
        mask(x,y,s*.44,s*.32,(u,v)=>u*u+v*v<1?.6+.3*(1-v*v):0,p.accent);
        for(let k=0;k<6;k++)char(x+s*.24+k*stepX*.65,y+s*.03,'=',p.secondary,.8);char(x+s*.1,y-s*.1,'o',p.glow);
        for(let k=0;k<30;k++){const q=k/29;const xx=x-s*.1+Math.sin(q*3.6)*s*.35,yy=y+s*.1+q*s;char(xx,yy,'#',p.accent);char(xx+stepX,yy,':',p.secondary);}
        for(let a=0;a<Math.PI*2.2;a+=.15){const r=(1-a/(Math.PI*2.6))*s*.36;char(x-s*.18+Math.cos(a)*r,y+s*1.2+Math.sin(a)*r,':',p.secondary,.8);}
        for(let k=0;k<6;k++)char(x-s*.35-k*stepX*.7,y+s*.4+Math.sin(t*2+i+k)*stepY,'/',p.glow,.5);
      }break;
    }
    case 'octopus-den':{
      const x=w*.65+Math.sin(t*.09)*w*.05,y=h*.35+Math.sin(t*.22)*20*scale,s=105*scale;
      glow(x,y,s*2,p.accent,.16);
      mask(x,y,s*.75,s*.85,(u,v)=>{const r=u*u+v*v;return r<1&&v<.65?.35+(1-r)*.6:0;},p.accent);
      for(let arm=0;arm<8;arm++)for(let k=0;k<36;k++){
        const q=k/35,a=(arm/7-0.5)*2.2,xx=x+Math.sin(a)*s*(.2+q*1.4)+Math.sin(q*7+t*.65+arm)*s*.18*q,yy=y+s*.45+q*s*(1.2-Math.abs(a)*.3);
        char(xx,yy,k%4?'%':'o',arm%2?p.secondary:p.accent,.9-q*.35);
      }
      char(x-s*.28,y+s*.08,'O',p.glow);char(x+s*.28,y+s*.08,'O',p.glow);
      for(let i=0;i<70;i++)char(rnd(i+10)*w,wrap(rnd(i+28)*h-t*(2+rnd(i)),h),'.',p.secondary,.2+.2*Math.sin(t+i));
      ridge(h*.95,25*scale);break;
    }
    case 'coral-garden':{
      water();
      function coral(x:number,y:number,len:number,angle:number,depth:number,color:string){
        const sway=Math.sin(t*.3+x*.01)*.08,dx=Math.cos(angle+sway),dy=Math.sin(angle+sway);
        for(let q=0;q<len;q+=stepY*.7)char(x+dx*q,y+dy*q,depth?'#':'+',color,.55+depth*.1);
        const xx=x+dx*len,yy=y+dy*len;
        if(depth>0){coral(xx,yy,len*.66,angle-.55,depth-1,color);coral(xx,yy,len*.61,angle+.5,depth-1,color);}
        else char(xx,yy,'*',p.glow,.55+.25*Math.sin(t*.8+x));
      }
      for(let i=0;i<10;i++)coral((i+.4)*w/10,h+10*scale,(38+rnd(i+30)*45)*scale,-Math.PI/2,3,i%2?p.accent:p.secondary);
      for(let i=0;i<12;i++){const x=wrap(rnd(i+5)*w+t*(7+i*.6),w+80)-40,y=h*(.12+rnd(i+44)*.4)+Math.sin(t*.35+i)*10*scale;fish(x,y,(17+rnd(i)*9)*scale,0,i%2?p.glow:p.accent,i);}break;
    }
    case 'submarine-voyage':{
      water();const x=w*.62+Math.sin(t*.1)*w*.08,y=h*.48+Math.sin(t*.3)*15*scale,s=140*scale;
      mask(x,y,s,s*.37,(u,v)=>u*u+v*v<1?.4+.35*(1-v):0,p.accent);
      mask(x-s*.08,y-s*.39,s*.27,s*.16,(u,v)=>Math.abs(u)<1&&Math.abs(v)<1?.65:0,p.secondary);
      for(let k=0;k<5;k++)char(x-s*.07,y-s*.5-k*stepY,'|',p.secondary,.8);char(x+s*.02,y-s*.8,'=',p.glow);
      for(let i=0;i<4;i++){const xx=x+s*(-.45+i*.32);mask(xx,y,s*.09,s*.09,(u,v)=>u*u+v*v<1?.9:0,p.glow);}
      for(let k=0;k<4;k++){const a=t*2+k*Math.PI/2;char(x-s*1.05+Math.cos(a)*s*.12,y+Math.sin(a)*s*.24,'#',p.secondary);}
      for(let i=0;i<25;i++){const q=fract(t*.17+i*.043);char(x-s*(1+q*1.3),y-q*s*.7+Math.sin(i)*s*.2,i%3?'o':'.',p.secondary,(1-q)*.7);}break;
    }
    case 'dragon-flight':{
      stars(45);ridge(h*.86,50*scale,p.muted);ridge(h*.95,25*scale,p.secondary);
      const x=w*.65+Math.sin(t*.08)*w*.06,y=h*.38+Math.sin(t*.3)*22*scale,s=115*scale,flap=Math.sin(t*.9);
      for(const side of [-1,1])mask(x+side*s*.5,y-s*.18,s*.95,s*.8,(u,v)=>{const wing=Math.abs(u);return wing<1&&v<.25+flap*.3&&v>-.7+wing*.6&&Math.sin((u+1)*5)>-.75?.65:0;},p.secondary,side*.25);
      mask(x,y,s*.8,s*.3,(u,v)=>u*u+v*v<1?.7:0,p.accent,.12);
      mask(x+s*.73,y-s*.24,s*.32,s*.2,(u,v)=>Math.abs(u)+Math.abs(v)<1.25?.8:0,p.accent,-.35);
      char(x+s*.87,y-s*.28,'o',p.glow);
      for(let k=0;k<35;k++){const q=k/34;char(x-s*(.55+q),y+Math.sin(q*4+t*.5)*s*.27,'#',p.accent,1-q*.6);}
      for(let k=0;k<10;k++)char(x-s*.25+k*stepX,y-s*.22,'^',p.glow,.7);break;
    }
    case 'phoenix-rise':{
      stars(45);const x=w*.67+Math.sin(t*.1)*25*scale,y=h*.38+Math.cos(t*.24)*20*scale,s=100*scale;
      glow(x,y,s*2.5,p.accent,.21);
      mask(x,y,s*.24,s*.75,(u,v)=>u*u+v*v<1?.75:0,p.glow);
      for(const side of [-1,1])for(let feather=0;feather<12;feather++){
        const a=-.5-feather*.08+Math.sin(t*.8)*.22,r=s*(.75+feather*.04);
        for(let k=0;k<16;k++){const q=k/15;char(x+side*(s*.12+Math.cos(a)*r*q),y+Math.sin(a)*r*q+feather*stepY*.35,k%3?'%':'*',feather%2?p.accent:p.secondary,.8-q*.2);}
      }
      for(let tail=0;tail<7;tail++)for(let k=0;k<28;k++){const q=k/27;char(x+(tail-3)*s*.09+Math.sin(q*5+t*.8+tail)*s*.15*q,y+s*.3+q*s*1.7,k%3?':':'*',tail%2?p.accent:p.glow,1-q*.65);}
      for(let i=0;i<50;i++)char(rnd(i+31)*w,wrap(rnd(i+18)*h-t*18,h),i%4?'.':'+',p.glow,.45);break;
    }
    case 'butterfly-meadow':{
      for(let i=0;i<24;i++){
        const x=rnd(i+15)*w,y=h*(.78+rnd(i+44)*.2);for(let k=0;k<5;k++)char(x+Math.sin(t*.4+i)*k*scale,y+k*stepY,'|',p.muted,.7);
        mask(x,y,12*scale,10*scale,(u,v)=>Math.abs(Math.hypot(u,v)-.55)<.3?.7:0,i%2?p.accent:p.glow);
      }
      for(let i=0;i<7;i++){
        const x=w*(.1+rnd(i+2)*.8)+Math.sin(t*.17+i)*w*.04,y=h*(.15+rnd(i+52)*.5)+Math.cos(t*.25+i)*h*.05,s=(24+rnd(i+16)*25)*scale,flap=.3+.7*Math.abs(Math.sin(t*1.5+i));
        for(const side of [-1,1])mask(x+side*s*.45*flap,y,s*.65*flap,s*.7,(u,v)=>u*u+v*v<1?.4+.4*Math.abs(Math.sin(u*6+v*4)):0,i%2?p.secondary:p.accent,side*.3);
        for(let k=-2;k<=2;k++)char(x,y+k*stepY*.6,'|',p.glow);
      }for(let i=0;i<40;i++)char(wrap(rnd(i)*w+t*3,w),rnd(i+19)*h,'.',p.glow,.2);break;
    }
    case 'floating-islands':{
      for(let i=0;i<5;i++){
        const x=(.12+i*.22)*w+Math.sin(t*.08+i)*20*scale,y=h*(.23+rnd(i+11)*.48)+Math.sin(t*.2+i)*10*scale,s=(65+rnd(i+9)*35)*scale;
        mask(x,y,s,s*.55,(u,v)=>v>-.08&&v<1&&Math.abs(u)<1-v*.72?.45+.3*(1-v):0,p.muted);
        mask(x,y-s*.05,s,s*.16,(u,v)=>u*u+v*v<1?.65:0,p.accent);
        tree(x-s*.15,y-s*.1,s*.72);
        for(let col=0;col<3;col++)for(let k=0;k<20;k++)char(x+s*.35+col*stepX,y+k*stepY,fract(k*.2+t*.8)<.4?'|':':',p.secondary,.7-k*.026);
      }
      for(let i=0;i<4;i++)cloud(wrap(i*w*.35+t*6,w+200)-100,h*(.15+i*.22),85*scale,p.secondary,.18);break;
    }
    case 'sky-lanterns':{
      stars(100);ridge(h*.95,30*scale);
      for(let i=0;i<11;i++){
        const x=rnd(i+34)*w+Math.sin(t*.16+i)*20*scale,y=wrap(rnd(i+17)*h-t*(4+rnd(i)*4),h+180*scale)-80*scale,s=(22+rnd(i+61)*25)*scale;
        glow(x,y,s*2.1,p.accent,.16);
        mask(x,y,s*.7,s,(u,v)=>Math.abs(u)<.75+.2*Math.cos(v*2)&&Math.abs(v)<.85?.5+.25*(1-Math.abs(u)):0,p.accent);
        for(let k=-2;k<=2;k++)char(x+k*stepX,y+s*.78,'_',p.secondary,.8);
        char(x,y+s*.65,Math.sin(t*3+i)>0?'*':':',p.glow);
      }break;
    }
    case 'thunderstorm':{
      for(let layer=0;layer<3;layer++)for(let i=0;i<5;i++)cloud(wrap(i*w*.28+t*(5+layer*2),w+200)-100,h*(.03+layer*.13),(105+layer*20)*scale,p.secondary,.3+layer*.16);
      for(let i=0;i<210;i++){const y=wrap(rnd(i+14)*h+t*(85+rnd(i)*40),h);char(wrap(rnd(i+31)*w-y*.18,w),y,'/',p.accent,.15+rnd(i)*.2);}
      const flash=clamp((Math.sin(t*.55)-.82)/.18);
      if(flash>0){const x=w*.7;glow(x,h*.35,300*scale,p.glow,flash*.3);for(let k=0;k<30;k++){const y=h*.18+k*stepY;char(x+Math.sin(Math.floor(k/4)*5)*35*scale,y,k%5?'|':'/',p.glow,flash);if(k>13&&k<23)char(x+Math.sin(3)*35*scale+(k-13)*stepX,y,'\\',p.glow,flash*.7);}}
      ridge(h*.9,25*scale);break;
    }
    case 'mushroom-grove':{
      for(let i=0;i<9;i++){
        const x=(i+.4)*w/9,y=h*(.5+rnd(i+4)*.4),s=(38+rnd(i+6)*52)*scale;
        glow(x,y-s*.25,s*1.3,i%2?p.accent:p.secondary,.13);
        mask(x,y+s*.24,s*.18,s*.55,(u,v)=>Math.abs(u)<.8-.15*v&&Math.abs(v)<1?.65:0,p.muted);
        mask(x,y-s*.15,s,s*.6,(u,v)=>u*u+v*v<1&&v<.2?.4+.4*(1-u*u):0,i%2?p.accent:p.secondary);
        for(let j=0;j<5;j++)char(x+(rnd(i*10+j)-.5)*s*1.4,y-s*(.2+rnd(j+3)*.3),'o',p.glow,.7);
      }
      for(let i=0;i<65;i++)char(wrap(rnd(i+21)*w+Math.sin(t*.3+i)*15,w),wrap(rnd(i+41)*h-t*5,h),i%5?'.':'*',p.glow,.3+.2*Math.sin(t+i));break;
    }
    case 'enchanted-library':{
      for(let shelf=0;shelf<4;shelf++){
        const y=h*(.15+shelf*.23);for(let x=0;x<w;x+=stepX)char(x,y,'=',p.muted,.6);
        for(let book=0;book<25;book++){const x=book*w/24,hh=(15+rnd(book+shelf*33)*28)*scale;for(let yy=y-hh;yy<y;yy+=stepY)char(x,yy,'|',book%3?p.secondary:p.accent,.45);}
      }
      for(let i=0;i<5;i++){
        const x=w*(.15+rnd(i+1)*.72)+Math.sin(t*.17+i)*30*scale,y=h*(.22+rnd(i+8)*.5)+Math.cos(t*.2+i)*18*scale,s=(25+rnd(i+17)*15)*scale;
        mask(x,y,s,s*.65,(u,v)=>Math.abs(u)<1&&Math.abs(v-(1-Math.abs(u))*.3)<.6?.7:0,p.glow,Math.sin(t*.4+i)*.2);
        for(let k=0;k<4;k++)char(x+(k-2)*stepX,y,'=',p.accent);
      }
      for(let i=0;i<45;i++){const a=t*.14+i,rad=(55+rnd(i)*110)*scale;char(w*.68+Math.cos(a)*rad,h*.45+Math.sin(a)*rad*.65,'*:+=?'[i%5],p.accent,.35);}break;
    }
    case 'teahouse-rain':{
      for(let i=0;i<120;i++){const x=rnd(i+31)*w,y=wrap(rnd(i+7)*h+t*40,h*.65);char(x,y,'|',p.secondary,.15);}
      for(const xx of [w*.08,w*.5,w*.92])for(let y=0;y<h*.64;y+=stepY)char(xx,y,'|',p.muted,.65);
      for(let x=0;x<w;x+=stepX){char(x,h*.64,'_',p.muted,.8);char(x,h*.86,'=',p.muted,.7);}
      const x=w*.68,y=h*.7,s=95*scale;
      mask(x,y,s,s*.53,(u,v)=>Math.abs(u)<1-v*.25&&v>-.5&&v<.8?.65:0,p.accent);
      mask(x,y-s*.3,s,s*.18,(u,v)=>u*u+v*v<1?.65:0,p.muted);
      mask(x+s*.98,y,s*.35,s*.32,(u,v)=>Math.abs(u*u+v*v-.65)<.3?.65:0,p.accent);
      mask(x,y+s*.56,s*1.3,s*.1,(u,v)=>u*u+v*v<1?.55:0,p.secondary);
      for(let plume=0;plume<3;plume++)for(let k=0;k<24;k++){const q=k/23;char(x+(plume-1)*s*.4+Math.sin(q*5+t*.7+plume)*s*.14,y-s*.48-q*s*1.5,'~',p.glow,(1-q)*.5);}break;
    }
    case 'desert-caravan':{
      stars(80);mask(w*.8,h*.18,32*scale,32*scale,(u,v)=>u*u+v*v<1&&((u-.4)**2+(v+.15)**2)>.75?.8:0,p.glow);
      for(let layer=0;layer<3;layer++){for(let x=0;x<w;x+=stepX){const y=h*(.55+layer*.15)+Math.sin(x*.004-layer*2+t*.025)*h*.07;char(x,y,'_',layer%2?p.secondary:p.muted,.7);}}
      for(let i=0;i<4;i++){
        const x=wrap(i*w*.27+t*4,w+120)-50,y=h*.69+Math.sin(i)*20*scale,s=50*scale;
        mask(x,y,s,s*.4,(u,v)=>u*u+v*v<1||Math.abs(u+.1)<.45&&v> -1.4&&v<0?.65:0,p.accent);
        for(let k=0;k<6;k++)char(x+s*.8,y-k*stepY*.8,'|',p.accent);char(x+s*.96,y-s*.8,'o',p.glow);
        for(let leg=0;leg<4;leg++)for(let k=0;k<5;k++)char(x+s*(-.55+leg*.35)+Math.sin(t*.8+leg*Math.PI)*k*scale,y+s*.3+k*stepY,'|',p.accent,.85);
      }break;
    }
    case 'bonsai-zen':{
      for(let y=h*.58;y<h;y+=stepY*2)for(let x=0;x<w;x+=stepX*2){const d=Math.hypot((x-w*.5)*.7,y-h*.72);if(Math.sin(d*.1-t*.04)>.7)char(x,y,'~',p.muted,.4);}
      const x=w*.67,y=h*.57,s=140*scale;
      for(let k=0;k<16;k++){const q=k/15;char(x-Math.sin(q*3)*s*.16,y-q*s*.9,'#',p.accent);char(x-Math.sin(q*3)*s*.16+stepX,y-q*s*.9,'#',p.muted);}
      for(let i=0;i<6;i++){const cx=x+Math.sin(i*2)*s*.6,cy=y-s*(.5+i*.08);mask(cx,cy,s*(.42-i*.025),s*.17,(u,v)=>u*u+v*v<1?.65:0,p.accent);}
      mask(x,y+s*.13,s*.65,s*.22,(u,v)=>Math.abs(u)<.85+v*.12&&Math.abs(v)<1?.55:0,p.secondary);
      for(let i=0;i<16;i++){const q=fract(t*.035+i*.067);char(x+Math.sin(q*4+i)*s,y-s+q*s*1.5,"'",p.glow,.5);}break;
    }
    case 'midnight-express':{
      stars(100);mask(w*.8,h*.16,25*scale,25*scale,(u,v)=>u*u+v*v<1?.8:0,p.glow);
      for(let i=0;i<14;i++)tree(wrap(i*w*.12-t*17,w+100)-50,h*.58,(35+rnd(i+3)*55)*scale);
      const y=h*.69;
      for(let car=0;car<4;car++){
        const x=w*(.12+car*.23),bw=w*.19,bh=58*scale;
        mask(x,y,bw*.5,bh*.5,(u,v)=>Math.abs(u)<1&&Math.abs(v)<1?.6:0,p.secondary);
        for(let i=0;i<4;i++)mask(x+bw*(-.32+i*.22),y-bh*.08,bw*.065,bh*.15,(u,v)=>Math.abs(u)<1&&Math.abs(v)<1?.85:0,p.glow);
        for(const side of [-1,1]){const xx=x+side*bw*.32,yy=y+bh*.55;mask(xx,yy,12*scale,12*scale,(u,v)=>u*u+v*v<1?.55:0,p.muted);char(xx+Math.cos(t*1.4)*8*scale,yy+Math.sin(t*1.4)*8*scale,'+',p.accent);}
      }
      for(let x=0;x<w;x+=stepX){char(x,y+48*scale,'=',p.muted,.75);if(fract(x*.02+t*.4)<.3)char(x,y+60*scale,'#',p.muted,.6);}break;
    }
    case 'black-hole':{
      stars(120);const x=w*.68,y=h*.46,s=125*scale;
      for(let band=0;band<7;band++)for(let k=0;k<130;k++){
        const a=k*TAU/130+t*(.08+band*.012),r=s*(1.05+band*.1),xx=Math.cos(a)*r,yy=Math.sin(a)*r*.32;
        char(x+xx,y+yy+xx*.18,k%3?':':'*',band%2?p.accent:p.secondary,.4+Math.sin(a)*.2);
      }
      mask(x,y,s*.72,s*.72,(u,v)=>Math.abs(u*u+v*v-1)<.16?.9:0,p.glow);
      // A dark event horizon occludes the rear disc, like a physical silhouette.
      ctx.globalAlpha=1;ctx.fillStyle=p.bg;
      for(let yy=-s*.61;yy<s*.61;yy+=stepY*.5){const half=Math.sqrt(Math.max(0,(s*.61)**2-yy*yy));ctx.fillRect(x-half,y+yy,half*2,stepY*.5);}
      for(let i=0;i<22;i++){const a=t*.2+i*.4,r=s*(1.9-fract(t*.03+i*.17)*.9);char(x+Math.cos(a)*r,y+Math.sin(a)*r*.7,'.',p.secondary,.55);}break;
    }
    case 'orbital-station':{
      stars(150);const x=w*.66,y=h*.46,s=100*scale,a=t*.075;
      mask(w*.1,h*1.1,w*.6,h*.42,(u,v)=>Math.abs(u*u+v*v-1)<.09?.65:0,p.secondary);
      for(let k=0;k<120;k++){const aa=k*TAU/120;char(x+Math.cos(aa)*s,y+Math.sin(aa)*s*.55, k%8?'=':'#',p.accent,.8);}
      for(const side of [-1,1]){
        const xx=x+Math.cos(a)*s*side,yy=y+Math.sin(a)*s*.55*side;
        mask(xx,yy,s*.57,s*.25,(u,v)=>Math.abs(u)<1&&Math.abs(v)<1?.4+(Math.abs(Math.sin(u*13)*Math.cos(v*7))<.25?.4:0):0,p.secondary,a);
        for(let k=0;k<18;k++)char(x+(xx-x)*k/17,y+(yy-y)*k/17,'+',p.muted,.8);
      }
      mask(x,y,s*.25,s*.25,(u,v)=>u*u+v*v<1?.8:0,p.glow);break;
    }
    case 'rocket-launch':{
      stars(95);const x=w*.66+Math.sin(t*.13)*20*scale,y=h*(.4+.04*Math.sin(t*.16)),s=80*scale;
      mask(x,y,s*.4,s,(u,v)=>v> -1&&v<.8&&Math.abs(u)<Math.min(.9,(v+1)*1.4)?.7:0,p.secondary);
      mask(x,y-s*.12,s*.16,s*.16,(u,v)=>u*u+v*v<1?.9:0,p.glow);
      for(const side of [-1,1])mask(x+side*s*.4,y+s*.6,s*.3,s*.45,(u,v)=>v>-.7&&v<.8&&Math.abs(u)<(v+1)*.5?.65:0,p.accent);
      for(let k=0;k<22;k++){const q=k/21,flame=(1-q)*s*.25;for(let xx=-flame;xx<=flame;xx+=stepX)char(x+xx,y+s*.8+q*s*1.3,Math.sin(t*4+k)>0?'%':':',q<.3?p.glow:p.accent,1-q*.65);}
      for(let i=0;i<5;i++)cloud(x+Math.sin(i*2)*s*.9,h*.95-i*7*scale,55*scale+i*9*scale,p.muted,.45);
      for(let i=0;i<40;i++)char(rnd(i+4)*w,wrap(rnd(i+7)*h+t*35,h),'.',p.glow,.35);break;
    }
    case 'alien-orchard':{
      stars(70);mask(w*.78,h*.16,35*scale,35*scale,(u,v)=>u*u+v*v<1?.7:0,p.secondary);mask(w*.9,h*.23,20*scale,20*scale,(u,v)=>u*u+v*v<1?.7:0,p.accent);
      for(let i=0;i<9;i++){
        const x=(i+.3)*w/9,y=h*.88,hh=(90+rnd(i+12)*100)*scale,sway=Math.sin(t*.25+i)*15*scale;
        for(let k=0;k<hh;k+=stepY)char(x+sway*k/hh,y-k,'|',p.muted,.85);
        for(let branch=0;branch<3;branch++){
          const xx=x+sway+Math.sin(branch*2+i)*hh*.3,yy=y-hh+branch*18*scale;
          mask(xx,yy,hh*.27,hh*.17,(u,v)=>u*u+v*v<1?.4+.35*Math.sin(t*.35+i)**2:0,branch%2?p.secondary:p.accent);
          char(xx,yy,'@',p.glow,.8);glow(xx,yy,hh*.3,p.accent,.12);
        }
      }for(let i=0;i<35;i++)char(wrap(rnd(i+3)*w+t*3,w),h*(.5+rnd(i+17)*.4)+Math.sin(t*.3+i)*15,'.',p.glow,.4);break;
    }
    case 'retro-arcade':{
      stars(50);const invader=['  #   #  ','   # #   ','  #####  ',' ## # ## ','#########','# ##### #','# #   # #','   # #   '];
      for(let fleet=0;fleet<2;fleet++)for(let i=0;i<5;i++){
        const x=w*(.12+i*.18)+Math.sin(t*.35)*30*scale,y=h*(.18+fleet*.22),cell=stepX*1.4;
        for(let row=0;row<invader.length;row++)for(let col=0;col<9;col++)if(invader[row][col]==='#'&&!(row===7&&Math.sin(t*2)>0&&col===3))char(x+(col-4)*cell,y+row*stepY,'#',fleet?p.secondary:p.accent);
      }
      const x=w*(.5+.3*Math.sin(t*.2)),y=h*.86;
      mask(x,y,28*scale,22*scale,(u,v)=>Math.abs(u)<.8-Math.abs(v)*.5?.8:0,p.glow);
      for(let i=0;i<4;i++){const yy=y-fract(t*.6+i*.25)*h*.75;char(x,yy,'|',p.glow,.8);}
      break;
    }
    case 'hologram-city':{
      for(let tower=0;tower<11;tower++){
        const x=(tower+.2)*w/11,bw=45*scale,bh=(70+rnd(tower+8)*200)*scale,base=h*(.85+.03*Math.sin(t*.3+tower));
        for(let yy=base-bh;yy<=base;yy+=stepY)for(let xx=x;xx<x+bw;xx+=stepX){
          const edge=xx===x||xx>x+bw-stepX||yy<base-bh+stepY||yy>base-stepY,scan=fract((yy-base)/bh+t*.15);
          if(edge||scan<.1||rnd(xx+yy)>.83)char(xx,yy,edge?'+':scan<.1?'=':':',edge?p.accent:p.secondary,edge?.75:.35);
        }
        if(tower<10)for(let k=0;k<12;k++){const q=k/11;char(x+bw+q*w*.06,base-bh*.4,'-',p.muted,.5);if(fract(t*.35+tower*.12+q)<.12)char(x+bw+q*w*.06,base-bh*.4,'*',p.glow);}
      }
      for(let i=0;i<50;i++)char(rnd(i+33)*w,wrap(rnd(i+19)*h-t*9,h),'0',p.secondary,.15);break;
    }
  }
  ctx.globalAlpha=1;
}
