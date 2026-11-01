#!/bin/bash
set -euo pipefail
PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
if ! command -v "$CLAUDE_BIN" >/dev/null 2>&1; then
  echo "Claude Code bulunamadı. Önce Claude Code 2.1.308 veya üstünü kur." >&2
  exit 1
fi
"$CLAUDE_BIN" plugin validate --strict "$PROJECT_ROOT"
"$CLAUDE_BIN" plugin marketplace add "$PROJECT_ROOT"
"$CLAUDE_BIN" plugin install living-themes@living-themes-local --scope user
echo 'Kuruldu. Açık Claude Code oturumlarında /reload-plugins, ardından /theme → Living · … seç.'
