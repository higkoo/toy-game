# 《郭生白 · 视频全集》介绍视频 · Remotion 源码

基于 `benneng/src/index.html` 真实结构制作的 24 秒介绍短片源码。

## 成品规格

- 1920×1080（16:9）/ 30fps / 24.0 秒 / 720 帧
- 4 场分镜：序 · 全集 → 全集总览 → 四个合集逐一出场 → 落版
- 深色底 + 暖橙色光晕，与 `benneng/src/css/app.css` 同一套视觉语言
- 素材全部取自 `benneng/src/img/`（5 张封面 + 郭生白人物照 + 图标），无任何外部素材

## 目录

| 路径 | 说明 |
|---|---|
| `src/theme.ts` | 画幅、配色、字体、4 场时间轴与动画工具函数 |
| `src/data.ts` | 4 个合集数据（20/53/43/48 集，共 164 集）、素材索引、品牌文案 |
| `src/components.tsx` | 背景光晕网格、顶栏、小标题、数字统计、封面卡、进度条 |
| `src/scenes.tsx` | 4 个场景组件 |
| `src/BennengExplainer.tsx` | 主时间轴（Sequence 编排） |
| `src/Root.tsx` / `src/index.ts` | Remotion 注册入口 |
| `public/img/` | 渲染用图片素材（复制自 `benneng/src/img/`） |

## 运行

需要 Node 18+ / pnpm；Remotion 会自行下载专用 headless 浏览器。

```bash
cd benneng/rem
pnpm install
pnpm studio     # 可视化调试
pnpm render     # 渲染 MP4 到 out/benneng-explainer.mp4
pnpm still      # 渲染单帧到 out/frame.png
```

### 本机渲染注意事项

Remotion 自带的 `chrome-headless-shell` 在部分 macOS 环境下会卡在
`Waiting for root component to load` 超时。改用 Playwright 缓存的同版本 headless shell 即可：

```bash
pnpm exec remotion render src/index.ts BennengExplainer out/benneng-explainer.mp4 \
  --codec=h264 --crf=18 --gl=swangle \
  --browser-executable="$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell"
```

渲染 720 帧约需 4–6 分钟（`remotion.config.ts` 中 `setConcurrency(4)`）。

## 说明

- 成片 MP4 属于交付物，不纳入仓库（`out/` 已在 `.gitignore` 中，仓库根 `.gitignore` 也忽略全部音视频后缀）。
- 本工程只做介绍，不含任何交易类文案。
