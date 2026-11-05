import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {
  C, FONT, FONT_SANS,
  fi, easeOut, easeInOut, riseIn, SCENES,
} from './theme';
import {
  ASSETS, TIANJI, RENJI_BASE, RENJI_FANG, ALL_COURSE_NAMES, LEARNING_PATH,
  CODA_QUOTE, PRODUCT_URL, DISCLAIMER,
} from './data';
import {
  Seal, GoldText, Eyebrow, GoldRule, SectionKicker,
  CourseCard, SceneWrap, Portrait, BrandIcon, PhotoTile,
} from './components';

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** 内容区通用容器：避开顶部章节条与底部字幕 */
const Stage: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{
    position: 'absolute', left: 130, right: 130, top: 138, bottom: 148,
    ...style,
  }}>{children}</div>
);

/* ================================================================
   01 · 印章揭幕 (0–180)
   ================================================================ */
export const S01Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES[0].duration;
  const seal = easeOut(fi(frame, 0, 26));
  const title = '倪海厦学习天地';
  const subP = easeOut(fi(frame, 54, 28));

  return (
    <SceneWrap frame={frame} duration={dur}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
        <div style={{
          opacity: fi(frame, 8, 20),
          marginBottom: 46,
        }}><Eyebrow text="经典研习 · 影像合集" /></div>

        <Seal char="倪" size={112} style={{
          opacity: seal,
          transform: `translateY(${(1 - seal) * -70}px) scale(${1 + (1 - seal) * 0.55}) rotate(${(1 - seal) * -12}deg)`,
          marginBottom: 44,
        }} />

        <div style={{display: 'flex', whiteSpace: 'nowrap'}}>
          {title.split('').map((ch, i) => {
            const p = easeOut(fi(frame, 20 + i * 5, 22));
            return (
              <span key={i} style={{
                display: 'inline-block', opacity: p,
                transform: `translateY(${(1 - p) * 30}px)`,
                filter: `blur(${(1 - p) * 9}px)`,
              }}>
                <GoldText size={112} letterSpacing="0.06em">{ch}</GoldText>
              </span>
            );
          })}
        </div>

        <div style={{
          marginTop: 30, opacity: subP,
          fontFamily: FONT, fontSize: 42, letterSpacing: `${lerp(0.72, 0.3, subP)}em`,
          color: C.goldDark, paddingLeft: `${lerp(0.72, 0.3, subP) * 42}px`,
        }}>天纪 · 人纪 · 地纪</div>

        <div style={{
          marginTop: 22, opacity: fi(frame, 70, 22),
          fontFamily: FONT_SANS, fontSize: 19, letterSpacing: '0.36em', color: C.inkSoft,
          textTransform: 'uppercase',
        }}>The Complete Collection of Ni Hai-Xia</div>

        <div style={{width: 420, marginTop: 46, opacity: fi(frame, 82, 24)}}>
          <GoldRule width="100%" />
        </div>
      </AbsoluteFill>
      {/* 源码 hero 右侧的倪海厦人像，同样用底部 mask 融入宣纸 */}
      <Portrait
        width={250}
        opacity={easeOut(fi(frame, 22, 34)) * 0.86}
        style={{position: 'absolute', right: 110, top: 125}}
      />
    </SceneWrap>
  );
};

/* ================================================================
   02 · 从散到聚 (180–360)
   ================================================================ */
const SCATTER = [
  {x: 40, y: 66, r: -11}, {x: 330, y: 20, r: 8}, {x: 690, y: 96, r: -6},
  {x: 1080, y: 34, r: 13}, {x: 1370, y: 128, r: -9}, {x: 190, y: 300, r: 7},
  {x: 1250, y: 390, r: -12}, {x: 60, y: 540, r: 10}, {x: 560, y: 630, r: -7},
  {x: 980, y: 620, r: 6}, {x: 1430, y: 560, r: -5},
];

