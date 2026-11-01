# Loaded by interactive zsh only. Keep PATH and the installed Claude executable
# intact: scripts, IDE extensions and other processes still resolve the real CLI.
typeset -g _LIVING_THEMES_TERMINAL_ROOT="${${(%):-%x}:A:h:h}"

function claude {
  local living_native
  living_native="$(whence -p claude)" || {
    print -u2 'Claude Code bulunamadı.'
    return 127
  }
  if [[ ! -t 0 || ! -t 1 || -n "${LIVING_THEMES_SURFACE-}" || "${LIVING_THEMES_DISABLE-}" == 1 || ! -r "$_LIVING_THEMES_TERMINAL_ROOT/dist/route-command.cjs" ]] || ! whence -p node >/dev/null; then
    command "$living_native" "$@"
    return $?
  fi
  if command node "$_LIVING_THEMES_TERMINAL_ROOT/dist/route-command.cjs" "$@"; then
    command "$_LIVING_THEMES_TERMINAL_ROOT/bin/living" --living-claude "$living_native" "$@"
  else
    command "$living_native" "$@"
  fi
}
