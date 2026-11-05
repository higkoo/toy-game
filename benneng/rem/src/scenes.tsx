import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT, fi, easeOut, riseIn, countTo, SCENES, lerp} from './theme';
import {COLLECTIONS, TOTAL, ASSETS, BRAND} from './data';
import {Backdrop, TopBar, Eyebrow, Stat, CoverCard} from './components';

const Stage: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{position: 'absolute', left: 96, right: 96, top: 128, bottom: 110, ...style}}>{children}</div>
);

/* ================================================================
   01 · 序（0–120）：人物照 + 标题
   ================================================================ */
export const S01Opening: React.FC = () => {
  const f = useCurrentFrame();
  const photoP = easeOut(fi(f, 0, 34));
  const t1 = riseIn(f, 6, 20, 30);
  const t2 = riseIn(f, 16, 20, 30);
  const t3 = riseIn(f, 28, 20, 24);

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.ink}}>
      <Backdrop glow={1.15} />
      <TopBar opacity={fi(f, 6, 20)} />
      <Stage style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 60}}>
        <div style={{width: 760}}>
          <div style={{opacity: t1.opacity, transform: `translateY(${t1.y}px)`}}>
            <Eyebrow>{BRAND.eyebrow}</Eyebrow>
          </div>
          <div style={{opacity: t2.opacity, transform: `translateY(${t2.y}px)`, marginTop: 26}}>
            <div style={{fontSize: 150, fontWeight: 800, lineHeight: 0.98, letterSpacing: -4}}>{BRAND.title}</div>
            <div style={{fontSize: 76, fontWeight: 700, color: C.dim, marginTop: 10, letterSpacing: 2}}>{BRAND.subtitle}</div>
          </div>
          <div style={{opacity: t3.opacity, transform: `translateY(${t3.y}px)`, marginTop: 34}}>
            <div style={{fontSize: 26, color: C.faint, letterSpacing: 2}}>{BRAND.series}</div>
            <div
              style={{
                marginTop: 30, display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '16px 30px', borderRadius: 16, background: C.accent, color: '#1B0D06',
                fontSize: 26, fontWeight: 700, boxShadow: '0 18px 44px rgba(232,100,43,.3)',
              }}
            >
              开始学习
              <span style={{fontSize: 22}}>↓</span>
            </div>
          </div>
        </div>
        <div
          style={{
            width: 900, height: 506, borderRadius: 30, overflow: 'hidden',
            boxShadow: '0 56px 120px rgba(0,0,0,.66), 0 0 0 1px rgba(255,255,255,.10)',
            opacity: photoP,
            transform: `translateX(${lerp(90, 0, photoP)}px) scale(${lerp(1.06, 1, photoP)})`,
            position: 'relative',
          }}
        >
          <Img src={staticFile(ASSETS.hero)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(12,11,10,.55) 0%, rgba(12,11,10,0) 42%)'}} />
        </div>
      </Stage>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 180, background: `linear-gradient(180deg, rgba(12,11,10,0) 0%, ${C.bg} 100%)`}} />
    </AbsoluteFill>
  );
};

/* ================================================================
   02 · 总览（120–240）：4 个合集 / 164 集
   ================================================================ */
