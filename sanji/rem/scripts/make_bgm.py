#!/usr/bin/env python3
"""
《倪海厦学习天地》60 秒解说视频 BGM 生成器

零版权风险：全部音频由 numpy 程序化合成，不使用任何第三方素材。
音色设计：古琴/古筝式拨弦（五声音阶）+ 低频持续音 + 极轻的气声铺底，
         场景切点处加一记很轻的磬音，配合宣纸金墨的画面气质。

运行： python3 scripts/make_bgm.py
输出： public/bgm.wav  (44.1kHz / 16bit / stereo / 60.0s)
"""
import os
import wave
import numpy as np

SR = 44100
DURATION = 60.0
N = int(SR * DURATION)
t = np.arange(N, dtype=np.float64) / SR

# 五声音阶：宫 商 角 徵 羽（C D E G A），横跨两个八度
PENTA = {
    "C3": 130.81, "D3": 146.83, "E3": 164.81, "G3": 196.00, "A3": 220.00,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "G4": 392.00, "A4": 440.00,
    "C5": 523.25, "D5": 587.33, "E5": 659.25, "G5": 783.99, "A5": 880.00,
}

# 主旋律：每 1.5 秒一音，四句起承转合，句末留白
PHRASES = [
    ["C4", "E4", "G4", "A4", "G4", "E4", "D4", "C4"],
    ["G4", "A4", "C5", "A4", "G4", "E4", "G4", "D4"],
    ["E4", "G4", "A4", "C5", "D5", "C5", "A4", "G4"],
    ["A4", "G4", "E4", "D4", "C4", "D4", "E4", "C4"],
]
MELODY = [n for phrase in PHRASES for n in phrase]  # 32 音 × 1.5s = 48s，末尾留 12s 收束


def pluck(freq: float, start: float, dur: float = 2.6, amp: float = 0.16) -> np.ndarray:
    """拨弦：基频 + 泛音列 + 指数衰减包络 + 极轻微失谐"""
    i0 = int(start * SR)
    length = min(int(dur * SR), N - i0)
    if length <= 0:
        return np.zeros(0)
    tt = np.arange(length) / SR
    env = (1 - np.exp(-70 * tt)) * np.exp(-2.9 * tt / dur)
    w = (
        np.sin(2 * np.pi * freq * tt)
        + 0.42 * np.sin(2 * np.pi * freq * 2 * tt)
        + 0.19 * np.sin(2 * np.pi * freq * 3 * tt)
        + 0.09 * np.sin(2 * np.pi * freq * 4.01 * tt)
        + 0.07 * np.sin(2 * np.pi * freq * 1.003 * tt)
    )
    return amp * env * w


def chime(freq: float, start: float, dur: float = 2.0, amp: float = 0.05) -> np.ndarray:
    """磬音：高频长衰减，只用在场景切点"""
    i0 = int(start * SR)
    length = min(int(dur * SR), N - i0)
    if length <= 0:
        return np.zeros(0)
    tt = np.arange(length) / SR
    env = (1 - np.exp(-30 * tt)) * np.exp(-2.2 * tt / dur)
    w = (np.sin(2 * np.pi * freq * tt)
         + 0.3 * np.sin(2 * np.pi * freq * 2.76 * tt)
         + 0.12 * np.sin(2 * np.pi * freq * 5.4 * tt))
    return amp * env * w


mix = np.zeros(N, dtype=np.float64)

# 1) 拨弦主旋律
for i, note in enumerate(MELODY):
    start = 1.0 + i * 1.5
    if start >= DURATION - 1:
        break
    amp = 0.155 if i % 4 == 0 else 0.115
    seg = pluck(PENTA[note], start, amp=amp)
    mix[int(start * SR):int(start * SR) + len(seg)] += seg
    # 每隔一句补一个低八度根音，托住和声
    if i % 8 == 0:
        bass_note = {"C4": "C3", "G4": "G3", "E4": "E3", "A4": "A3"}.get(note, "C3")
        bseg = pluck(PENTA[bass_note], start, dur=3.8, amp=0.075)
        mix[int(start * SR):int(start * SR) + len(bseg)] += bseg

# 2) 低频持续铺底（缓慢呼吸感）
lfo = 0.72 + 0.28 * np.sin(2 * np.pi * 0.055 * t)
pad = 0.038 * lfo * (
    np.sin(2 * np.pi * PENTA["C3"] * t)
    + 0.46 * np.sin(2 * np.pi * PENTA["G3"] * t)
    + 0.16 * np.sin(2 * np.pi * PENTA["E3"] * t)
)
mix += pad

# 3) 气声铺底：FFT 低通白噪声，模拟宣纸/空间的空气感
rng = np.random.default_rng(20261104)
noise = rng.normal(0, 1, N)
spec = np.fft.rfft(noise)
freqs = np.fft.rfftfreq(N, 1 / SR)
spec[freqs > 320] = 0
air = np.fft.irfft(spec, N)
air /= max(1e-9, np.max(np.abs(air)))
mix += 0.020 * air * (0.6 + 0.4 * np.sin(2 * np.pi * 0.03 * t + 0.8))

# 4) 场景切点轻磬（对应分镜的 9 个场景起点，跳过开场）
scene_starts = [6, 12, 19, 26, 33, 40, 47, 54]
for k, s in enumerate(scene_starts):
    seg = chime(PENTA[["G5", "E5", "D5", "C5"][k % 4]], s, amp=0.032)
    mix[int(s * SR):int(s * SR) + len(seg)] += seg

# 5) 收束：最后 6 秒只留一声长音 + 铺底渐隐
tail = chime(PENTA["C4"], 54.2, dur=5.0, amp=0.055)
mix[int(54.2 * SR):int(54.2 * SR) + len(tail)] += tail

# 6) 整体包络：2s 淡入 / 3s 淡出
fade_in = np.clip(t / 2.0, 0, 1)
fade_out = np.clip((DURATION - t) / 3.0, 0, 1)
mix *= fade_in * fade_out

# 归一到舒适峰值（约 -3 dBFS），再做软限幅防削波（保持峰值不被削弱）
peak = np.max(np.abs(mix))
mix = mix / max(peak, 1e-9) * 0.70
mix = 0.70 * np.tanh(mix / 0.70 * 1.15) / np.tanh(1.15)

# 立体声：右声道加 12ms 延迟 + 轻微电平差，拉开空间感（不做强分离）
delay = int(0.012 * SR)
right = np.concatenate([np.zeros(delay), mix[:-delay]]) * 0.94
left = mix

stereo = np.stack([left, right], axis=1)
pcm = (np.clip(stereo, -1, 1) * 32767).astype(np.int16)

out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "bgm.wav")
with wave.open(out_path, "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(pcm.tobytes())

print(f"BGM 生成完成: {out_path}")
print(f"时长 {DURATION:.1f}s / {SR}Hz / 16bit / stereo / {os.path.getsize(out_path) / 1024 / 1024:.2f} MB")
