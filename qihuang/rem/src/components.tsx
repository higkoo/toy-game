import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {
  C, FONT, FONT_SANS, WIDTH, DURATION_IN_FRAMES,
  SCENES, fi, easeOut, riseIn, fadeScene,
} from './theme';
import {ASSETS, CourseItem, CoverKind, NARRATION} from './data';

/* ============================================================
   宣纸背景：复刻源码 body 渐变 + 三层径向光晕 + 山水 + 颗粒
   ============================================================ */
export const Mountains: React.FC<{opacity?: number; height?: string}> = ({
  opacity = 0.55, height = '58%',
}) => (
  <svg
    style={{position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height, opacity}}
    viewBox="0 0 1440 520"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="mg1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8d7a56" stopOpacity=".16" />
        <stop offset="100%" stopColor="#f7f2e7" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="mg2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7d6b48" stopOpacity=".22" />
        <stop offset="100%" stopColor="#f7f2e7" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0,380 L120,300 L210,346 L320,236 L420,320 L520,272 L640,360 L760,300 L880,352 L1000,264 L1120,330 L1230,286 L1340,360 L1440,318 L1440,520 L0,520 Z" fill="url(#mg1)" />
    <path d="M0,440 L150,388 L260,428 L380,352 L500,420 L620,376 L740,436 L860,384 L980,440 L1100,372 L1220,428 L1340,392 L1440,440 L1440,520 L0,520 Z" fill="url(#mg2)" />
  </svg>
);

export const PaperBackground: React.FC<{dim?: number}> = ({dim = 0}) => (
  <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.paperTop} 0%, ${C.paperMid} 58%, ${C.paperBottom} 100%)`}}>
    <AbsoluteFill style={{
      background: [
        'radial-gradient(1000px 620px at 16% -8%, rgba(219,196,148,.50), transparent 62%)',
        'radial-gradient(880px 600px at 88% 4%, rgba(190,212,222,.42), transparent 64%)',
        'radial-gradient(900px 700px at 52% 112%, rgba(226,203,176,.50), transparent 66%)',
      ].join(','),
    }} />
    <Mountains />
    <AbsoluteFill style={{
      backgroundImage: `url(${staticFile('grain.png')})`,
      backgroundRepeat: 'repeat',
      opacity: 0.075,
      mixBlendMode: 'multiply',
    }} />
    {dim > 0 && <AbsoluteFill style={{background: `rgba(44,37,25,${dim})`}} />}
  </AbsoluteFill>
);

/* ============================================================
   装饰件
   ============================================================ */
export const GoldRule: React.FC<{width?: number | string; frame?: number; delay?: number}> = ({
  width = '100%', frame, delay = 0,
}) => {
  const p = frame === undefined ? 1 : easeOut(fi(frame, delay, 26));
  return (
    <div style={{
      position: 'relative', height: 1, width,
      background: 'linear-gradient(90deg, rgba(216,181,106,.65), rgba(216,181,106,.14) 60%, transparent)',
      transform: `scaleX(${p})`, transformOrigin: 'left center',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: -3, width: 6, height: 6,
        transform: 'rotate(45deg)', background: C.gold,
      }} />
    </div>
  );
};

export const Eyebrow: React.FC<{text: string; opacity?: number}> = ({text, opacity = 1}) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
    fontFamily: FONT, fontSize: 19, letterSpacing: '0.46em', color: C.gold, opacity,
  }}>
    <span style={{width: 56, height: 1, background: 'linear-gradient(90deg,transparent,#a3803f)'}} />
    {text}
    <span style={{width: 56, height: 1, background: 'linear-gradient(90deg,#a3803f,transparent)'}} />
  </div>
);

export const Seal: React.FC<{char: string; size?: number; style?: React.CSSProperties}> = ({
  char, size = 108, style,
}) => (
  <div style={{
    width: size, height: size, borderRadius: 8,
    border: `2px solid ${C.rust}`, color: C.rust,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: FONT, fontSize: size * 0.56, fontWeight: 700, lineHeight: 1,
    background: 'rgba(255,251,241,.55)',
    boxShadow: 'inset 0 0 0 5px rgba(255,255,255,.45), 0 12px 34px rgba(168,98,58,.20)',
    ...style,
  }}>
    {char}
  </div>
);

export const GoldText: React.FC<{
  children: React.ReactNode;
  size: number;
  letterSpacing?: string;
  weight?: number;
  style?: React.CSSProperties;
}> = ({children, size, letterSpacing = '0.08em', weight = 600, style}) => (
  <span style={{
    fontFamily: FONT, fontSize: size, fontWeight: weight, letterSpacing,
    background: 'linear-gradient(180deg,#2f2716 8%,#6d5224 58%,#a37e39 100%)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
    ...style,
  }}>{children}</span>
);

export const SectionKicker: React.FC<{
  no: string; title: string; em?: string; sub?: string; frame: number;
}> = ({no, title, em, sub, frame}) => {
  const a = riseIn(frame, 0, 20);
  return (
    <div style={{opacity: a.opacity, transform: `translateY(${a.y}px)`}}>
      <div style={{
        fontFamily: FONT, fontSize: 20, letterSpacing: '0.36em', color: C.gold, marginBottom: 14,
      }}>{no}</div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
        <span style={{fontFamily: FONT, fontSize: 62, fontWeight: 600, letterSpacing: '0.14em', color: C.ink}}>{title}</span>
        {em && <span style={{fontFamily: FONT, fontSize: 34, letterSpacing: '0.2em', color: C.gold}}>{em}</span>}
      </div>
      {sub && <div style={{marginTop: 16, fontFamily: FONT, fontSize: 27, lineHeight: 1.9, letterSpacing: '0.05em', color: C.inkDim}}>{sub}</div>}
    </div>
  );
};

/* ============================================================
   课程封面窗：程序化 SVG 纹样，零外部图片依赖
   ============================================================ */
const COVER_BG: Record<CoverKind, string> = {
  meridian: 'linear-gradient(150deg,#e7ddc6,#cbd8d3)',
  bamboo: 'linear-gradient(150deg,#eae0c7,#d6c6a0)',
  herb: 'linear-gradient(150deg,#dfe4d0,#c6d2b8)',
  six: 'linear-gradient(150deg,#e9dcc9,#d2bda0)',
  cabinet: 'linear-gradient(150deg,#e5d9c3,#c8b28c)',
  heart: 'linear-gradient(150deg,#eae1d0,#d4c2a1)',
  case: 'linear-gradient(150deg,#e3ddd0,#c5c9bd)',
};

export const CoverArt: React.FC<{kind: CoverKind; src?: string}> = ({kind, src}) => {
  // 有真实封面时复刻源码 .card-media：轻降饱和 + 底部宣纸渐隐遮罩，
  // 让亮蓝课程封面自然融进米黄卡片，而不是硬贴一块色块
  if (src) {
    return (
      <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#e9e3d3'}}>
        <Img src={staticFile(`img/${src}`)} style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%',
          filter: 'saturate(.94) contrast(1.02)', display: 'block',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom,transparent 50%,rgba(255,252,245,.42) 84%,rgba(255,252,245,.92))',
        }} />
      </div>
    );
  }
  const s = {fill: 'none', stroke: 'rgba(109,81,36,.5)', strokeWidth: 1.6} as const;
  const dot = {fill: 'rgba(163,128,63,.65)'} as const;
  return (
    <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: COVER_BG[kind]}}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" style={{width: '100%', height: '100%', opacity: 0.9}}>
        {kind === 'meridian' && (
          <g>
            {[0, 1, 2, 3].map((i) => (
              <path key={i} {...s} d={`M-10,${40 + i * 42} C110,${10 + i * 44} 180,${150 - i * 18} 410,${55 + i * 34}`} />
            ))}
            {[[78, 62], [152, 96], [238, 74], [312, 128], [196, 148]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={4} {...dot} />
            ))}
          </g>
        )}
        {kind === 'bamboo' && (
          <g>
            {Array.from({length: 11}, (_, i) => (
              <g key={i}>
                <line {...s} x1={28 + i * 35} y1={-10} x2={28 + i * 35} y2={210} />
                <line {...s} x1={24 + i * 35} y1={46} x2={32 + i * 35} y2={46} />
                <line {...s} x1={24 + i * 35} y1={132} x2={32 + i * 35} y2={132} />
              </g>
            ))}
          </g>
        )}
        {kind === 'herb' && (
          <g>
            <path {...s} d="M200,200 C200,140 198,90 200,30" />
            {Array.from({length: 6}, (_, i) => {
              const y = 46 + i * 26;
              const dir = i % 2 === 0 ? 1 : -1;
              return (
                <g key={i}>
                  <path {...s} d={`M200,${y} C${200 + dir * 45},${y - 26} ${200 + dir * 75},${y - 10} ${200 + dir * 82},${y + 8} C${200 + dir * 58},${y + 22} ${200 + dir * 26},${y + 18} 200,${y}`} />
                  <line {...s} x1={200} y1={y} x2={200 + dir * 70} y2={y + 2} />
                </g>
              );
            })}
          </g>
        )}
        {kind === 'six' && (
          <g>
            {Array.from({length: 6}, (_, i) => (
              <g key={i}>
                <line {...s} x1={40} y1={28 + i * 30} x2={360} y2={28 + i * 30} />
                <line {...s} x1={40 + (i % 3) * 26} y1={20 + i * 30} x2={40 + (i % 3) * 26} y2={36 + i * 30} />
              </g>
            ))}
            <circle cx={330} cy={118} r={26} {...s} />
          </g>
        )}
        {kind === 'cabinet' && (
          <g>
            {Array.from({length: 3}, (_, r) => Array.from({length: 4}, (_, c) => (
              <rect key={`${r}-${c}`} {...s} x={48 + c * 80} y={26 + r * 56} width={62} height={42} />
            )))}
          </g>
        )}
        {kind === 'heart' && (
          <g>
            {[34, 58, 82].map((r, i) => <circle key={i} cx={200} cy={100} r={r} {...s} />)}
            <path {...s} d="M40,100 C90,100 100,46 150,100 S210,154 260,100 S320,46 360,100" />
          </g>
        )}
        {kind === 'case' && (
          <g>
            <rect {...s} x={92} y={22} width={216} height={164} rx={3} />
            {Array.from({length: 8}, (_, i) => (
              <line key={i} {...s} x1={116} y1={48 + i * 18} x2={284 - (i % 3) * 36} y2={48 + i * 18} />
            ))}
            <path {...s} d="M116,164 L150,148 L182,158 L224,126 L268,142 L284,136" />
          </g>
        )}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom,transparent 46%,rgba(255,252,245,.45) 82%,rgba(255,252,245,.94))',
      }} />
    </div>
  );
};

/* ============================================================
   课程卡片（复刻源码 .card / .card-media / .card-foot）
   ============================================================ */
export const CourseCard: React.FC<{
  item: CourseItem;
  frame: number;
  delay: number;
  width?: number;
  height?: number;
  showCover?: boolean;
  compact?: boolean;
}> = ({item, frame, delay, width = 520, height = 470, showCover = false, compact = false}) => {
  const a = riseIn(frame, delay, 22, 46);
  return (
    <div style={{
      width, height, opacity: a.opacity,
      transform: `translateY(${a.y}px)`,
      background: 'linear-gradient(165deg,rgba(255,255,255,.90),rgba(255,252,245,.62))',
      border: `1px solid ${C.cardBorder}`,
      borderRadius: 3,
      boxShadow: '0 18px 44px rgba(120,100,64,.09)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {showCover && (item.cover || item.kind) && (
        <div style={{height: compact ? 140 : 176, flex: '0 0 auto'}}>
          <CoverArt kind={item.kind ?? 'case'} src={item.cover} />
        </div>
      )}
      <div style={{
        padding: showCover ? '18px 26px 16px' : '26px 28px 22px',
        display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexShrink: 0}}>
          <span style={{
            fontFamily: FONT, fontSize: 16, letterSpacing: '0.18em', color: C.goldDeep,
            border: '1px solid rgba(216,181,106,.42)', padding: '4px 9px', borderRadius: 2,
          }}>{item.idx}</span>
          <span style={{fontFamily: FONT, fontSize: 16, letterSpacing: '0.16em', color: C.inkSoft}}>{item.tag}</span>
        </div>
        <div style={{fontFamily: FONT, fontSize: 42, fontWeight: 600, letterSpacing: '0.08em', color: '#2b2418', flexShrink: 0}}>{item.name}</div>
        <div style={{marginTop: 6, fontFamily: FONT_SANS, fontSize: 15, letterSpacing: '0.18em', color: C.goldDeep, textTransform: 'uppercase', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.en}</div>
        <div style={{
          marginTop: 12, fontFamily: FONT, fontSize: width < 430 ? 21 : 23, lineHeight: width < 430 ? 1.55 : 1.7,
          letterSpacing: '0.02em', color: C.inkDim,
          flex: 1, minHeight: 0, overflow: 'hidden',
        }}>{item.desc}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12,
          borderTop: '1px solid rgba(120,100,64,.16)', flexShrink: 0,
        }}>
          <span style={{width: 5, height: 5, borderRadius: '50%', background: C.gold}} />
          <span style={{fontFamily: FONT, fontSize: 17, letterSpacing: '0.14em', color: C.inkSoft}}>{item.eps}</span>
          <span style={{marginLeft: 'auto', fontFamily: FONT, fontSize: 19, letterSpacing: '0.12em', color: C.goldDark, fontWeight: 600, whiteSpace: 'nowrap'}}>观看 →</span>
          <span style={{fontFamily: FONT, fontSize: 17, letterSpacing: '0.12em', color: C.inkSoft, whiteSpace: 'nowrap'}}>{item.action}</span>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   字幕条
   ============================================================ */
export const Subtitle: React.FC<{text: string; frame: number; start?: number}> = ({
  text, frame, start = 12,
}) => {
  const p = easeOut(fi(frame, start, 16));
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 52, pointerEvents: 'none'}}>
      <div style={{
        opacity: p, transform: `translateY(${(1 - p) * 14}px)`,
        display: 'flex', alignItems: 'center', gap: 22,
        background: 'rgba(253,250,242,.82)',
        borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`,
        padding: '15px 44px', maxWidth: 1560,
      }}>
        <span style={{width: 18, height: 1, background: C.gold, flex: '0 0 auto'}} />
        <span style={{fontFamily: FONT, fontSize: 37, letterSpacing: '0.1em', color: C.inkDim, whiteSpace: 'nowrap'}}>{text}</span>
        <span style={{width: 18, height: 1, background: C.gold, flex: '0 0 auto'}} />
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   逐句解说字幕轨（全局、跨场景连续）
   底板常驻不闪，只有文字按绝对时间轴淡出淡入切换；
   相邻两条严格接续（前条 to === 后条 from），切换点不叠字。
   ============================================================ */
