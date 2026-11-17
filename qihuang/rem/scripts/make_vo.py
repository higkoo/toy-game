#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
生成中文配音音轨 public/vo.wav（60s / 48kHz / stereo / 16bit PCM）。

11 段旁白按绝对帧区间精确对齐；相邻内容对应场景，字幕另由 NARRATION 提供
（字幕 24 条是完整信息层，旁白 11 段是口语提炼层，避免 60s 内逐字朗读导致语速过快）。

依赖：edge-tts（装在系统 /usr/bin/python3 3.12）、ffmpeg。
运行：/usr/bin/python3 scripts/make_vo.py
不使用 numpy，纯标准库拼接，规避多版本 Python 环境差异。
"""
import asyncio
import hashlib
import subprocess
import wave
from array import array
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
TMP = ROOT / 'scripts' / '_vo_tmp'
TMP.mkdir(parents=True, exist_ok=True)
OUT = ROOT / 'public' / 'vo.wav'

SR = 48000
FPS = 30
TOTAL_FRAMES = 1800
VOICE = 'zh-CN-YunyangNeural'   # 男声 · 新闻播报 · 专业可靠，贴合宣纸金墨的沉稳解说
RATE = '+12%'                    # 60 秒内保持自然语速的轻微提速
PEAK = 24000                     # 段落峰值目标，留 headroom 给后续响度提升与混音
HEAD_PAD = 0.15                  # 每段前留白（秒）
TAIL_PAD = 0.15                  # 每段后预留（秒）
MAX_ATEMPO = 1.28                # 最长允许的时间压缩，超过则提示精简文案

# (起始帧, 结束帧, 旁白文案) —— 帧区间与 SCENES / NARRATION 对齐
VO = [
    (42,   180,  '倪海厦学习天地，一页收齐天纪、人纪、地纪。'),
    (180,  360,  '想系统学，最难的不是听懂，是找齐。视频、讲义、顺序，散在各处。'),
    (360,  470,  '三大体系，十一部课程，全集完整收录。'),
    (470,  570,  '天纪天道，人纪医道，地纪未竟。'),
    (570,  780,  '天纪以易经为骨：天机道讲卦象推演，人间道讲进退取舍，地脉道落到山川形势。'),
    (780,  990,  '人纪从针灸入门，先建立经络地图；再由内经立医理，本草识药性。'),
    (990,  1200, '伤寒、金匮入经方之门，仲景心法讲看证定方，医案收在最后。'),
    (1200, 1410, '地纪只留片段与提纲，页面如实标注未竟，也给出一条不绕弯的学习顺序。'),
    (1410, 1510, '观看与讲义双入口，点开即播。'),
    (1510, 1620, '手机内原生播放，分集面板切换，打不开给链接。'),
    (1620, 1780, '一页索引，重走一遍传统之学的脉络。仅供研习参考。'),
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
        except Exception as exc:  # 微软 WebSocket 偶发 503，重试即可
            print(f'  retry {i + 1} #{attempt + 1}: {type(exc).__name__}: {exc}')
            await asyncio.sleep(1.2)
    raise RuntimeError(f'TTS 生成失败：第 {i + 1} 段')


async def synth_all() -> list:
    results = []
    for i, (_, _, text) in enumerate(VO):
        print(f'[TTS {i + 1:2d}/{len(VO)}] {text}')
        results.append(await synth_one(i, text))
    return results


def main() -> None:
    mp3s = asyncio.run(synth_all())
    total_samples = SR * (TOTAL_FRAMES // FPS) * 2
    track = array('h', [0]) * total_samples

    print('\n=== 段落对齐 ===')
    print(f'{"#":>2}  {"帧区间":>12}  {"可用":>6}  {"原时长":>7}  {"atempo":>7}  {"终时长":>7}  文案')
    warnings = []
    for i, (start_f, end_f, text) in enumerate(VO):
        seg = decode(mp3s[i], 1.0)
        raw_dur = len(seg) / SR
        avail = (end_f - start_f) / FPS - HEAD_PAD - TAIL_PAD

        atempo = 1.0
        if raw_dur > avail:
            atempo = min(raw_dur / avail, MAX_ATEMPO)
            seg = decode(mp3s[i], atempo)
        final_dur = len(seg) / SR
        if final_dur > avail + 0.05:
            warnings.append((i + 1, final_dur, avail, text))

        # 段落峰值归一，保证 12 段响度一致
        peak = max((abs(x) for x in seg), default=1)
        gain = PEAK / max(peak, 1)
        if abs(gain - 1) > 0.01:
            seg = array('h', (clamp16(int(x * gain)) for x in seg))

        start = int((start_f / FPS + HEAD_PAD) * SR)
        for j, v in enumerate(seg):
            idx = (start + j) * 2
            if idx + 1 >= len(track):
                break
            nv = clamp16(track[idx] + v)
            track[idx] = nv
            track[idx + 1] = nv

        print(f'{i + 1:2d}  {start_f:5d}-{end_f:<5d}  {avail:5.2f}s  {raw_dur:6.2f}s  '
              f'{atempo:7.3f}  {final_dur:6.2f}s  {text}')

    raw_wav = TMP / 'vo_raw.wav'
    with wave.open(str(raw_wav), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(track.tobytes())

    # 轻度提升平均响度 + 真峰值限幅：
    # 让人声清晰靠前，同时把峰值锁在 0.72（-2.9 dBFS），给 AAC 编码留足 headroom，
    # 避免成片出现贴 0 dBFS 的削波样本。
    subprocess.run([
        'ffmpeg', '-y', '-v', 'error', '-i', str(raw_wav),
        '-af', 'volume=3dB,alimiter=limit=0.72:level=disabled',
        '-c:a', 'pcm_s16le', '-ar', str(SR), '-ac', '2', str(OUT),
    ], check=True)

    print(f'\n=== 输出 ===\n{OUT}  {OUT.stat().st_size / 1024 / 1024:.2f} MB')
    if warnings:
        print('\n⚠ 以下段落超出可用时长，建议精简文案：')
        for n, dur, avail, text in warnings:
            print(f'  #{n} 需 {dur:.2f}s / 可用 {avail:.2f}s — {text}')
    else:
        print('全部段落均在帧区间内，无重叠、无截断。')


if __name__ == '__main__':
    main()
