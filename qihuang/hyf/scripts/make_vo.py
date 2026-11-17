#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成中文旁白音轨 assets/vo.wav（60s / 48kHz / stereo / 16bit PCM）。

与字幕的关系：字幕是 18 句完整信息层，旁白是口语层 —— 按语义合并为 14 段，
每段落在它所覆盖的字幕区间内，避免 60 秒内逐句朗读导致语速过快、听感断续。

依赖：edge-tts（装在系统 /usr/bin/python3 3.12）、ffmpeg。
运行：/usr/bin/python3 scripts/make_vo.py

不使用 numpy，纯标准库拼接，规避多版本 Python 环境差异。
"""
import asyncio
import hashlib
import math
import subprocess
import wave
from array import array
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
TMP = ROOT / 'scripts' / '_vo_tmp'
TMP.mkdir(parents=True, exist_ok=True)
OUT = ROOT / 'assets' / 'vo.wav'

SR = 48000
TOTAL_SECONDS = 60.0
VOICE = 'zh-CN-YunyangNeural'   # 男声 · 新闻播报 · 专业可靠，贴合宣纸金墨的沉稳解说
RATE = '+10%'                    # 60 秒内保持自然语速的轻微提速
PEAK = 11000                     # 段落峰值目标（≈ -9.5 dBFS），留足 headroom 给后续母带压缩
HEAD_PAD = 0.12                  # 每段前留白（秒）
TAIL_PAD = 0.18                  # 每段后预留（秒）
MAX_ATEMPO = 1.30                # 最长允许的时间压缩，超过则提示精简文案

# 段落归一后的总增益：让旁白在混音里明显高于 BGM（人声为主）
# 最终电平由 scripts/make_mix.py 统一校准到 -16 ~ -14 LUFS
VO_GAIN = 1.8

# (起始秒, 结束秒, 旁白文案) —— 区间与 index.html 的字幕 clip 对齐
VO = [
    (0.0,   6.0,  '倪师资料铺天盖地，越学越散？视频散落各处，版本还乱。'),
    (6.0,   11.0, '学了后面，忘了前面。查个穴位、找个方剂，翻遍全网。'),
    (11.0,  15.0, '一页收齐人纪与天纪。'),
    (15.0,  19.0, '七部人纪，三路天纪。'),
    (19.0,  23.0, '顺序按倪师教学逻辑排好。'),
    (23.0,  31.0, '针灸起手，内经、本草接续。再进伤寒、金匮学方证。'),
    (31.0,  34.0, '天纪并行，不必求快。'),
    (34.0,  38.0, '点课程，App 内直接播。'),
    (38.0,  42.0, '讲义、笔记就在一旁。'),
    (42.0,  46.0, '哪一集、哪份讲义，一眼定位。'),
    (46.0,  50.0, '路径清晰，不再纠结从哪开始。'),
    (50.0,  53.0, '随查随用，反复温习。'),
    (53.0,  56.0, '一条线，把散落的课串起来。'),
    (56.0,  60.0, '打开倪海厦学习天地。收藏这一页，随时回来。'),
]


def decode(path: Path, atempo: float = 1.0) -> array:
    """ffmpeg 解码为 48kHz 单声道 s16le RAW → array('h')"""
    af = f'atempo={atempo:.4f},aresample={SR}' if atempo > 1.0001 else f'aresample={SR}'
    raw = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(path),
        '-af', af, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-',
    ])
    out = array('h')
    out.frombytes(raw)
    return out


def clamp16(v: int) -> int:
    return 32767 if v > 32767 else (-32768 if v < -32768 else v)


async def synth_one(i: int, text: str) -> Path:
    # 按「音色 + 语速 + 文案」缓存：改了词才重新请求，未改动的段落直接复用
    key = hashlib.md5(f'{VOICE}|{RATE}|{text}'.encode('utf-8')).hexdigest()[:10]
    mp3 = TMP / f'{i:02d}-{key}.mp3'
    if mp3.exists() and mp3.stat().st_size > 1000:
        return mp3
    for attempt in range(4):
        try:
            comm = edge_tts.Communicate(text, VOICE, rate=RATE)
            await comm.save(str(mp3))
            if mp3.exists() and mp3.stat().st_size > 1000:
                return mp3
        except Exception as exc:  # 网络抖动重试
            print(f'  段 {i} 第 {attempt + 1} 次失败：{exc}')
            await asyncio.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f'段 {i} 合成失败：{text}')


async def synth_all() -> list:
    print(f'合成 {len(VO)} 段旁白（{VOICE}, rate={RATE}）…')
    paths = []
    for i, (_, _, text) in enumerate(VO):
        p = await synth_one(i, text)
        paths.append(p)
        print(f'  [{i + 1:02d}/{len(VO)}] {text[:18]}…  {p.stat().st_size / 1024:.1f} KB')
    return paths


def build_track(paths: list) -> array:
    """把各段拼到各自时间窗内；超出窗口则用 atempo 压缩，仍超则报错。"""
    total = int(SR * TOTAL_SECONDS)
    track = array('h', bytes(total * 2))

    for i, (start, end, text) in enumerate(VO):
        budget = end - start - HEAD_PAD - TAIL_PAD
        seg = decode(paths[i])

        # 先按目标峰值归一
        peak = max((abs(s) for s in seg), default=0)
        if peak > 0:
            scale = PEAK / peak
            seg = array('h', (clamp16(int(s * scale)) for s in seg))

        # 超出可用时长则压缩
        atempo = 1.0
        if len(seg) > int(budget * SR):
            atempo = len(seg) / (budget * SR)
            if atempo > MAX_ATEMPO:
                raise SystemExit(
                    f'段 {i} 语速超限（需 {atempo:.2f}x > {MAX_ATEMPO}x），请精简文案：{text}'
                )
            seg = decode(paths[i], atempo)
            peak = max((abs(s) for s in seg), default=0)
            if peak > 0:
                scale = PEAK / peak
                seg = array('h', (clamp16(int(s * scale)) for s in seg))

        offset = int((start + HEAD_PAD) * SR)
        end_i = min(offset + len(seg), total)
        for j in range(end_i - offset):
            track[offset + j] = seg[j]

        used = (len(seg) / SR) / (end - start)
        print(f'  段 {i + 1:02d} {start:5.1f}-{end:5.1f}s  '
              f'语音 {len(seg) / SR:4.2f}s  占用 {used * 100:4.1f}%'
              + (f'  atempo={atempo:.3f}' if atempo > 1.0 else ''))

    return track


def write_wav(track: array) -> None:
    """写盘前统一增益并限幅。

    这里只做「安全限幅」，不做响度美化：母带压缩（acompressor + alimiter）
    由 scripts/make_vo_master.sh 完成，这样 VO 的峰值不会顶到 0 dBFS，
    后续在 index.html 里用 data-volume 提增益时才有headroom。
    """
    track = array('h', (clamp16(int(s * VO_GAIN)) for s in track))
    peak = max((abs(s) for s in track), default=0)
    if peak > 0:
        # 限幅到 -9.5 dBFS（32767 * 10**(-9.5/20) ≈ 11000）
        limit = 11000
        if peak > limit:
            scale = limit / peak
            track = array('h', (clamp16(int(s * scale)) for s in track))
            print(f'限幅：峰值 {20 * math.log10(peak / 32768):.1f} dBFS -> -9.5 dBFS')

    stereo = array('h')
    for s in track:
        stereo.append(s)
        stereo.append(s)
    with wave.open(str(OUT), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())
    print(f'\n写出 {OUT}（{OUT.stat().st_size / 1024 / 1024:.2f} MB，{TOTAL_SECONDS:.1f}s）')


def main() -> None:
    paths = asyncio.run(synth_all())
    track = build_track(paths)
    write_wav(track)


if __name__ == '__main__':
    main()
