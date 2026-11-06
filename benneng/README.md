# 郭生白 · 视频全集（本能论）

TOY 静态页面，入口 `src/index.html`；`toy update` 打包 `src/` 整体上传。

- `src/js/app.js`：合集切换、章节列表、已看进度、SDK 原生导航。
- `src/data/videos.js`：4 个合集共 164 集数据。
- `src/css/app.css`：样式与首图轮播。
- `src/img/`：封面、人像、icon、poster。

## 版本

当前源码版本：`v1.0`

## 榜单

接 TOY 原生排行榜（`toy.submitScore`），统一用 1 号榜（`board: 1`）。

- 每打开一次页面计 1 分，累计不清零（"看过一次，计 1 分，一直累计"）。
- 15 秒内重复打开不重复计分，避免刷新刷分。
- 累计分存 `localStorage`；`submitScore` 传的是**绝对值**，不是增量。
- 本页 SDK 用 `defer` 加载，模块会轮询等待就绪；非 TOY 容器静默跳过。

> 榜单结果由 TOY 平台原生榜单承载，页面内未新增榜单 UI，避免挤占移动端界面。
