# -*- coding: utf-8 -*-
"""《海风竞速》Toy 素材：icon 512x512 / poster 1280x720。

视觉主张 —— 「落日下的冲刺」。
和游戏内一致：暖金落日占满画面上半部（#ffb547），路面是深蓝沥青，
两侧红白路肩条（#ff5a6e / #f4f6fb）向消失点收束，一辆暖金低多边形赛车
压着路肩切弯。海只用一小条深青（#3fd0c9）做冷色对位。

字体：窄体斜体近似赛车涂装字体；中文用 Noto Sans CJK Bold。
"""
import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

random.seed(8801)

FD = '/usr/share/fonts/opentype/urw-base35/NimbusSansNarrow-BoldOblique.otf'
FD_R = '/usr/share/fonts/opentype/urw-base35/NimbusSansNarrow-Regular.otf'
FD_B = '/usr/share/fonts/opentype/urw-base35/NimbusSansNarrow-Bold.otf'
CJKB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
CJKR = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
MONO = '/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf'

SUN = (255, 181, 71)
SUN_SOFT = (255, 215, 154)
SEA = (63, 208, 201)
DEEP = (22, 35, 61)
DEEP2 = (13, 22, 38)
ROAD = (58, 64, 85)
SAND = (240, 217, 181)
INK = (244, 246, 251)
RED = (255, 90, 110)
MUTED = (154, 163, 174)


def font(path, size):
    return ImageFont.truetype(path, size)


def vgrad(w, h, top, bottom):
    g = Image.new('RGB', (1, h))
    d = ImageDraw.Draw(g)
    for y in range(h):
        t = y / max(1, h - 1)
        d.point((0, y), fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g.resize((w, h), Image.BILINEAR)


def radial_mask(w, h, cx, cy, r, strength=1.0, power=2.1):
    layer = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(layer)
    steps = 64
    for i in range(steps, 0, -1):
        t = i / steps
        rr = r * t
        a = int(255 * (1 - t) ** power * strength)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=a)
    return layer.filter(ImageFilter.GaussianBlur(max(1, r * 0.09)))


def screen(base, color, mask):
    w, h = base.size
    out = base.copy()
    pb, pm, po = base.load(), mask.load(), out.load()
    cr, cg, cb = color
    for y in range(h):
        for x in range(w):
            a = pm[x, y]
            if not a:
                continue
            k = a / 255.0
            br, bg, bb = pb[x, y]
            po[x, y] = (min(255, int(br + cr * k)), min(255, int(bg + cg * k)),
                        min(255, int(bb + cb * k)))
    return out


def grain(img, amount=6):
    w, h = img.size
    n = Image.new('L', (w, h))
    n.putdata([random.randint(128 - amount * 4, 128 + amount * 4) for _ in range(w * h)])
    n = n.filter(ImageFilter.GaussianBlur(0.4))
    noise = Image.merge('RGB', (n, n, n))
    return Image.blend(img, Image.blend(img, noise, 0.5), 0.09)


def vignette(img, strength=0.5):
    """标准径向渐晕：中心不动，四角按平滑曲线压暗。numpy 向量化。"""
    import numpy as np
    w, h = img.size
    yy, xx = np.mgrid[0:h, 0:w]
    dx = (xx - w / 2) / (w / 2)
    dy = (yy - h / 2) / (h / 2)
    dist = np.sqrt(dx * dx + dy * dy) / np.sqrt(2)   # 0 中心 → 1 四角
    k = (strength * dist ** 2.2)[..., None]
    arr = np.asarray(img, dtype=np.float32) * (1 - k)
    return Image.fromarray(arr.astype('uint8'), 'RGB')


