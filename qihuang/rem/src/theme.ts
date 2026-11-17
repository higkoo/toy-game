/** 全局常量：画幅、帧率、配色、字体、场景时间轴 —— 改这里就能改全片 */
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_IN_FRAMES = 1800; // 60s @ 30fps

export const C = {
  paper: '#f7f2e7',
  paperTop: '#fdfaf2',
  paperMid: '#f4edde',
  paperBottom: '#efe6d5',
  ink: '#2c2519',
  inkDim: '#5b5245',
  inkSoft: '#8a8072',
  gold: '#a3803f',
  goldDeep: '#8a6a2e',
  goldDark: '#6d5124',
  goldLight: '#dcbb73',
  goldPale: '#f3dda6',
  rust: '#a8623a',
  line: 'rgba(163,128,63,.26)',
  card: 'rgba(255,255,255,.72)',
  cardBorder: 'rgba(120,100,64,.16)',
};

export const FONT = '"Noto Serif CJK SC","Songti SC","Source Han Serif SC",serif';
export const FONT_SANS = '"Noto Sans CJK SC","PingFang SC",sans-serif';

export interface SceneDef {
  id: string;
  label: string;
  from: number;
  duration: number;
}

/** 9 个场景，总帧数 180 + 180 + 210×6 + 180 = 1800 */
export const SCENES: SceneDef[] = [
  {id: '01', label: '序 · 学习天地', from: 0, duration: 180},
  {id: '02', label: '从散到聚', from: 180, duration: 180},
  {id: '03', label: '三纪总览', from: 360, duration: 210},
  {id: '04', label: '天纪 · 天道', from: 570, duration: 210},
  {id: '05', label: '人纪 · 筑基', from: 780, duration: 210},
  {id: '06', label: '人纪 · 方证', from: 990, duration: 210},
  {id: '07', label: '地纪 · 未竟', from: 1200, duration: 210},
  {id: '08', label: '交互亮点', from: 1410, duration: 210},
  {id: '09', label: '结语', from: 1620, duration: 180},
];

/* ---------- 动画小工具 ---------- */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 线性淡入进度 */
export const fi = (frame: number, delay = 0, dur = 18) =>
  clamp01((frame - delay) / dur);

export const easeOut = (v: number) => 1 - Math.pow(1 - v, 3);
export const easeInOut = (v: number) =>
  v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;

/** 场景首尾各 edge 帧淡入淡出 */
export const fadeScene = (frame: number, duration: number, edge = 14) =>
  Math.min(fi(frame, 0, edge), fi(duration - frame, 0, edge));

/** 带延迟的上浮进入：返回 {opacity, y} */
export const riseIn = (frame: number, delay: number, dur = 20, distance = 34) => {
  const p = easeOut(fi(frame, delay, dur));
  return {opacity: p, y: (1 - p) * distance};
};

/** 数字滚动 */
export const countTo = (frame: number, delay: number, dur: number, target: number) =>
  Math.round(easeOut(fi(frame, delay, dur)) * target);
