# -*- coding: utf-8 -*-
"""组装《海风竞速》单文件 HTML：three.js r180（MIT）+ 游戏代码 + 样式。"""
import io
import os

SRC = '/workspace/海风竞速/src'
THREE = '/tmp/threebuild/three.global.js'
OUT = '/workspace/海风竞速/index.html'
OUT_SPLIT_DIR = '/workspace/海风竞速/dist'

LICENSE = """/*!
 * three.js r180 — The MIT License
 * Copyright © 2010-2025 three.js authors
 * https://threejs.org
 * 保留全部权利。允许使用、复制、修改、合并、发布、分发、再许可及销售本软件的
 * 副本，并允许任何获得副本的人获得本软件及相关文档的副本，但须在所有副本或
 * 实质性部分中保留上述版权声明和本许可声明。
 */"""


def read(p, mode='r'):
    if mode == 'r':
        return io.open(p, encoding='utf-8').read()
    return io.open(p, 'rb').read()


def main():
    three = read(THREE)
    css = read(os.path.join(SRC, 'style.css'))
    parts = []
    for f in ('01_world.js', '02_car.js', '03_game.js'):
        parts.append(read(os.path.join(SRC, f)))
    game = '\n\n'.join(parts)

    html = read(os.path.join(SRC, 'index.html'))
    assert '/*__CSS__*/' in html and '/*__THREE__*/' in html and '/*__GAME__*/' in html

    html = html.replace('/*__CSS__*/', css)
    html = html.replace('/*__THREE__*/', LICENSE + '\n' + three)
    html = html.replace('/*__GAME__*/', game)

    os.makedirs(OUT_SPLIT_DIR, exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8').write(html)
    print('单文件:', OUT, len(html.encode('utf-8')), 'B')

    # 拆分版（Toy 上传用：入口需 < 1MB，所以游戏代码与库分离）
    split = read(os.path.join(SRC, 'index.html'))
    assert '/*__CSS__*/' in split and '/*__THREE__*/' in split and '/*__GAME__*/' in split
    split = split.replace('/*__CSS__*/', css)
    split = split.replace('<script>/*__THREE__*/</script>',
                          '<script src="three.global.js"></script>')
    split = split.replace('<script>/*__GAME__*/</script>',
                          '<script src="game.js"></script>')
    io.open(os.path.join(OUT_SPLIT_DIR, 'index.html'), 'w', encoding='utf-8').write(split)
    io.open(os.path.join(OUT_SPLIT_DIR, 'three.global.js'), 'w', encoding='utf-8').write(three)
    io.open(os.path.join(OUT_SPLIT_DIR, 'game.js'), 'w', encoding='utf-8').write(game)
    for f, c in (('index.html', None), ('three.global.js', three), ('game.js', game)):
        p = os.path.join(OUT_SPLIT_DIR, f)
        print('  拆分版', f, os.path.getsize(p), 'B')


if __name__ == '__main__':
    main()
