#!/usr/bin/env bash
# 生成已做 ducking 的 BGM 轨：VO 一出声，BGM 自动让位。
#
# 为什么在 ffmpeg 侧做而不是用 GSAP tween：
#   21 段语音需要 60+ 条 tween 才能描述，且渲染期依赖 audio 元素的 volume 属性；
#   sidechaincompress 一次算出连续包络，产出单文件，渲染期零复杂度。
#
# 用法：bash scripts/make_ducked_bgm.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BGM="$ROOT/assets/bgm.wav"
VO="$ROOT/assets/vo-master.wav"
OUT="$ROOT/assets/bgm-ducked.wav"

[ -f "$BGM" ] || { echo "缺少 $BGM，先跑 scripts/make_bgm.py"; exit 1; }
[ -f "$VO" ]  || { echo "缺少 $VO，先跑 scripts/make_vo.py"; exit 1; }

# sidechaincompress：VO 为触发源（key），BGM 为被压缩轨（main）
#   ratio=8   有人声时压到约 1/8
#   threshold=0.02  低于此电平不触发（保留 BGM 的自然起伏）
#   attack=20ms / release=350ms  快进慢出，听感不突兀
# apad + atrim：sidechaincompress 的输出会比输入短约 0.18s（尾部不触发即提前收），
#   这里补齐到精确 60.000s，避免 index.html 的 data-duration 与媒体长度不一致。
ffmpeg -y -hide_banner -loglevel error \
  -i "$BGM" -i "$VO" \
  -filter_complex "[1:a]aformat=channel_layouts=stereo[key]; \
                   [0:a]aformat=channel_layouts=stereo[bg]; \
                   [bg][key]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=350:makeup=1, \
                   apad=whole_dur=60,atrim=0:60,asetpts=N/SR/TB[ducked]" \
  -map "[ducked]" -c:a pcm_s16le -ar 48000 -ac 2 "$OUT"

echo "写出 $OUT（$(du -h "$OUT" | cut -f1)，$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s）"
