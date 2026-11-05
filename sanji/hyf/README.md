# 《倪海厦学习天地》60 秒产品解说 · 制作卡索引

> **状态：已渲染并验证（rendered → verified）。**
> 成片位于 `renders/video.mp4`；未发布、未上传、未调用任何外部服务。

## 交付物

| 文件 | 内容 | 对应 HyperFrames 工作流 |
|---|---|---|
| `BRIEF.md` | 产品定位、核心价值、受众、运行形状、事实边界 | Step 0 的意图文档（前置） |
| `STORYBOARD.md` | 60 秒分镜表：时间码 / 画面 / 字幕 / 转场 / 情绪 | Step 3 storyboard |
| `SCRIPT.md` | 18 句口播稿，单句 ≤20 字，逐句绑定画面动作 | Step 3 script |
| `FRAME-SPEC.md` | **HyperFrames 可执行逐帧描述**：主体 + 画面 + 镜头运动 + 字幕出现方式 + `data-*` 接线 | Step 4/5 的输入 |
| `BGM.md` | 五段情绪曲线、配器、BPM、切点、混音与版权建议 | Step 3.1 audio |
| `frame.md` | 设计系统：画布 / 色板 / 字体 / 构图 / 字幕规则 / 动效词汇 / 音频 / 事实边界 | Step 4 设计系统 |

### 复现

```bash
npm install                      # 装 hyperframes@0.9.14
python3 scripts/make_font_subset.py   # 生成字体子集（已入库，通常无需重跑）
python3 scripts/make_bgm.py           # 生成 assets/bgm.wav（不入库）
npx hyperframes render --quality high --fps 30 --output renders/video.mp4
```

> `scripts/make_bgm.py` 需要 `numpy`；`scripts/make_font_subset.py` 需要 `fonttools`。
> 音频与成片不入库：`bgm.wav` 由脚本本地生成，MP4 是渲染产物。

## 项目状态卡（v3 · 2026-11-05 渲染后）

| 字段 | 值 |
|---|---|
| `project_id` | `sanji-explainer-60s` |
| `project_root` | `/workspace/sanji-hyperframes`（工程与 6 份规划文档同目录） |
| `run_id` | `2026-11-05-planning` → `2026-11-05-build` → `2026-11-05-render` |
| `brief` | `BRIEF.md` 存在；`workflow: product-launch-video` / `flow: automation`（建议值，未确认）/ 60s / 1920×1080 |
| `shots` | 17 个 Frame，已全部落为 `index.html` 中的 `class="clip"` |
| `assets` | 11 张产品图 + 本地源码渲染的 `ui-home.png` / `ui-full.png` + `gsap.min.js` + **`SanjiSerif-subset.ttf`（285 KB 字体子集，替代 26 MB 完整 ttc）** + 程序化 `bgm.wav`（本地生成，不入库） |
| `steps` | 规划文档 ✅ → `init` ✅ → 设计系统 `frame.md` ✅ → 逐帧搭建 ✅ → `check` ✅ → `snapshot` ✅ → `preview` ✅ → **`render` ✅（用户批准后执行）** → **成片校验 ✅** |
| `outputs` | 6 份 Markdown + `frame.md` + `index.html` + `scripts/make_bgm.py` + `assets/` + 25 张静帧 / 3 张 contact sheet + **`renders/video.mp4`（16.6 MB，60.000s，1920×1080@30fps，h264+aac；已按源码顺序修订并重渲）** + `renders/contact-sheet.jpg` + 3 张原分辨率关键帧 |
| `blockers` | 无阻塞项阻断成片。待用户裁定项仍开放：学习顺序 A/B、画幅与投放渠道、是否补中文旁白 VO（HeyGen 未登录 + Kokoro 未装） |
| `next_action` | 用户审阅 `renders/video.mp4`；如需改动，指定帧号即可定位重渲 |

状态机：`planned → checked → previewed → rendered → verified`。当前为 **`verified`**（`render` 成功、`check` 0 错误、静帧与成片抽帧均已目视复核、音频电平与时长已实测）。

## 决策分类（不把建议冒充确认）

