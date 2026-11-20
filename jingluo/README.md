# 经络图谱 · 3D

可旋转、缩放、点选的 3D 人体十四经脉学习图谱。人体采用 CC0 MakeHuman 真实解剖网格，并加不透明医学运动着装；经脉以透视覆盖方式绘制，点选穴位可查看编号、定位、主治与循行。

## 功能

- 十四经脉完整展示：十二正经 + 任脉 + 督脉，双侧经脉自动镜像。
- 161 个常用代表穴位，点选后查看编号、定位、主治与所属经脉循行。
- 真实人体网格 + 医学运动上衣 / 高裁短裤，兼顾解剖形态与公开发布审核。
- 拖拽旋转、滚轮 / 双指缩放、正背面与左右侧视角。
- 手部特写：独立高精度手模，显示五指三节与拇1/2、食1/2/3、中1/2/3、环1/2/3、小1/2/3 标签；手机端用“拇/食/中/环/小”切换，只显示当前手指三节，避免标签堆叠。
- 18 个腕以下穴位带“解剖定位”，写明左右手、具体手指、第几节、桡侧/尺侧与掌侧/背侧。
- 十二地支子午流注罗盘底座：十二地支、十二时辰与对应脏腑标签始终朝向相机，便于斜视角阅读。
- 经脉筛选：只看一条经脉，再点一次恢复全身；足太阳膀胱经、督脉自动转到背面。
- 穴位搜索：支持中文名与编号，如“合谷”“LI4”。
- 聚焦穴位、上一穴 / 下一穴、随机一穴。
- 桌面与手机响应式；手机端穴位信息为底部抽屉。

## 数据范围

每条经脉选取常用代表穴位，共 161 个；不是 361 个经穴的全集。其中 18 个腕以下穴位按五指三节重建了坐标，并补充指节级解剖定位。定位按经络腧穴常用体表定位整理，主治为学习向的概述，不构成诊断或治疗建议。

## 操作

| 操作 | 桌面 | 手机 |
| --- | --- | --- |
| 旋转 | 按住拖动 | 单指拖动 |
| 缩放 | 滚轮 / ＋－按钮 | 双指捏合 / ＋－按钮 |
| 查看穴位 | 点击发光点 | 点击发光点 |
| 筛选经脉 | 左侧列表 | 顶部横向列表 |
| 手部特写 | 右上“指”按钮 | 顶部“指”按钮 |
| 手指切换 | 全部指节标签 | 拇/食/中/环/小 |

## 实现

- `src/index.html`：界面与样式。
- `src/data.*.js`：十四经脉坐标与穴位资料（含手部 `ana` 解剖定位）。
- `src/app.*.js`：three.js 场景、真实人体、医学着装、五指三节手模、经脉透视覆盖、子午流注罗盘、屏幕空间点选与相机控制。
- `src/body.*.js`：CC0 MakeHuman hm08 基础网格的浏览器打包数据。
- `src/three.global.*.js`：three.js 全局构建（MIT License，Copyright 2010-2025 three.js authors）。
- `assets/poster.jpg`：1200×900 发布封面。
- `assets/icon.png`：512×512 发布图标。

经脉线使用 `TubeGeometry` + `CatmullRomCurve3`；穴位点击把所有穴位投影到屏幕后取最近点，避免密集穴位误选。投影结果带缓存，避免重复射线计算。

## 人体模型来源与许可

人体基础网格为 **MakeHuman hm08 basemesh**，经 [`aicuc/3d-acupoint-atlas`](https://github.com/aicuc/3d-acupoint-atlas) 适配打包，原模型以 **CC0 1.0 Universal** dedication 发布。完整说明见 [`licenses/HUMAN-MODEL-LICENSE.txt`](licenses/HUMAN-MODEL-LICENSE.txt)。

本项目对网格做了肩关节姿态调整、坐标缩放与体表投影；手部特写、医学着装、穴位与经脉数据由本项目单独实现。参考项目：
- [`aicuc/3d-acupoint-atlas`](https://github.com/aicuc/3d-acupoint-atlas)（MIT，人体网格与子午流注交互参考）
- [`zmtom18988tmd/chinese-acupuncture-point`](https://github.com/zmtom18988tmd/chinese-acupuncture-point)（穴位与循行参考）
- [`Z-Anatomy/Models-of-human-anatomy`](https://github.com/Z-Anatomy/Models-of-human-anatomy)（解剖结构参考，CC BY-SA 4.0，本项目未直接打包其模型）
