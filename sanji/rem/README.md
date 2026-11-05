# 《倪海厦学习天地》60 秒产品解说视频 · Remotion 源码

基于本仓库 `sanji/src/index.html`（v1.15）真实结构制作的 60 秒产品解说视频源码。

## 成品规格

- 1920×1080 / 30fps / 60.011 秒 / 1800 帧
- 9 场分镜、24 条逐句动态字幕、11 段中文男声旁白 + 程序化古风 BGM
- 宣纸金墨视觉体系，图片素材取自 `sanji/src/img/`

## 目录

| 路径 | 说明 |
|---|---|
| `src/theme.ts` | 画幅、配色、字体、9 场时间轴 |
| `src/data.ts` | 课程数据、素材索引、24 条字幕轨 `NARRATION` |
| `src/components.tsx` | 宣纸背景、印章、课程卡、真实素材、字幕轨 |
| `src/scenes.tsx` | 9 个场景组件 |
| `src/SanjiExplainer.tsx` | 主时间轴与双音轨混音（人声为主、BGM ducking） |
| `src/Root.tsx` / `src/index.ts` | Remotion 注册入口 |
| `scripts/make_bgm.py` | 程序化合成古风 BGM（零第三方素材） |
| `scripts/make_vo.py` | edge-tts 生成 11 段中文旁白并按绝对帧对齐（需联网） |
| `scripts/make_grain.py` | 生成宣纸颗粒噪点贴图 |
| `public/` | 图片素材、BGM、旁白音轨、噪点贴图 |
| `STORYBOARD.md` | 完整分镜脚本、配音稿与混音参数 |

## 运行

需要 Node 22+ / pnpm / ffmpeg / Python 3；Remotion 会自行下载专用 headless 浏览器。

```bash
cd sanji/rem
pnpm install
pnpm studio     # 可视化调试
pnpm render     # 渲染 1920×1080 MP4 到 out/
```

## 重新生成素材

```bash
python3 scripts/make_bgm.py          # -> public/bgm.wav
python3 scripts/make_grain.py        # -> public/grain.png
/usr/bin/python3 scripts/make_vo.py  # -> public/vo.wav，需 pip install edge-tts 且可联网
```

改字幕动 `src/data.ts` 的 `NARRATION`（`from` / `to` 为绝对帧）；改旁白动 `scripts/make_vo.py` 的 `VO` 数组后重新生成；改时长配色动 `src/theme.ts`；调人声/BGM 比例动 `src/SanjiExplainer.tsx` 的 `volume` 与 `bgmVolume`。

## 说明

- 成片 MP4 与封面帧属于交付物，不纳入仓库（见 `.gitignore`）。
- 免责声明与「仅供研习参考，不能替代专业诊疗」按产品源码原意保留在收尾。
- 图片素材来自产品自身素材包；商用投放前请确认图片授权范围。
