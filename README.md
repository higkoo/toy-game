# Toy 小游戏合集

B 站 Toy 容器中运行的纯静态小游戏与学习页面合集。所有页面都是原生 HTML + CSS + JavaScript，没有构建步骤，打开就能玩；内容型页面会拆成多个文件。

## 游戏一览

| 目录 | 游戏 | 简介 |
| --- | --- | --- |
| [anime-calculator](anime-calculator/README.md) | [小偶像计算器](https://www.bilibili.com/toy/idol-calculator/index.html) | 标准 / 科学计算与亲戚称呼三种模式 |
| [gomoku](gomoku/README.md) | [小偶像五子棋](https://www.bilibili.com/toy/idol-gomoku/index.html) | 人机 / 双人 / 联机五子棋，含教学模式、回放、好友与房间大厅 |
| [go](go/README.md) | [小偶像围棋](https://www.bilibili.com/toy/idol-go/index.html) | 9 / 13 / 19 路人机、双人与联机围棋 |
| [tetris](tetris/README.md) | [小偶像方块](https://www.bilibili.com/toy/idol-tetris/index.html) | 触屏方向键和键盘都能玩的俄罗斯方块 |
| [sanji](sanji/README.md) | [倪海厦学习天地](https://www.bilibili.com/toy/sanji/index.html) | 天纪、人纪、地纪课程视频与讲义导航 |
| [benneng](benneng/README.md) | [郭生白 · 视频全集](https://www.bilibili.com/toy/benneng/index.html) | 本能系统医学视频合集与已看进度 |
| [jianzhi](jianzhi/README.md) | [我的健康减脂方法](https://www.bilibili.com/toy/jianzhi/index.html) | 44 天减脂记录、五三二饮食与 45 条问答 |
| [berth4](berth4/README.md) | [四号泊位](https://www.bilibili.com/toy/berth4/index.html) | 港口题材第一人称射击，切断三处中继后登船撤离 |
| [dashcam](dashcam/README.md) | [夜行记录仪](https://www.bilibili.com/toy/dashcam/index.html) | 第一人称深夜货运模拟，43 个模块的自研 WebGL2 引擎 |
| [seabreeze](seabreeze/README.md) | [海风竞速](https://www.bilibili.com/toy/seabreeze/index.html) | 落日海岸低多边形 3D 竞速，三圈计时赛，漂移攒氮气 |

游戏名称已隐式链接到对应的 Toy 正式发布页，点击即可直接游玩。

## 目录结构

每个游戏一个目录，源码和素材分开存放：

```text
<game>/
├── src/
│   └── index.html      # 游戏源码（单文件）
├── assets/             # 图标、海报等静态素材（如有）
└── README.md           # 该游戏的玩法与实现说明
```

例如：

```text
gomoku/
├── src/index.html
├── assets/icon.png
├── assets/poster.png
└── README.md
```

## 本地运行

直接用浏览器打开各游戏的 `src/index.html` 即可体验单机玩法。部分功能依赖 B 站 Toy 环境：

- Toy SDK 登录、好友、在线状态
- 联机房间
- App 内跳转 B 站视频

联机与视频跳转建议在 Toy 容器或线上页面中测试。

## 发布到 Toy

每个游戏以各自的 `src` 目录作为 Toy 页面根目录上传，`assets` 目录中的图标和海报用于 Toy 的外层素材。

《四号泊位》是例外：内联 three.js 的单文件约 1.4 MB，超过入口 `index.html` 解压后 ≤ 1 MB 的预检，所以拆成 `src/index.html` + `src/game.bundle.js` 两个文件一起作为页面根目录上传，两者必须同目录。

《海风竞速》同样把 three.js 拆成独立文件：`src/index.html` + `src/three.global.js` + `src/game.js` 三者同目录上传。

## 联机说明

五子棋和围棋的联机模式基于公共中转 `ntfy.sh`，没有自建后端：

- 房间频道：`bg-gomoku-*` / `bg-go-*`
- 传输方式：发布消息用 HTTP POST，接收用 SSE 实时订阅，失败时自动回退到轮询
- 消息协议：加入申请、同意/拒绝、落子、悔棋、全量状态同步、离开房间等

围棋 v18 与五子棋 v24 都加入了弱网处理：

- 所有联机请求带超时，半开连接不会一直占着浏览器连接
- 发送失败自动重试，并给每条消息加唯一 `mid` 去重
- 轮询固定串行执行，失败按指数退避，避免请求堆积刷爆公共中转
- 连接看门狗检测静默断流，断网/恢复/切回前台时自动重建连接
- 房间信息里常驻网络状态，也可手动点「重连」并主动同步棋局

联机时如果房间信息出现「网络慢」，可以直接点「重连」；网络恢复或切回前台时也会自动重连并同步棋局。

## 说明

仓库不包含 Toy 会话凭据、用户上传文件、截图和构建产物，这些路径已写入 `.gitignore`。
