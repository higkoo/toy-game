import React from "react";
import {
  AbsoluteFill, Sequence, Audio, Img, staticFile,
  useCurrentFrame, useVideoConfig, interpolate, spring,
} from "remotion";

/* ══════════════════════ 常量区 ══════════════════════ */
export const C = {
  W: 1920, H: 1080, FPS: 30,
  INK: "#0b0f14", BONE: "#e8e2d5", MOURN: "#b4463a",
  CYAN: "#5fd4c4", GOLD: "#8a7755", MUTED: "#8b929c",
  SERIF: '"Noto Serif CJK SC","Songti SC","STSong",serif',
  MONO: 'ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace',
};

// 人声段落时长（来自 edge-tts 实测），帧 = 秒 * FPS
const VOICE = {
  intro: 6.24, world: 15.70, gallery: 6.60, relicA: 18.91,
  relicB: 18.02, flower: 13.97, wall: 17.64, elegy: 13.73, outro: 9.82,
};
const S = (sec: number) => Math.round(sec * C.FPS);

// 每幕：起点帧、帧数、人声文件、图片列表、字幕行
type Sub = { t: string; d?: string }; // 主字幕 / 副标题（可选）
type Scene = {
  name: string; start: number; frames: number;
  voice: string; imgs: string[]; subs: Sub[];
  ken?: "in" | "out" | "left" | "right";
};

// 字幕按人声节奏切分（每句一段），自动均分到该幕时长内
const SCENES: Scene[] = [
  {
    name: "intro", start: 0, frames: S(8.2), voice: "01_intro.mp3",
    imgs: ["01_hero.png"], ken: "in",
    subs: [
      { t: "如果有一天，", d: "IF AI SOLVED IT ALL" },
      { t: "AI 把所有数学难题都解完了……", d: "WHAT WOULD BE LEFT OF US?" },
      { t: "人类还剩下什么？", d: "" },
    ],
  },
  {
    name: "world", start: S(8.2), frames: S(17.2), voice: "02_world.mp3",
    imgs: ["01_hero.png"], ken: "out",
    subs: [
      { t: "2026 年，AI 证明了黎曼猜想。", d: "A CYBER FUNERAL · 2026" },
      { t: "证明、作图、修图、计算，一样一样被接管。", d: "" },
      { t: "我们建了这座展厅，", d: "" },
      { t: "把那些需要人亲手完成的手艺，送进来。", d: "" },
    ],
  },
  {
    name: "gallery", start: S(25.4), frames: S(8.6), voice: "03_gallery.mp3",
    imgs: ["02_relics_top.png"], ken: "left",
    subs: [
      { t: "六件旧物，六块墓碑。", d: "01 / 遗物陈列" },
      { t: "请慢慢走，献一束花，说句话。", d: "" },
    ],
  },
  {
    name: "relicA", start: S(34.0), frames: S(20.5), voice: "04_relic_a.mp3",
    imgs: ["03_principia.png", "04_draft.png", "05_euclid.png"], ken: "in",
    subs: [
      { t: "《原理》：一条公式把天体装进纸里。", d: "F = G · m₁m₂ / r²" },
      { t: "三百年后，证明它的人，不再是人。", d: "" },
      { t: "手算草稿的涂改，是思考的指纹。", d: "0.5772156649…" },
      { t: "真理不需要圆规，但证明它的人需要。", d: "∠A + ∠B + ∠C = 180°" },
    ],
  },
  {
    name: "relicB", start: S(54.5), frames: S(19.5), voice: "05_relic_b.mp3",
    imgs: ["06_logtable.png", "07_photoshop.png", "08_abacus.png"], ken: "right",
    subs: [
      { t: "对数表把乘法变成加法，然后被忘掉。", d: "log(a·b) = log a + log b" },
      { t: "古法修图：一根头发一根头发地修。", d: "Ctrl+J → 魔棒 → 羽化" },
      { t: "现在一句话，就能换掉整片天空。", d: "" },
      { t: "算盘响了一千年，被移进抽屉最里层。", d: "一上一，一下五去四" },
    ],
  },
  {
    name: "flower", start: S(74.0), frames: S(15.2), voice: "06_flower.mp3",
    imgs: ["09_flower.png"], ken: "in",
    subs: [
      { t: "我给它们各献了一束花。", d: "02 / 献花" },
      { t: "系统只允许每处献一次——", d: "" },
      { t: "挺好，隆重的东西，一次就够了。", d: "" },
      { t: "花瓣落下，像一场迟到很久的告别。", d: "✿  同一件，只记一次" },
    ],
  },
  {
    name: "wall", start: S(89.2), frames: S(18.8), voice: "07_wall.mp3",
    imgs: ["10_wall.png"], ken: "out",
    subs: [
      { t: "墙上可以留言。", d: "03 / 悼念墙" },
      { t: "「手算的涂改别被算法抹平。」", d: "" },
      { t: "「爷爷的算盘还在抽屉里。」", d: "" },
      { t: "这些话只存在你自己的设备上。", d: "本地保存 · 不上传" },
    ],
  },
  {
    name: "elegy", start: S(108.0), frames: S(15.5), voice: "08_elegy.mp3",
    imgs: ["11_elegy.png"], ken: "in",
    subs: [
      { t: "我选了算盘，让它写一段悼词。", d: "04 / 悼词生成器" },
      { t: "「不是因为无用，", d: "" },
      { t: "是因为不再需要我们。」", d: "" },
      { t: "可惜它不懂，算盘珠响起来是什么声音。", d: "" },
    ],
  },
  {
    name: "outro", start: S(123.5), frames: S(13.5), voice: "09_outro.mp3",
    imgs: ["12_coda.png"], ken: "out",
    subs: [
      { t: "我们并没有失去它们。", d: "" },
      { t: "只是不再需要亲手去做。", d: "" },
      { t: "数学界赛博葬礼 · 向所有手工技艺致意", d: "THE END" },
    ],
  },
];