| 类型 | 内容 |
|---|---|
| **user-confirmed** | 60 秒；五段节奏 Hook 0–3 / Pain 3–11 / Solution 11–46 / Result 46–56 / CTA 56–60；产品定位与受众；口播单句 ≤20 字且逐句对应画面动作；优先 UI 录屏 / 知识图谱 / 词卡 / 时间轴动效；避免真人出镜与复杂实拍；交付 5 类文档；中文；**人纪顺序采用源码 v1.15（针灸 → 黄帝内经 → 神农本草经 → 伤寒论 → 金匮要略），2026-11-05 裁定** |
| **model-proposed（待确认）** | 画幅 1920×1080 / 16:9、30fps；`flow: automation`、`mode: collaborative`；17 帧切分；中文男声旁白；宣纸金墨视觉体系；穴位/方剂「查询」用概念词卡表现 |
| **unknown / 待决** | ① 投放渠道未指定 ② 是否要真实 UI 录屏还是静态截图重建 ③ 是否加中文旁白音轨（用户提到「口播」但未确认配音方式） |

## 事实边界（重要）

**产品真实功能**，全部可由 `index.html` v1.15 验证，可作为「UI 录屏」画面：

- 三大体系：天纪（天机道 / 人间道 / 地脉道）、人纪（针灸 / 黄帝内经 / 神农本草经 / 伤寒论 / 金匮要略 / 仲景心法 / 医案，共 7 部）、地纪「未竟之章」
- 课程卡「观看」→ B 站合集；App 内 Toy SDK 原生播放 + 分集面板（集数 / 时长）
- 「讲义」入口（天纪三卡、地纪卡）→ 金山文档；「笔记」入口（人纪 5 卡）→ 会员购
- 电子书区：5 本读书笔记 + 《三纪》全套资源包
- 「如何开始」建议顺序卡片

**不是产品功能**（用户 brief 提到，但源码不存在），只能做**概念图解 / 信息图**，不得标为产品 UI 录屏、不得在口播中宣称产品具备：

- 穴位 / 方剂全文检索、搜索框、知识图谱、词卡、学习进度条、笔记编辑器、学习账号系统
- 源码结语原文：「页面仅提供检索与导航，不存储、不转载任何课程文件」——这里的「检索」是分类导航，不是内容检索

因此 Solution 段「课程、讲义、查询、笔记在同一处打通」中的「查询」，本方案落成对**真实能力**的表述：*同一处定位到第几集、哪份讲义*（导航式定位），并额外用**概念词卡**做视觉隐喻。产品不宣称具备穴位/方剂搜索。

## ✅ 顺序冲突（已裁定 2026-11-05）

| 来源 | 人纪学习顺序 |
|---|---|
| 你的 brief（原） | 针灸大成 → ~~神农本草经 → 黄帝内经~~ → 伤寒论 → 金匮要略 |
| 源码 v1.15「如何开始」（第 698–699 行） | 针灸 → **黄帝内经 → 神农本草经** → 伤寒 / 金匮，天纪可并行旁听 |

**你的裁定：采用源码顺序** —— 针灸之后是黄帝内经，然后才是神农本草、伤寒论、金匮要略。

源码三处互相印证，不是单点推断：

1. **导语**（第 537–538 行）：「从针灸入手，循《黄帝内经》立根基，以《神农本草经》识药性，再由《伤寒论》《金匮要略》入经方之门」
2. **「如何开始」卡片**（第 698–699 行）：「先《针灸》建立身体观，再《黄帝内经》立医理，随后《神农本草经》识药，最后进《伤寒》《金匮》学方证」
3. **人纪卡片编号**：针灸=人纪·一、黄帝内经=人纪·二、神农本草经=人纪·三、伤寒论=人纪·四、金匮要略=人纪·五

**已按此顺序修正**：`index.html` 的 F07 时间轴标签、F08 词卡（针灸 → 黄帝内经 → 神农本草经）、F14 全景轴、F13 电子书列表、F07 概念标注与「如何开始」小窗；`SCRIPT.md` Line 8 改为「针灸起手，内经、本草接续。」（13 字，时长不变）；`STORYBOARD.md` / `FRAME-SPEC.md` / `BRIEF.md` 同步。

> 课程名差异仍在：源码课程名为「针灸」，brief 写「针灸大成」；片中的封面/分集标题按源码真实文案保留「针灸」。

源码免责声明须原样保留在 CTA：「仅供研习参考，不能替代专业诊疗」。

## 限制与证据（含执行记录）

