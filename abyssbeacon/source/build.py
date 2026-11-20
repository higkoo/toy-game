#!/usr/bin/env python3
"""组装《深蓝信标》发布包：单文件 + 拆分版（Toy 用）。"""
import io, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))   # abyssbeacon/source
BASE = os.path.dirname(ROOT)                        # abyssbeacon
SRC = ROOT
OUT = os.path.join(BASE, 'dist')
SINGLE = os.path.join(BASE, '深蓝信标.html')
os.makedirs(OUT, exist_ok=True)

def read(p):
    with io.open(p, encoding='utf-8') as f:
        return f.read()

css = read(os.path.join(SRC, 'style.css'))
three = read(os.path.join(SRC, 'three.global.js'))
game = '\n'.join(read(os.path.join(SRC, f)) for f in
                 ['01_world.js', '02_sub.js', '03_game.js'])
html = read(os.path.join(SRC, 'index.html'))

single = html.replace('/*__CSS__*/', css).replace('/*__THREE__*/', three).replace('/*__GAME__*/', game)
io.open(SINGLE, 'w', encoding='utf-8').write(single)

# 拆分版：入口 index.html < 1MB，three 与 game 分文件
# 清掉上一次构建留下的指纹文件，避免 dist 里堆积旧产物
for name in os.listdir(OUT):
    if re.match(r'^(game|three\.global)\.[0-9a-f]{8}\.js$', name):
        os.remove(os.path.join(OUT, name))
split = html.replace('/*__CSS__*/', css)
# 定位两个占位脚本块，替换为外链
split = re.sub(r'<script>/\*__THREE__\*/</script>', '<script src="three.global.js"></script>', split)
split = re.sub(r'<script>/\*__GAME__\*/</script>', '<script src="game.js"></script>', split)
io.open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(split)
io.open(os.path.join(OUT, 'game.js'), 'w', encoding='utf-8').write(game)
io.open(os.path.join(OUT, 'three.global.js'), 'w', encoding='utf-8').write(three)

# 给拆分版 JS 加内容指纹并同步更新 index.html 引用
subprocess.run([sys.executable, os.path.join(ROOT, '..', '..', 'scripts', 'fingerprint.py'), OUT], check=True)

print('single:', len(single.encode()), 'B')
for f in ['index.html'] + sorted(n for n in os.listdir(OUT) if re.match(r'^(game|three\.global)\.', n)):
    p = os.path.join(OUT, f)
    print('dist/' + f, os.path.getsize(p), 'B')