def sky_scene(w, h, horizon=0.46, road_half=0.36, curve=0.16):
    """落日 + 蜿蜒的海岸公路（弯道向右偏）。返回 RGB 图。"""
    hy = int(h * horizon)
    img = Image.new('RGB', (w, h), DEEP2)
    d = ImageDraw.Draw(img)

    # 天空：三段渐变（天顶蓝紫 → 中段玫瑰 → 地平线暖金）
    for y in range(hy):
        t = y / max(1, hy)
        if t < 0.55:
            k = t / 0.55
            c = (int(40 + 96 * k), int(52 + 34 * k), int(96 - 26 * k))
        else:
            k = (t - 0.55) / 0.45
            c = (int(136 + 119 * k ** 1.3), int(86 + 95 * k ** 1.1), int(70 + 1 * k))
        d.line([(0, y), (w, y)], fill=c)

    # 远处海面：地平线上一条深青细带
    sea_h = int(h * 0.038)
    for i in range(sea_h):
        t = i / sea_h
        d.line([(0, hy - sea_h + i), (w, hy - sea_h + i)],
               fill=(int(22 - 6 * t), int(58 - 18 * t), int(68 - 20 * t)))
    for i in range(90):
        x = random.uniform(0, w)
        y = hy - sea_h + random.uniform(0, sea_h)
        ww = random.uniform(3, 14)
        d.line([(x, y), (x + ww, y)], fill=(110, 190, 184), width=1)

    # 落日圆盘 + 辉光（画在海面带之后：圆盘底沿自然压在地平线上，不被海面横切）
    # 落日落在路的消失点上方：它既是光源也是构图焦点
    sun_x = w * 0.40
    sun_y = hy - h * 0.088   # 圆盘底沿正好切在地平线上（sr = h*0.088）
    sr = h * 0.088
    img = screen(img, (196, 106, 24), radial_mask(w, h, sun_x, sun_y, sr * 1.9, 0.42, 3.4))
    img = screen(img, (255, 206, 120), radial_mask(w, h, sun_x, sun_y, sr * 1.05, 0.72, 3.0))
    d = ImageDraw.Draw(img)
    # 落日本体：中心亮黄 → 边缘橙
    sun_grad = Image.new('RGB', (int(sr * 2), int(sr * 2)))
    sg = ImageDraw.Draw(sun_grad)
    for i in range(int(sr)):
        t = i / max(1, int(sr))
        c = (int(255 - 4 * t), int(246 - 52 * t), int(214 - 116 * t))
        sg.ellipse([int(sr) - i, int(sr) - i, int(sr) + i, int(sr) + i], fill=c)
    sun_mask = Image.new('L', (int(sr * 2), int(sr * 2)), 0)
    ImageDraw.Draw(sun_mask).ellipse([0, 0, int(sr * 2) - 1, int(sr * 2) - 1], fill=255)
    img.paste(sun_grad, (int(sun_x - sr), int(sun_y - sr)), sun_mask)
    d = ImageDraw.Draw(img)
    # 海面上的落日倒影：一条竖向光柱
    refl = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    rd = ImageDraw.Draw(refl)
    for i in range(int(h * 0.11)):
        t = i / (h * 0.11)
        y = hy + i
        ww = sr * (0.16 + t * 0.55)
        a = int(180 * (1 - t) ** 1.5)
        rd.ellipse([sun_x - ww, y - h * 0.006, sun_x + ww, y + h * 0.006],
                   fill=(255, 196, 110, a))
    img = Image.alpha_composite(img.convert('RGBA'),
                                refl.filter(ImageFilter.GaussianBlur(h * 0.004))).convert('RGB')
    d = ImageDraw.Draw(img)

    # 远景沙地
    d.rectangle([0, hy, w, h], fill=(158, 130, 86))

    # 近处的海：赛道两侧各一条（左右边缘的深青）
    for side in (-1, 1):
        edge = []
        for i in range(31):
            y = hy + (h - hy) * (i / 30)
            edge.append((w * (0.5 + side * 0.86) + (1 - i / 30) * w * side * 0.30, y))
        for i in range(30, -1, -1):
            y = hy + (h - hy) * (i / 30)
            edge.append((w * (0.5 + side * 0.86) + (1 - i / 30) * w * side * 0.30 - w * side * 0.06, y))
        d.polygon(edge, fill=(24, 62, 74))

    # 路面：一个向右弯的梯形（用二次曲线近似）
    def road_center(y):
        t = (y - hy) / max(1, (h - hy))
        return w * (0.40 + curve * 1.9 * t * t)

    def road_half_at(y):
        t = (y - hy) / max(1, (h - hy))
        return w * road_half * (0.06 + 0.94 * t)

    # 路面（从下往上画，用多边形）
    poly = []
    for i in range(41):
        y = hy + (h - hy) * (i / 40)
        poly.append((road_center(y) - road_half_at(y), y))
    for i in range(40, -1, -1):
        y = hy + (h - hy) * (i / 40)
        poly.append((road_center(y) + road_half_at(y), y))
    d.polygon(poly, fill=ROAD)

    # 路肩红白条
    for side in (-1, 1):
        for i in range(60):
            t0 = i / 60
            t1 = (i + 0.5) / 60
            y0 = hy + (h - hy) * t0
            y1 = hy + (h - hy) * t1
            c0 = road_center(y0) + side * road_half_at(y0)
            c1 = road_center(y1) + side * road_half_at(y1)
            w0 = w * 0.016 * (0.10 + t0 * 1.5)
            w1 = w * 0.016 * (0.10 + t1 * 1.5)
            col = INK if i % 2 == 0 else RED
            d.polygon([(c0 - side * w0, y0), (c0 + side * w0, y0),
                       (c1 + side * w1, y1), (c1 - side * w1, y1)], fill=col)

    # 中线虚线
    for i in range(26):
        t0 = 0.02 + i * 0.037
        t1 = t0 + 0.019
        y0 = hy + (h - hy) * t0
        y1 = hy + (h - hy) * t1
        c0 = road_center(y0)
        c1 = road_center(y1)
        w0 = w * 0.006 * (0.10 + t0 * 1.6)
        w1 = w * 0.006 * (0.10 + t1 * 1.6)
        b = int(120 + 110 * t0)
        d.polygon([(c0 - w0, y0), (c0 + w0, y0), (c1 + w1, y1), (c1 - w1, y1)],
                  fill=(b, b - 4, b - 14))

    return img, road_center, road_half_at, hy


