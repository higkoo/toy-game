# 铁翼破云 · Skybreaker

驾驶 F-14B TOMCAT 的空战小游戏：穿过城市、军港与近海舰队，用六件武器组建编队，逐个击破来袭波次，最终摧毁巨型空中堡垒。three.js WebGL 实时渲染。

## 玩法与操作

- **鼠标** 驾驶战机；**按住左键** 开火，松开进入慢速；**右键** 释放大招
- 鼠标靠近目标可辅助瞄准；大招次数与补充进度显示在右下角，点击也可释放
- **空格** 翻滚；**左 Ctrl / F** 爆盾（驾驶舱菱形是受击点，红色角框表示敌弹进入爆盾范围，琥珀弧指向将命中的来弹）
- **1 / 2 / 3** 选择升级，**R** 换一组；**Esc** 暂停
- 出击前选择一项支援：战术核打击 / 无人机群 / 空中一号 / 天枪校射 / 导电猎场（前方标定落点，冲击波清弹并重创敌群）
- 波次简报：截击来袭编队 → 接近基地跑道（优先摧毁制导雷达）→ 进入近海（压制航母飞行甲板）
- 六件武器可组成编队：截击机（优先猎杀侦察机）、对地攻击机（俯冲打击地面和炮塔）、电子战僚机（引走制导弹并反击）、护盾僚机、交叉光翼（翼侧双光棱齐射）等
- 已获得武器存在 `localStorage`，键名 `sky-bag-v1`，断网可玩

## 目录

```text
skybreaker/
├── src/
│   ├── index.html        # 页面入口：HTML + CSS + 游戏逻辑（约 670 KB）
│   └── assets.js         # 模型与贴图资源包（约 8.7 MB，挂载 window.__FLIGHT_ASSETS__）
└── README.md
```

## 为什么是两个文件

原稿是单文件 HTML，three.js 与 flight-assets 资源 JSON 都内联，体积远超 Toy 收包预检「入口 `index.html` 解压后 ≤ 1 MB」的上限。游戏脚本保留在 `index.html` 中，只把内联的资源包原样外置为 `assets.js`，运行时挂载到 `window.__FLIGHT_ASSETS__` 供主流程解析。两个文件必须放在同一目录，用相对路径加载。

## 本地运行

直接用浏览器打开 `src/index.html` 即可（`file://` 直开也能正常加载资源包）；也可以起个静态服务器：

```bash
cd skybreaker/src && python3 -m http.server 8080
```

## 依赖

- 零第三方网络依赖，断网可玩；three.js 内联于 `index.html`
- 浏览器能力：WebGL2、`AudioContext`、`localStorage`、系统字体
- 模型、贴图与音效均内嵌于资源包，无外部资源请求

## 发布到 Toy

以 `src/` 作为页面根目录（两个文件一起打包）：

```bash
# 先只出预览，确认后同参数加 --yes 提交审核
toy create skybreaker/src \
  --title "铁翼破云 · Skybreaker" --slug skybreaker \
  --category GAME --theme dark --visibility public \
  --poster assets/poster.jpg --json
```

`--visibility public` 的作品**必须带 `--poster`**：缺封面时预览能生成，但提交审核会返回 `307009 缺少必要文件`。

已发布：Toy id `56128704871424`，<https://www.bilibili.com/toy/skybreaker/index.html>