export const S02Gather: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES[1].duration;
  const p = easeInOut(fi(frame, 54, 62));
  const frameIn = easeOut(fi(frame, 68, 30));
  const scatterOut = 1 - easeOut(fi(frame, 58, 26));
  const gatherIn = easeOut(fi(frame, 80, 28));

  return (
    <SceneWrap frame={frame} duration={dur}>
      <Stage>
        {/* 收拢后的「一页」框架 */}
        <div style={{
          position: 'absolute', left: 404, top: 52, width: 846, height: 552,
          border: `1px solid ${C.line}`, borderRadius: 4,
          background: 'linear-gradient(165deg,rgba(255,255,255,.78),rgba(255,252,245,.42))',
          boxShadow: '0 24px 60px rgba(120,100,64,.10)',
          opacity: frameIn, transform: `scale(${0.96 + frameIn * 0.04})`,
        }}>
          <div style={{
            height: 52, borderBottom: `1px solid ${C.line}`,
            display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px',
            fontFamily: FONT, fontSize: 19, letterSpacing: '0.24em', color: C.goldDark,
          }}>
            <span style={{width: 24, height: 24, border: `1px solid ${C.gold}`, borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 13, letterSpacing: 0}}>倪</span>
            学习天地
            <span style={{marginLeft: 'auto', fontSize: 16, color: C.inkSoft, letterSpacing: '0.14em'}}>天纪 ・ 人纪 ・ 地纪 ・ 电子书</span>
          </div>
        </div>

        {/* 11 张散落课程卡 → 吸附成整齐网格 */}
        {ALL_COURSE_NAMES.map((name, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const tx = 452 + col * 262;
          const ty = 140 + row * 112;
          const s = SCATTER[i];
          const floatY = Math.sin(frame / 18 + i * 1.7) * 7 * (1 - p);
          const x = lerp(s.x, tx, p);
          const y = lerp(s.y, ty, p) + floatY;
          const rot = lerp(s.r, 0, p);
          const scale = lerp(1.08, 0.94, p);
          return (
            <div key={name} style={{
              position: 'absolute', left: x, top: y,
              width: 232, height: 82,
              transform: `rotate(${rot}deg) scale(${scale})`,
              background: 'rgba(255,253,247,.94)',
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 3, boxShadow: '0 10px 26px rgba(120,100,64,.12)',
              display: 'flex', alignItems: 'center', padding: '0 18px', gap: 14,
            }}>
              <span style={{width: 5, height: 5, borderRadius: '50%', background: C.gold, flex: '0 0 auto'}} />
              <span style={{fontFamily: FONT, fontSize: 25, letterSpacing: '0.08em', color: C.ink, whiteSpace: 'nowrap'}}>{name}</span>
              <span style={{marginLeft: 'auto', fontFamily: FONT, fontSize: 16, color: C.inkSoft}}>›</span>
            </div>
          );
        })}

        {/* 左侧叙事文字 */}
        <div style={{position: 'absolute', left: 0, top: 150, opacity: scatterOut}}>
          <div style={{fontFamily: FONT, fontSize: 52, fontWeight: 600, letterSpacing: '0.1em', color: C.inkDim}}>课程散落</div>
          <div style={{fontFamily: FONT, fontSize: 52, fontWeight: 600, letterSpacing: '0.1em', color: C.inkDim}}>链接零碎</div>
          <div style={{marginTop: 26, width: 200}}><GoldRule width="100%" /></div>
          <div style={{marginTop: 22, fontFamily: FONT, fontSize: 25, lineHeight: 1.9, color: C.inkSoft}}>收藏夹里翻半天，<br />还是找不齐一整套。</div>
        </div>

        <div style={{position: 'absolute', left: 0, top: 420, opacity: gatherIn, transform: `translateY(${(1 - gatherIn) * 22}px)`}}>
          <GoldText size={62} letterSpacing="0.12em">一页收拢</GoldText>
          <div style={{marginTop: 20, fontFamily: FONT, fontSize: 26, lineHeight: 1.9, letterSpacing: '0.05em', color: C.inkDim}}>B 站 Toy 内打开即用，<br />观看与讲义，各归其位。</div>
        </div>
      </Stage>
    </SceneWrap>
  );
};

