/** 全局常量：画幅、帧率、配色、字体、场景时间轴 —— 改这里就能改全片 */
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_IN_FRAMES = 720; // 24s @ 30fps

export const C = {
  bg: '#0C0B0A',
  bgSoft: '#141210',
  card: '#1D1915',
  ink: '#F5F1EA',
  dim: '#B9B1A6',
  faint: '#7A736A',
  accent: '#E8642B',
  accentSoft: '#F3A177',
  line: 'rgba(255,255,255,.10)',
};

export const FONT = '"PingFang SC","Noto Sans CJK SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

export interface SceneDef {
  id: string;
  label: string;
  from: number;
  duration: number;
}

/** 4 个场景：120 + 120 + 360 + 120 = 720 */
export const SCENES: SceneDef[] = [
  {id: '01', label: '序 · 全集', from: 0, duration: 120},
  {id: '02', label: '总览 · 4 个合集', from: 120, duration: 120},
  {id: '03', label: '四个合集', from: 240, duration: 360},
  {id: '04', label: '落版', from: 600, duration: 120},
];

/* ---------- 动画小工具 ---------- */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

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

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
