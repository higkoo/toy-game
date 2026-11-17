#!/usr/bin/env python3
"""《深蓝信标》素材生成：纯 PIL + numpy，无第三方美术资源。
icon 512x512 PNG / poster 1280x720 JPEG —— 生物荧光深海风格。"""
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

random.seed(20261116)
ABYSS = (5, 18, 31); MID = (11, 43, 61)
CYAN = (79, 245, 216); MAGENTA = (255, 92, 138); AMBER = (255, 198, 107); FOAM = (223, 245, 240)


def glow_layer(size, cx, cy, r, color, power=2.2):
    """径向辉光层（RGBA），中心亮、边缘透明。"""
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / max(1, r)
    a = np.clip(1 - d, 0, 1) ** power
    arr = np.zeros((h, w, 4), dtype=np.uint8)
    arr[:, :, 0], arr[:, :, 1], arr[:, :, 2] = color
    arr[:, :, 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


def screen(base, layer):
    """滤色混合（辉光叠加）。"""
    return Image.blend(base, Image.alpha_composite(base.convert('RGBA'), layer).convert('RGB'), 0.92)


def sea_gradient(w, h):
    """深海垂直渐变 + 顶部微弱波光。"""
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        t = y / h
        # 上浅下深，但整体压暗
        c = (int(MID[0] * (1 - t * 0.72) + ABYSS[0] * t * 0.72),
             int(MID[1] * (1 - t * 0.72) + ABYSS[1] * t * 0.72),
             int(MID[2] * (1 - t * 0.72) + ABYSS[2] * t * 0.72))
        arr[y, :, :] = c
    img = Image.fromarray(arr, 'RGB')
    d = ImageDraw.Draw(img)
    # 顶部波光带
    for i in range(int(h * 0.06)):
        a = int(26 * (1 - i / (h * 0.06)))
        d.line([(0, i), (w, i)], fill=(MID[0] + a, MID[1] + a, MID[2] + a))
    return img


def draw_sub(d, cx, cy, s, glow=True):
    """低多边形深潜器剪影（侧视 3/4）。"""
    def poly(pts, fill, outline=None):
        d.polygon([(cx + x * s, cy + y * s) for x, y in pts], fill=fill, outline=outline)
    # 船体
    hull = [(-6, 0), (-4.4, -2.2), (2.6, -2.4), (5.4, -0.8), (5, 1.4), (-4.6, 1.8)]
    poly(hull, (198, 220, 214))
    # 腹部阴影
    poly([(-4.6, 1.8), (5, 1.4), (3.4, 2.6), (-3.6, 2.6)], (150, 180, 176))
    # 观察窗
    ox, oy, r = 0.2, -0.6, 1.9
    d.ellipse([cx + (ox - r) * s, cy + (oy - r) * s, cx + (ox + r) * s, cy + (oy + r) * s],
              fill=(42, 107, 128))
    d.ellipse([cx + (ox - r * 0.7) * s, cy + (oy - r * 0.7) * s,
               cx + (ox + r * 0.7) * s, cy + (oy + r * 0.7) * s],
              fill=(90, 190, 205))
    d.ellipse([cx + (ox - r * 0.3) * s, cy + (oy - r * 0.55) * s,
               cx + (ox + r * 0.2) * s, cy + (oy - r * 0.05) * s],
              fill=(180, 235, 235))
    # 窗框
    d.arc([cx + (ox - r * 1.15) * s, cy + (oy - r * 1.15) * s,
           cx + (ox + r * 1.15) * s, cy + (oy + r * 1.15) * s],
          0, 360, fill=(51, 85, 95), width=max(1, int(0.3 * s)))
    # 尾翼
    poly([(4.2, -2.2), (6.6, -4.2), (6.2, -1.4)], (184, 207, 201))
    poly([(4.4, 1.6), (6.4, 3.4), (6, 1.2)], (184, 207, 201))
    # 推进器辉光
    if glow:
        for ty in [-1.2, 1.1]:
            d.ellipse([cx + 5.6 * s, cy + (ty - 0.6) * s, cx + 7.0 * s, cy + (ty + 0.6) * s], fill=CYAN)
    # 顶部信号灯
    d.ellipse([cx - 0.4 * s, cy - 3.0 * s, cx + 0.4 * s, cy - 2.2 * s], fill=AMBER)


def draw_beacon(img, cx, base_y, s, lit=True):
    d = ImageDraw.Draw(img)
    """远古灯塔：分层石塔 + 灯室 + 光柱。"""
    def poly(pts, fill):
        d.polygon([(cx + x * s, base_y + y * s) for x, y in pts], fill=fill)
    # 塔身 5 层，逐层收窄
    for i in range(5):
        w = 3.2 - i * 0.32
        top = -(i + 1) * 3.0
        bot = -i * 3.0
        poly([(-w, bot), (w, bot), (w - 0.3, top), (-w + 0.3, top)], (42, 66, 80))
        # 荧光纹
        band = AMBER if lit else (40, 60, 70)
        d.line([(cx - w * s, base_y + (bot - 0.4) * s), (cx + w * s, base_y + (bot - 0.4) * s)],
               fill=band, width=max(1, int(0.22 * s)))
    # 灯室
    ly = base_y - 16 * s
    d.ellipse([cx - 1.7 * s, ly - 1.7 * s, cx + 1.7 * s, ly + 1.7 * s],
              fill=AMBER if lit else (35, 55, 65))
    if lit:
        # 向上光柱：画在独立图层再高斯模糊，避免分段色块
        beam = Image.new('RGBA', img.size, (0, 0, 0, 0))
        bd = ImageDraw.Draw(beam)
        for k in range(60):
            t = k / 60
            y0 = ly - t * 62 * s
            y1 = ly - (t + 1 / 60) * 62 * s
            w0 = 0.8 * s + t * 5.5 * s
            w1 = 0.8 * s + (t + 1 / 60) * 5.5 * s
            a = int(200 * (1 - t) ** 1.5)
            bd.polygon([(cx - w0, y0), (cx + w0, y0), (cx + w1, y1), (cx - w1, y1)],
                       fill=(255, 198, 107, a))
        beam = beam.filter(ImageFilter.GaussianBlur(max(2, int(1.2 * s))))
        blended = Image.alpha_composite(img.convert('RGBA'), beam).convert('RGB')
        img.paste(blended, (0, 0))
        d = ImageDraw.Draw(img)


def draw_jelly(d, cx, cy, s, color, alpha=200):
    """水母：半球伞盖 + 触须。"""
    c = (*color, alpha)
    d.pieslice([cx - 2 * s, cy - 1.6 * s, cx + 2 * s, cy + 1.4 * s], 180, 360, fill=color)
    d.arc([cx - 2 * s, cy - 0.4 * s, cx + 2 * s, cy + 1.4 * s], 0, 180, fill=color, width=max(1, int(0.18 * s)))
    for i in range(5):
        x = cx + (i - 2) * 0.7 * s
        d.line([(x, cy + 0.6 * s), (x - 0.3 * s, cy + 3.4 * s)], fill=color, width=max(1, int(0.12 * s)))


def make_icon():
    w = h = 512
    img = sea_gradient(w, h)
    # 中央灯塔
    glow = glow_layer((w, h), w * 0.5, h * 0.30, 190, AMBER, 1.8)
    img = screen(img, glow)
    d = ImageDraw.Draw(img)
    draw_beacon(img, w * 0.5, h * 0.78, 13, lit=True)
    # 潜航器
    glow2 = glow_layer((w, h), w * 0.34, h * 0.72, 95, CYAN, 2.0)
    img = screen(img, glow2)
    d = ImageDraw.Draw(img)
    draw_sub(d, w * 0.34, h * 0.72, 11)
    # 光囊点缀
    for x, y, col in [(0.78, 0.42, CYAN), (0.84, 0.60, CYAN), (0.70, 0.68, CYAN), (0.22, 0.42, MAGENTA)]:
        g = glow_layer((w, h), w * x, h * y, 40, col, 2.0)
        img = screen(img, g)
        d = ImageDraw.Draw(img)
        r = 4
        d.ellipse([w * x - r, h * y - r, w * x + r, h * y + r], fill=col)
    # 浮游粒子
    d = ImageDraw.Draw(img)
    for _ in range(120):
        x, y = random.uniform(0, w), random.uniform(0, h)
        v = random.randint(60, 150)
        d.point((x, y), fill=(v // 2, v, v))
    # 暗角
    arr = np.asarray(img.convert('RGB')).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    d2 = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    vig = np.clip(1 - np.clip(d2 - 0.55, 0, 1) * 0.6, 0, 1)
    arr = (arr * vig[:, :, None]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(arr, 'RGB')
    img.save('/tmp/abyss-icon.png')
    print('icon ok', img.size)


def make_poster():
    w, h = 1280, 720
    img = sea_gradient(w, h)
    # 灯塔辉光（偏右）
    glow = glow_layer((w, h), w * 0.74, h * 0.28, 240, AMBER, 1.7)
    img = screen(img, glow)
    d = ImageDraw.Draw(img)
    draw_beacon(img, w * 0.74, h * 0.74, 15, lit=True)
    # 潜航器（偏左下）
    glow2 = glow_layer((w, h), w * 0.32, h * 0.62, 150, CYAN, 2.0)
    img = screen(img, glow2)
    d = ImageDraw.Draw(img)
    draw_sub(d, w * 0.32, h * 0.62, 15)
    # 水母群
    for x, y, s, col in [(0.52, 0.32, 7, CYAN), (0.60, 0.46, 5, MAGENTA),
                         (0.18, 0.38, 6, CYAN), (0.88, 0.56, 5, CYAN)]:
        g = glow_layer((w, h), w * x, h * y, 52, col, 2.0)
        img = screen(img, g)
        d = ImageDraw.Draw(img)
        draw_jelly(d, w * x, h * y, s, col)
    # 光囊点
    for x, y in [(0.45, 0.66), (0.58, 0.58), (0.66, 0.72), (0.24, 0.70), (0.82, 0.44)]:
        g = glow_layer((w, h), w * x, h * y, 34, CYAN, 2.0)
        img = screen(img, g)
        d = ImageDraw.Draw(img)
        d.ellipse([w * x - 4, h * y - 4, w * x + 4, h * y + 4], fill=CYAN)
    # 浮游粒子
    d = ImageDraw.Draw(img)
    for _ in range(260):
        x, y = random.uniform(0, w), random.uniform(0, h)
        v = random.randint(50, 130)
        d.point((x, y), fill=(v // 2, v, v))
    # 标题文字（无衬线粗体，拉字距）
    try:
        font_big = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 60)
        font_sm = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 20)
    except Exception:
        font_big = font_sm = None
    if font_big:
        d.text((64, 72), 'A B Y S S   B E A C O N', font=font_big, fill=FOAM)
        d.text((68, 146), '深蓝信标  ·  让航路从迷雾里重新显形', font=font_sm, fill=(160, 220, 215))
    # 暗角
    arr = np.asarray(img.convert('RGB')).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    d2 = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    vig = np.clip(1 - np.clip(d2 - 0.6, 0, 1) * 0.55, 0, 1)
    arr = (arr * vig[:, :, None]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(arr, 'RGB')
    img.save('/tmp/abyss-poster.jpg', 'JPEG', quality=88, optimize=True)
    print('poster ok', img.size)


from PIL import ImageFont
make_icon()
make_poster()
