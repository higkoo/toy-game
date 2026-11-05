---
format: 1920x1080
duration: 60s
message: "一页索引，把散落的倪师课程串成一条能反复走的学习路径"
arc: Hook → Pain → Solution → Result → CTA
audience: 中医/国学自学者与需反复温习的进阶学习者
mode: collaborative
note: "src 均为 Step 5 的规划目标路径，文件尚未创建；全部帧 status=outline"
---

> 17 个 Frame，累计 60.0s。`visual_type` 区分**真实产品 UI**与**概念图解**——后者不是产品功能，不得当作录屏使用。
> 字幕列即当句口播文本，逐句跟随；转场与情绪按用户指定的五段节奏设计。

## Frame 01 — Hook · 越学越散

- timecode: 00:00 – 00:03
- duration: 3s
- transition_in: cut
- scene: 满屏散乱资料卡飞散，一句大字砸入
- voiceover: "倪师资料铺天盖地，越学越散？"
- subtitle: 倪师资料铺天盖地，越学越散？
- emotion: 困惑 · 刺痛 · 冷
- visual_type: concept-diagram
- status: outline
- poster: 2s
- src: compositions/frames/01-hook.html

冷开场，无音乐。十余张半透明「资料卡」（视频缩略、PDF、链接、笔记碎片）从画面四角无序漂入、互相遮挡；第 1.6s 全部定格，中央大字「越学越散？」以金墨重击落下，背景卡降饱和度退到 15% 不透明度。**不出现真人**，不使用产品人像素材。这是痛点的视觉隐喻，不是产品界面。

## Frame 02 — Pain · 分散与版本混乱

- timecode: 00:03 – 00:06
- duration: 3s
- transition_in: crossfade
- scene: 多个内容窗口错位漂浮，版本号标签互相冲突
- voiceover: "视频散落各处，版本还乱。"
- subtitle: 视频散落各处，版本还乱。
- emotion: 焦躁 · 碎片化
- visual_type: concept-diagram
- status: outline
- poster: 4.5s
- src: compositions/frames/02-pain-scatter.html

四到五个浏览器/播放器窗口轮廓错位排列，同一课程名的「480i / 720p / 1080p / 无删减 / 删减版」标签逐个闪现又互相覆盖。镜头轻微手持式漂移（幅度 ≤8px，确定性关键帧，不用随机）。视觉上「很多，但没有一个是对的」。

## Frame 03 — Pain · 学了后面忘了前面

- timecode: 00:06 – 00:08.5
- duration: 2.5s
- transition_in: cut
- scene: 学习进度条走到 80% 后倒退，前面的节点褪色
- voiceover: "学了后面，忘了前面。"
- subtitle: 学了后面，忘了前面。
- emotion: 疲惫 · 失落
- visual_type: concept-diagram
- status: outline
- poster: 7.2s
- src: compositions/frames/03-pain-forget.html

一条横向进度条从 0 走到 80%，随后金色填充**倒退**到 35%；已完成的节点逐个变灰、边缘虚化。进度条是概念图解（产品无学习进度功能），不暗示产品提供进度记录。

## Frame 04 — Pain · 查讲脱节

- timecode: 00:08.5 – 00:11
- duration: 2.5s
- transition_in: crossfade
- scene: 搜索框输入「合谷」，加载转圈无结果；讲义窗口在画面另一端
- voiceover: "查个穴位、找个方剂，翻遍全网。"
- subtitle: 查个穴位、找个方剂，翻遍全网。
- emotion: 无力 · 翻找感
- visual_type: concept-diagram
- status: outline
- poster: 9.8s
- src: compositions/frames/04-pain-search.html

左侧搜索框逐字打出「合谷」，下方结果区持续空转；右侧一张「讲义」文档窗口被推到画面边缘并拉远，中间用断裂的虚线连接。**明确标注为概念图解**：源码无穴位/方剂检索与搜索框，此帧只表达痛点，不宣称产品具备该能力。

## Frame 05 — Solution · 一页收齐

- timecode: 00:11 – 00:15
- duration: 4s
- transition_in: wipe
- scene: 产品首页 UI 录屏，散卡收拢成三大体系导航
- voiceover: "一页收齐人纪与天纪。"
- subtitle: 一页收齐人纪与天纪。
- emotion: 转折 · 豁然 · 秩序初现
- visual_type: ui-capture
- status: outline
- poster: 13.5s
- src: compositions/frames/05-solution-home.html

**首个真实产品画面**。以产品首页截图为底（宣纸底 + 顶部三大体系数据条），把 Frame 01 的散卡从四周吸附、缩放、整齐落位到「天纪 / 人纪 / 地纪」三栏。镜头由 1.15× 缓慢回到 1.0×（推近后的回正），背景噪点颗粒保持静止。此处完成全片情绪转折。

## Frame 06 — Solution · 两套体系

