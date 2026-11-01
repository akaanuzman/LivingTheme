/** Only the interactive CLI gets the compositor. Management commands, print/
 * SDK streams and redirected I/O must retain the installed CLI's exact output. */
const commands=new Set('agents attach auth auto-mode doctor gateway import install logs mcp plugin plugins purge respawn rm setup-token stop kill ultrareview update upgrade remote-control web'.split(' '));
const scalar=new Set(('agent agents append-system-prompt append-system-prompt-file autocompact debug-file effort environment fallback-model json-schema max-budget-usd model name permission-mode permission-prompts permission-prompt-tool session-id setting-sources settings system-prompt system-prompt-file system-prompt-snapshot'+
  ' n').split(' '));
const optional=new Set('resume r from-pr worktree w debug d teleport'.split(' '));
const variadic=new Set('add-dir allowedTools allowed-tools disallowedTools disallowed-tools betas file mcp-config plugin-dir tools'.split(' '));
const rawOptions=new Set('print p help h version v bg background desktop cloud ax-screen-reader bare safe-mode input-format output-format sdk-url remote remote-control'.split(' '));
export function shouldWrap(args:string[],context:{stdinTTY:boolean;stdoutTTY:boolean;surface?:string;disabled?:string}):boolean {
  if(!context.stdinTTY||!context.stdoutTTY||context.surface||context.disabled==='1')return false;
  let positional=false;
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(arg==='--')break;
    if(arg.startsWith('-')){
      if(/^-[cvhp]+$/.test(arg)&&/[vhp]/.test(arg))return false;
      if(arg.startsWith('-p')&&!arg.startsWith('--'))return false;
      const name=arg.replace(/^--?/,'').split('=')[0];
      if(rawOptions.has(name))return false;
      if(arg.includes('='))continue;
      if(scalar.has(name)){i++;continue;}
      if(optional.has(name)){if(args[i+1]&&!args[i+1].startsWith('-'))i++;continue;}
      if(variadic.has(name)){while(args[i+1]&&!args[i+1].startsWith('-'))i++;continue;}
    }else if(!positional){
      positional=true;if(commands.has(arg))return false;
    }
  }
  return true;
}
