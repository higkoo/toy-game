#!/usr/bin/env bash
# 旁白母带：把 make_vo.py 产出的 vo.wav 做广播式动态处理，输出 vo-master.wav。
#
# 为什么需要这一步：
#   TTS 原始语音的波峰因数很大（峰值 -0.7 dBFS 但整体响度只有 -17.3 LUFS），
#   直接在 index.html 里用 data-volume 提增益必然削波（实测 +1.2 倍就破 0 dBFS）。
#   正确做法是先压动态（acompressor）把平均电平提上来，再用 alimiter 兜住真峰值，
#   这样人声清晰靠前、BGM 垫在后面，且不削波。
#
# 参数标定（实测）：
#   threshold=-26dB ratio=3.5 attack=8ms release=200ms  → 压动态，LRA 7.1 → 4.6 LU
#   volume=6.5 (+16.3 dB) + alimiter limit=0.794 (-2 dBFS) → 真峰值 -1.8 dBFS
#   结果：-16.0 LUFS / LRA 4.9 LU / Peak -1.9 dBFS
#
# 用法：bash scripts/make_vo_master.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IN="$ROOT/assets/vo.wav"
OUT="$ROOT/assets/vo-master.wav"

[ -f "$IN" ] || { echo "缺少 $IN，先跑 /usr/bin/python3 scripts/make_vo.py"; exit 1; }

ffmpeg -y -hide_banner -loglevel error -i "$IN" \
  -af "acompressor=threshold=-26dB:ratio=3.5:attack=8:release=200:makeup=1,\
volume=6.5,\
alimiter=limit=0.794:attack=4:release=80:level=disabled" \
  -c:a pcm_s16le -ar 48000 -ac 2 "$OUT"

echo "写出 $OUT（$(du -h "$OUT" | cut -f1)）"
echo "=== 母带电平 ==="
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 \
  | tail -14 | grep -E "I: |LRA: |Peak: "