- timecode: 00:15 – 00:19
- duration: 4s
- transition_in: cut
- scene: 知识图谱展开，真实课程名分两列点亮
- voiceover: "七部人纪，三路天纪。"
- subtitle: 七部人纪，三路天纪。
- emotion: 清晰 · 可掌控
- visual_type: mixed
- status: outline
- poster: 17.2s
- src: compositions/frames/06-solution-map.html

以真实课程名生成知识图谱：左列「人纪」7 个节点（针灸 / 黄帝内经 / 神农本草经 / 伤寒论 / 金匮要略 / 仲景心法 / 医案），右列「天纪」3 个节点（天机道 / 人间道 / 地脉道），地纪以浅色单节点附在下方并标「未竟」。节点用真实课程封面缩略。图谱是**信息图**（产品无图谱界面），但节点文字与封面均为源码真实内容。

## Frame 07 — Solution · 顺序排好

- timecode: 00:19 – 00:23
- duration: 4s
- transition_in: crossfade
- scene: 学习路径时间轴从左到右逐节点点亮
- voiceover: "顺序按倪师教学逻辑排好。"
- subtitle: 顺序按倪师教学逻辑排好。
- emotion: 笃定 · 有方向
- visual_type: mixed
- status: outline
- poster: 21.5s
- src: compositions/frames/07-solution-path.html

一条金色时间轴贯穿画面，五个人纪节点依次浮现并连成线；右上角小窗叠放源码「如何开始」卡片的真实截图作为依据。**顺序按源码 v1.15**（针灸 → 黄帝内经 → 神农本草经 → 伤寒论 → 金匮要略），已由用户裁定（2026-11-05）：源码第 537–538 行导语、第 698–699 行「如何开始」、人纪卡片「人纪·一/二/三/四/五」编号三处互相印证。

## Frame 08 — Solution · 前段路径

- timecode: 00:23 – 00:27
- duration: 4s
- transition_in: cut
- scene: 前三个节点依次高亮并弹出对应课程封面词卡
- voiceover: "针灸起手，内经、本草接续。"
- subtitle: 针灸起手，内经、本草接续。
- emotion: 稳步推进
- visual_type: mixed
- status: outline
- poster: 25s
- src: compositions/frames/08-solution-path-a.html

镜头沿时间轴**平移（pan）**跟随高亮：针灸 → 黄帝内经 → 神农本草经，每点亮一个节点，上方弹出对应真实课程封面词卡（带「观看」角标），0.8s 后缩小归位。词卡素材为真实封面，卡片弹出动效为信息图表现。

## Frame 09 — Solution · 后段路径

- timecode: 00:27 – 00:31
- duration: 4s
- transition_in: cut
- scene: 后两个节点点亮，伤寒 / 金匮封面并排
- voiceover: "再进伤寒、金匮学方证。"
- subtitle: 再进伤寒、金匮学方证。
- emotion: 承接 · 略上扬
- visual_type: mixed
- status: outline
- poster: 29s
- src: compositions/frames/09-solution-path-b.html

镜头继续右移，伤寒论、金匮要略两节点点亮，两张真实封面并排放大 0.6s 后回落到轴上；金色路径线延伸填满整条时间轴，暗示「五部走完」。

## Frame 10 — Solution · 双线并行

- timecode: 00:31 – 00:34
- duration: 3s
- transition_in: crossfade
- scene: 人纪主轴与天纪副轴上下并行，同速前进
- voiceover: "天纪并行，不必求快。"
- subtitle: 天纪并行，不必求快。
- emotion: 从容 · 不催
- visual_type: mixed
- status: outline
- poster: 32.5s
- src: compositions/frames/10-solution-dual.html

画面分上下两轨：上轨人纪五节点（已点亮），下轨天纪三节点以略低亮度同速推进；两轨之间用细虚线连接，标注「并行旁听」。天纪章节封面 `cover-tianji.jpg` 作为轨头缩略。对应源码「天纪可并行旁听，不必求快」的真实表述。

## Frame 11 — Solution · 点开即播

- timecode: 00:34 – 00:38
- duration: 4s
- transition_in: cut
- scene: 点击课程卡 → 分集面板从底部升起
- voiceover: "点课程，App 内直接播。"
- subtitle: 点课程，App 内直接播。
- emotion: 利落 · 顺手
- visual_type: ui-capture
- status: outline
- poster: 36.5s
- src: compositions/frames/11-solution-play.html

**真实 UI 录屏**。手机 Mock 内展示课程卡，光标点击「观看」，底部按源码 `.sheet` 样式升起分集面板（集数 + 时长列表），面板逐行淡入。镜头对手机区域做 1.0→1.35× **推近（push-in）**，其余区域压暗。对应 README 的 Toy SDK 原生播放与 `openSheet` 分集面板。

## Frame 12 — Solution · 讲义与笔记在一旁

- timecode: 00:38 – 00:42
- duration: 4s
- transition_in: crossfade
- scene: 卡片底部「观看 / 讲义 / 笔记」入口依次高亮
- voiceover: "讲义、笔记就在一旁。"
- subtitle: 讲义、笔记就在一旁。
- emotion: 温和 · 距离感消失
- visual_type: ui-capture
- status: outline
- poster: 40s
- src: compositions/frames/12-solution-links.html

