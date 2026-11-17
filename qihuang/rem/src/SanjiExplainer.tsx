import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES, fi, easeOut} from './theme';
import {PaperBackground, GlobalChrome, NarrationTrack} from './components';
import {SCENE_COMPONENTS} from './scenes';

/**
 * 《倪海厦学习天地》60 秒产品解说
 * 1920×1080 / 30fps / 1800 帧，9 个场景
 *
 * 背景与全局章节条只渲染一次（跨场景连续），各场景只负责内容层，
 * 由 SceneWrap 做首尾淡入淡出，避免每场背景闪动。
 *
 * 声音：中文旁白为主（vo.wav，0.9），BGM 在人声段自动 duck 到 0.15
 * ——相对原先 0.8 衰减约 14.5dB，只留可闻的垫底，不与人声抢中频。
 */

/** BGM 动态音量：人声进来前 0.30，人声在场 0.15，收尾平滑回升 */
const bgmVolume = (f: number) => {
  const voiceIn = easeOut(fi(f, 24, 30));
  const voiceOut = 1 - easeOut(fi(f, 1730, 50));
  const duck = Math.max(0, Math.min(voiceIn, voiceOut));
  return 0.30 - 0.15 * duck;
};
export const SanjiExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: C.paper, fontFamily: FONT}}>
      <PaperBackground />

      {SCENES.map((s, i) => {
        const Scene = SCENE_COMPONENTS[i];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.duration} layout="none">
            <Scene />
          </Sequence>
        );
      })}

      <GlobalChrome absoluteFrame={frame} />
      <NarrationTrack absoluteFrame={frame} />
      <Audio src={staticFile('vo.wav')} volume={0.9} />
      <Audio src={staticFile('bgm.wav')} volume={bgmVolume} />
    </AbsoluteFill>
  );
};
