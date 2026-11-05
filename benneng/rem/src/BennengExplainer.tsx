import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {C, SCENES} from './theme';
import {COLLECTIONS} from './data';
import {S01Opening, S02Overview, S03Collections, S04Coda} from './scenes';

/** 主时间轴：4 个场景 + 4 段合集分镜，总 720 帧 */
export const BennengExplainer: React.FC = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <Sequence from={SCENES[0].from} durationInFrames={SCENES[0].duration}>
      <S01Opening />
    </Sequence>

    <Sequence from={SCENES[1].from} durationInFrames={SCENES[1].duration}>
      <S02Overview />
    </Sequence>

    {COLLECTIONS.map((c, i) => (
      <Sequence key={c.id} from={SCENES[2].from + i * 90} durationInFrames={90}>
        <S03Collections index={i} />
      </Sequence>
    ))}

    <Sequence from={SCENES[3].from} durationInFrames={SCENES[3].duration}>
      <S04Coda />
    </Sequence>
  </AbsoluteFill>
);