const TOTAL = SCENES[SCENES.length - 1].start + SCENES[SCENES.length - 1].frames;

/* ══════════════════════ 通用组件 ══════════════════════ */

// 图片 Ken Burns 运镜 + 暗角遮罩，让截图有电影感
const KenImg: React.FC<{ file: string; ken?: Scene["ken"]; frames: number }> =
  ({ file, ken, frames }) => {
    const f = useCurrentFrame();
    const p = f / frames;
    let scale = 1.06, tx = 0, ty = 0;
    if (ken === "in") scale = interpolate(p, [0, 1], [1.04, 1.14]);
    else if (ken === "out") scale = interpolate(p, [0, 1], [1.14, 1.04]);
    else if (ken === "left") { scale = 1.1; tx = interpolate(p, [0, 1], [18, -18]); }
    else if (ken === "right") { scale = 1.1; tx = interpolate(p, [0, 1], [-18, 18]); }
    return (
      <AbsoluteFill style={{ overflow: "hidden", background: C.INK }}>
        <Img
          src={staticFile("img/" + file)}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            objectPosition: "center 30%",
            transform: `scale(${scale}) translateX(${tx}px) translateY(${ty}px)`,
          }}
        />
        {/* 上下暗角，压暗截图边缘聚焦字幕 */}
        <AbsoluteFill style={{
          background: "linear-gradient(180deg,rgba(11,15,20,.72) 0%,rgba(11,15,20,.30) 12%,transparent 24%,transparent 48%,rgba(11,15,20,.90) 82%,rgba(11,15,20,.97) 100%)",
        }} />
      </AbsoluteFill>
    );
  };

// 字幕：按该幕 subs 数量均分时间，逐句淡入 + 轻微上浮
const Captions: React.FC<{ subs: Sub[]; frames: number }> = ({ subs, frames }) => {
  const f = useCurrentFrame();
  const seg = frames / subs.length;
  const idx = Math.min(Math.floor(f / seg), subs.length - 1);
  const local = f - idx * seg;
  const sub = subs[idx];
  const op = interpolate(local, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const ty = interpolate(local, [0, 10], [14, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: 118, alignItems: "center" }}>
      <div style={{ opacity: op, transform: `translateY(${ty}px)`, textAlign: "center", maxWidth: 1500 }}>
        {sub.d ? (
          <div style={{ fontFamily: C.MONO, fontSize: 22, letterSpacing: ".34em", color: C.MOURN, marginBottom: 16 }}>
            {sub.d}
          </div>
        ) : null}
        <div style={{
          fontFamily: C.SERIF, fontSize: sub.t.length > 22 ? 46 : 60,
          fontWeight: 600, letterSpacing: ".06em", color: C.BONE,
          textShadow: "0 4px 24px rgba(0,0,0,.8)",
        }}>
          {sub.t}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 顶部持续角标（幕与幕之间固定，建立品牌感）
const BrandMark: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 40, pointerEvents: "none" }}>
    <div style={{
      fontFamily: C.MONO, fontSize: 15, letterSpacing: ".34em",
      color: "rgba(232,226,213,.62)", textIndent: ".34em",
      background: "rgba(11,15,20,.82)", padding: "8px 20px",
      border: "1px solid rgba(232,226,213,.10)", borderRadius: 2,
    }}>
      MEMORIAL <span style={{ color: C.MOURN }}>/</span> 2026
    </div>
  </AbsoluteFill>
);

/* ══════════════════════ 单幕 ══════════════════════ */
const SceneBlock: React.FC<{ scene: Scene; index: number }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 幕首淡入、幕尾淡出（crossfade 观感）
  const enter = spring({ frame: f, fps, config: { damping: 200, stiffness: 90 } });
  const fade = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(f, [scene.frames - 12, scene.frames - 1], [1, 0], { extrapolateLeft: "clamp" });
  const op = Math.min(fade, fadeOut);

  // 多图时按幕内时长均分显示
  const per = scene.frames / scene.imgs.length;
  const imgIdx = Math.min(Math.floor(f / per), scene.imgs.length - 1);

  return (
    <AbsoluteFill style={{ opacity: op }}>
      <KenImg file={scene.imgs[imgIdx]} ken={scene.ken} frames={per} />
      <BrandMark />
      <Captions subs={scene.subs} frames={scene.frames} />
      <Audio src={staticFile("audio/" + scene.voice)} />
      {/* 初始一次整体淡入的轻微缩放 */}
      <AbsoluteFill style={{
        background: C.INK, opacity: interpolate(enter, [0, 1], [0.25, 0]),
      }} />
    </AbsoluteFill>
  );
};

/* ══════════════════════ 主合成 ══════════════════════ */
export const MemorialPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.INK }}>
      {/* 全局氛围 BGM，音量压低给人声让路 */}
      <Audio src={staticFile("audio/bgm.wav")} volume={0.14} />
      {SCENES.map((s) => (
        <Sequence key={s.name} from={s.start} durationInFrames={s.frames}>
          <SceneBlock scene={s} index={SCENES.indexOf(s)} />
        </Sequence>
      ))}
      {/* 片头 1 秒黑场淡入 */}
      <Sequence from={0} durationInFrames={C.FPS}>
        {(function IntroVeil() {
          const f = useCurrentFrame();
          return <AbsoluteFill style={{
            background: C.INK,
            opacity: interpolate(f, [0, C.FPS - 1], [1, 0]),
          }} />;
        })()}
      </Sequence>
    </AbsoluteFill>
  );
};

export const DURATION_FRAMES = TOTAL;
