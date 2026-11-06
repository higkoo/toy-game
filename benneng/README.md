# 郭生白 · 视频全集（本能论）

TOY 静态页面，入口 `src/index.html`；`toy update` 打包 `src/` 整体上传。

- `src/js/app.js`：合集切换、章节列表、已看进度、SDK 原生导航。
- `src/data/videos.js`：4 个合集共 164 集数据。
- `src/css/app.css`：样式与首图轮播。
- `src/img/`：封面、人像、icon、poster。

## 版本

当前源码版本：`v1.1`

## 榜单

接 TOY 原生排行榜（`board: 1`），并在页面内自带排行榜面板（页脚「排行榜」入口）。

- **平台规则**：`submitScore` 传绝对分，服务端只保留历史最高分；`getRankList` 游客可读，`getMyRank` 需登录。
- 每打开一次页面计 1 分，**一直累计**不清零；15 秒内重复打开不重复计分，避免刷新刷分。
- 面板只在点开时拉一次并本地缓存，不轮询；带加载中 / 空态 / 失败重试；非 Toy 容器显示本地累计并提示去 B站 App 查看。
- 累计分存 `localStorage`；换设备或清缓存后，面板会用 `getMyRank` 返回的历史最高分校准显示。
