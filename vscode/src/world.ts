import { THEMES, type Palette } from '../../src/catalog.ts';

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
    const cos=Math.cos(angle),sin=Math.sin(angle),bound=Math.max(rx,ry)*1.05;
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
  }
  ctx.globalAlpha=1;
}
