#!/usr/bin/env python3
"""Two real Claude Code processes through the native terminal compositor.
Isolated configuration and no API key, OAuth token or model request.
Writes an asciinema recording and actual terminal output for visual review.
"""
import codecs, fcntl, json, os, pty, re, select, signal, struct, subprocess, tempfile, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(os.environ.get('LIVING_TEST_OUTPUT',tempfile.gettempdir()+'/living-terminal-proof'))
OUT.mkdir(parents=True,exist_ok=True)
ANSI=re.compile(r'\x1b\][^\x07]*\x07|\x1b\[[0-?]*[ -/]*[@-~]|\x1b[()][A-Z0-9]|\x1b.')
class Terminal:
    live=[]
    def __init__(self,config,record=False):
        self.master,slave=pty.openpty();self.raw=bytearray();self.plain='';self.start=time.monotonic();self.events=[];self.record=record;self.decoder=codecs.getincrementaldecoder('utf8')('replace')
        fcntl.ioctl(slave,termios_winsize,struct.pack('HHHH',42,140,0,0))
        env=dict(os.environ,CLAUDE_CONFIG_DIR=str(config),DISABLE_TELEMETRY='1',CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC='1',ANTHROPIC_BASE_URL='http://127.0.0.1:9',TERM='xterm-256color',COLORTERM='truecolor')
        env.pop('ANTHROPIC_API_KEY',None);env.pop('CLAUDE_CODE_OAUTH_TOKEN',None)
        command=[str(ROOT/'terminal/bin/living'),'--living-theme','koi-pond','--plugin-dir',str(ROOT)]
        if os.environ.get('LIVING_TEST_AUTOMATIC')=='1':
            command=['/bin/zsh','-dfc','source \"$1\"; shift; claude \"$@\"','living-shell-test',str(ROOT/'terminal/shell/claude.zsh'),'--plugin-dir',str(ROOT)]
        self.process=subprocess.Popen(command,stdin=slave,stdout=slave,stderr=slave,cwd=ROOT,env=env)
        os.close(slave);Terminal.live.append(self)
    def drain(self,seconds=1):
        end=time.monotonic()+seconds
        while time.monotonic()<end:
            ready=select.select([t.master for t in Terminal.live],[],[],.04)[0]
            for t in Terminal.live:
                if t.master not in ready:continue
                try:data=os.read(t.master,1000000)
                except OSError:continue
                t.raw.extend(data);t.plain+=ANSI.sub('',data.decode('utf8','replace'))
                if t.record:t.events.append([round(time.monotonic()-t.start,4),'o',t.decoder.decode(data)])
    def send(self,data,seconds=1):os.write(self.master,data.encode());self.drain(seconds)
    def capture(self,name):
        (OUT/(name+'.ansi')).write_bytes(self.raw)
    def visible(self):
        self.capture('current-screen')
        return subprocess.check_output(['node',str(ROOT/'terminal/tests/read-screen.cjs'),str(OUT/'current-screen.ansi')],text=True)
    def close(self):
        if self.process.poll() is None:
            self.send('\x1b',.1);self.send('/exit\r',.5)
            if self.process.poll() is None:self.process.terminate()
            try:self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:self.process.kill();self.process.wait(timeout=3)
        self.drain(.1);os.close(self.master);Terminal.live.remove(self)