export const S02Overview: React.FC = () => {
  const f = useCurrentFrame();
  const eased = easeOut(fi(f, 0, 16));
  const flip = easeOut(fi(f, 10, 24));

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.ink, opacity: eased}}>
      <Backdrop glow={0.8} />
      <TopBar opacity={1} />
      <Stage style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 54}}>
        <div>
          <Eyebrow>全集总览</Eyebrow>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 90, marginTop: 34}}>
            <Stat value={countTo(f, 8, 34, 4)} label="个合集" />
            <span style={{width: 1, height: 96, background: C.line, marginBottom: 6}} />
            <Stat value={countTo(f, 14, 38, TOTAL)} label="集完整收录" />
            <span style={{width: 1, height: 96, background: C.line, marginBottom: 6}} />
            <Stat value="16:9" label="移动与桌面自适应" />
          </div>
        </div>
        <div style={{display: 'flex', gap: 22}}>
          {COLLECTIONS.map((c, i) => {
            const r = riseIn(f, 16 + i * 6, 18, 32);
            return (
              <div
                key={c.id}
                style={{
                  width: 400, borderRadius: 22, overflow: 'hidden',
                  background: C.card, boxShadow: '0 26px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08)',
                  opacity: r.opacity, transform: `translateY(${r.y}px)`,
                  position: 'relative',
                }}
              >
                <Img src={staticFile(c.cover)} style={{display: 'block', width: '100%', height: 225, objectFit: 'cover'}} />
                <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 225, background: 'linear-gradient(180deg, rgba(12,11,10,0) 55%, rgba(12,11,10,.55) 100%)'}} />
                <div style={{padding: '18px 22px 22px', borderTop: `1px solid ${C.line}`}}>
                  <div style={{fontSize: 25, fontWeight: 700}}>{c.name}</div>
                  <div style={{fontSize: 18, color: C.dim, marginTop: 6, letterSpacing: 2}}>{c.count} 集</div>
                </div>
              </div>
            );
          })}
        </div>
      </Stage>
      <div style={{position: 'absolute', inset: 0, background: C.bg, opacity: 1 - flip, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

/* ================================================================
   03 · 四个合集（240–600）：每个 90 帧
   ================================================================ */
export const S03Collections: React.FC<{index: number}> = ({index}) => {
  const f = useCurrentFrame();
  const c = COLLECTIONS[index];
  const seg = 90;
  const local = f;
  const inP = easeOut(fi(local, 0, 14));
  const outP = fi(local, seg - 7, 7);
  const text1 = riseIn(local, 5, 18, 26);
  const text2 = riseIn(local, 14, 18, 22);

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.ink, opacity: 1 - outP}}>
      <Backdrop glow={0.95} />
      <TopBar opacity={0.9} />
      <Stage style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 70}}>
        <CoverCard
          cover={c.cover}
          index={index + 1}
          count={c.count}
          width={880}
          style={{
            opacity: inP,
            transform: `translateX(${lerp(-70, 0, inP)}px) scale(${lerp(0.97, 1, inP)})`,
          }}
        />
        <div style={{width: 720}}>
          <div style={{display: 'flex', gap: 10, marginBottom: 26}}>
            {COLLECTIONS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === index ? 46 : 18, height: 4, borderRadius: 2,
                  background: i === index ? C.accent : 'rgba(255,255,255,.16)',
                }}
              />
            ))}
          </div>
          <div style={{opacity: text1.opacity, transform: `translateY(${text1.y}px)`}}>
            <div style={{fontSize: 30, color: C.accentSoft, letterSpacing: 5}}>
              合集 {String(index + 1).padStart(2, '0')}
            </div>
            <div style={{fontSize: 78, fontWeight: 800, lineHeight: 1.12, marginTop: 12, letterSpacing: -1}}>
              {c.name}
            </div>
          </div>
          <div style={{opacity: text2.opacity, transform: `translateY(${text2.y}px)`, marginTop: 24}}>
            <div style={{fontSize: 30, color: C.dim, lineHeight: 1.6, maxWidth: 640}}>{c.intro}</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 26}}>
              <span style={{fontSize: 54, fontWeight: 800, color: C.accent}}>{c.count}</span>
              <span style={{fontSize: 24, color: C.faint, letterSpacing: 2}}>集 · 已收录</span>
            </div>
          </div>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

/* ================================================================
   04 · 落版（600–720）
   ================================================================ */
export const S04Coda: React.FC = () => {
  const f = useCurrentFrame();
  const seal = easeOut(fi(f, 4, 30));
  const t1 = riseIn(f, 18, 24, 26);
  const t2 = riseIn(f, 34, 24, 22);

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.ink}}>
      <Backdrop glow={1.3} />
      <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 34}}>
        <div
          style={{
            width: 128, height: 128, borderRadius: 26, display: 'grid', placeItems: 'center',
            background: C.accent, color: '#1B0D06', fontSize: 64, fontWeight: 800,
            opacity: seal, transform: `scale(${lerp(0.82, 1, seal)})`,
            boxShadow: '0 26px 60px rgba(232,100,43,.3)',
          }}
        >本</div>
        <div style={{opacity: t1.opacity, transform: `translateY(${t1.y}px)`, textAlign: 'center'}}>
          <div style={{fontSize: 88, fontWeight: 800, letterSpacing: -1}}>{BRAND.codaTitle}</div>
          <div style={{fontSize: 30, color: C.dim, marginTop: 18, letterSpacing: 2}}>{BRAND.codaSub}</div>
        </div>
        <div
          style={{
            opacity: t2.opacity, transform: `translateY(${t2.y}px)`,
            marginTop: 16, padding: '14px 28px', borderRadius: 999,
            border: `1px solid ${C.line}`, color: C.faint, fontSize: 24, letterSpacing: 3,
          }}
        >
          B 站 Toy · 郭生白视频全集
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