**真实 UI 录屏**。镜头沿卡片底栏横移，依次点亮真实入口：天纪卡「观看 + 讲义」、人纪卡「观看 + 笔记」、地纪卡「观看 + 讲义」。每个入口高亮时弹出极小的目标标签（B 站合集 / 金山文档 / 会员购），标明跳转去向。不虚构「站内笔记编辑器」。

## Frame 13 — Solution · 一眼定位

- timecode: 00:42 – 00:46
- duration: 4s
- transition_in: cut
- scene: 分集面板与资源包列表并排，定位高亮；一张概念词卡弹出
- voiceover: "哪一集、哪份讲义，一眼定位。"
- subtitle: 哪一集、哪份讲义，一眼定位。
- emotion: 收束 · 可信
- visual_type: mixed
- status: outline
- poster: 44s
- src: compositions/frames/13-solution-locate.html

左侧真实分集面板（集数列表）、右侧真实电子书区（5 本读书笔记 + 《三纪》全套资源包），同一课程名两侧同步高亮，表示「视频 ↔ 讲义/笔记」可在同一页对上。右上方额外弹出一张**概念词卡**（如「合谷 · 手阳明大肠经」）作为「随查随用」的视觉隐喻——**词卡为概念图解，不是产品检索结果**，画面需与真实 UI 有明确视觉区分（虚线边框 + 「示意」角标）。

## Frame 14 — Result · 路径清晰

- timecode: 00:46 – 00:50
- duration: 4s
- transition_in: crossfade
- scene: 完整学习路径整条高亮，进度指示走满
- voiceover: "路径清晰，不再纠结从哪开始。"
- subtitle: 路径清晰，不再纠结从哪开始。
- emotion: 松弛 · 安心
- visual_type: mixed
- status: outline
- poster: 48s
- src: compositions/frames/14-result-clear.html

镜头**拉远（pull-back）**到完整路径全景，五个节点全部点亮、连线贯通；起点节点加一圈呼吸光晕，回答「从哪开始」。进度指示为信息图表现（非产品功能），仅作情绪收束，不加文字宣称。

## Frame 15 — Result · 反复温习

- timecode: 00:50 – 00:53
- duration: 3s
- transition_in: cut
- scene: 光标两次回到同一节点，节点保持点亮不熄灭
- voiceover: "随查随用，反复温习。"
- subtitle: 随查随用，反复温习。
- emotion: 温和 · 稳定
- visual_type: mixed
- status: outline
- poster: 51.5s
- src: compositions/frames/15-result-revisit.html

镜头回到路径中段，光标回退到「伤寒论」节点再前进，节点始终保持点亮（与 Frame 03 的「褪色倒退」形成呼应）。用「不丢线」表达反复温习，不暗示产品有进度存档。

## Frame 16 — Result · 串成一条线

- timecode: 00:53 – 00:56
- duration: 3s
- transition_in: crossfade
- scene: 知识图谱的散点连线收束成一条金色主线
- voiceover: "一条线，把散落的课串起来。"
- subtitle: 一条线，把散落的课串起来。
- emotion: 舒展 · 完成感
- visual_type: concept-diagram
- status: outline
- poster: 54.5s
- src: compositions/frames/16-result-thread.html

Frame 06 的图谱节点重新出现，杂乱连线逐条消失、收束成一条贯穿画面的金线；与 Frame 01 的散乱卡片形成首尾对照。背景宣纸颗粒轻微提亮，为 CTA 让出空间。

## Frame 17 — CTA · 打开与收藏

- timecode: 00:56 – 01:00
- duration: 4s
- transition_in: crossfade
- scene: 产品名 + 网址 + 图标落款，收藏动效，免责小字
- voiceover: "打开倪海厦学习天地。" / "收藏这一页，随时回来。"
- subtitle: 打开倪海厦学习天地。 → 收藏这一页，随时回来。
- emotion: 邀请 · 轻收
- visual_type: ui-capture
- status: outline
- poster: 58.5s
- src: compositions/frames/17-cta.html

居中落款：品牌图标 `icon.png` + 产品名「倪海厦学习天地」+ 网址 `bilibili.com/toy/sanji`；右上角一个极简「收藏」星标点亮。底部保留源码免责声明原意小字：「本页仅提供检索与导航，不存储、不转载任何课程文件。内容涉及医学，仅供研习参考，不能替代专业诊疗。」两句口播各占 2s，字幕条不重载、只换文字。末 0.4s 留给长磬收尾。

---

## 节奏核对

| 段 | 时间 | 帧 | 时长 | 句数 |
|---|---|---|---|---|
| Hook | 0–3s | F01 | 3s | 1 |
| Pain | 3–11s | F02–F04 | 8s | 3 |
| Solution | 11–46s | F05–F13 | 35s | 9 |
| Result | 46–56s | F14–F16 | 10s | 3 |
| CTA | 56–60s | F17 | 4s | 2 |
| **合计** | **60s** | **17 帧** | **60s** | **18 句** |
