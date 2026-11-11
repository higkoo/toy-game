# 四号泊位

港口题材的第一人称射击小游戏。`05:42` 封港，港区防御系统失控；单人潜入 B4 港区，切断三处中继、突破封锁、登船撤离。

## 玩法与操作

- 键鼠：WASD 移动、鼠标瞄准、左键射击、R 换弹、Shift 冲刺、空格跳跃；进入游戏需要点击锁定指针。
- 触屏：屏幕上的虚拟摇杆与开火键，支持陀螺仪以外的全部基础操作。
- 目标：按 HUD 指引依次切断三处中继，再抵达撤离点登船。
- 画质、灵敏度等设置存在 `localStorage`，旧键 `saltline.settings.v1` 会在读取时自动回退，保存时统一写 `zhidu.settings.v1`。

## 目录

```text
berth4/
├── src/
│   ├── index.html        # 页面入口：HTML + CSS + three.js MIT 声明（约 33 KB）
│   └── game.bundle.js    # 内联的 three.js r180 + 游戏逻辑（约 1.39 MB）
├── assets/
│   ├── icon.png          # Toy 图标 512×512 RGB PNG
│   └── poster.jpg        # Toy 封面 1280×720 JPEG
└── README.md
```

页面本身不引用 `assets/` 里的图片，它们是 Toy 平台的外层展示素材，创建 / 更新 Toy 时用 `--icon`、`--poster` 指定。

## 为什么是两个文件

原稿是一个约 1.4 MB 的单文件 HTML，three.js 与游戏逻辑都内联在同一个 IIFE 里。Toy 收包预检要求入口 `index.html` 解压后 ≤ 1 MB，因此把整个 `<script>` 内容原样外置为 `game.bundle.js`。

不按「three.js / 游戏代码」边界硬拆，是因为游戏代码直接引用了压缩后的库内部符号（如 `new Ae`、`new Qe`），拆分会断引用。两个文件必须放在同一目录，用相对路径 `./game.bundle.js` 加载。

## 依赖

零第三方网络依赖，断网可玩。唯一的 `http://` 字符串是 SVG 命名空间 `http://www.w3.org/1999/xhtml`，不产生请求。

浏览器能力：WebGL2（three.js r180 的 `WebGLRenderer`）、Pointer Lock、Fullscreen、Gamepad、`AudioContext` / `OfflineAudioContext`、Canvas 2D（运行时生成贴图）、`AbortSignal.any`、系统字体。没有可创建的 WebGL 上下文时，页面会显示中文「启动失败」兜底提示，不会白屏。

内联的 three.js r180 采用 MIT 许可，`Copyright © 2010-2025 three.js authors`。许可全文放在 `index.html` 的 `<head>` 注释与 `game.bundle.js` 顶部。

## 本地运行

直接用浏览器打开 `src/index.html` 即可；也可以起个静态服务：

```bash
cd berth4/src && python3 -m http.server 8080
```

## 发布到 Toy

以 `src/` 作为页面根目录（两个文件一起打包）：

```bash
toy create berth4/src \
  --title "四号泊位" --slug berth4 --category GAME --theme dark \
  --icon berth4/assets/icon.png --poster berth4/assets/poster.jpg --yes
```

- Toy id：`53940016128000`
- 正式地址：`https://www.bilibili.com/toy/berth4/index.html`（审核通过后生效）
- 预览：`https://www.bilibili.com/toy/preview/author_TwW1g6ZP/index.html`

图标与封面用 SVG 绘制后渲染成位图：暗色战术底、九式突击步枪剪影、琥珀准星、B4 角标、`05:42`、集装箱与龙门吊、雨线。视觉语法对齐战术射击品类，但素材全部来自这个游戏自身设定。
