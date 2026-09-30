#!/bin/sh
# Master a mix to streaming loudness:  bash master.sh <in.wav> <out.wav> <duration-seconds> [LUFS=-14] [fade-ms=60]
# Two-pass linear loudnorm (true peak ≤ -1 dBTP), exact length, short tail fade. Prints measured I / peak.
set -e
IN=$1; OUT=$2; DUR=$3; I=${4:--14}; FADE=${5:-60}
M=$(ffmpeg -hide_banner -i "$IN" -af "atrim=0:$DUR,loudnorm=I=$I:TP=-1:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$M" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
FS=$(awk "BEGIN{print $DUR - $FADE/1000}")
ffmpeg -v error -y -i "$IN" -af "atrim=0:$DUR,loudnorm=I=$I:TP=-1:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000,apad=whole_dur=$DUR,atrim=0:$DUR,afade=t=out:st=$FS:d=$(awk "BEGIN{print $FADE/1000}")" -c:a pcm_s24le "$OUT"
ffmpeg -hide_banner -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)"
printf 'duration: '; ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