/* ================================================================
   03 · 三纪总览 (360–570)
   ================================================================ */
const AXES = [
  {glyph: '天', name: '天纪', em: '天道', n: '3', unit: '条脉络', note: '天机道 ・ 人间道 ・ 地脉道', delay: 8},
  {glyph: '人', name: '人纪', em: '医道', n: '7', unit: '部课程', note: '针灸 → 内经 → 伤寒 → 金匮', delay: 26},
  {glyph: '地', name: '地纪', em: '未竟', n: '1', unit: '卷残章', note: '原计划未完，仅存片段', delay: 44},
];

export const S03Overview: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES[2].duration;
  const stats = easeOut(fi(frame, 104, 30));

  return (
    <SceneWrap frame={frame} duration={dur}>
      <Stage>
        <div style={{textAlign: 'center', marginBottom: 40, opacity: fi(frame, 0, 18)}}>
          <Eyebrow text="三 大 体 系" />
        </div>
        <div style={{display: 'flex', gap: 58, justifyContent: 'center'}}>
          {AXES.map((a) => {
            const ap = easeOut(fi(frame, a.delay, 26));
            const lineGrow = easeOut(fi(frame, a.delay + 6, 34));
            return (
              <div key={a.glyph} style={{
                width: 470, height: 500, position: 'relative',
                opacity: ap, transform: `translateY(${(1 - ap) * 44}px)`,
                background: 'linear-gradient(180deg,rgba(255,255,255,.76),rgba(255,252,245,.30))',
                border: `1px solid ${C.cardBorder}`, borderTop: `2px solid ${C.gold}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                paddingTop: 30,
              }}>
                <div style={{position: 'absolute', top: -7, left: '50%', width: 12, height: 12, transform: 'translateX(-50%) rotate(45deg)', background: C.gold}} />
                <GoldText size={146} letterSpacing="0">{a.glyph}</GoldText>
                <div style={{marginTop: 8, fontFamily: FONT, fontSize: 44, fontWeight: 600, letterSpacing: '0.24em', color: C.ink}}>{a.name}</div>
                <div style={{marginTop: 10, fontFamily: FONT, fontSize: 27, letterSpacing: '0.3em', color: C.goldDark}}>{a.em}</div>
                <div style={{
                  width: 240, height: 1, marginTop: 26,
                  background: `linear-gradient(90deg,transparent,${C.gold},transparent)`,
                  transform: `scaleX(${lineGrow})`,
                }} />
                <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 26}}>
                  <GoldText size={54}>{a.n}</GoldText>
                  <span style={{fontFamily: FONT, fontSize: 25, letterSpacing: '0.14em', color: C.inkDim}}>{a.unit}</span>
                </div>
                <div style={{marginTop: 14, fontFamily: FONT, fontSize: 21, letterSpacing: '0.04em', color: C.inkSoft}}>{a.note}</div>
              </div>
            );
          })}
        </div>

        {/* 数据条 */}
        <div style={{
          marginTop: 34, display: 'flex', justifyContent: 'center', gap: 90,
          opacity: stats, transform: `translateY(${(1 - stats) * 20}px)`,
          borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`,
          padding: '22px 0',
        }}>
          {[
            {n: '三', label: '大 体 系'},
            {n: '十一', label: '部 课 程'},
            {n: '全集', label: '完 整 收 录'},
          ].map((s) => (
            <div key={s.label} style={{textAlign: 'center', minWidth: 210}}>
              <GoldText size={40}>{s.n}</GoldText>
              <div style={{marginTop: 6, fontFamily: FONT, fontSize: 19, letterSpacing: '0.28em', color: C.inkSoft}}>{s.label}</div>
            </div>
          ))}
        </div>
      </Stage>
    </SceneWrap>
  );
};

/* ================================================================
   04 · 天纪 (570–780)
   ================================================================ */
export const S04Tianji: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES[3].duration;
  const bannerOut = 1 - easeOut(fi(frame, 62, 20));
  const cardsIn = easeOut(fi(frame, 74, 18));
  return (
    <SceneWrap frame={frame} duration={dur}>
      <Stage>
        <SectionKicker
          no="01 / 天 纪" title="天纪" em="天道"
          sub="以易经为骨，分三路展开：卦象推演、人事进退、山川形势。"
          frame={frame}
        />
        <div style={{width: 660, margin: '26px 0 0'}}><GoldRule frame={frame} delay={10} /></div>

        {/* 前 2 秒：展示源码 section-banner 里的天纪章节封面 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 220,
          display: 'flex', gap: 64, alignItems: 'center',
          opacity: bannerOut,
        }}>
          <div style={{flex: 1, opacity: easeOut(fi(frame, 8, 22))}}>
            <div style={{fontFamily: FONT, fontSize: 38, fontWeight: 600, letterSpacing: '0.1em', color: C.ink, lineHeight: 1.7}}>
              《天纪》讲的是<br />天地之间的大道理
            </div>
            <div style={{marginTop: 26, fontFamily: FONT, fontSize: 26, lineHeight: 2, color: C.inkDim}}>
              从卦象推演到人事进退，再到山川形势，<br />
              讲的不是趋吉避凶的技巧，而是读懂时与位。
            </div>
            <div style={{marginTop: 34, width: 300}}><GoldRule frame={frame} delay={20} /></div>
            <div style={{marginTop: 20, fontFamily: FONT, fontSize: 22, letterSpacing: '0.2em', color: C.goldDark}}>易经 · 紫微斗数 · 阳宅风水</div>
          </div>
          <PhotoTile
            src={ASSETS.tianji} width={720} height={480}
            caption="天纪 · 紫微斗数 / 原版 DVD 高清复刻"
            frame={frame} delay={6}
          />
        </div>

        {/* 后 4.5 秒：三张板块卡片滑入 */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 220, opacity: cardsIn}}>
          <div style={{display: 'flex', gap: 40, justifyContent: 'center'}}>
            {TIANJI.map((item, i) => (
              <CourseCard key={item.name} item={item} frame={frame} delay={78 + i * 14} width={500} height={452} />
            ))}
          </div>
        </div>
      </Stage>
    </SceneWrap>
  );
};

/* ================================================================
   05 · 人纪 · 筑基 (780–990)
   ================================================================ */
export const S05RenjiBase: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES[4].duration;
  return (
    <SceneWrap frame={frame} duration={dur}>
      <Stage>
        <SectionKicker
          no="02 / 人 纪" title="人纪" em="筑基"
          sub="一条由术入道的完整路径：先建立身体观，再立医理、识药性。"
          frame={frame}
        />
        <div style={{width: 660, margin: '26px 0 30px'}}><GoldRule frame={frame} delay={10} /></div>
        <div style={{display: 'flex', gap: 40, justifyContent: 'center'}}>
          {RENJI_BASE.map((item, i) => (
            <CourseCard key={item.name} item={item} frame={frame} delay={18 + i * 16} width={500} height={496} showCover />
          ))}
        </div>
      </Stage>
    </SceneWrap>
  );
};

