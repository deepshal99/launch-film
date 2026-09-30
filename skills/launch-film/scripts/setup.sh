#!/bin/sh
# Scaffold a film folder and install the toolchain.
#   bash setup.sh <film-dir> [--demo]
# Creates <film-dir>/{index.html,engine.js,film.js,fonts/} (film.js = demo sting only with --demo, else a stub),
# installs playwright + @fontsource/inter in the current project, and makes sure Chromium is available.
set -e
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:?usage: setup.sh <film-dir> [--demo]}"
mkdir -p "$DIR/fonts" "$DIR/out"
cp "$SKILL/assets/template/index.html" "$SKILL/assets/template/engine.js" "$DIR/"
if [ "$2" = "--demo" ] || [ ! -f "$DIR/film.js" ]; then
  if [ "$2" = "--demo" ]; then cp "$SKILL/assets/template/film.js" "$DIR/film.js"; else cp "$SKILL/assets/template/film.stub.js" "$DIR/film.js"; fi
fi
for t in node npm ffmpeg ffprobe; do command -v $t >/dev/null || { echo "missing: $t (install it first)"; exit 1; }; done
[ -f package.json ] || npm init -y >/dev/null
node -e "require.resolve('playwright')" 2>/dev/null || npm i -D playwright >/dev/null 2>&1
node -e "require.resolve('@fontsource/inter/package.json')" 2>/dev/null || npm i -D @fontsource/inter >/dev/null 2>&1
cp node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2 node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2 \
   node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2 node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2 "$DIR/fonts/"
node -e "
const {chromium}=require('playwright');
chromium.launch().then(b=>b.close()).catch(()=>chromium.launch({channel:'chromium'}).then(b=>b.close())).then(()=>console.log('chromium ok')).catch(()=>{console.log('installing chromium…');process.exit(3)})" \
  || npx playwright install chromium
grep -qs "^$DIR/out" .gitignore 2>/dev/null || printf '%s/out/\n' "$DIR" >> .gitignore
command -v yt-dlp >/dev/null || echo "note: yt-dlp not found — needed only to analyse inspiration videos from a URL (brew install yt-dlp / pipx install yt-dlp)"
echo "ready: $DIR  (open $DIR/index.html?play to preview)"
