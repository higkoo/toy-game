# Frame — 《倪海厦学习天地》60s 设计系统

> Step 2 产物。品牌 token 取自产品源码 `index.html` v1.15 与 BRIEF.md。
> **生成路径说明**：本工程走 workbuddy-v2-adapter 允许的「离线工程」路径，本文件手写而成，
> 未调用上游 `build-frame.mjs`（该脚本与宿主 manifest 命名不兼容，属未测路径，见 README 执行记录）。

## Canvas

| 项 | 值 |
|---|---|
| 尺寸 | 1920 × 1080（landscape / 16:9） |
| 时长 | 60.000s |
| 帧率 | 30fps（渲染时由 CLI 决定） |
| 底色 | `#f7f2e7` 宣纸 |
| 安全区 | 上 96px / 下 150px（字幕带） / 左右 120px |

## Palette

| Role | Token | Value | 来源 |
|---|---|---|---|
| Canvas | `--paper` | `#f7f2e7` | 源码 `body` 背景 |
| Paper light | `--paper-lit` | `#fdfaf2` | 卡片/字幕底板提亮 |
| Ink | `--ink` | `#2b2620` | 源码正文深墨 |
| Ink soft | `--ink-2` | `#6b6152` | 次级说明文字 |
| Gold | `--gold` | `#a3803f` | 源码强调色（按钮/序号/金线） |
| Gold light | `--gold-lit` | `#c9a860` | 高亮、光晕 |
| Rule | `--rule` | `rgba(163,128,63,.32)` | 分隔线 |
| Pain gray | `--ash` | `#9a9488` | 痛点段的去饱和灰 |

## Typography

- **Display / 标题**：`Noto Serif CJK SC`（思源宋体），`font-weight: 600`
- **Body / 字幕**：同上，`font-weight: 400`
- 本地字体文件 `assets/NotoSerifCJK.ttc`（26MB，系统字体副本），CSS 用 `@font-face` 声明并以 `local()` 优先命中，避免渲染期网络请求。
- 字号：主标题 96–120px；场景标题 52–64px；卡片课程名 32px；字幕 35px；小字/免责 18–20px。
- 字距：标题 `letter-spacing: .06em`；正文 `0`；序号类 `letter-spacing: .18em`。

## Composition patterns

- **背景层（T0）**：宣纸底 + 确定性 SVG 噪点颗粒 + 双层远山剪影，跨 0–60s 连续单 clip，避免逐帧背景闪动。
- **真实 UI 底板**：`assets/ui-home.png`（首屏）、`assets/ui-full.png`（1920×3600 长图）。用 `background-position` / wrapper `y` 位移做 viewport 移动，超过 1:1 不做推近。
- **概念图解**：HTML/CSS/SVG 确定性绘制，必须带虚线边框 + 「示意」角标，与真实 UI 明确区分。
- **卡片**：宣纸底 + 1px 金线 + 顶部序号 + 课程名 + 描述 + 底部「观看 / 讲义 / 笔记」入口；底栏用绝对定位锁死，不被描述挤出。
- **字幕带（T3）**：宣纸半透明条 `rgba(253,250,242,.88)` + 上下 1px 金线，宽 1460px 居中，底部 `padding-bottom: 52px`，高 ≥74px，**常驻 0–60s 不重绘**。

## Caption rules

- 底板常驻；18 句文字各为独立 `class="clip"`，`data-start`/`data-duration` 严格首尾相接。
- 切换不闪空：新句立即以 60% 不透明出现、7 帧淡到全亮，**不做淡出**。
- 关键词金墨高亮：`--gold`；单句 ≤20 字，`whiteSpace: nowrap`，不折行。
- 开场 0–1.4s 与收尾 59.2–60s 底板整体淡入/淡出。

## Motion vocabulary

镜头运动一律作用在 **clip 内部的 wrapper**，不动画 `.clip` 本身（避免 `gsap_animates_clip_element`）：

| 术语 | 实现 | 参数 |
|---|---|---|
| `push-in` | wrapper `scale` 1.0→1.35 | 18–24 帧，`power2.out` |
| `pull-back` | wrapper `scale` 1.2→1.0 | 20 帧，`power2.inOut` |
| `pan` | wrapper `x`（预计算 px） | `power1.inOut` |
| `gather` | 多子元素 `fromTo` 到网格坐标 | 24 帧，`power3.out`，错峰 3 帧 |
| `crossfade` / `wipe` | clip 边界 + 内部 opacity / mask | 8–13 帧 |

**确定性红线**：无 `Date.now()`、无 `Math.random()`、无 `fetch()`；所有「随机散落」用预计算坐标表写死；GSAP 用 `assets/gsap.min.js` 本地副本，非 CDN。

## Audio

| 轨 | 文件 | `data-volume` | 说明 |
|---|---|---|---|
| BGM | `assets/bgm.wav` | 0.34 | 本轮纯字幕版，音乐垫底但不消失；Solution 段已按 BGM.md 上调 |
| VO | — | — | **未提供**：HeyGen 未登录、Kokoro 本地 TTS 未安装，中文旁白为待授权项 |

## Fact boundary

真实产品 UI 才可用 `visual_type: ui-capture`；源码无穴位/方剂检索、搜索框、知识图谱、学习进度条、笔记编辑器，相关画面只能是 `concept-diagram`，不得宣称是产品功能。
