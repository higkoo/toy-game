# 海风竞速 · Sea Breeze GP

落日海岸低多边形 3D 竞速游戏。三圈计时赛，8 车同场，漂移攒氮气，冲线夺冠。

**零外部资源、零网络请求**：赛道、海面、松林、灯塔、赛车与对手全部程序化生成，three.js r180 以 IIFE 形式随包分发，断网可玩。

## 玩法

- **目标**：3 圈竞速，跑赢 7 辆 AI 车拿第 1 名。
- **自动油门**：松开按键也在加速；按刹车才减速，急弯的弯道阻力会让车自然掉速。
- **漂移**：`空格`（触屏「漂移」键）配合转向进入漂移，累积氮气。
- **氮气**：`Shift`（触屏「N₂」键）释放，瞬时提速 + 镜头 FOV 拉伸。
- **结算**：名次 + 总时间 + 最快单圈，可一键再跑。

### 按键

| 键 | 作用 |
| --- | --- |
| `A` / `D` | 左右转向 |
| `W` / `↑` | 全功率油门（默认已是自动油门） |
| `S` / `↓` | 刹车 / 倒车 |
| `空格` | 漂移 |
| `Shift` | 氮气 |
| `R` | 重新开始 |

移动端有独立触屏控件（左侧转向 + 刹车，右侧漂移 / 氮气 / 油门），并强制横屏游玩；竖屏会显示「请将手机横过来」。

## 场景与渲染

- **赛道**：`THREE.CatmullRomCurve3` 闭合海岸线，`getSpacedPoints(360)` 弧长均匀采样；Frenet 标架构造左右路肩，法线朝上保证路面不被背面剔除。
- **路肩**：8×8 Canvas 红白贴图沿弧长重复的连续条纹带（`NearestFilter` + `RepeatWrapping`），不是一堆散落方块。
- **镜头**：跟随相机用**赛道切向**而非车身旋转方向计算，弯道里车身侧滑时画面不会跟着甩；FOV 随速度与氮气动态拉伸。
- **对手 AI**：8 台车沿赛道跑，带弯道技巧、线路偏好、橡皮筋追赶与轮胎打滑表现，横向位置互相分散避免叠成一团。
- **特效**：漂移烟雾、氮气边缘泛光、进站减速。

## 依赖

游戏本体无任何外部资源引用。唯一的第三方库是 three.js r180（MIT），以 IIFE 全局形式随包分发。

## 目录结构

```text
seabreeze/
├── src/
│   ├── index.html        # 页面入口：HTML + 内嵌样式 + 引入三个脚本（约 20 KB）
│   ├── three.global.js   # three.js r180，esbuild 打包为 IIFE 全局（约 680 KB）
│   └── game.js           # 赛道 / 场景 / 赛车 / AI / 输入 / HUD / 主循环（约 52 KB）
├── assets/
│   ├── icon.png          # 512×512 PNG
│   └── poster.jpg        # 1280×720 JPEG
└── README.md
```

### 为什么拆包

单文件版（含内联 three.js）约 753 KB，虽然还在入口限制内，但拆开后 `index.html` 只有约 20 KB，预检余量大得多，也方便浏览器缓存库文件。

`source/` 目录另存了可读的模块化源码与构建脚本（`build.py` 组装发布产物，`gen_assets.py` 用纯 PIL + numpy 程序化生成图标与海报），与 `src/` 的发布产物一一对应。

## 发布

```bash
toy create src --title "海风竞速" --slug seabreeze \
  --category GAME --theme dark \
  --icon assets/icon.png --poster assets/poster.jpg --yes --json
```

线上地址：<https://www.bilibili.com/toy/seabreeze/index.html>

## 版本

- **v1.0.0** —— 首发版：三圈竞速 / 漂移氮气 / 8 车 AI / 落日海岸场景。
