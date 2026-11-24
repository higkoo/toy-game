# 数独 · 九宫

一场安静的数独。五种难度、候选与排除、提示与计时，所有题目都在浏览器本地生成，每一局保证唯一解。

> 本作参考 [binhua380/sudoku](https://gitee.com/binhua380/sudoku) 的玩法与功能范围。参考仓库 README 写 MIT、`LICENSE` 文件却是 GPLv3，许可证声明互相冲突；为避免把 GPL 代码混入本仓库的 MIT 代码，生成器、界面、样式与视觉全部独立重写，没有复制参考项目的源码、样式或图片。

## 游戏内容

- **五种难度**：简单 40 个提示数、一般 34、困难 30、特难 27、地狱 24。
- **唯一解**：先生成完整终盘，再挖空并用 MRV 回溯求解器校验唯一解；无法继续挖空时保留最后一版合法题面。
- **普通 / 候选**：候选模式自动显示每个空格的合法数字；打开「排除」后点数字，把该候选从当前格划掉。
- **辅助**：撤销、提示、显示答案、菜单与每难度最佳时间；错误上限 3 次。
- **输入**：鼠标、触控、数字键盘与方向键均可操作。
- **视觉**：深色纸感棋盘、3×3 宫格粗线、选中行/列/宫高亮、相同数字高亮；桌面居中，移动端自适应。

## 目录

```text
jiugong-sudoku/
├── src/
│   ├── index.html              # Toy 发布入口
│   ├── style.f58badb6.css      # 带内容指纹
│   ├── sudoku.34e53558.js      # 生成、唯一解校验、候选
│   ├── game.9050ffe5.js        # 界面、计时、存档、结算
│   └── assets/icon.png         # 页面图标 + Toy 图标（512×512）
├── assets/
│   └── poster.jpg              # Toy 分享封面（1200×900，4:3）
└── README.md
```

入口解压后约 8 KB；无第三方运行时、无外部字体或 CDN 依赖。

## 核心算法

- `generateSolution`：在 9×9 终盘上做随机化回溯，每次选择候选最少的空格。
- `countSolutions`：带行列宫位掩码的 MRV 回溯，最多数到 2 个解就提前返回；挖空时用它判断唯一性。
- `makePuzzle`：按难度目标挖空；24 个提示数接近唯一解下限，因此最多重试 8 次，保留提示数最少的一版。
- 生成速度：本机 Node 测试中，五种难度单题约 1–10ms。

## 验收

2026-11-24 在 macOS + Chrome 上完成：

- 核心测试：五种难度各 4 个种子（20 局）均唯一解、终盘合法、题面取自终盘；固定 seed 可复现。
- 真实浏览器：首格填数、计时启动、撤销、错误计数、提示、候选定位、排除与恢复、难度切换、完成结算、三次错误失败、显示答案、结算页菜单逐项通过。
- Toy 预览内实际点击空格、切换候选、填入正确数字，计时从 `00:00` 走到 `00:01`，无错误计数。
- 1200×900、390×844、360×640、320×568 视口下无横向滚动；360×640 完整落在首屏，320×568 仅 4px 纵向余量。
- Toy 预览无 `pageerror`、无 console error、无资源 404。

## 发布状态

Toy **预览阶段**，尚未提交审核。

- 标题：`数独 · 九宫`
- slug：`jiugong-sudoku`
- 分类：GAME；可见性：public；主题：dark
- 预览：<https://www.bilibili.com/toy/preview/author_KhgAySno/index.html>
- 页面无自由绘制能力，未开启访问者水印
- 内容指纹：`toy_doctor.py` 返回 `{"ok": true, "findings": []}`

```bash
toy create jiugong-sudoku/src \
  --title "数独 · 九宫" --slug jiugong-sudoku \
  --category GAME --theme dark --visibility public \
  --poster jiugong-sudoku/assets/poster.jpg \
  --icon jiugong-sudoku/src/assets/icon.png --json
```
