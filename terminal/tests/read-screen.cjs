const fs=require('node:fs');
const {Terminal}=require('@xterm/headless');
const t=new Terminal({cols:Number(process.argv[3]||140),rows:Number(process.argv[4]||42),allowProposedApi:true});
t.write(fs.readFileSync(process.argv[2],'utf8'),()=>{const b=t.buffer.active;console.log(Array.from({length:t.rows},(_,y)=>b.getLine(b.viewportY+y)?.translateToString(true)??'').join('\n'));t.dispose();});