def draw_car(d, cx, cy, scale, body=SUN, dark=DEEP, flip=False):
    """低多边形赛车（侧后 3/4 视角的简化剪影）。"""
    s = scale
    # 影子
    d.ellipse([cx - 1.05 * s, cy + 0.30 * s, cx + 1.15 * s, cy + 0.52 * s],
              fill=(18, 22, 34))
    # 尾翼
    d.polygon([(cx - 1.00 * s, cy - 0.22 * s), (cx - 0.30 * s, cy - 0.30 * s),
               (cx - 0.30 * s, cy - 0.16 * s), (cx - 1.00 * s, cy - 0.08 * s)], fill=dark)
    # 车身主体：楔形
    d.polygon([(cx - 1.05 * s, cy + 0.18 * s), (cx - 0.95 * s, cy - 0.14 * s),
               (cx + 0.25 * s, cy - 0.20 * s), (cx + 1.05 * s, cy + 0.06 * s),
               (cx + 1.00 * s, cy + 0.22 * s), (cx - 0.90 * s, cy + 0.30 * s)], fill=body)
    # 座舱
    d.polygon([(cx - 0.34 * s, cy - 0.18 * s), (cx + 0.10 * s, cy - 0.20 * s),
               (cx + 0.26 * s, cy - 0.02 * s), (cx - 0.28 * s, cy + 0.02 * s)],
              fill=(26, 34, 52))
    # 侧裙阴影
    d.polygon([(cx - 0.85 * s, cy + 0.16 * s), (cx + 0.95 * s, cy + 0.06 * s),
               (cx + 1.00 * s, cy + 0.22 * s), (cx - 0.90 * s, cy + 0.30 * s)],
              fill=(190, 128, 46))
    # 尾灯
    d.rectangle([cx - 0.98 * s, cy - 0.06 * s, cx - 0.72 * s, cy + 0.02 * s], fill=RED)
    # 车轮
    for wx, wy, r in ((cx - 0.60 * s, cy + 0.24 * s, 0.30 * s),
                      (cx + 0.58 * s, cy + 0.16 * s, 0.28 * s)):
        d.ellipse([wx - r, wy - r * 0.86, wx + r, wy + r * 0.86], fill=(20, 23, 30))
        d.ellipse([wx - r * 0.42, wy - r * 0.36, wx + r * 0.42, wy + r * 0.36], fill=(188, 194, 204))


