import React from 'react';
import {Composition} from 'remotion';
import {BennengExplainer} from './BennengExplainer';
import {FPS, WIDTH, HEIGHT, DURATION_IN_FRAMES} from './theme';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="BennengExplainer"
    component={BennengExplainer}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
