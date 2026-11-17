#!/usr/bin/env python3
"""组装《深蓝信标》发布包：单文件 + 拆分版（Toy 用）。"""
import io, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, '海风竞速'.replace('海风竞速', 'dist'))  # dist
SINGLE = os.path.join(ROOT, '深蓝信标.html')
os.makedirs(OUT, exist_ok=True)

def read(p):
    with io.open(p, encoding='utf-8') as f:
        return f.read()

css = read(os.path.join(SRC, 'style.css'))
three = read(os.path.join(OUT, 'three.global.js'))
game = '\n'.join(read(os.path.join(SRC, f)) for f in
                 ['01_world.js', '02_sub.js', '03_game.js'])
html = read(os.path.join(SRC, 'index.html'))

single = html.replace('/*__CSS__*/', css).replace('/*__THREE__*/', three).replace('/*__GAME__*/', game)
io.open(SINGLE, 'w', encoding='utf-8').write(single)

# 拆分版：入口 index.html < 1MB，three 与 game 分文件
split = html.replace('/*__CSS__*/', css)
# 定位两个占位脚本块，替换为外链
import re
split = re.sub(r'<script>/\*__THREE__\*/</script>', '<script src="three.global.js"></script>', split)
split = re.sub(r'<script>/\*__GAME__\*/</script>', '<script src="game.js"></script>', split)
io.open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(split)
io.open(os.path.join(OUT, 'game.js'), 'w', encoding='utf-8').write(game)

print('single:', len(single.encode()), 'B')
for f in ['index.html', 'three.global.js', 'game.js']:
    p = os.path.join(OUT, f)
    print('dist/' + f, os.path.getsize(p), 'B')
