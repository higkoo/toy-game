# 阳羽 · Aureate

一只小太阳鹦鹉穿过云海与落日的飞行。穿过十二道天门，拾起散落的光羽，回到太阳的故乡。

## 玩法

- **移动鼠标 / 拖动屏幕**：御风，控制飞行方向
- **按住空格 / 右侧圆钮**：振翅加速（消耗风息，风息会随时间回复）
- 穿过云海中的十二道天门、收集光羽；连续穿门可叠加连门评价
- 支持 ESC/P 暂停，M 静音，H 隐藏界面

## 本地运行

直接用浏览器打开 `src/index.html` 即可；也可以起一个静态服务器：

```bash
cd src && python3 -m http.server 8000
```

## 技术要点

- 单文件 HTML，无外部资源依赖（Three.js r180 与后处理链全部内嵌）
- WebGL2 / CSM 级联阴影 / Raymarching 体积光 / SSAO / Bloom / FXAA
- 程序化建模 + 顶点着色的小太阳鹦鹉（金羽、绿翅尖、蓝尾梢）
- WebAudio 程序化音效，无音频文件
- 移动端触控与自适应分辨率缩放

## 发布到 Toy

封面在 `assets/poster.jpg`（1200×900，4:3）。`--visibility public` 必须带 `--poster`，否则提交审核报 `307009`：

```bash
toy create src --title "阳羽 · Aureate" --slug yangyu \
  --category GAME --theme dark --visibility public \
  --poster assets/poster.jpg --json
```

已发布：Toy id `56044302892032`，<https://www.bilibili.com/toy/yangyu/index.html>
