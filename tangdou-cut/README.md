# 糖豆快吃 · 割绳益智

经典「割绳喂糖」玩法的原创重构版：切开绳索，让糖果摆荡、落进泡泡或弹上蘑菇，收集三颗星，最后落进糖豆的嘴里。

> 本项目复刻的是玩法机制，不是原版素材。角色「糖豆」、12 个关卡、全部 Canvas 矢量美术和音效均为原创；没有复制参考仓库的角色、图片、关卡数据或 GPL 代码。

## 游戏内容

- 12 个原创关卡：单绳入门、双绳摆荡、泡泡升空、蘑菇弹弓、尖刺走廊、三重绳、旋转挂点、泡泡过刺、节奏尖刺、弹跳高台、窄门、终关。
- 物理固定 60Hz：绳索距离约束 + 径向速度削减，保留切向速度形成摆荡；支持多绳、泡泡、弹垫、旋转/移动尖刺、星星与嘴部判定。
- 交互：鼠标划绳、手机触控划绳、点击泡泡；本地保存每关最佳星数。
- 视觉：720×1080 逻辑分辨率，2:3 竖屏；全 Canvas 矢量绘制，桌面居中、移动端自适应。

## 目录

```text
tangdou-cut/
├── src/
│   ├── index.html            # Toy 发布入口
│   ├── style.*.css           # 带内容指纹
│   ├── physics.*.js          # 物理
│   ├── levels.*.js           # 12 关数据
│   ├── game.*.js             # 渲染 / 交互 / 音效 / 存档
│   └── assets/icon.png       # 页面 favicon + Toy 图标（512×512）
├── assets/
│   └── poster.jpg            # Toy 分享封面（1200×900）
└── README.md
```

入口解压后约 4.5 KB，全部资源为同目录相对路径，可直接作为 Toy 页面根目录发布。

## 本地运行

```bash
cd tangdou-cut/src
python3 -m http.server 8080
# 打开 http://127.0.0.1:8080/
```

调试钩子：`window.__TANGDOU_DEBUG__`，可读取 `world` / `mode` / `levelIndex`，并提供 `startLevel`、`cutRope`、`tapBubble`。

## 发布状态

- Toy id：`58651511365632`
- slug：`tangdou-cut`
- 状态：`auditing`（2026-11-24 提交审核）
- 预期地址：<https://www.bilibili.com/toy/tangdou-cut/index.html>
- 分类：GAME；可见性：public；主题：dark

```bash
toy create tangdou-cut/src \
  --title "糖豆快吃 · 割绳益智" --slug tangdou-cut \
  --category GAME --theme dark --visibility public \
  --poster tangdou-cut/assets/poster.jpg \
  --icon tangdou-cut/src/assets/icon.png --json
```

## 验证记录

2026-11-24 在 macOS + Chrome 上完成：

- 12 个关卡全部用真实鼠标划绳通关，均 3 星。
- 390×844 移动端用真实触控划绳通关第一关，3 星。
- 选关、暂停/继续、失败重试、下一关、再玩一次逐项走通。
- Toy 预览 iframe 内无资源 404、无 `pageerror`、无 console error。
- `toy_doctor.py` 对上传包零 WARN/ERROR。
