# 深蓝信标 · Abyss Beacon

一款运行在浏览器里的 3D 深海探索小游戏。驾驶微型深潜器「萤火号」，在被荧光生物照亮的失落海域里收集光囊，送回三座熄灭的远古灯塔，让航路从迷雾中重新显形。

**线上地址**：https://www.bilibili.com/toy/abyssbeacon/index.html

## 玩法

- 没有倒计时，慢慢逛。海域里散落着 **18 个光囊**（冷青发光）和 **8 枚贝片**（白）。
- 靠近光囊自动收集。飞到灯塔附近，按 `E`（或点「投放」）把光囊注入灯塔。
- 每座灯塔需要 **4 个光囊**，点亮全部三座即通关。光囊有 6 个富余，漏捡几个也能完成。
- 贝片是可选收集，计入最终得分。

## 操作

| 动作 | 键盘 | 触屏 |
|---|---|---|
| 前进 / 后退 | `W` / `S` | 左下 ▲ / ▼ |
| 左转 / 右转 | `A` / `D` | 左下 ◀ / ▶ |
| 上浮 / 下潜 | `空格` / `Shift` | 右下「上浮」/「下潜」 |
| 切换视角（外部 / 驾驶舱） | `C` | 右下「视角」 |
| 投放光囊 | `E` | 右下「投放」 |
| 开始 / 重开 | `Enter` | 点击按钮 |

手机竖屏时会提示横过设备。触屏控件与安全区（刘海/圆角）从一开始内置，非事后补丁。

## 技术形态

- **three.js r180**，以 esbuild 打包为 IIFE 全局随包分发（`src/three.global.js`，MIT）。
- **零外部资源、零网络请求**：海底地形、荧光珊瑚、水母、沉船、灯塔、潜航器全部程序化生成。
- **确定性随机**：mulberry32 + 值噪声，同一 seed 生成同一片海。
- **颜色即语义**：冷青=可收集、洋红=生物警示、琥珀=目标灯塔；三色把玩法信息直接编码进视觉。
- **相机**：外部跟随 / 驾驶舱内视双视角，FOV 随视角平滑过渡。
- **拆分发布**：入口 `index.html` 与 `three.global.js`、`game.js` 三者同目录上传（入口需 < 1MB）。

## 目录

```
abyssbeacon/
├── dist/                    # Toy 发布产物（页面根目录）
│   ├── index.html
│   ├── three.global.js
│   └── game.js
├── assets/                  # icon.png / poster.jpg
├── source/                  # 模块化源码 + 构建/素材脚本 + DESIGN.md
└── README.md
```

单文件版 `深蓝信标.html` 由 `build.py` 生成，双击即可本地离线游玩。

## 构建与发布

```bash
cd source && python3.11 ../build.py      # 生成 dist/ 与单文件版
python3.11 gen_assets.py                 # 重新生成 icon/poster

toy create dist \
  --title "深蓝信标" --slug abyssbeacon \
  --category GAME --theme dark \
  --icon assets/icon.png --poster assets/poster.jpg \
  --visibility public --yes --json
```

## 验证

沙箱 Xvfb + SwiftShader WebGL2 实跑：

- 桌面 1280×800：标题页开始按钮在视口内、WebGL 正常、行驶 60 km/h、0 报错。
- 手机横屏 844×390 / 740×360：`body.touch` 判定正确、6 个触屏按钮全部在视口内可点、按住前进键车实际移动、0 报错。
- 玩法闭环：逐个收集光囊 → 三座灯塔各注入 4 个 → 通关结算「三座灯塔已亮」，得分计算正确、0 报错。

`source/` 内 `01_world.js`（世界）、`02_sub.js`（潜航器与相机）、`03_game.js`（输入/HUD/玩法）可直接 `node --check`。
