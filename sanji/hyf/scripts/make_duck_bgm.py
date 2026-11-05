#!/usr/bin/env python3
"""生成已做 ducking 的 BGM 轨：VO 一出声，BGM 自动让位。

为什么自己算包络而不用 ffmpeg sidechaincompress：
    实测 sidechaincompress(threshold=0.02, ratio=8) 在本工程只把语音段的 BGM
    压低约 1.5 dB，远达不到「人声下 BGM 低 12–15 dB」的目标（见 BGM.md §5），
    原因是其压缩量取决于输入超过 threshold 的部分，对已经接近满幅的母带 VO
    反而只在峰值处起作用。改为自己算 VO 包络 → 目标增益 → 平滑 → 相乘，
    衰减量完全由我们指定，可复现、可解释。

算法：
    1. 10 ms 窗 / 5 ms 跳步 计算 VO 的短时 RMS（dBFS）
    2. 二值化门限 VO_FLOOR_DB：高于门限视为「有人在说话」
    3. 目标增益：有声段 DUCK_DB（默认 -13 dB），无声段 0 dB
    4. 平滑：attack 15 ms（快速让位）/ release 300 ms（缓慢回升，听感不突兀）
    5. 线性插值回采样点，与原 BGM 相乘

用法：python3 scripts/make_duck_bgm.py
"""
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BGM = ROOT / 'assets' / 'bgm.wav'
VO = ROOT / 'assets' / 'vo-master.wav'
OUT = ROOT / 'assets' / 'bgm-ducked.wav'

SR = 48000
FRAME_MS = 10.0          # 分析窗长
HOP_MS = 5.0             # 跳步
VO_FLOOR_DB = -45.0      # 低于此电平视为无声
DUCK_DB = -14.0          # 有声时 BGM 的衰减量（相对原轨）
ATTACK_MS = 15.0         # 让位速度
RELEASE_MS = 250.0       # 回升速度
TARGET_SECONDS = 60.0


def read_wav(path: Path) -> np.ndarray:
    """读 wav → (samples, channels) float32，均值成单声道。"""
    with wave.open(str(path)) as w:
        if w.getsampwidth() != 2:
            raise SystemExit(f'{path} 不是 16bit PCM')
        sr = w.getframerate()
        if sr != SR:
            raise SystemExit(f'{path} 采样率 {sr} != {SR}')
        n = w.getnframes()
        ch = w.getnchannels()
        a = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
    return a.reshape(-1, ch).mean(axis=1)


def write_wav(path: Path, mono: np.ndarray) -> None:
    """写 16bit PCM 双声道 wav。"""
    st = np.clip(mono, -1.0, 1.0)
    inter = np.repeat(st, 2)
    pcm = (inter * 32767.0).astype(np.int16)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def envelope_db(x: np.ndarray) -> np.ndarray:
    """短时 RMS 包络（dBFS），每 hop 一个值。"""
    frame = int(SR * FRAME_MS / 1000)
    hop = int(SR * HOP_MS / 1000)
    n = max(1, (len(x) - frame) // hop + 1)
    rms = np.empty(n, dtype=np.float64)
    for i in range(n):
        seg = x[i * hop: i * hop + frame]
        rms[i] = np.sqrt(np.mean(seg * seg) + 1e-20)
    return 20.0 * np.log10(rms)


def smooth_gain(active: np.ndarray, hop: int) -> np.ndarray:
    """把门限序列平滑成连续衰减量曲线。

    返回值 g：1.0 = 完全让位（BGM 被压到 target_gain），0.0 = 完全放开。
    有人声出现时必须**快速**下压（attack），人声结束后**缓慢**回升（release），
    否则会出现「有人声时音乐反而涨上来」的反向问题。
    """
    a_att = max(1, int(SR * ATTACK_MS / 1000 / hop))
    a_rel = max(1, int(SR * RELEASE_MS / 1000 / hop))
    g = np.zeros(len(active), dtype=np.float64)
    cur = 0.0
    for i, on in enumerate(active):
        target = 1.0 if on else 0.0
        if target > cur:
            # 让位：快（attack）
            cur = min(target, cur + 1.0 / a_att)
        else:
            # 回升：慢（release）
            cur = max(target, cur - 1.0 / a_rel)
        g[i] = cur
    return g


def main() -> None:
    for p in (BGM, VO):
        if not p.exists():
            raise SystemExit(f'缺少 {p}')

    bgm = read_wav(BGM)
    vo = read_wav(VO)
    n = int(SR * TARGET_SECONDS)
    if len(bgm) < n:
        bgm = np.pad(bgm, (0, n - len(bgm)))
    bgm = bgm[:n]
    if len(vo) < n:
        vo = np.pad(vo, (0, n - len(vo)))
    vo = vo[:n]

    env = envelope_db(vo)
    hop = int(SR * HOP_MS / 1000)
    active = env > VO_FLOOR_DB
    g = smooth_gain(active, hop)

    # 目标增益：g=1（有人声）→ target_gain；g=0（无人声）→ 1.0
    target_gain = 10.0 ** (DUCK_DB / 20.0)
    frame_gain = 1.0 - g * (1.0 - target_gain)

    # 帧级增益曲线插值回采样点
    xp = np.arange(len(frame_gain)) * hop
    gain = np.interp(np.arange(n), xp, frame_gain)

    out = bgm * gain
    write_wav(OUT, out)

    # 报告：语音段与间隙的 BGM 电平对比
    def rms_db(seg):
        return 20 * np.log10(np.sqrt(np.mean(seg * seg) + 1e-20) + 1e-20)

    on_db = [rms_db(out[int(a * SR):int(b * SR)])
             for a, b in [(s, e) for s, e, on in
                          [(0, 6, True), (11, 15, True), (23, 31, True), (46, 50, True)]
                          if on]]
    off_db = [rms_db(out[int(a * SR):int(b * SR)])
              for a, b in [(1.0, 2.0), (30.2, 30.9), (45.2, 45.9)]]
    src_on = rms_db(bgm[int(23 * SR):int(31 * SR)])
    dst_on = rms_db(out[int(23 * SR):int(31 * SR)])
    print(f'写出 {OUT}（{OUT.stat().st_size / 1024 / 1024:.2f} MB，'
          f'{len(out) / SR:.3f}s）')
    print(f'语音段 BGM 平均 {np.mean(on_db):.1f} dB（原 {src_on:.1f} dB，'
          f'降 {src_on - np.mean(on_db):.1f} dB）')
    print(f'间隙 BGM 平均 {np.mean(off_db):.1f} dB')


if __name__ == '__main__':
    main()
