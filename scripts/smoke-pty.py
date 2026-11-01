#!/usr/bin/env python3
"""Two actual Claude Code PTYs, isolated preferences, no model request or login.
Requires macOS/Linux Python 3 and Claude Code 2.1.308+. Report on stdout.
"""
import fcntl
import json
import os
from pathlib import Path
import pty
import re
import select
import shutil
import signal
import struct
import subprocess
import tempfile
import termios
import time

ROOT = Path(__file__).resolve().parent.parent
CLAUDE = os.environ.get('CLAUDE_BIN', shutil.which('claude') or 'claude')
ANSI = re.compile(r'\x1b\][^\x07]*\x07|\x1b\[[0-?]*[ -/]*[@-~]|\x1b[()][A-Z0-9]|\x1b.')

class Terminal:
    live = []
    def __init__(self, config):
        self.master, slave = pty.openpty()
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 36, 140, 0, 0))
        env = dict(os.environ, CLAUDE_CONFIG_DIR=str(config), DISABLE_TELEMETRY='1',
                   CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC='1', ANTHROPIC_BASE_URL='http://127.0.0.1:9',
                   TERM='xterm-256color', COLORTERM='truecolor')
        # Never inherit an API credential into this rendering-only smoke test.
        env.pop('ANTHROPIC_API_KEY', None)
        env.pop('CLAUDE_CODE_OAUTH_TOKEN', None)
        self.process = subprocess.Popen([CLAUDE, '--plugin-dir', str(ROOT)], cwd=ROOT,
                                        stdin=slave, stdout=slave, stderr=slave, env=env)
        os.close(slave)
        self.output = ''
        Terminal.live.append(self)

    def drain(self, seconds=1.2):
        end = time.monotonic() + seconds
        out = b''
        while time.monotonic() < end:
            readable=select.select([t.master for t in Terminal.live], [], [], .05)[0]
            for terminal in Terminal.live:
                if terminal.master not in readable:
                    continue
                try:
                    chunk=os.read(terminal.master, 500000)
                except OSError:
                    continue
                terminal.output+=ANSI.sub('',chunk.decode('utf-8','replace'))
                if terminal is self:
                    out+=chunk
        plain = ANSI.sub('', out.decode('utf-8', 'replace'))
        return re.sub(r'\s+', '', plain)

    def send(self, command, seconds=1.2):
        os.write(self.master, command.encode())
        return self.drain(seconds)

    def close(self):
        if self.process.poll() is None:
            self.send('\x1b', .1)
            self.send('/exit\r', .4)
            try:
                self.process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=3)
        os.close(self.master)
        Terminal.live.remove(self)

def run(config):
    (config / '.claude.json').write_text(json.dumps({
        'hasCompletedOnboarding': True, 'lastOnboardingVersion': '2.1.308',
        'hasSeenAutoDefaultNotice': True, 'hasSeenAutoDefaultNudge': True,
        'hasSeenAutoModeEntryWarning': True, 'hasResetAutoModeOptInForDefaultOffer': True,
        'projects': {str(ROOT): {'hasTrustDialogAccepted': True}},
    }))
    (config / 'settings.json').write_text(json.dumps({'theme': 'dark'}))
    terminals = []
    checks = []
    def store():
        folder=config / 'plugins/living-themes/state-v1'
        return {p.stem:json.loads(p.read_text()) for p in folder.glob('*.json')} if folder.exists() else {}
    try:
        a = Terminal(config); terminals.append(a); a.drain(2)
        b = Terminal(config); terminals.append(b); b.drain(2)
        a.send('/theme\r')
        a.send('\x1b[H' + '\x1b[B' * 7, .4)
        a.send('\r', 2)
        selection = store().get('selection.v1', {})
        assert selection.get('value', '').startswith('custom:living-themes:'), a.output[-5000:]
        scene = selection['value'].split(':')[-1]
        checks.append('native /theme picker selects a contributed Living theme: ' + scene)
        pause_output=a.send('/living pause\r', 4)
        assert store().get('motion.v1',{}).get('paused') is True, 'Pause did not persist: '+pause_output+'\n'+a.output[-5000:]
        status = b.send('/living status\r', 1.5)
        assert '"scene":"' + scene + '"' in status, status
        assert '"paused":true' in status, status
        checks.append('second real session adopts the scene and shared pause')
        a.send('/living hide\r', 1.5)
        status = b.send('/living status\r')
        assert '"hidden":true' in status, status
        a.send('/living show\r', 1.5)
        b.send('/clear\r')
        status = b.send('/living status\r')
        assert '"scene":"' + scene + '"' in status, status
        assert '"hidden":false' in status, status
        checks.append('/clear preserves the shared scene and hide/show control')
        fcntl.ioctl(b.master, termios.TIOCSWINSZ, struct.pack('HHHH', 22, 60, 0, 0))
        b.process.send_signal(signal.SIGWINCH); b.drain(.4)
        b.send('/living\r'); b.send('\x1b', .4)
        checks.append('narrow terminal resize and /living controls remain responsive')
        a.send('/theme\r'); a.send('\x1b[H\x1b[B', .4); a.send('\r', 2)
        status = b.send('/living status\r', 1.5)
        assert '"scene":null' in status and '"localTheme":"dark"' in status, status
        checks.append('native built-in theme hides scene and synchronizes the built-in palette')
        return {'version': subprocess.check_output([CLAUDE, '--version'], text=True).strip(),
                'passed': len(checks), 'checks': checks, 'modelRequests': 0,
                'configuration': 'temporary isolated CLAUDE_CONFIG_DIR'}
    except Exception:
        for index, terminal in enumerate(terminals):
            Path(tempfile.gettempdir(), 'living-themes-smoke-'+str(index)+'.txt').write_text(terminal.output)
        raise
    finally:
        for terminal in terminals:
            terminal.close()

if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='living-themes-smoke-') as directory:
        print(json.dumps(run(Path(directory)), ensure_ascii=False, indent=2))
