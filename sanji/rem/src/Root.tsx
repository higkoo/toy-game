import React from 'react';
import {Composition} from 'remotion';
import {SanjiExplainer} from './SanjiExplainer';
import {FPS, WIDTH, HEIGHT, DURATION_IN_FRAMES} from './theme';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="SanjiExplainer"
    component={SanjiExplainer}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