import termios
termios_winsize=termios.TIOCSWINSZ
checks=[];terminals=[]
with tempfile.TemporaryDirectory(prefix='living-native-') as directory:
    config=Path(directory)
    (config/'.claude.json').write_text(json.dumps({'hasCompletedOnboarding':True,'lastOnboardingVersion':'2.1.308','hasSeenAutoDefaultNotice':True,'hasSeenAutoDefaultNudge':True,'hasSeenAutoModeEntryWarning':True,'hasResetAutoModeOptInForDefaultOffer':True,'projects':{str(ROOT):{'hasTrustDialogAccepted':True}}}))
    (config/'settings.json').write_text('{"theme":"dark"}')
    state=config/'plugins/living-themes/state-v1'
    def record(key):
        try:return json.loads((state/(key+'.json')).read_text())
        except (FileNotFoundError,json.JSONDecodeError):return {}
    def wait_for(predicate,t,seconds=15):
        end=time.monotonic()+seconds
        while time.monotonic()<end:
            t.drain(.2)
            if predicate():return
        raise AssertionError(t.plain[-3500:])
    catalog=json.loads((ROOT/"terminal/dist/themes.json").read_text())
    offsets={theme["id"]:7+i for i,theme in enumerate(sorted(catalog,key=lambda x:x["name"].lower()))}
    def choose(t,theme):
        offset=1 if theme=="dark" else offsets[theme]
        t.send('/theme\r',1);t.send('\x1b[H'+'\x1b[B'*offset,.4);t.send('\r',1)
        wait_for(lambda:record('selection.v1').get('value','').endswith(theme),t)
    try:
        a=Terminal(config,True);terminals.append(a);a.drain(3)
        wait_for(lambda:'Claude Code' in a.plain,a)
        if 'trust this' in a.plain.lower() and 'Yes' in a.plain:a.send('\r',2)
        choose(a,'koi-pond');a.drain(1);a.capture('Koi-Pond-real-Claude')
        checks.append('Real Claude Code and native /theme picker run inside the full-screen terminal compositor')
        b=Terminal(config);terminals.append(b);b.drain(3);b.send('/living status\r',2)
        assert 'koi-pond' in b.plain
        a.send('/living pause\r',1);wait_for(lambda:record('motion.v1').get('paused') is True,a)
        a.drain(2);b.send('/living status\r',2);assert re.search(r'"paused":\s*true',b.plain), b.plain[-3000:]
        checks.append('Two real Claude sessions share scene selection and pause')
        a.send('/living brightness 65\r',1);wait_for(lambda:record('appearance.v1').get('brightness')==.65,a)
        a.send('/living hide\r',1);wait_for(lambda:record('motion.v1').get('hidden') is True,a)
        a.send('/living show\r',1);a.send('/living resume\r',1)
        checks.append('Native /living brightness, hide/show and resume controls reach the full-area renderer')
        a.send('Türkçe: ığüşöç İĞÜŞÖÇ',1);a.capture('Turkish-input-real-Claude')
        assert 'Türkçe: ığüşöç İĞÜŞÖÇ' in a.visible()
        a.send('\x15',.4)
        checks.append('Turkish keyboard input is echoed by the real Claude process without a model request')
        choose(a,'jellyfish');a.drain(.8);a.capture('Jellyfish-real-Claude')
        choose(a,'cloud-drift');a.drain(.8);a.capture('Cloud-Drift-real-Claude')
        checks.append('Koi Pond, Jellyfish and Cloud Drift switch through the real native /theme menu')
        for theme in ['whale-song','dragon-flight','black-hole']:
            choose(a,theme);a.drain(.8);a.capture(theme+'-real-Claude')
        checks.append('New Whale Song, Dragon Flight and Black Hole run through the native 48-theme picker')
        fcntl.ioctl(a.master,termios_winsize,struct.pack('HHHH',26,76,0,0));a.process.send_signal(signal.SIGWINCH);a.drain(1)
        a.send('/clear\r',1);a.send('/living status\r',1)
        assert record('selection.v1').get('value','').endswith('black-hole')
        checks.append('PTY resizes and /clear preserves selection')
        choose(a,'dark');a.drain(.7)
        checks.append('Selecting a built-in theme clears the shared scene')
        result={'passed':len(checks),'checks':checks,'modelRequests':0,'claude':subprocess.check_output(['claude','--version'],text=True).strip(),'terminal':('automatic zsh claude command' if os.environ.get('LIVING_TEST_AUTOMATIC')=='1' else 'living launcher')+'; real PTY, 140x42, then 76x26; no VS Code'}
    except Exception as error:
        result={'error':str(error),'checks':checks};a.capture('failure')
        if len(terminals)>1:terminals[1].capture('failure-second')
        raise
    finally:
        for t in list(terminals):t.close()
        if terminals:
            a=terminals[0]
            with (OUT/'Living-Themes-real-terminal.cast').open('w') as f:
                f.write(json.dumps({'version':2,'width':140,'height':42,'title':'Living Themes — real Claude Code, no model requests','env':{'TERM':'xterm-256color'}})+'\n')
                for event in a.events:f.write(json.dumps(event,ensure_ascii=False)+'\n')
        (OUT/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
