import { MutableRefObject } from 'react';

export interface AvatarProps {
  /** Ref to amplitude value (0-1), updated via AnalyserNode */
  amplitudeRef: MutableRefObject<number>;
  /** Whether AI is currently speaking */
  isSpeaking: boolean;
}

export interface LowPolyHeadProps {
  /** Ref to amplitude value for mouth animation */
  amplitudeRef: MutableRefObject<number>;
}

export interface HeadMorphTargets {
  /** Mouth open amount (0 = closed, 1 = fully open) */
  mouthOpen: number;
}