- `npx hyperframes usage --json` 两次读取均返回 `{"status":"unknown","reason":"unsupported_harness"}` → **用量未知，不猜测额度**，也未因此擅自渲染。
- CLI 实测 `hyperframes v0.9.14` 可用；`doctor`：Node 22.13.1 / FFmpeg / FFprobe / 系统 Chrome / Docker ✓；whisper-cpp 与 Kokoro TTS 缺失（可选）。
- **宿主适配说明（重要）**：本包以 `.codebuddy-plugin/plugin.json`（`name: hyperframes-director`）安装，而 `plugin-cli.mjs` 启动器只认 `name === "hyperframes"` 的 manifest，实测报 `No HyperFrames plugin manifest found`。因此按 `workbuddy-v2-adapter.md` 允许的**离线工程路径**，改用随包同版本 CLI 的 standalone 调用 `npx hyperframes`；**未运行** `skills update` / `skills check` / `npx skills add`（插件规则禁止，且 workflow 与领域 Skill 已随包内置）。
- **未调用的上游自动化脚本（未测路径，如实记录）**：`build-frame.mjs`、`audio.mjs`、`captions.mjs`、`stage-assets.mjs`、`frame-packets.mjs`、`transitions.mjs`、`assemble-index.mjs`。原因：本工程 `STORYBOARD.md` 是规划层自定义格式，与这些脚本的解析契约不耦合；改用手写 `frame.md` + 单文件 `index.html`，并以 CLI 的 `lint` / `check` / `snapshot` / `preview` 验证。脚本文件随包存在，但**未假装执行**。
- **登录态**：`hyperframes auth status` → `Not signed in to HeyGen (non-interactive)`。VO/BGM 不走 HeyGen；BGM 用本地程序化合成，VO 未生成。
- **已执行命令证据**：`init`（`--example blank --resolution landscape --non-interactive --skip-skills`）→ `lint`（0 错误）→ `check`（**Layout 0 错误 / Contrast 66→66 通过 WCAG AA / Motion 0 / Runtime 0 / Audio 0**）→ `snapshot --at` 17 个帧中点 + 6 个字幕切点 → `preview --background` + `preview --status`（PID 24249）。
- **静帧目视复核**：25 张静帧、3 张 contact sheet；中文字体、素材、字幕均正常，无空白字幕条、无图片加载失败、无黑帧。F13 两个面板重叠、F17 免责小字被字幕带遮挡，均在 `check` 通过前修复并复验。字幕切换点（2.99/3.01、10.99/11.01、57.99/58.01s）7 格全部有文字、切换连贯。
- **BGM 实测**：`assets/bgm.wav` 60.000s / 48kHz / stereo / 峰值 -3.00 dBFS / 零削波；`scripts/make_bgm.py` 可复现（固定种子、纯 numpy 离线合成）。
- **字体子集化（入库前处理）**：HyperFrames 的 lint 要求 `@font-face` 必须带 `url()` 源（只写 `local()` 报 `font_face_local_only`；写系统字体名报 `font_family_without_font_face`），即字体文件必须随工程走，才能保证任何机器渲染出同样字形。完整 `NotoSerifCJK.ttc` 26 MB 会让 clone 变慢，故用 `scripts/make_font_subset.py` 扫 `index.html` 实际用到的 502 个字符（含 ASCII 与中文标点）抽成 `assets/SanjiSerif-subset.ttf`（285 KB，压缩 90%）。**像素验证**：与完整 ttc 渲染对比，同帧最大差异 82/255、平均 1.72/255，差异全部是 1–2 px 宽的笔画边缘抗锯齿微差，放大比对字形完整无缺字；`check` 由 1 error（`font_family_without_font_face`）变为 **0 error / Check passed**。脚本固定 `head.created/modified` 时间戳，**字节级可复现**（两次生成 md5 一致）。
- **文档层机械校验已通过（24 项 / 0 失败）**：帧时长合计 60.0s、时间码 0→60 连续、18 句口播最长 15 字、STORYBOARD/SCRIPT 逐句文案一致、FRAME-SPEC 的 17 组 `data-start`/`data-duration` 与分镜一致、BGM 切点覆盖全部帧起点。
- **保留的 warning（已 review，非错误）**：lint 24 条（19 条「建议拆子合成」、2 条同图多 img 的媒体探测提示、2 条轨道过密、1 条文件偏大）；craft 14 条（装饰碎片文字停留时间短、小字角标低于 28px 阅读下限）。均为可读性 / 风格建议，不影响渲染正确性；片尾免责声明按源码原意在 60s 结构下只停留 4s，属已记录的取舍。
- 本次为独立的新规划与工程，**未改动**既有的 `sanji-video/` Remotion 成片与 GitHub PR，不复用。
- 本文档不含任何凭证、不写入远程仓库；**已渲染**（用户明确批准「没问题，继续吧」之后），**未发布、未上传、未调用云渲染**。

