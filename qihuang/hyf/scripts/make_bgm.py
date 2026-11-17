#!/usr/bin/env python3
"""《倪海厦学习天地》60s 程序化 BGM 生成器。

纯 numpy 离线合成：五声音阶古琴拨弦 + 低频铺底 + 磬/节点音 + 箫长线条。
对应 BGM.md 的五段情绪曲线与切点表。无第三方素材、无网络请求、无版权风险。
固定随机种子，输出可复现；确定性只在离线生成阶段，composition 运行时不含随机逻辑。

用法: /usr/bin/python3 scripts/make_bgm.py
输出: assets/bgm.wav (60.000s / 48kHz / stereo / 16-bit PCM)
"""
import math
import pathlib
import wave

import numpy as np

SR = 48000
DUR = 60.0
N = int(SR * DUR)
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "bgm.wav"

rng = np.random.default_rng(20261105)  # 固定种子：可复现，不是渲染期随机
L = np.zeros(N, dtype=np.float64)
R = np.zeros(N, dtype=np.float64)


def place(t, sig, gain=1.0, pan=0.0):
    """把一段信号按绝对秒放到立体声总线上（等功率 pan）。"""
    i = int(round(t * SR))
    j = min(N, i + len(sig))
    if i >= N or j <= i:
        return
    s = sig[: j - i] * gain
    p = max(-1.0, min(1.0, pan))
    a = math.sqrt((1 - p) / 2) * math.sqrt(2)
    b = math.sqrt((1 + p) / 2) * math.sqrt(2)
    L[i:j] += s * a
    R[i:j] += s * b


def pluck(f, dur=2.4, tau=1.05, amp=1.0):
    """古琴拨弦：基频 + 泛音列 + 指数衰减 + 极短起拨噪声。"""
    t = np.arange(int(SR * dur)) / SR
    env = (1 - np.exp(-t / 0.003)) * np.exp(-t / tau)
    s = np.zeros_like(t)
    for k, a in enumerate([1, .44, .24, .13, .07, .035], start=1):
        s += a * np.sin(2 * np.pi * f * k * t + .31 * k) * np.exp(-t / (tau / (1 + .22 * (k - 1))))
    s += .05 * rng.standard_normal(len(t)) * np.exp(-t / 0.018)
    s *= env
    return s / (np.max(np.abs(s)) + 1e-9) * amp


def glide(f0, f1, dur=1.0, amp=1.0):
    """音高下滑（F03 进度条倒退）。"""
    t = np.arange(int(SR * dur)) / SR
    f = f0 + (f1 - f0) * t / dur
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return s * np.exp(-t / .45) * amp


def bell(f, dur=1.3, amp=1.0):
    """磬：非谐泛音比，短衰减。"""
    t = np.arange(int(SR * dur)) / SR
    s = np.zeros_like(t)
    for r, a in zip([1, 2.76, 5.40, 8.93], [1, .5, .28, .13]):
        s += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (.42 / (1 + .5 * (r - 1))))
    s *= (1 - np.exp(-t / .002))
    return s / (np.max(np.abs(s)) + 1e-9) * amp


def drone(f, dur, amp=1.0):
    """低频持续铺底 + 缓慢起伏 + 首尾淡变。"""
    t = np.arange(int(SR * dur)) / SR
    s = np.sin(2 * np.pi * f * t) + .42 * np.sin(2 * np.pi * f * 2 * t) + .20 * np.sin(2 * np.pi * f * .5 * t)
    s *= .82 + .18 * np.sin(2 * np.pi * .13 * t)
    fi, fo = int(SR * .8), int(SR * 1.0)
    s[:fi] *= np.linspace(0, 1, fi)
    s[-fo:] *= np.linspace(1, 0, fo)
    return s / 3 * amp


def air(dur, amp=1.0):
    """极轻气声/纸张摩擦：FFT 低通白噪声。"""
    n = rng.standard_normal(int(SR * dur))
    F = np.fft.rfft(n)
    fr = np.fft.rfftfreq(len(n), 1 / SR)
    F *= np.where(fr < 350, 1.0, .05)
    y = np.fft.irfft(F, len(n))
    t = np.arange(len(n)) / SR
    y *= (1 - np.exp(-t / .5)) * np.exp(-t / (dur / 2.2))
    return y / (np.max(np.abs(y)) + 1e-9) * amp