/* ================================================================
   06 · 人纪 · 方证 (990–1200)
   ================================================================ */
export const S06RenjiFang: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES[5].duration;
  const path = easeOut(fi(frame, 74, 52));
  return (
    <SceneWrap frame={frame} duration={dur}>
      <Stage>
        <SectionKicker
          no="02 / 人 纪" title="人纪" em="方证"
          sub="由六经辨证入经方之门，再以心法与医案收束。"
          frame={frame}
        />
        <div style={{width: 660, margin: '26px 0 30px'}}><GoldRule frame={frame} delay={10} /></div>
        <div style={{display: 'flex', gap: 26, justifyContent: 'center'}}>
          {RENJI_FANG.map((item, i) => (
            <CourseCard key={item.name} item={item} frame={frame} delay={16 + i * 13} width={385} height={452} showCover compact />
          ))}
        </div>
        {/* 串联路径线 */}
        <svg style={{position: 'absolute', left: 40, top: 690, width: 1580, height: 40}} viewBox="0 0 1580 40">
          <line x1="30" y1="20" x2="1550" y2="20" stroke={C.gold} strokeWidth="2"
            strokeDasharray="1520" strokeDashoffset={1520 * (1 - path)} opacity="0.7" />
          {[30, 530, 1030, 1550].map((x, i) => (
            <circle key={i} cx={x} cy="20" r="6" fill={C.gold} opacity={fi(frame, 90 + i * 10, 12)} />
          ))}
        </svg>
        {/* 绝对定位锁定在金线之下、字幕条之上，避免被常驻字幕底板压住 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 742,
          textAlign: 'center', opacity: fi(frame, 104, 22),
          fontFamily: FONT, fontSize: 27, fontWeight: 600, letterSpacing: '0.3em', color: C.goldDark,
        }}>由 术 入 道</div>
      </Stage>
    </SceneWrap>
  );
};

/* ================================================================
   07 · 地纪与学习路径 (1200–1410)
   ================================================================ */
export const S07Diji: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES[6].duration;
  const left = riseIn(frame, 6, 26);
  const right = riseIn(frame, 26, 26);
  return (
    <SceneWrap frame={frame} duration={dur}>
      <AbsoluteFill style={{background: 'rgba(44,37,25,0.045)'}} />
      <Stage>
        <SectionKicker no="03 / 地 纪" title="地纪" em="未竟" frame={frame} />
        <div style={{width: 660, margin: '24px 0 30px'}}><GoldRule frame={frame} delay={8} /></div>
        <div style={{display: 'flex', gap: 70}}>
          {/* 残卷 */}
          <div style={{
            width: 720, height: 470, position: 'relative',
            opacity: left.opacity, transform: `translateY(${left.y}px)`,
            background: `linear-gradient(120deg,rgba(252,248,238,.97),rgba(240,232,215,.94)), url(${staticFile(`img/${ASSETS.diji}`)}) 72% 16%/cover no-repeat`,
            border: `1px solid rgba(163,128,63,.34)`,
            clipPath: 'polygon(0 0, 97% 0, 100% 8%, 98% 30%, 100% 52%, 97% 74%, 100% 92%, 97% 100%, 0 100%)',
            padding: '44px 48px',
          }}>
            <Img src={staticFile(`img/${ASSETS.diji}`)} style={{
              position: 'absolute', right: 62, top: 40, width: 76, height: 76,
              objectFit: 'cover', borderRadius: '50%',
              border: '2px solid rgba(163,128,63,.55)', opacity: 0.9,
              boxShadow: '0 8px 20px rgba(80,60,30,.16)',
            }} />
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              <span style={{fontFamily: FONT, fontSize: 18, letterSpacing: '0.2em', color: C.goldDeep, border: '1px solid rgba(216,181,106,.4)', padding: '5px 10px'}}>地纪 · 残章</span>
              <span style={{fontFamily: FONT, fontSize: 18, letterSpacing: '0.2em', color: C.inkSoft}}>未完成</span>
            </div>
            <div style={{marginTop: 30, fontFamily: FONT, fontSize: 52, fontWeight: 600, letterSpacing: '0.08em', color: C.ink}}>地纪 · 未竟之章</div>
            <div style={{marginTop: 10, fontFamily: FONT_SANS, fontSize: 17, letterSpacing: '0.2em', color: C.goldDeep, textTransform: 'uppercase'}}>The Unfinished Chapter</div>
            <div style={{marginTop: 28, fontFamily: FONT, fontSize: 26, lineHeight: 1.95, color: C.inkDim, maxWidth: 600}}>
              讲座未能全部完成，如今留存的只是片段与提纲——也因此，它更像一个未写完的结尾。
            </div>
            <div style={{
              marginTop: 30, display: 'inline-flex', alignItems: 'center', gap: 10,
              fontFamily: FONT, fontSize: 21, letterSpacing: '0.16em', color: C.rust,
            }}>
              <span style={{width: 7, height: 7, borderRadius: '50%', background: C.rust}} />
              原计划未完 · 仅存片段
            </div>
          </div>

          {/* 学习路径 */}
          <div style={{flex: 1, opacity: right.opacity, transform: `translateY(${right.y}px)`}}>
            <div style={{fontFamily: FONT, fontSize: 34, fontWeight: 600, letterSpacing: '0.16em', color: C.ink}}>如何开始</div>
            <div style={{marginTop: 6, fontFamily: FONT_SANS, fontSize: 16, letterSpacing: '0.2em', color: C.goldDeep}}>A PATH FOR BEGINNERS</div>
            <div style={{marginTop: 28, position: 'relative'}}>
              <div style={{position: 'absolute', left: 13, top: 12, bottom: 12, width: 1, background: `linear-gradient(180deg,${C.gold},rgba(163,128,63,.15))`}} />
              {LEARNING_PATH.map((n, i) => {
                const p = easeOut(fi(frame, 42 + i * 12, 18));
                return (
                  <div key={n} style={{
                    display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18,
                    opacity: p, transform: `translateX(${(1 - p) * 18}px)`,
                  }}>
                    <span style={{
                      width: 27, height: 27, borderRadius: '50%', flex: '0 0 auto',
                      border: `1px solid ${C.gold}`, background: i === 0 ? C.gold : 'rgba(255,253,247,.9)',
                      display: 'grid', placeItems: 'center',
                      fontFamily: FONT_SANS, fontSize: 14, color: i === 0 ? '#fffdf8' : C.goldDark,
                    }}>{i + 1}</span>
                    <span style={{fontFamily: FONT, fontSize: 29, letterSpacing: '0.1em', color: C.ink}}>{n}</span>
                    {i < LEARNING_PATH.length - 1 && <span style={{marginLeft: 'auto', fontFamily: FONT, fontSize: 19, color: C.inkSoft}}>→</span>}
                  </div>
                );
              })}
            </div>
            <div style={{
              marginTop: 12, opacity: fi(frame, 116, 22),
              fontFamily: FONT, fontSize: 22, letterSpacing: '0.08em', color: C.goldDark,
            }}>天纪可并行旁听，不必求快</div>
          </div>
        </div>
      </Stage>
    </SceneWrap>
  );
};

/* ================================================================
   08 · 交互亮点 (1410–1620)
   ================================================================ */
const HIGHLIGHTS = [
  {n: '01', t: '观看 + 讲义', d: '每张卡片两个入口，视频与文档各归其位', delay: 12},
  {n: '02', t: 'App 内即点即播', d: 'Toy SDK 原生导航，移动端还有分集面板', delay: 28},
  {n: '03', t: '打不开也有兜底', d: '自动给出视频链接，一键复制', delay: 44},
];

const PhoneMock: React.FC<{frame: number}> = ({frame}) => {
  const panel = easeOut(fi(frame, 88, 30));
  const ripple = fi(frame, 40, 34);
  return (
    <div style={{
      position: 'absolute', left: 1000, top: 6, width: 420, height: 726,
      borderRadius: 40, border: '9px solid #3a3226',
      background: 'linear-gradient(180deg,#fdfaf2,#f2ebdc)',
      boxShadow: '0 30px 70px rgba(60,48,28,.24)', overflow: 'hidden',
    }}>
      {/* 导航条 */}
      <div style={{
        height: 76, borderBottom: `1px solid ${C.line}`, padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: FONT, fontSize: 17, letterSpacing: '0.18em', color: C.goldDark,
      }}>
        <span style={{width: 25, height: 25, border: `1px solid ${C.gold}`, borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 13, letterSpacing: 0}}>倪</span>
        学习天地
      </div>
      <div style={{
        display: 'flex', gap: 14, padding: '14px 20px',
        fontFamily: FONT, fontSize: 14, letterSpacing: '0.08em', color: C.inkSoft,
        borderBottom: `1px solid ${C.line}`,
      }}>
        <span style={{color: C.goldDark}}>天纪</span><span style={{color: C.goldDark}}>人纪</span><span>电子书</span><span>地纪</span>
      </div>

      {/* 课程卡 */}
      <div style={{margin: 22, padding: 20, background: 'rgba(255,255,255,.86)', border: `1px solid ${C.cardBorder}`, borderRadius: 3}}>
        <div style={{fontFamily: FONT, fontSize: 14, letterSpacing: '0.16em', color: C.goldDeep}}>人纪 · 四</div>
        <div style={{marginTop: 12, fontFamily: FONT, fontSize: 32, fontWeight: 600, letterSpacing: '0.08em', color: C.ink}}>伤寒论</div>
        <div style={{marginTop: 8, fontFamily: FONT, fontSize: 15, lineHeight: 1.8, color: C.inkDim}}>六经辨证的主体课程，逐条讲方证与传变。</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.cardBorder}`, position: 'relative'}}>
          <span style={{fontFamily: FONT, fontSize: 14, color: C.inkSoft}}>8 集 · 合集</span>
          <span style={{
            marginLeft: 'auto', position: 'relative',
            fontFamily: FONT, fontSize: 17, fontWeight: 600, letterSpacing: '0.1em', color: '#2a2008',
            background: 'linear-gradient(160deg,#f3dda6,#dcbb73)', padding: '8px 16px', borderRadius: 2,
          }}>
            观看 →
            <span style={{
              position: 'absolute', left: '50%', top: '50%', width: 90, height: 90,
              marginLeft: -45, marginTop: -45, borderRadius: '50%',
              border: `2px solid ${C.gold}`,
              opacity: (1 - ripple) * 0.8, transform: `scale(${0.3 + ripple * 2.1})`,
              pointerEvents: 'none',
            }} />
          </span>
          <span style={{fontFamily: FONT, fontSize: 15, color: C.inkSoft}}>笔记</span>
        </div>
      </div>

      <div style={{margin: '0 22px', padding: 16, background: 'rgba(255,255,255,.7)', border: `1px solid ${C.cardBorder}`}}>
        <div style={{fontFamily: FONT, fontSize: 14, color: C.goldDeep, letterSpacing: '0.16em'}}>附 / 电子书</div>
        <div style={{marginTop: 10, fontFamily: FONT, fontSize: 18, color: C.ink}}>《三纪》学习笔记 · 全套资源包</div>
      </div>

      {/* 分集面板 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 350,
        background: 'linear-gradient(180deg,#fffdf8,#f8f2e5)',
        borderTop: `1px solid rgba(163,128,63,.3)`,
        borderRadius: '20px 20px 0 0', padding: '20px 22px',
        boxShadow: '0 -14px 40px rgba(80,60,30,.18)',
        opacity: panel, transform: `translateY(${(1 - panel) * 360}px)`,
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span style={{fontFamily: FONT, fontSize: 23, fontWeight: 600, color: C.ink}}>伤寒论 · 分集</span>
          <span style={{fontSize: 20, color: C.goldDark}}>×</span>
        </div>
        <div style={{marginTop: 8, fontFamily: FONT, fontSize: 14, color: C.inkSoft}}>共 8 集 · 原版 DVD 高清复刻</div>
        {['DVD01 · 高清复刻', 'DVD02 · 高清复刻', 'DVD03 · 高清复刻'].map((e, i) => (
          <div key={e} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
            borderBottom: '1px dashed rgba(120,100,64,.16)',
          }}>
            <span style={{fontFamily: FONT_SANS, fontSize: 14, color: C.goldDeep}}>0{i + 1}</span>
            <span style={{fontFamily: FONT, fontSize: 16, color: '#3a3223'}}>{e}</span>
            <span style={{marginLeft: 'auto', fontFamily: FONT_SANS, fontSize: 13, color: C.inkSoft}}>03:56</span>
            <span style={{color: C.gold}}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const S08Interaction: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES[7].duration;
  return (
    <SceneWrap frame={frame} duration={dur}>
      <Stage>
        <div style={{width: 700}}>
          <SectionKicker no="产 品 体 验" title="打开即用" em="少一步" frame={frame} />
          <div style={{marginTop: 42}}>
            {HIGHLIGHTS.map((h) => {
              const a = riseIn(frame, h.delay, 22);
              return (
                <div key={h.n} style={{
                  display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 30,
                  opacity: a.opacity, transform: `translateY(${a.y}px)`,
                }}>
                  <span style={{
                    fontFamily: FONT_SANS, fontSize: 17, color: C.gold,
                    border: `1px solid ${C.line}`, padding: '7px 10px', borderRadius: 2, flex: '0 0 auto',
                  }}>{h.n}</span>
                  <div>
                    <div style={{fontFamily: FONT, fontSize: 32, fontWeight: 600, letterSpacing: '0.08em', color: C.ink}}>{h.t}</div>
                    <div style={{marginTop: 8, fontFamily: FONT, fontSize: 23, lineHeight: 1.8, color: C.inkDim}}>{h.d}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 浮动资源标签 */}
        {['讲义', '笔记', '全套资源包'].map((label, i) => {
          const p = easeOut(fi(frame, 104 + i * 12, 20));
          return (
            <div key={label} style={{
              position: 'absolute', left: 762, top: 190 + i * 88,
              opacity: p, transform: `translateX(${(1 - p) * 26}px)`,
              fontFamily: FONT, fontSize: 22, letterSpacing: '0.14em', color: C.goldDark,
              background: 'rgba(255,253,247,.92)', border: `1px solid ${C.line}`,
              borderRadius: 999, padding: '10px 22px', whiteSpace: 'nowrap',
              boxShadow: '0 8px 22px rgba(120,100,64,.10)',
            }}>{label}</div>
          );
        })}

        <PhoneMock frame={frame} />
      </Stage>
    </SceneWrap>
  );
};

/* ================================================================
   09 · 收尾 CTA (1620–1800)
   ================================================================ */
export const S09Coda: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES[8].duration;
  const parts = CODA_QUOTE.split('，');
  const brand = riseIn(frame, 78, 26);
  return (
    <SceneWrap frame={frame} duration={dur}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
        <div style={{display: 'flex', gap: 34, marginBottom: 48}}>
          {parts.map((p, i) => {
            const a = easeOut(fi(frame, 6 + i * 16, 26));
            return (
              <span key={p} style={{opacity: a, transform: `translateY(${(1 - a) * 22}px)`}}>
                <GoldText size={54} letterSpacing="0.14em">{p}</GoldText>
              </span>
            );
          })}
        </div>
        <div style={{width: 560, opacity: fi(frame, 64, 24)}}><GoldRule width="100%" /></div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 26, marginTop: 52,
          opacity: brand.opacity, transform: `translateY(${brand.y}px)`,
        }}>
          <BrandIcon size={112} />
          <div>
            <div style={{fontFamily: FONT, fontSize: 44, fontWeight: 600, letterSpacing: '0.14em', color: C.ink}}>倪海厦学习天地</div>
            <div style={{marginTop: 10, fontFamily: FONT, fontSize: 24, letterSpacing: '0.2em', color: C.goldDark}}>天纪 / 人纪 / 地纪 · 学习合集</div>
          </div>
        </div>

        <div style={{
          marginTop: 40, opacity: fi(frame, 96, 24),
          fontFamily: FONT_SANS, fontSize: 26, letterSpacing: '0.14em', color: C.goldDeep,
          border: `1px solid ${C.line}`, borderRadius: 2, padding: '12px 30px',
          background: 'rgba(255,253,247,.7)',
        }}>B 站 Toy · {PRODUCT_URL}</div>

        <div style={{
          position: 'absolute', bottom: 150, maxWidth: 1240, textAlign: 'center',
          opacity: fi(frame, 88, 20),
          fontFamily: FONT, fontSize: 19, lineHeight: 1.9, letterSpacing: '0.03em',
          color: C.inkDim, background: 'rgba(253,250,242,.74)',
          padding: '10px 26px', borderRadius: 2,
        }}>{DISCLAIMER}</div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export const SCENE_COMPONENTS = [
  S01Opening, S02Gather, S03Overview,
  S04Tianji, S05RenjiBase, S06RenjiFang,
  S07Diji, S08Interaction, S09Coda,
];
