#!/usr/bin/env python3
"""生成宣纸颗粒噪点贴图（静态 PNG，避免每帧重算 SVG filter，提升渲染速度）"""
import os
from PIL import Image
import numpy as np

SIZE = 256
rng = np.random.default_rng(20261104)
# 灰度噪点 + 轻微低频云斑，做成可平铺的颗粒
noise = rng.normal(128, 26, (SIZE, SIZE)).astype(np.float32)
y, x = np.mgrid[0:SIZE, 0:SIZE]
cloud = 12 * np.sin(2 * np.pi * x / 190) * np.cos(2 * np.pi * y / 210)
g = np.clip(noise + cloud, 0, 255).astype(np.uint8)
rgb = np.stack([g, g, g], axis=-1)

out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
os.makedirs(out_dir, exist_ok=True)
path = os.path.join(out_dir, "grain.png")
Image.fromarray(rgb, "RGB").save(path, optimize=True)
print(f"grain.png 生成完成: {path} ({os.path.getsize(path)} bytes)")
