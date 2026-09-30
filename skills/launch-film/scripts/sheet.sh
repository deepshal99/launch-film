#!/bin/sh
# Contact sheet of film frames:  bash sheet.sh <film-dir> <name> f1 f2 ...   → <film-dir>/out/<name>.png
# Frames are tiled left→right, top→bottom in the order given (4 columns). Read the PNG to review.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR=$1; NAME=$2; shift 2
node "$HERE/stills.mjs" "$DIR" "$@" >/dev/null
ROWS=$(( ($# + 3) / 4 ))
ffmpeg -v error -y -pattern_type glob -i "$DIR/out/stills/f*.png" -vf "scale=480:-2,tile=4x$ROWS:padding=6:color=0xFF2D2D" -frames:v 1 "$DIR/out/$NAME.png"
echo "$DIR/out/$NAME.png"