def xiao(f, dur, amp=1.0):
    """箫：长线条 + 轻揉音 + 首尾渐入渐出。"""
    t = np.arange(int(SR * dur)) / SR
    vib = 1 + .0035 * np.sin(2 * np.pi * 4.7 * t)
    s = np.sin(2 * np.pi * f * vib * t) + .22 * np.sin(2 * np.pi * f * 2 * vib * t) + .06 * np.sin(2 * np.pi * f * 3 * vib * t)
    fi, fo = int(SR * .35), int(SR * .55)
    e = np.ones_like(t)
    e[:fi] = np.linspace(0, 1, fi)
    e[-fo:] = np.linspace(1, 0, fo)
    return s * e / 1.28 * amp


# 宫调式五声音阶（C 宫）
GONG, SHANG, JUE, ZHI, YU = 261.63, 293.66, 329.63, 392.00, 440.00
G2, S2, J2, Z2, Y2 = 523.25, 587.33, 659.25, 783.99, 880.00
BIAN, QING = 246.94, 349.23  # 变宫 / 清角：Pain 段的临时不稳音

# ---- Hook 0–3s：悬置留白，1.6s 一记泛音 ----
place(1.6, pluck(G2, 2.0, .75), .30, -.15)
place(1.65, air(1.8), .022)

# ---- Pain 3–11s：低频铺底 + 稀疏不协和拨弦，不成旋律 ----
place(3.0, drone(82.41, 8.2), .16)
place(3.0, air(8.2), .020)
for t, f, g in [(3.5, BIAN, .15), (5.1, QING, .13), (6.7, BIAN / 2, .12), (8.2, QING / 2, .11)]:
    place(t, pluck(f, 1.8, .55), g, -.1 if t < 6 else .1)
place(6.0, glide(440, 300, .9), .055)   # F03 进度倒退
place(8.5, bell(Y2, .7), .035)          # F04 空转结果区

# ---- Solution 11–46s：宫调式主题首次完整呈现 + 9 个节点音 ----
theme = [GONG, JUE, ZHI, YU, G2, ZHI, JUE, SHANG, GONG, JUE, ZHI, Y2, Z2, J2, ZHI, JUE, SHANG]
for i, f in enumerate(theme):
    place(11.0 + i * 2.0, pluck(f, 2.6, 1.15), .17, -.12 if i % 2 == 0 else .12)
for t in [11, 15, 19, 23, 27, 31, 34, 38, 42]:  # F05–F13 切点
    place(float(t), bell(G2, 1.0), .055)
for t, f, d in [(20.0, ZHI, 4.0), (26.0, YU, 4.0), (33.0, G2, 5.0), (40.0, Z2, 5.0)]:
    place(t, xiao(f, d), .075, .1)       # 20s 起箫进入
place(11.0, drone(82.41, 35.0), .085)
place(11.0, air(35.0), .012)

# ---- Result 46–56s：旋律放宽、音符时值加倍 ----
for t, f in [(46.0, GONG), (49.3, JUE), (52.6, ZHI)]:
    place(t, pluck(f, 4.2, 2.0), .16, -.08)
place(46.0, xiao(GONG, 9.5), .06)
place(53.0, bell(Z2, 1.4), .075)        # F16 连线收束

# ---- CTA 56–60s：单磬 + 长音衰减，末 0.4s 留白 ----
place(56.0, bell(GONG, 2.6), .10)
place(56.0, drone(130.81, 4.0), .10)
place(56.0, air(4.0), .016)

# ---- 整体包络 + 归一化到 -3 dBFS ----
env = np.ones(N)
env[:int(1.6 * SR)] = 0.0
fi = int(SR * .4)
env[int(1.6 * SR):int(1.6 * SR) + fi] = np.linspace(0, 1, fi)
fo = int((60 - 57.0) * SR)
env[int(57.0 * SR):] = np.linspace(1, 0, fo)
L *= env
R *= env
peak = max(np.max(np.abs(L)), np.max(np.abs(R)), 1e-9)
scale = (10 ** (-3 / 20)) / peak
L *= scale
R *= scale

pcm = (np.clip(np.stack([L, R], axis=1), -1, 1) * 32767).astype(np.int16)
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

rms = 20 * math.log10(math.sqrt(np.mean(np.concatenate([L, R]) ** 2)) + 1e-9)
print(f"written {OUT}  {DUR:.3f}s / {SR}Hz / stereo / 16-bit")
print(f"peak {20*math.log10(peak*scale+1e-9):.2f} dBFS  rms {rms:.2f} dBFS  clipping_samples=0")
