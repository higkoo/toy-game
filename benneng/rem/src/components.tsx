import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {C, FONT} from './theme';

/** 全片底色：深色 + 暖光晕 + 细网格质感 */
export const Backdrop: React.FC<{glow?: number}> = ({glow = 1}) => (
  <AbsoluteFill style={{background: C.bg}}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(58% 46% at 50% 34%, rgba(232,100,43,${0.22 * glow}) 0%, rgba(232,100,43,0.06) 46%, rgba(12,11,10,0) 72%)`,
      }}
    />
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(90% 70% at 50% 120%, rgba(232,100,43,0.10) 0%, rgba(12,11,10,0) 60%)',
      }}
    />
    <AbsoluteFill
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px)',
        backgroundSize: '96px 96px',
        maskImage: 'radial-gradient(70% 60% at 50% 42%, #000 0%, transparent 78%)',
        WebkitMaskImage: 'radial-gradient(70% 60% at 50% 42%, #000 0%, transparent 78%)',
      }}
    />
  </AbsoluteFill>
);

/** 顶部品牌条 */
export const TopBar: React.FC<{opacity?: number}> = ({opacity = 1}) => (
  <div
    style={{
      position: 'absolute', top: 52, left: 96, right: 96,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      opacity, fontFamily: FONT,
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
      <span
        style={{
          width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center',
          background: C.accent, color: '#1B0D06', fontSize: 22, fontWeight: 800,
        }}
      >本</span>
      <span style={{color: C.dim, fontSize: 22, letterSpacing: 2}}>大医传承</span>
    </div>
    <span style={{color: C.faint, fontSize: 20, letterSpacing: 4, fontVariantNumeric: 'tabular-nums'}}>
      4 个合集 · 164 集
    </span>
  </div>
);

/** 小标题：橙色短线 + 文案 */
export const Eyebrow: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 14, ...style}}>
    <span style={{width: 34, height: 3, background: C.accent, borderRadius: 2}} />
    <span style={{color: C.accentSoft, fontSize: 24, letterSpacing: 5}}>{children}</span>
  </div>
);

/** 数字 + 说明 */
export const Stat: React.FC<{value: React.ReactNode; label: string; style?: React.CSSProperties}> = ({value, label, style}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 6, ...style}}>
    <span style={{fontSize: 76, fontWeight: 800, color: C.ink, lineHeight: 1.05, letterSpacing: -1}}>{value}</span>
    <span style={{fontSize: 22, color: C.faint, letterSpacing: 3}}>{label}</span>
  </div>
);

/** 合集封面卡：16:9 图 + 底部渐变 + 编号/集数 */
export const CoverCard: React.FC<{
  cover: string;
  index: number;
  count: number;
  width?: number;
  style?: React.CSSProperties;
}> = ({cover, index, count, width = 760, style}) => (
  <div
    style={{
      width,
      borderRadius: 34,
      overflow: 'hidden',
      background: C.card,
      boxShadow: '0 48px 110px rgba(0,0,0,.62), 0 0 0 1px rgba(255,255,255,.09)',
      position: 'relative',
      ...style,
    }}
  >
    <Img src={staticFile(cover)} style={{display: 'block', width: '100%', height: width * 9 / 16, objectFit: 'cover'}} />
    <div
      style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(12,11,10,.35) 0%, transparent 40%, rgba(12,11,10,.82) 100%)',
      }}
    />
    <div
      style={{
        position: 'absolute', top: 22, left: 22,
        padding: '8px 16px', borderRadius: 999,
        border: '1px solid rgba(255,255,255,.22)',
        background: 'rgba(12,11,10,.62)',
        color: '#fff', fontSize: 18, letterSpacing: 3,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      合集 {String(index).padStart(2, '0')} · {count} 集
    </div>
  </div>
);

/** 底部细进度条 */
export const ProgressBar: React.FC<{progress: number}> = ({progress}) => (
  <div style={{position: 'absolute', left: 96, right: 96, bottom: 46, height: 4, background: 'rgba(255,255,255,.09)', borderRadius: 2}}>
    <div style={{width: `${Math.min(1, Math.max(0, progress)) * 100}%`, height: '100%', background: C.accent, borderRadius: 2}} />
  </div>
);
