# Toy 小游戏合集

B 站 Toy 容器中运行的静态小游戏与学习页面合集。页面本身都是原生 HTML + CSS + JavaScript，没有打包器，打开就能玩。少数项目在 `src` 之外另有生成步骤（见「构建与生成」），但发布物仍是纯静态文件。

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
| [abyssbeacon](abyssbeacon/README.md) | [深蓝信标](https://www.bilibili.com/toy/abyssbeacon/index.html) | 生物荧光深海 3D 探索，收集光囊点亮三座远古灯塔 |
| [xingzhao](xingzhao/README.md) | [星召群英](https://www.bilibili.com/toy/xingzhao/index.html) | 5v5 MOBA，1 名玩家 + 9 名 AI 操控历代英杰，推塔打野摧毁对方水晶 |
| [skybreaker](skybreaker/README.md) | [铁翼破云](https://www.bilibili.com/toy/skybreaker/index.html) | F-14B 空战，鼠标驾驶六武器编队，截击波次、击破巨型空中堡垒 |
| [yangyu](yangyu/README.md) | [阳羽](https://www.bilibili.com/toy/yangyu/index.html) | 3D 飞行收集，穿过天门环累积光羽 |
| [qihuang](qihuang/README.md) | [岐黄典籍故事](https://www.bilibili.com/toy/qihuang/index.html) | 中医典籍科普，按卷次阅读原文与注解 |
| [jingluo](jingluo/README.md) | 经络图谱 · 3D（新增，待发布） | 3D 人体十四经脉，旋转缩放、筛选循行、点穴查看定位与主治 |
| [airliner-flight-sim](airliner-flight-sim/README.md) | [客机飞行模拟](https://www.bilibili.com/toy/airliner-flight-sim/index.html) | 3 机型、16 机场的写实客机飞行沙盒 |

16 款作品已上线，点击游戏名即可直接试玩；《经络图谱 · 3D》为新增项目，尚未发布。

## 目录结构

每个游戏一个目录，发布根目录里放 `index.html` 和它依赖的资源：

```text
<game>/
├── src/                  # 发布根目录（深蓝信标为 dist/）
│   ├── index.html
│   ├── *.js              # 拆出来的 three.js / 资源包 / 游戏逻辑
│   └── img/ 或 assets/   # 图标、海报等外层素材
└── README.md             # 该游戏的玩法与实现说明
```

例如：

```text
gomoku/
├── src/index.html
├── src/img/icon.png
├── src/img/poster.png
└── README.md

abyssbeacon/
├── source/               # 分片源码，拼成 dist/
├── dist/index.html       # 发布根目录
├── dist/three.global.js
├── dist/game.js
└── README.md
```

## 构建与生成

绝大部分项目是"改完直接传"，下面三个不是：

- **深蓝信标**：源码在 `abyssbeacon/source/`（`01_style`、`02_scene`、`03_game` 等分片），拼接后输出到 `dist/`。改 `source` 之后必须重新生成 `dist`，否则线上还是旧的。
- **岐黄典籍故事**：`qihuang` 下的 `build_home.py`、`gen_kb.py`、`volumes_extra*.py` 负责生成 `src/index.html` 与卷次内容。直接改 `src` 里的产物，下次生成会被覆盖。
- **阳羽 / 铁翼破云**：入口 `index.html` 只保留标记，three.js 与游戏逻辑已拆成同目录 `.js` 文件，改代码改 `.js`，不要再塞回 HTML。

## 本地运行

直接用浏览器打开各游戏的 `src/index.html` 即可体验单机玩法。部分功能依赖 B 站 Toy 环境：

- Toy SDK 登录、好友、在线状态
- 联机房间
- App 内跳转 B 站视频

联机与视频跳转建议在 Toy 容器或线上页面中测试。

## 发布到 Toy

每个游戏以各自的 `src` 目录作为 Toy 页面根目录上传，`assets` 目录中的图标和海报用于 Toy 的外层素材。

### 发布参数的三条硬要求

- **`--visibility public` 必须同时给 `--poster`**，否则预览能出来、提交审核却返回 `307009 缺少必要文件`。这是本项目里两个作品（《星召群英》《铁翼破云》）卡住过的真实原因。
- `--poster` 用 **4:3 横图**（建议 1200×900），PNG/JPG 均可，放各自项目的 `assets/`（或 `src/img/`）下，不要用远程热链。
- 入口 `index.html` **解压后不得超过 1 MB**（超了报 `307000`），所以大项目一律把资源拆成同目录的独立文件。

### 外层素材规格

- **图标**：512×512 PNG 为主。`sanji` 用的是 1024×1024，平台会自行缩放，不必改。
- **海报**：Toy 卡片按 4:3 显示，建议 1200×900。目前仍有 6 个作品是 1280×720（16:9）——`abyssbeacon`、`berth4`、`dashcam`、`jianzhi`、`sanji`、`seabreeze`。16:9 在卡片里会被裁掉左右各约 12.5%，这些海报的主体文字都压在中间 4:3 安全区内；下次重制时直接出 1200×900，并保持主体在中央。
- **原始大图只留档，不进发布包**：`tetris/assets/` 放 `icon.jpg`（1920×1920）和 `poster.jpg`（2240×1680），上传只用 `src/img/icon.png`、`src/img/poster.png`。
- **一个素材只放一份**：发布根目录里同时放 jpg 和 png 两套，只会让包体白白多几百 KB。

标准流程是「先预览、确认后再提交」，不要一步 `--yes`：

```bash
toy create <项目>/src --title "<标题>" --slug <slug> \
  --category GAME --theme dark --visibility public \
  --poster <项目>/assets/poster.jpg --json          # 只生成 preview_url
# 人工看过预览页后，同参数再加 --yes 重新执行，才进入审核
```

《四号泊位》是例外：内联 three.js 的单文件约 1.4 MB，超过入口 `index.html` 解压后 ≤ 1 MB 的预检，所以拆成 `src/index.html` + `src/game.bundle.js` 两个文件一起作为页面根目录上传，两者必须同目录。

《海风竞速》同样把 three.js 拆成独立文件：`src/index.html` + `src/three.global.js` + `src/game.js` 三者同目录上传。

《深蓝信标》同样把 three.js 拆成独立文件：`dist/index.html` + `dist/three.global.js` + `dist/game.js` 三者同目录上传。

《星召群英》拆成 `src/index.html` + `src/game.bundle.js`（three.js 与游戏逻辑打在同一个 bundle 里）。

《铁翼破云》拆成 `src/index.html` + `src/three.global.js`（three.js，挂 `window.TH`）+ `src/game.js`（游戏逻辑）+ `src/assets.js`（内嵌资源包，挂 `window.__FLIGHT_ASSETS__`），四个文件同目录上传。

《阳羽》原本把 three.js 和游戏逻辑一起内联在入口里（657 KB），现在拆成 `src/index.html` + `src/game.js` 两个文件，入口只留标记和样式。

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

## 本地检查

改完代码后，在仓库根目录跑：

```bash
python3 scripts/check_repo.py          # 入口体积、本地资源引用、封面比例
python3 scripts/fingerprint.py --check # JS/CSS 文件名是否带内容指纹
python3 scripts/smoke_test.py          # 15 个入口浏览器冒烟（需 playwright）
```

改了某个项目的 JS/CSS 后，先跑一次指纹脚本再提交：

```bash
python3 scripts/fingerprint.py benneng/src
```

`abyssbeacon` 用 `python3 abyssbeacon/source/build.py` 重建，构建结束会自动加指纹。
GitHub Actions 会在 push / PR 时自动跑前两项与浏览器冒烟。

## 说明

仓库不包含 Toy 会话凭据、用户上传文件、截图和构建产物，这些路径已写入 `.gitignore`。
