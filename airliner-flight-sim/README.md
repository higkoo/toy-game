# 客机飞行模拟 · Airliner Flight Sim

第三人称 + 座舱第一人称的写实客机飞行沙盒。单文件 `src/index.html`，three.js 已内联，零外部依赖，`file://` 双击即玩，也能直接作为 Toy 页面根目录发布。

## 游戏内容

- 3 款机型：A220 支线客机 / A320 窄体主力 / A350 宽体客机，涂装、尺寸与气动参数不同。
- 16 座机场、世界半径约 42 万米；开始菜单点地图选起飞机场，进入机场后再选航班目的地。
- 任务清单实时打勾：起飞爬升 400 m、巡航 > 220 m/s、飞抵目的空域、在目的机场平稳着陆（< 2 m/s）。
- 昼夜循环、实时风、ILS 盲降航道、ATC 无线电字幕、10 架 AI 空中交通、着陆 S/A/B/C 评分。
- 晴空颠簸、阵风、鸟击、单发失效等随机飞行事件；撞到建筑或山体会被柔和推开，不判坠毁。
- 平稳落地即成功，没有坠毁惩罚；新手辅助可降低上手门槛。

## 操作

| 按键 | 功能 |
| --- | --- |
| `S` / `↓` | 拉杆抬头 |
| `W` / `↑` | 推杆低头 |
| `A` / `←` | 左压杆，左坡左转 |
| `D` / `→` | 右压杆，右坡右转 |
| `Q` / `E` | 左 / 右方向舵 |
| `Shift` / `Ctrl` | 加油门 / 减油门 |
| `B` | 刹车 |
| `C` | 切换视角：追尾 / 远距 / 俯视 / 座舱 |
| `N` | 切换机型 |
| `M` | 重开航班目的地面板 |
| `H` | 新手辅助开关 |
| `L` | 按住自动改平 |
| `P` / `空格` | 暂停 / 重置到跑道头 |

## 目录

```text
airliner-flight-sim/
├── src/index.html      # 发布入口：three.js 与游戏逻辑全部内联，约 772 KB
└── assets/
    ├── poster.jpg      # Toy 封面，1200×900
    └── icon.png        # Toy 图标，512×512
```

入口 772 KB，低于 Toy「入口 `index.html` 解压后 ≤ 1 MB」的硬限制，因此保持单文件，不拆 `three.global.js`。页面没有外部脚本、贴图或绝对路径，Toy 子路径 `/toy/airliner-flight-sim/` 下可直接运行。

## 本地运行

直接双击 `src/index.html`，或在目录里起静态服务器：

```bash
cd airliner-flight-sim/src && python3 -m http.server 8080
```

调试钩子：`window.__state / __update / __keys / __airports / __obstacles / __checkCollision / __camMode / __aero / __info`。测试脚本在原始工程中，通过 `__update(dt)` 做确定性飞行回归，不依赖真实 rAF 计时。

## 发布到 Toy

已发布：Toy id `58350838489088`，slug `airliner-flight-sim`，<https://www.bilibili.com/toy/airliner-flight-sim/index.html>。

```bash
# 先只出预览，确认后同参数加 --yes 提交审核
toy create airliner-flight-sim/src \
  --title "客机飞行模拟" --slug airliner-flight-sim \
  --category GAME --theme dark --visibility public \
  --poster airliner-flight-sim/assets/poster.jpg \
  --icon airliner-flight-sim/assets/icon.png --json
```

`--visibility public` 必须带 `--poster`，否则提交审核会报 `307009 缺少必要文件`。Toy 会取 `--poster` 作为转发卡片封面，不用页面截图。

## 发布验证

2026-11-23 在 Toy 预览页与公网页分别用 Playwright + Chromium（SwiftShader）做真实加载和确定性飞行回归：

- 公网页 HTTP 200，Toy 外壳正常加载游戏 iframe。
- 0 个 `pageerror`、0 个 console error、0 个资源请求失败。
- 8 项飞控断言全过：出生高度 3.2；满油门 387 帧到 85.02 m/s；抬轮离地高度 3.57；`A` 左坡 `roll -1.15 / yaw +0.152`；`D` 右坡 `roll 1.15 / yaw -0.152`。
- 预览截图与本地 `file://` 版本一致，HUD、地图、任务清单正常。
