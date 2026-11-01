#!/bin/bash
set -euo pipefail
PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
command -v node >/dev/null || { echo 'Node 24+ gereklidir.' >&2; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])<24)process.exit(1)' || { echo 'Node 24+ gereklidir.' >&2; exit 1; }
test -f "$PROJECT_ROOT/terminal/dist/living.cjs" || { echo 'Önce npm run build ve terminal/ altında npm ci; npm run build çalıştır.' >&2; exit 1; }
"$CLAUDE_BIN" plugin validate --strict "$PROJECT_ROOT/plugin"
if "$CLAUDE_BIN" plugin marketplace list --json | python3 -c 'import sys,json; d=json.load(sys.stdin);sys.exit(0 if any(x.get("name")=="living-themes-local" for x in d) else 1)'; then
  "$CLAUDE_BIN" plugin marketplace update living-themes-local
  "$CLAUDE_BIN" plugin update living-themes@living-themes-local
else
  "$CLAUDE_BIN" plugin marketplace add "$PROJECT_ROOT"
  "$CLAUDE_BIN" plugin install living-themes@living-themes-local --scope user
fi
mkdir -p "$HOME/.local/bin"
TARGET="$HOME/.local/bin/living"
if [ -e "$TARGET" ] || [ -L "$TARGET" ]; then
  test -L "$TARGET" && test "$(readlink "$TARGET")" = "$PROJECT_ROOT/terminal/bin/living" || { echo "$TARGET zaten var; üzerine yazılmadı." >&2; exit 1; }
else
  ln -s "$PROJECT_ROOT/terminal/bin/living" "$TARGET"
fi
python3 "$PROJECT_ROOT/scripts/install-shell.py"
echo 'Hazır. Yeni bir terminalde claude, ardından /theme → Living · … seç.'
