#!/usr/bin/env bash
# 混音预演：把 VO 与 ducked BGM 按 index.html 里的 data-volume 混起来，
# 用来在渲染前核对电平（响度 / 真峰值 / 语音可懂度），不产出最终成片。
#
# 用法：bash scripts/make_mix.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VO_GAIN="$(grep -o 'id="vo"[^>]*data-volume="[0-9.]*"' "$ROOT/index.html" | grep -o '[0-9.]*"$' | tr -d '"')"
BGM_GAIN="$(grep -o 'id="bgm"[^>]*data-volume="[0-9.]*"' "$ROOT/index.html" | grep -o '[0-9.]*"$' | tr -d '"')"
OUT="${1:-/tmp/sanji-mix-preview.wav}"

echo "VO 增益 $VO_GAIN · BGM 增益 $BGM_GAIN"

ffmpeg -y -hide_banner -loglevel error \
  -i "$ROOT/assets/vo-master.wav" -i "$ROOT/assets/bgm-ducked.wav" \
  -filter_complex "[0:a]volume=$VO_GAIN[vo];[1:a]volume=$BGM_GAIN[bg];[vo][bg]amix=inputs=2:duration=longest:normalize=0[out]" \
  -map "[out]" -c:a pcm_s16le -ar 48000 -ac 2 "$OUT"

echo "=== 响度（最终值）==="
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 \
  | tail -14 | grep -E "^\s+I:|LRA:|Peak:" | tail -4
echo "预演文件：$OUT"
