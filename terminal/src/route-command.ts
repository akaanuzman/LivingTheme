import {shouldWrap} from './routing.ts';
process.exitCode=shouldWrap(process.argv.slice(2),{
  stdinTTY:!!process.stdin.isTTY,stdoutTTY:!!process.stdout.isTTY,
  surface:process.env.LIVING_THEMES_SURFACE,disabled:process.env.LIVING_THEMES_DISABLE,
})?0:1;