export const NarrationTrack: React.FC<{absoluteFrame: number}> = ({absoluteFrame}) => {
  const cap = NARRATION.find((c) => absoluteFrame >= c.from && absoluteFrame < c.to);
  // 开场留 1.4s 让印章揭幕，收尾前 0.8s 整体淡出
  const base = Math.min(
    fi(absoluteFrame, 42, 20),
    fi(DURATION_IN_FRAMES - absoluteFrame, 0, 24),
  );
  // 新字幕立即以 60% 不透明出现、7 帧内淡到全亮；不做淡出，
  // 避免切换点出现「底板在、文字空」的空白字幕条。
  const p = cap ? 0.6 + 0.4 * fi(absoluteFrame, cap.from, 7) : 0;
  return (
    <AbsoluteFill style={{
      justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 52,
      pointerEvents: 'none', opacity: base,
    }}>
      <div style={{
        width: 1460, minHeight: 74, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 22,
        background: 'rgba(253,250,242,.88)',
        borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`,
        padding: '15px 44px',
      }}>
        <span style={{width: 18, height: 1, background: C.gold, flex: '0 0 auto'}} />
        <div style={{flex: 1, textAlign: 'center', overflow: 'hidden'}}>
          {cap ? (
            <span style={{
              display: 'inline-block', opacity: p,
              transform: `translateY(${(1 - p) * 10}px)`,
              fontFamily: FONT, fontSize: 35, letterSpacing: '0.08em',
              color: C.inkDim, whiteSpace: 'nowrap',
            }}>{cap.text}</span>
          ) : null}
        </div>
        <span style={{width: 18, height: 1, background: C.gold, flex: '0 0 auto'}} />
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   全局章节标识 + 顶部进度条（用绝对帧，跨场景连续）
   ============================================================ */
export const GlobalChrome: React.FC<{absoluteFrame: number}> = ({absoluteFrame}) => {
  const current = [...SCENES].reverse().find((s) => absoluteFrame >= s.from) ?? SCENES[0];
  const progress = Math.min(1, absoluteFrame / DURATION_IN_FRAMES);
  const p = fi(absoluteFrame, 0, 24);
  return (
    <>
      <div style={{position: 'absolute', top: 0, left: 0, height: 3, width: WIDTH * progress, background: `linear-gradient(90deg,${C.goldLight},${C.gold})`, opacity: 0.85}} />
      <div style={{
        position: 'absolute', top: 46, right: 68, opacity: p * 0.9,
        display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: FONT, fontSize: 19, letterSpacing: '0.24em', color: C.goldDark,
      }}>
        <span style={{width: 6, height: 6, transform: 'rotate(45deg)', background: C.gold}} />
        <span style={{fontFamily: FONT_SANS, fontSize: 15, letterSpacing: '0.1em', color: C.gold}}>{current.id} / 09</span>
        <span>{current.label}</span>
      </div>
      <div style={{
        position: 'absolute', top: 46, left: 68, opacity: p * 0.55,
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: FONT, fontSize: 17, letterSpacing: '0.28em', color: C.inkSoft,
      }}>
        <span style={{width: 22, height: 22, border: `1px solid ${C.gold}`, borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 12, letterSpacing: 0, color: C.goldDark}}>倪</span>
        学习天地
      </div>
    </>
  );
};

/* ============================================================
   场景包装：首尾淡入淡出（背景是全局的，不受影响）
   ============================================================ */
export const SceneWrap: React.FC<{
  frame: number; duration: number; children: React.ReactNode;
}> = ({frame, duration, children}) => (
  <AbsoluteFill style={{opacity: fadeScene(frame, duration, 13)}}>{children}</AbsoluteFill>
);

/* ============================================================
   真实素材组件：人像 / 品牌图标 / 图片小卡
   复刻源码 .hero-portrait 的 mask 与 .section-banner 的遮罩处理
   ============================================================ */
export const Portrait: React.FC<{
  width: number; opacity: number; style?: React.CSSProperties;
}> = ({width, opacity, style}) => (
  <div style={{position: 'relative', width, opacity, ...style}}>
    <Img src={staticFile(`img/${ASSETS.portrait}`)} style={{
      width: '100%', display: 'block',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 16%, #000 52%, transparent 97%)',
      maskImage: 'linear-gradient(to bottom, transparent 0%, #000 16%, #000 52%, transparent 97%)',
    }} />
    <div style={{
      position: 'absolute', inset: 0,
      // 左侧线性渐变 + 四边径向羽化，避免人像像一张硬贴的矩形照片
      background: [
        'linear-gradient(90deg,rgba(247,242,231,.95) 0%,rgba(247,242,231,.46) 24%,rgba(247,242,231,0) 60%)',
        'radial-gradient(ellipse at 54% 44%, rgba(247,242,231,0) 32%, rgba(247,242,231,.98) 94%)',
      ].join(','),
    }} />
  </div>
);

export const BrandIcon: React.FC<{size: number; style?: React.CSSProperties}> = ({size, style}) => (
  <Img src={staticFile(`img/${ASSETS.icon}`)} style={{
    width: size, height: size, objectFit: 'contain',
    borderRadius: size * 0.2,
    boxShadow: '0 12px 32px rgba(120,95,50,.20)',
    ...style,
  }} />
);

export const PhotoTile: React.FC<{
  src: string;
  width: number;
  height: number;
  caption?: string;
  frame: number;
  delay?: number;
  objectPosition?: string;
}> = ({src, width, height, caption, frame, delay = 0, objectPosition = 'center 28%'}) => {
  const p = easeOut(fi(frame, delay, 24));
  return (
    <div style={{opacity: p, transform: `translateY(${(1 - p) * 18}px)`, width, flex: '0 0 auto'}}>
      <div style={{
        width, height, position: 'relative', overflow: 'hidden',
        border: `1px solid ${C.line}`, borderRadius: 3,
        boxShadow: '0 16px 38px rgba(120,100,64,.16)', background: '#e9e3d3',
      }}>
        <Img src={staticFile(`img/${src}`)} style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition,
          filter: 'saturate(.94) contrast(1.02)', display: 'block',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom,transparent 50%,rgba(247,242,231,.42) 86%,rgba(247,242,231,.92))',
        }} />
      </div>
      {caption && (
        <div style={{
          marginTop: 12, fontFamily: FONT, fontSize: 20,
          letterSpacing: '0.18em', color: C.goldDark, textAlign: 'center',
        }}>{caption}</div>
      )}
    </div>
  );
};
