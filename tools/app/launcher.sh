#!/bin/sh
# PocketReader.app launcher (Contents/MacOS/PocketReader, the bundle's CFBundleExecutable).
# Asks for an EPUB with the system file chooser, then starts the PocketJS desktop host from the
# bundle. The host reads --file as text and pushes it to the guest once at boot, so the EPUB is
# sent as base64 text (the reader decodes it). No pick: the host starts without --file and the
# reader shows its bundled book. One book per launch.
#
# Arguments (a double-click passes none):
#   --book <path>   open this EPUB instead of asking
#   --no-chooser    do not ask; start with the bundled book
#   -- <args>       passed to the host last (e.g. --quit-after 120)
# Environment: POCKETREADER_OSASCRIPT replaces osascript; POCKETREADER_DRY_RUN=1 prints the host
# argv one per line instead of starting it.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
resources="$here/../Resources"
book=""
ask=1
while [ $# -gt 0 ]; do
  case "$1" in
    --book) book="${2:-}"; ask=0; shift 2 || shift ;;
    --no-chooser) ask=0; shift ;;
    --) shift; break ;;
    *) shift ;;  # LaunchServices may add its own arguments (e.g. -psn_...); ignore them
  esac
done

if [ "$ask" = 1 ]; then
  book="$("${POCKETREADER_OSASCRIPT:-/usr/bin/osascript}" \
    -e 'tell current application to activate' \
    -e 'POSIX path of (choose file with prompt "Open an EPUB" of type {"org.idpf.epub-container"})' 2>/dev/null)" || book=""
fi

title="PocketReader"
file=""
if [ -n "$book" ] && [ -r "$book" ]; then
  tmp="${TMPDIR:-/tmp}"
  tmp="${tmp%/}/pocketreader"
  mkdir -p "$tmp" && rm -f "$tmp"/book.*
  file="$(mktemp "$tmp/book.XXXXXX")" && /usr/bin/base64 -i "$book" -o "$file" || file=""
  [ -n "$file" ] && title="PocketReader — $(basename "$book")"
fi

set -- "$here/pocket-desktop-host" --app pocketreader --title "$title" --viewport 480x272 --density 2 --fixed \
  --js "$resources/reader.js" --pak "$resources/reader.pak" --companions reader \
  ${file:+--file} ${file:+"$file"} "$@"

if [ "${POCKETREADER_DRY_RUN:-}" = 1 ]; then
  printf '%s\n' "$@"
  exit 0
fi
# The host reads the file once at boot; remove it shortly after, from a detached subshell.
[ -n "$file" ] && (sleep 30; rm -f "$file") >/dev/null 2>&1 &
exec "$@"