def motion_streaks(d, w, h, y0, y1, n, color=(255, 210, 150)):
    for _ in range(n):
        x = random.uniform(w * 0.05, w * 0.95)
        y = random.uniform(y0, y1)
        L = random.uniform(w * 0.02, w * 0.10)
        a = random.randint(20, 70)
        d.line([(x, y), (x + L, y)], fill=color, width=random.choice([1, 1, 2]))


# ---------------------------------------------------------------- icon
def make_icon(path):
    S = 4
    W = H = 512 * S
    img, rc, rh, hy = sky_scene(W, H, horizon=0.47, road_half=0.34, curve=0.10)
    d = ImageDraw.Draw(img)

    # 速度线
    motion_streaks(d, W, H, hy, H, 40)

    # 车：压在左下，压过内侧路肩
    car_x = W * 0.40
    car_y = H * 0.80
    draw_car(d, car_x, car_y, W * 0.155)

    # 漂移烟
    for i in range(26):
        t = random.random()
        x = car_x - W * 0.16 - t * W * 0.10 + random.uniform(-8, 8) * S
        y = car_y + W * 0.045 + random.uniform(-6, 6) * S
        r = W * (0.012 + t * 0.022)
        d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=(200, 214, 216))

    img = vignette(img, 0.46)
    img = grain(img, 5)

    # 标题组（贴在左上安全区）
    d = ImageDraw.Draw(img)
    d.polygon([(W * 0.06, H * 0.085), (W * 0.30, H * 0.085),
               (W * 0.288, H * 0.115), (W * 0.048, H * 0.115)], fill=SUN)
    d.text((W * 0.075, H * 0.100), '海风竞速', font=font(CJKB, 34 * S),
           fill=(255, 255, 255), anchor='lm')
    d.text((W * 0.078, H * 0.152), 'SEA BREEZE GP', font=font(FD_B, 19 * S),
           fill=(210, 226, 226), anchor='lm')

    # 右下速度读数
    d.text((W * 0.93, H * 0.925), '223', font=font(FD_B, 44 * S), fill=INK, anchor='rm')
    d.text((W * 0.93, H * 0.962), 'KM/H', font=font(FD_R, 18 * S),
           fill=(200, 210, 220), anchor='rm')

    img = img.resize((512, 512), Image.LANCZOS)
    img.convert('RGB').save(path, 'PNG', optimize=True)
    return path


