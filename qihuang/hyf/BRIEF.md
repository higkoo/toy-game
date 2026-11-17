---
workflow: product-launch-video
flow: automation                 # model-proposed，未确认；companion 则在 /general-video 协同搭建
storyboard: yes                  # user-confirmed：本次交付含分镜表与逐帧描述
mode: collaborative              # 派生：automation × yes
message: "一页索引，把散落的倪师课程串成一条能反复走的学习路径"
destination: bilibili-toy-embed  # model-proposed（推断自产品 URL）；投放渠道未指定
aspect: 1920x1080                # model-proposed：由 destination 派生 16:9
language: zh-CN                  # user-confirmed（用户语言）
audience: 对倪海厦课程感兴趣但不知从何入手的中医/国学自学者；已有基础、需便捷查询与反复温习的进阶学习者
length: 60s                      # user-confirmed
angle: pain-to-order             # 依据：用户指定的 Hook→Pain→Solution→Result→CTA 结构
narration: yes                   # user-confirmed（「每一句口播对应一个明确的画面动作」）
---

## Intent

《倪海厦学习天地》（B 站 Toy）是一款面向倪海厦老师学习者的**结构化、一站式学习工具**。它要解决的不是「再搬运一套课程」，而是三个具体麻烦：资料零散、路径不清、查讲脱节。

**核心价值**：把天纪与人纪两套体系收进同一页，按倪师教学逻辑排好顺序，让课程、讲义、笔记在同一处互相连通。人纪（中医）沿「针灸 → 黄帝内经 → 神农本草经 → 伤寒论 → 金匮要略」推进；天纪（术数，覆盖易经、命理、风水）双线并行。

**谁在看**：一类是心动却不知从哪下手的中医/国学自学者，一类是已有基础、需要便捷定位与反复温习的进阶学习者。片子要同时让前者敢开始、让后者觉得好用。

**这一支片要传达的唯一一件事**：一页索引，把散落的课串成一条能反复走的学习路径。

**语气**：克制、可信、有秩序感。不煽情、不卖焦虑到底，先刺痛再给秩序；不夸大产品能力（它是导航索引，不是内容库或搜索引擎）。视觉延续产品源码的宣纸金墨体系（`#f7f2e7` 底 / `#a3803f` 金 / 宋体），信息密度高但不拥塞。

## Assets

用户已提供、本次会话已读核对：

- `/root/uploads/.../index.html` — 产品源码 v1.15（58768 字节），**画面与文案的事实来源**
- `/root/uploads/.../README.md` — 内容结构、Toy SDK 跳转说明、素材清单
- `hero-portrait.jpg` — 首屏倪海厦人像（**仅作为产品 UI 内的静态素材**，不做独立人物镜头）
- `cover-tianji.jpg` — 天纪章节封面「天纪 · 紫微斗数」
- `cover-zhenjiu.jpg` / `cover-neijing.jpg` / `cover-bencao.jpg` / `cover-shanghan.jpg` / `cover-jingui.jpg` / `cover-zhongjing.jpg` — 6 张人纪课程封面
- `poster.jpg` — Toy 系列海报（`医案` 卡封面）
- `diji-vista.jpg` — 地纪残章背景
- `icon.png` — 品牌图标（CTA）
- 本地既有 `sanji-video/` Remotion 项目 — **本次不复用**：节奏与画面方案不同，且用户要求 HyperFrames 友好

**待采集**：产品 UI 录屏 / 逐屏截图。当前只有源码与静态图，无 UI 动态录屏。降级方案见 `FRAME-SPEC.md`（静态截图为底 + 只重建会动的组件）。

**授权范围**：素材来自产品自身素材包，用于本产品解说无问题；商业投放或二次分发前需另行确认图片授权。

## Customizations

- **五段节奏（user-confirmed）**：Hook 0–3s / Pain 3–11s / Solution 11–46s / Result 46–56s / CTA 56–60s。
- **口播约束（user-confirmed）**：单句 ≤20 字；每一句对应一个明确画面动作；18 句见 `SCRIPT.md`。
- **画面偏好（user-confirmed）**：优先产品 UI 录屏、知识图谱 / 学习路径图、查询界面高亮、词卡弹出、时间轴 / 进度条动效。
- **避免（user-confirmed）**：真人出镜、复杂实拍场景。人像只出现在 UI 内部的封面卡与图标里。
- **字幕**：逐句跟随口播，底部常驻条 + 关键词金墨高亮；切换不闪空白。
- **BGM**：五段情绪曲线，人声为主、音乐垫底；详见 `BGM.md`。
- **可分镜审查**：本次交付 `STORYBOARD.md` + `FRAME-SPEC.md` 供逐帧过审，不自动进入搭建。
- **事实标注**：概念图解（词卡 / 搜索框 / 知识图谱 / 进度条）与真实 UI 录屏在分镜表里逐帧标明，不混用。

## Notes

- **顺序冲突已裁定（2026-11-05，用户确认）**：brief 的人纪顺序「针灸大成 → 神农本草经 → 黄帝内经 → 伤寒 → 金匮」**作废**，改用源码 v1.15 顺序「针灸 → 黄帝内经 → 神农本草经 → 伤寒 / 金匮」。依据：源码第 537–538 行导语「从针灸入手，循《黄帝内经》立根基，以《神农本草经》识药性」、第 698–699 行「如何开始」、以及人纪卡片「人纪·一/二/三/四/五」编号三处互相印证。分镜、字幕、时间轴节点、词卡与 F13 电子书列表已全部按此顺序修正。
- **产品能力边界**：源码无穴位/方剂全文检索、无搜索框、无知识图谱、无进度条、无笔记编辑器。用户 brief 中的「查询」在本片落成为「同一处定位到第几集、哪份讲义」的导航式表述；相关查询界面、词卡、图谱均为**概念图解**，不得宣称是产品功能。
- **入口差异**：天纪三卡与地纪卡为「观看 + 讲义」；人纪 5 卡为「观看 + 笔记」。分镜表按真实分布呈现。
- **免责声明**：源码结语「页面仅提供检索与导航，不存储、不转载任何课程文件。内容涉及医学，仅供研习参考，不能替代专业诊疗」须原样保留在 CTA。
- **运行形状未确认项**：`flow`、画幅、投放渠道、配音方式均为建议值，未获确认；`storyboard` 因本次交付物而成立。
- **已执行**：`hyperframes init` / `lint` / `check` / `snapshot` / `preview` / `render` 均已运行；成片见 `renders/video.mp4`（60.000s / 1920×1080@30fps）。`npx hyperframes usage --json` 返回 `status: unknown`（`unsupported_harness`），用量未知。
- 项目状态卡、决策分类与待确认清单见 `README.md`。
