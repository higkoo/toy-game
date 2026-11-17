# 星召群英 · Astra

5v5 MOBA 小游戏。坠星召来历代英杰：玩家选择一名英杰，与 9 名 AI 组成两队，在三路兵线上推塔、打野、团战，摧毁对方水晶获胜。

## 玩法与操作

- 1 名玩家 + 9 名 AI 自动匹配；可选英雄包括樊哙（鸿门闯帐）、程咬金（混世魔王）、王昭君等历代英杰
- 技能键：**Q** 爆发、**E** 位移、**R** 大招；**空格** 取消当前目标 / 引导
- **F** 闪现（朝鼠标方向，可拖动选方向）、**G** 疗伤、**B** 回城
- 回城引导 5 秒返回泉水补满状态；移动、攻击或受伤都会打断
- 中立生物：霜晶巨鹿（蓝 buff）、炽焰巨熊（红 buff）、深渊鳞龙（河道巨龙）、坠星巨灵（远古巨灵，击杀掉祝福：加伤害、持续回血、小兵增强）
- 对战辅助：自动出装（金币够了自动购买推荐出装的下一件，阵亡时也会买）、当前目标提示、新手引导（第一次玩建议打开）
- 设置项：画质、帧率、音乐、音效等存在 `localStorage`，键名 `astra.settings.v1`；英雄选择记忆 `astra.lastChoice.v1`；HUD 提示开关 `astra.hud.tips.v1`

## 目录

```text
xingzhao/
├── src/
│   ├── index.html        # 页面入口：HTML + CSS（约 60 KB）
│   └── game.bundle.js    # 内联 three.js + 游戏逻辑（约 1.9 MB）
└── README.md
```

## 为什么是两个文件

原稿是单文件 HTML，three.js 与游戏逻辑全部内联，体积超过 Toy 收包预检「入口 `index.html` 解压后 ≤ 1 MB」的上限。因此把整个游戏脚本原样外置为 `game.bundle.js`，入口只保留 HTML 与样式，并用 `<script defer src="game.bundle.js"></script>` 加载。两个文件必须放在同一目录，用相对路径加载。

## 本地运行

直接用浏览器打开 `src/index.html` 即可；也可以起个静态服务器：

```bash
cd xingzhao/src && python3 -m http.server 8080
```

## 依赖

- 零第三方网络依赖，断网可玩；three.js 内联于 `game.bundle.js`
- 浏览器能力：WebGL2、Pointer Lock、`AudioContext`、Canvas 2D、`localStorage`
- 全部美术与音效均为程序化生成
- 版本页脚显示 `v1.0`

## 发布到 Toy

以 `src/` 作为页面根目录（两个文件一起打包）：

```bash
toy create xingzhao/src --title "星召群英" --slug xingzhao --category GAME --theme dark --yes
```

发布后把 Toy id 与正式地址补进本文件与仓库根 README。