# ---------------------------------------------------------------- poster
def make_poster(path):
    S = 2
    W, H = 1280 * S, 720 * S
    img, rc, rh, hy = sky_scene(W, H, horizon=0.50, road_half=0.30, curve=0.14)
    d = ImageDraw.Draw(img)
    motion_streaks(d, W, H, hy, H, 90)

    # 松树剪影（两侧）
    for side in (-1, 1):
        for i in range(14):
            t = (i / 13) ** 1.6
            x = W * (0.5 + side * (0.30 + t * 0.26)) + random.uniform(-20, 20) * S
            y = hy - H * 0.01 - t * H * 0.03
            hgt = H * (0.075 + t * 0.10)
            wdt = hgt * 0.42
            d.polygon([(x, y - hgt), (x - wdt, y), (x + wdt, y)], fill=(24, 58, 48))
            d.rectangle([x - wdt * 0.10, y, x + wdt * 0.10, y + hgt * 0.14], fill=(40, 30, 22))

    # 车：压左下，视觉重心
    car_x = W * 0.335
    car_y = H * 0.795
    draw_car(d, car_x, car_y, W * 0.135)
    for i in range(40):
        t = random.random()
        x = car_x - W * 0.145 - t * W * 0.13 + random.uniform(-10, 10) * S
        y = car_y + W * 0.040 + random.uniform(-8, 8) * S
        r = W * (0.010 + t * 0.024)
        d.ellipse([x - r, y - r * 0.68, x + r, y + r * 0.68], fill=(204, 218, 220))

    # 左侧文字暗幕
    scrim = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(scrim)
    for i in range(int(W * 0.50)):
        t = i / (W * 0.50)
        a = int(232 * (1 - t) ** 1.55)
        sd.line([(i, 0), (i, H)], fill=(10, 16, 28, a))
    img = Image.alpha_composite(img.convert('RGBA'), scrim).convert('RGB')

    img = vignette(img, 0.50)
    img = grain(img, 5)
    d = ImageDraw.Draw(img)

    # 顶部标识
    d.polygon([(W * 0.050, H * 0.085), (W * 0.058, H * 0.085),
               (W * 0.058, H * 0.140), (W * 0.050, H * 0.140)], fill=SUN)
    d.text((W * 0.072, H * 0.112), '海风竞速', font=font(CJKB, 32 * S),
           fill=(248, 249, 251), anchor='lm')
    d.text((W * 0.073, H * 0.163), 'SEA BREEZE GP', font=font(FD_B, 17 * S),
           fill=MUTED, anchor='lm')

    # 主标题
    ty = H * 0.335
    d.text((W * 0.048, ty), 'SEA', font=font(FD, 132 * S), fill=(250, 251, 253), anchor='lm')
    d.text((W * 0.048, ty + 118 * S), 'BREEZE', font=font(FD, 132 * S),
           fill=(250, 251, 253), anchor='lm')
    d.rectangle([W * 0.050, ty + 196 * S, W * 0.050 + 340 * S, ty + 201 * S], fill=SUN)
    d.text((W * 0.050, ty + 224 * S), '落日海岸 · 三圈竞速 · 漂移与氮气',
           font=font(CJKR, 25 * S), fill=(212, 216, 222), anchor='lm')
    d.text((W * 0.050, ty + 264 * S), 'A LOW-POLY SUNSET RACING GAME',
           font=font(FD_R, 18 * S), fill=MUTED, anchor='lm')

    # 底部仪表条
    dash = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dash)
    top = int(H * 0.855)
    dd.rectangle([0, top, W, H], fill=(11, 17, 30, 244))
    dd.rectangle([0, top, W, top + 2 * S], fill=(255, 181, 71, 180))
    img = Image.alpha_composite(img.convert('RGBA'), dash).convert('RGB')
    d = ImageDraw.Draw(img)

    d.text((W * 0.050, top + 52 * S), '223', font=font(FD_B, 58 * S), fill=INK, anchor='lm')
    d.text((W * 0.050 + 92 * S, top + 62 * S), 'KM/H', font=font(FD_R, 19 * S),
           fill=MUTED, anchor='lm')
    d.text((W * 0.330, top + 52 * S), 'BEST LAP  0:42.18', font=font(MONO, 18 * S),
           fill=MUTED, anchor='lm')
    d.text((W * 0.330, top + 92 * S), 'POS  #1 / 8', font=font(MONO, 18 * S),
           fill=SUN, anchor='lm')

    # 氮气格
    for i in range(6):
        x = W * 0.855 + i * 26 * S
        y = top + 66 * S
        if i < 4:
            d.rectangle([x, y, x + 20 * S, y + 10 * S], fill=SEA)
        else:
            d.rectangle([x, y, x + 20 * S, y + 10 * S], outline=(63, 208, 201, 110), width=1)
    d.text((W * 0.855, top + 36 * S), 'NITRO', font=font(FD_R, 15 * S),
           fill=MUTED, anchor='lm')

    img = img.resize((1280, 720), Image.LANCZOS)
    img.convert('RGB').save(path, 'JPEG', quality=92, optimize=True, progressive=True)
    return path


if __name__ == '__main__':
    print(make_icon('/tmp/sb-icon.png'))
    print(make_poster('/tmp/sb-poster.png'))
