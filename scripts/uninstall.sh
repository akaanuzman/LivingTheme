#!/bin/bash
set -euo pipefail
PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
python3 "$PROJECT_ROOT/scripts/install-shell.py" --remove
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
"$CLAUDE_BIN" plugin uninstall living-themes@living-themes-local --scope user
"$CLAUDE_BIN" plugin marketplace remove living-themes-local
echo 'Living Themes kaldırıldı. Açık oturumlarda /reload-plugins çalıştır.'
