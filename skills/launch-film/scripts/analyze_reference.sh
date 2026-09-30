#!/bin/sh
# Break down an inspiration video (URL or local file) into things Claude can read:
#   bash analyze_reference.sh <url-or-file> <out-dir>
# Produces in <out-dir>:
#   ref.mp4            the video (downloaded with yt-dlp when given a URL)
#   probe.txt          size / fps / duration
#   cuts.txt           hard-cut timestamps (scene score > 0.3)
#   overview-N.png     4 fps contact sheets, 20 frames each (5 s per sheet), timestamp burned in
#   detail-N.png       10 fps contact sheets for the first 20 s (2 s per sheet)
#   tempo.txt          BPM candidates + strongest onsets (for the beat grid)
# Use it to learn pacing, transitions and motion grammar — never to copy a video shot-for-shot
# or reuse its logos, characters, footage or music (see references/inspiration.md).
set -e
SRC=${1:?usage: analyze_reference.sh <url-or-file> <out-dir>}; OUT=${2:?out dir}
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"
case "$SRC" in
  http*://*) command -v yt-dlp >/dev/null || { echo "yt-dlp is required for URLs (brew install yt-dlp)"; exit 1; }
             yt-dlp -q --no-warnings -f "bv*+ba/b" --merge-output-format mp4 -o "$OUT/ref.%(ext)s" "$SRC" ;;
  *) cp "$SRC" "$OUT/ref.${SRC##*.}"; [ -f "$OUT/ref.mp4" ] || ffmpeg -v error -y -i "$OUT/ref.${SRC##*.}" -c:v libx264 -crf 18 -c:a aac "$OUT/ref.mp4" ;;
esac
V="$OUT/ref.mp4"
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate,duration -of compact "$V" > "$OUT/probe.txt"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
ffmpeg -hide_banner -i "$V" -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep -o "pts_time:[0-9.]*" | sed 's/pts_time://' > "$OUT/cuts.txt" || true
LABEL="drawtext=text='%{pts\:hms}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=4"
ffmpeg -v error -y -i "$V" -vf "fps=4,scale=384:-2,$LABEL,tile=5x4:padding=3:color=0xFF2D2D" "$OUT/overview-%02d.png" 2>/dev/null || \
ffmpeg -v error -y -i "$V" -vf "fps=4,scale=384:-2,tile=5x4:padding=3:color=0xFF2D2D" "$OUT/overview-%02d.png"
ffmpeg -v error -y -t 20 -i "$V" -vf "fps=10,scale=384:-2,$LABEL,tile=5x4:padding=3:color=0xFF2D2D" "$OUT/detail-%02d.png" 2>/dev/null || \
ffmpeg -v error -y -t 20 -i "$V" -vf "fps=10,scale=384:-2,tile=5x4:padding=3:color=0xFF2D2D" "$OUT/detail-%02d.png"
node "$HERE/tempo.mjs" "$V" > "$OUT/tempo.txt" 2>/dev/null || echo "no audio track" > "$OUT/tempo.txt"
echo "duration ${DUR}s"; cat "$OUT/probe.txt"; echo "cuts: $(tr '\n' ' ' < "$OUT/cuts.txt")"; cat "$OUT/tempo.txt"
ls "$OUT"/overview-*.png "$OUT"/detail-*.png
