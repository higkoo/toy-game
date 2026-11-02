# Toy 小游戏合集

B 站 Toy 容器中运行的纯静态小游戏与学习页面合集。所有页面都是单文件 HTML + CSS + JavaScript，没有构建步骤，打开就能玩。

## 游戏一览

| 目录 | 游戏 | 简介 |
| --- | --- | --- |
| [anime-calculator](anime-calculator/README.md) | [小偶像计算器](https://www.bilibili.com/toy/idol-calculator/index.html)（审核中） | 标准 / 科学计算与亲戚称呼三种模式 |
| [gomoku](gomoku/README.md) | [小偶像五子棋](https://www.bilibili.com/toy/idol-gomoku/index.html) | 人机 / 双人 / 联机五子棋，含教学模式、回放、好友与房间大厅 |
| [go](go/README.md) | [小偶像围棋](https://www.bilibili.com/toy/idol-go/index.html) | 9 / 13 / 19 路人机、双人与联机围棋 |
| [tetris](tetris/README.md) | [小偶像方块](https://www.bilibili.com/toy/idol-tetris/index.html) | 触屏方向键和键盘都能玩的俄罗斯方块 |
| [sanji](sanji/README.md) | [倪海厦学习天地](https://www.bilibili.com/toy/sanji/index.html) | 天纪、人纪、地纪课程视频与讲义导航 |

游戏名称已隐式链接到对应的 Toy 正式发布页；`小偶像计算器` 已提交审核，审核通过后链接生效，期间可先用[预览地址](https://www.bilibili.com/toy/preview/author_ehklVhcg/index.html)体验。

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

## 联机说明

五子棋和围棋的联机模式基于公共中转 `ntfy.sh`，没有自建后端：

- 房间频道：`bg-gomoku-*` / `bg-go-*`
- 传输方式：发布消息用 HTTP POST，接收用 SSE 实时订阅，失败时自动回退到轮询
- 消息协议：加入申请、同意/拒绝、落子、悔棋、全量状态同步、离开房间等

五子棋 v24 额外加入了弱网处理：请求超时、失败退避重试、消息去重、连接看门狗和手动「重连」按钮。

## 说明

仓库不包含 Toy 会话凭据、用户上传文件、截图和构建产物，这些路径已写入 `.gitignore`。