## 渲染执行记录（2026-11-05）

### 修订：人纪顺序按源码 v1.15 修正（用户裁定后重渲）

用户指出「针灸之后是黄帝内经，然后才是神农本草、伤寒论、金匮要略」。核对源码 v1.15 后确认与源码一致，原成片用的是 brief 里的旧顺序（针灸 → 本草 → 内经 → 伤寒 → 金匮），已修正。

**改动清单**：

| 文件 | 改动 |
|---|---|
| `index.html` F07 | 五个时间轴标签改为 针灸 → 黄帝内经 → 神农本草经 → 伤寒论 → 金匮要略；右上角小窗补写源码真实建议顺序；概念标注由「顺序按 brief」改为「顺序按源码「如何开始」」 |
| `index.html` F08 | 三张词卡改为 针灸 → 黄帝内经 → 神农本草经（`cover-neijing.jpg` 与 `cover-bencao.jpg` 随位置对调，`im14`/`im15` 的 id 与图片同步） |
| `index.html` F14 | 全景轴五个标签同上修正 |
| `index.html` F13 | 电子书列表第三项由《神农本草经》辑录改为《黄帝内经》读书笔记（源码第 653 行的真实措辞与顺序） |
| `index.html` F04 | 讲义浮窗的条目名改为源码真实措辞《针灸》读书笔记 / 《黄帝内经》读书笔记（原用「针灸大成笔记 / 神农本草经辑录」，两者均非源码条目名） |
| `index.html` F13 | 同上，「《针灸大成》读书笔记 / 讲义」改为源码的「《针灸》读书笔记 / 讲义」（源码课程名为「针灸」，条目名随之对应） |
| `index.html` 字幕 | Line 8 改为「针灸起手，内经、本草接续。」（13 字，时长不变） |
| `SCRIPT.md` / `STORYBOARD.md` / `FRAME-SPEC.md` / `BRIEF.md` | 逐句文案与顺序表述同步；Line 8 的「待确认」改为「已裁定」并记录三处源码依据 |
| `README.md` | 冲突段落由「需你裁定」改为「✅ 已裁定」，记录依据与改动清单 |

**未改动**：F02/F04 痛点帧中的「本草 · 顺序?」碎片文字 —— 那是「资料零散、路径不清」的痛点隐喻，不是顺序陈述；F07 知识图谱（`gnode`）原本就是正确顺序。

**修正后校验**：`lint` 0 错误 / 24 warning（与修正前同）；`check` **通过** — Layout 0 错误、Contrast 66/66 WCAG AA、Motion 0、Runtime 0、Audio 0；新增 1 条 craft warning（扩写后的「如何开始」小窗 24 词停留 4s 低于 5.77s 阅读下限），为佐证顺序而保留。静帧目视复核 F04（9.5s）/ F07（21s）/ F08（25s）/ F13（44s）/ F14（48s）五帧，顺序、字幕、条目用词均正确。

**机械校验（18 项 / 0 失败）**：18 句字幕与 `SCRIPT.md` 逐句一致且全部 ≤20 字；F07 / F08 / F14 三处节点顺序均为「针灸 → 黄帝内经 → 神农本草经 →（伤寒论 → 金匮要略）」；5 张词卡封面与课程名一一对应（`wc1` 针灸 / `wc2` 黄帝内经 / `wc3` 神农本草经 / `wc4` 伤寒论 / `wc5` 金匮要略）；旧顺序表述在四份文档中均已清除；帧时长合计 60.00s。

**修订后重渲**：`render` 耗时 1m 45.1s，成片 16.6 MB / 60.000s / 1920×1080@30fps / h264+aac，真峰值 -12.4 dBFS，无削波；抽帧确认 21s / 25s / 44s / 48s 四帧的顺序已改正，17 帧 contact sheet 全部正常。

### 首轮渲染

**最终命令**（`renders/video.mp4`，用户批准后执行）：

```bash
export HYPERFRAMES_BROWSER_PATH=/usr/bin/google-chrome
export HYPERFRAMES_FFMPEG_PATH=/root/.pyenv/versions/3.11.1/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
export HYPERFRAMES_FFPROBE_PATH=/usr/local/bin/ffprobe
npx --yes hyperframes@0.9.14 render --skill=product-launch-video --quality high --fps 30 --output renders/video.mp4
```

