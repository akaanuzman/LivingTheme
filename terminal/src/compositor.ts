import {paintWorld} from '../../shared/world.ts';
import {THEMES} from '../../src/catalog.ts';

export type RGB=[number,number,number];
type Stop={at:number;color:RGB;alpha:number};
type Gradient={kind:'linear'|'radial';values:number[];stops:Stop[];addColorStop:(at:number,color:string)=>void};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const rgb=(s:string):RGB=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
const blend=(a:RGB,b:RGB,t:number):RGB=>a.map((v,i)=>Math.round(v*(1-t)+b[i]*t)) as RGB;
const equal=(a:RGB,b:RGB)=>a.every((n,i)=>n===b[i]);
const CELL_X=8,CELL_Y=16;
const ansiBase=['#000000','#cd3131','#0dbc79','#e5e510','#2472c8','#bc3fbc','#11a8cd','#e5e5e5','#666666','#f14c4c','#23d18b','#f5f543','#3b8eea','#d670d6','#29b8db','#ffffff'].map(rgb);
export function indexed(n:number):RGB {
  if(n<16)return ansiBase[n]??ansiBase[7];
  if(n>=232)return [8+(n-232)*10,8+(n-232)*10,8+(n-232)*10];
  const v=n-16,levels=[0,95,135,175,215,255];return [levels[Math.floor(v/36)],levels[Math.floor(v/6)%6],levels[v%6]];
}
function gradient(kind:Gradient['kind'],values:number[]):Gradient {
  const stops:Stop[]=[];
  return {kind,values,stops,addColorStop(at,color){stops.push({at,color:color==='transparent'?[0,0,0]:rgb(color),alpha:color==='transparent'?0:1});stops.sort((a,b)=>a.at-b.at);}};
}
function colorAt(fill:string|Gradient,x:number,y:number):{color:RGB;alpha:number}{
  if(typeof fill==='string')return {color:rgb(fill),alpha:1};
  const v=fill.values;
  const pos=clamp(fill.kind==='linear'?((x-v[0])*(v[2]-v[0])+(y-v[1])*(v[3]-v[1]))/((v[2]-v[0])**2+(v[3]-v[1])**2):Math.hypot(x-v[3],y-v[4])/v[5]);
  const a=[...fill.stops].reverse().find(s=>s.at<=pos)??fill.stops[0],b=fill.stops.find(s=>s.at>=pos)??fill.stops.at(-1)!;
  const t=b.at===a.at?0:(pos-a.at)/(b.at-a.at);
  // Interpolate premultiplied colors so transparent glow edges stay colored.
  const alpha=a.alpha*(1-t)+b.alpha*t;
  const color=alpha? a.color.map((n,i)=>Math.round((n*a.alpha*(1-t)+b.color[i]*b.alpha*t)/alpha)) as RGB:a.color;
  return {color,alpha};
}
export type Pixel={char:string;fg:RGB;bg:RGB};
/** A character-cell Canvas adapter: the same 48 worlds paint into the terminal,
 * without a browser, webview, image protocol, or writes over Claude's PTY. */
export class CellCanvas {
  cells:Pixel[];fillStyle:string|Gradient='#000000';globalAlpha=1;
  font='';textAlign='';textBaseline='';strokeStyle='';lineWidth=1;
  constructor(public columns:number,public rows:number,private base:RGB){this.cells=Array.from({length:columns*rows},()=>({char:' ',fg:base,bg:base}));}
  clearRect(){for(const c of this.cells){c.char=' ';c.fg=this.base;c.bg=this.base;}}
  createLinearGradient(...values:number[]){return gradient('linear',values);}
  createRadialGradient(...values:number[]){return gradient('radial',values);}
  fillRect(x:number,y:number,w:number,h:number){
    for(let row=Math.max(0,Math.floor(y/CELL_Y));row<Math.min(this.rows,Math.ceil((y+h)/CELL_Y));row++)
      for(let col=Math.max(0,Math.floor(x/CELL_X));col<Math.min(this.columns,Math.ceil((x+w)/CELL_X));col++){
        const c=this.cells[row*this.columns+col],p=colorAt(this.fillStyle,col*CELL_X,row*CELL_Y);
        c.bg=blend(c.bg,p.color,clamp(this.globalAlpha*p.alpha));
        if(this.globalAlpha*p.alpha>=1){c.char=' ';c.fg=c.bg;}
      }
  }
  fillText(char:string,x:number,y:number){
    const col=Math.round(x/CELL_X),row=Math.round(y/CELL_Y);if(col<0||row<0||col>=this.columns||row>=this.rows||!char.trim())return;
    const c=this.cells[row*this.columns+col],p=colorAt(this.fillStyle,x,y);
    const alpha=clamp(this.globalAlpha*p.alpha);if(alpha<.04)return;
    c.char=char;c.fg=blend(c.bg,p.color,alpha);
  }
  // World grid strokes are decorative; cell glyphs carry the actual scenery.
  beginPath(){} moveTo(){} lineTo(){} stroke(){}
}
function packed(value:number):RGB{return [(value>>16)&255,(value>>8)&255,value&255];}
function cellColor(c:any,fg:boolean,fallback:RGB):RGB{
  if(fg?c.isFgDefault():c.isBgDefault())return fallback;
  const n=fg?c.getFgColor():c.getBgColor();return (fg?c.isFgRGB():c.isBgRGB())?packed(n):indexed(n);
}
function attributes(c:any):string{
  const a:number[]=[];
  if(c.isBold())a.push(1);if(c.isDim())a.push(2);if(c.isItalic())a.push(3);if(c.isUnderline())a.push(4);
  if(c.isBlink())a.push(5);if(c.isStrikethrough())a.push(9);if(c.isOverline())a.push(53);
  return a.join(';');
}
export interface FrameOptions {themeId:string|null;time:number;brightness:number;intensity:number;hidden:boolean}
export type PaintCell={glyph:string;style:string;width:number};
export function sceneFrame(columns:number,rows:number,o:FrameOptions):Pixel[]{
  const theme=THEMES.find(t=>t.id===o.themeId),base=theme?rgb(theme.palette.bg):rgb('#171717');
  const ctx=new CellCanvas(columns,rows,base);
  if(theme&&!o.hidden){paintWorld(ctx as unknown as CanvasRenderingContext2D,columns*CELL_X,rows*CELL_Y,theme.id,o.time,o.intensity);
    for(const c of ctx.cells){c.bg=blend(base,c.bg,clamp(o.brightness));c.fg=blend(c.bg,c.fg,clamp(o.brightness));}}
  // Gentle quantization keeps the terminal stream small without reducing text
  // colors. Subtle gradient noise otherwise emits a new SGR for every cell.
  for(const c of ctx.cells){c.fg=c.fg.map(n=>Math.min(255,Math.round(n/4)*4)) as RGB;c.bg=c.bg.map(n=>Math.min(255,Math.round(n/4)*4)) as RGB;}
  return ctx.cells;
}
/** Merge from the parsed terminal buffer, preserving wide cells, RGB/ANSI
 * colors and SGR attributes. Text spans have quiet backing for readability. */
