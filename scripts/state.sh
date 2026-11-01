#!/bin/sh
# Only writes this plugin's two preference records. No evaluation of input.
set -eu
umask 077
state_dir=$1
record=$2
case "$record" in
  selection.v1|motion.v1|appearance.v1) ;;
  instance-*) printf '%s' "$record" | LC_ALL=C grep -Eq '^instance-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' || exit 2 ;;
  *) exit 2 ;;
esac
case "$state_dir" in /*/plugins/living-themes/state-v1) ;; *) exit 2 ;; esac
[ ! -L "$state_dir" ] || exit 2
mkdir -p "$state_dir"
[ ! -L "$state_dir/$record.json" ] || exit 2
state_tmp=$(mktemp "$state_dir/.write.XXXXXX")
trap 'rm -f "$state_tmp"' EXIT HUP INT TERM
cat > "$state_tmp"
[ "$(wc -c < "$state_tmp")" -le 4096 ] || exit 2
chmod 600 "$state_tmp"
mv -f "$state_tmp" "$state_dir/$record.json"