**途中三次失败与修复（均已记录，未绕过）**：

| 失败 | 原因 | 处理 |
|---|---|---|
| `No HyperFrames plugin manifest found` | 启动器只认 `name === "hyperframes"` 的 manifest | 走 adapter 允许的 standalone `npx hyperframes` 路径 |
| `npm 404 hyperframes-0.9.15.tgz` | 镜像源 `latest` 指向未发布的 0.9.15 | 改用项目已 pin 的 `hyperframes@0.9.14` |
| `Chrome not found`（下载 storage.googleapis.com stalled 60s） | `chrome-headless-shell` 下载源不通 | 设 `HYPERFRAMES_BROWSER_PATH=/usr/bin/google-chrome` |
| `MP4 H.264 encoder unavailable` | 系统 ffmpeg 为定制构建（`--disable-libx264`） | 用 pip 内置的 `imageio-ffmpeg` 静态 ffmpeg 7.0.2（含 libx264/libx265/aac），经 `HYPERFRAMES_FFMPEG_PATH` 注入 |

**渲染输出（CLI 自报）**：`16.6 MB · 1m 0.0s video · rendered in 1m 44.9s`；`captureMode: screenshot`、`software gpu`、1800/1800 帧完成、static-dedup 复用 769 帧（43%）。因无 `chrome-headless-shell`，走逐帧截图回退路径（性能路径需 BeginFrame，本次不可用，**不影响画面正确性**）。

**成片实测校验（`ffprobe` / `ffmpeg` / numpy）**（下表为**修订重渲后**的实测值，与首轮一致）：

| 项 | 实测值 | 判定 |
|---|---|---|
| 分辨率 / 帧率 | 1920×1080 / 30/1 | ✅ 合规 |
| 时长 / 帧数 | 60.000000s / 1800 帧 | ✅ 与 60s 结构一致 |
| 视频编码 | h264 | ✅ |
| 音频 | aac / 48000 Hz / 2ch / 60.000s | ✅ 音轨存在且等长 |
| 码率 | 2.32 Mbps | ✅ |
| 真峰值 | **-12.40 dBFS** | ✅ 零削波 |
| 整体响度 | -25.1 LUFS（LRA 6.1 LU） | ✅ 无过度压缩 |
| 静音扫描 | 仅 0–1.6s（设计内淡入）与 59.6s+（淡出）；45.9s 处 0.1s 呼吸为**源 BGM 自身乐句断口**（源 WAV 同位置同为 -33.5→-12.3 dB），非渲染缺陷 | ✅ |
| 抽帧目视 | 17 格 contact sheet + 原分辨率帧（21s / 25s / 44s / 48s / 59.5s） | ✅ 无黑帧、无空白字幕条、无重叠、无遮挡 |

**修订重渲**：首轮成片渲染后用户指出人纪顺序有误（针灸之后应为黄帝内经），按源码 v1.15 修正全部相关画面与文案后重新渲染，耗时 1m 45.4s，规格与首轮完全一致。抽帧确认 21s / 25s / 44s / 48s 四帧的节点顺序与字幕均已改正。

**未生成 / 未执行**：中文旁白 VO（HeyGen 未登录、Kokoro 未装）、真实产品 UI 动态录屏（用静态 `ui-home.png` / `ui-full.png` 降级）、发布或上传。

## 下一步（需你审阅 / 授权）

1. **审阅成片**：`renders/video.mp4`（1920×1080 / 30fps / 60.000s / 16.6 MB）；`renders/contact-sheet.jpg` 是 17 帧一览。Studio 预览仍在 `http://localhost:3002/#project/sanji-hyperframes` 运行，可直接在画布上改文字、拖动剪辑。
2. **改稿方式**：给我帧号与时间码即可定位重渲（帧号 → 时间码对照见 `STORYBOARD.md`；字幕句序见 `SCRIPT.md`）。
3. 裁定仍开放的两项：画幅与投放渠道、**是否补中文旁白音轨**（当前为纯字幕 + BGM）。
4. 若要补配音：先解决本地 TTS 引擎（安装 Kokoro，或授权走外部 TTS 接口），再按 `SCRIPT.md` 的 18 句词级时间戳对齐，并把 BGM 做 ducking（`BGM.md` §5 已给参数）。
5. 发布 / 上传 / 提交 PR 等对外动作**均未执行**，需要时另行授权。