export function composeFrame(terminal:any,o:FrameOptions):PaintCell[][]{
  const {cols,rows}=terminal,buffer=terminal.buffer.active,theme=THEMES.find(t=>t.id===o.themeId);
  const base=rgb(theme?.palette.bg??'#171717'),text=rgb(theme?.palette.text??'#eeeeee');
  const pixels=sceneFrame(cols,rows,o),output:PaintCell[][]=[];
  for(let y=0;y<rows;y++){
    const line=buffer.getLine(buffer.viewportY+y);let first=cols,last=-1;
    for(let x=0;x<cols;x++){const c=line?.getCell(x);if(c?.getChars().trim()&&!c.isInvisible()){first=Math.min(first,x);last=x+c.getWidth()-1;}}
    const row:PaintCell[]=[];
    for(let x=0;x<cols;x++){
      const c=line?.getCell(x);if(c&&c.getWidth()===0){row.push({glyph:'',style:'',width:0});continue;}
      const pixel=pixels[y*cols+x],glyph=c?.isInvisible()?' ':c?.getChars()||' ';
      const quiet=x>=first-2&&x<=last+2;
      const cursor=y===buffer.cursorY;
      let bg=c?cellColor(c,false,pixel.bg):pixel.bg;
      const transparent=!c||c.isBgDefault()||(c.isBgRGB()&&equal(bg,base));
      const hasText=!!glyph.trim();
      let fg=c?cellColor(c,true,text):text;
      if(c?.isInverse()){const swap=fg;fg=bg;bg=swap;}
      else if(transparent)bg=quiet||cursor?blend(pixel.bg,base,.88):pixel.bg;
      let char=hasText?glyph:(!transparent||c?.isInverse()||quiet||cursor?' ':pixel.char);
      if(!hasText)fg=pixel.fg;
      if(c?.isInvisible())char=' ';
      const attrs=hasText?attributes(c):'';
      const style=`0;38;2;${fg.join(';')};48;2;${bg.join(';')}${attrs?';'+attrs:''}`;
      row.push({glyph:char,style,width:c?.getWidth()||1});
    }
    output.push(row);
  }
  return output;
}
export function composeRows(terminal:any,o:FrameOptions):string[]{
  return composeFrame(terminal,o).map(row=>{let s='',last='';for(const c of row){if(!c.width)continue;if(c.style!==last){s+=`\x1b[${c.style}m`;last=c.style;}s+=c.glyph;}return s+'\x1b[0m';});
}
export function frameDifference(current:PaintCell[][],previous:PaintCell[][]):string{
  let output='';
  for(let y=0;y<current.length;y++){
    let lastStyle='',at=-1;
    for(let x=0;x<current[y].length;x++){
      const c=current[y][x],p=previous[y]?.[x];if(!c.width)continue;
      if(p&&c.glyph===p.glyph&&c.style===p.style&&c.width===p.width){at=-1;continue;}
      if(at!==x)output+=`\x1b[${y+1};${x+1}H`;
      if(c.style!==lastStyle){output+=`\x1b[${c.style}m`;lastStyle=c.style;}
      output+=c.glyph;at=x+c.width;
    }
  }
  return output;
}
