import { useEffect, useRef, useState } from 'react';
import { LowPolyHeadProps } from './types';

/**
 * SVG Cat Avatar with mouth animation driven by audio amplitude.
 * Replaces the Three.js approach with a simpler CSS/SVG solution.
 */
export function CatAvatar({ amplitudeRef }: LowPolyHeadProps) {
  const [mouthOpen, setMouthOpen] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Sync amplitude ref to React state for SVG animation
  useEffect(() => {
    const updateMouth = () => {
      setMouthOpen(amplitudeRef.current);
      animationRef.current = requestAnimationFrame(updateMouth);
    };
    animationRef.current = requestAnimationFrame(updateMouth);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [amplitudeRef]);

  // Mouth path changes based on amplitude (0 = closed, 1 = fully open)
  const mouthHeight = 2 + mouthOpen * 15;
  const mouthY = 62 + mouthOpen * 3;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="w-[80%] h-[80%] max-w-[400px] max-h-[400px] animate-breathe"
      >
        {/* Definitions for gradients */}
        <defs>
          <linearGradient id="catFur" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a4a4a" />
            <stop offset="100%" stopColor="#2a2a2a" />
          </linearGradient>
          <linearGradient id="earInner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="100%" stopColor="#252525" />
          </linearGradient>
        </defs>

        {/* Left Ear */}
        <polygon
          points="20,35 35,5 45,35"
          fill="url(#catFur)"
          className="animate-ear-twitch-left"
        />
        <polygon points="25,32 35,12 42,32" fill="url(#earInner)" />

        {/* Right Ear */}
        <polygon
          points="55,35 65,5 80,35"
          fill="url(#catFur)"
          className="animate-ear-twitch-right"
        />
        <polygon points="58,32 65,12 75,32" fill="url(#earInner)" />

        {/* Head - rounded shape made with ellipse */}
        <ellipse cx="50" cy="55" rx="35" ry="32" fill="url(#catFur)" />

        {/* Inner face - lighter area */}
        <ellipse cx="50" cy="60" rx="22" ry="18" fill="#3a3a3a" />

        {/* Left Eye */}
        <ellipse cx="38" cy="50" rx="6" ry="7" fill="#1a1a1a" />
        <ellipse cx="38" cy="50" rx="4" ry="5" fill="#4fc3f7" />
        <ellipse cx="39" cy="49" rx="1.5" ry="2" fill="#ffffff" />

        {/* Right Eye */}
        <ellipse cx="62" cy="50" rx="6" ry="7" fill="#1a1a1a" />
        <ellipse cx="62" cy="50" rx="4" ry="5" fill="#4fc3f7" />
        <ellipse cx="63" cy="49" rx="1.5" ry="2" fill="#ffffff" />

        {/* Nose */}
        <polygon points="50,56 46,62 54,62" fill="#2a2a2a" />

        {/* Mouth - animated based on amplitude */}
        <ellipse
          cx="50"
          cy={mouthY}
          rx="8"
          ry={mouthHeight}
          fill="#1a1a1a"
          style={{ transition: 'ry 0.05s ease-out, cy 0.05s ease-out' }}
        />

        {/* Whiskers - Left */}
        <line
          x1="15"
          y1="58"
          x2="32"
          y2="60"
          stroke="#5a5a5a"
          strokeWidth="0.8"
          className="animate-whisker"
        />
        <line
          x1="15"
          y1="63"
          x2="32"
          y2="63"
          stroke="#5a5a5a"
          strokeWidth="0.8"
          className="animate-whisker"
        />
        <line
          x1="15"
          y1="68"
          x2="32"
          y2="66"
          stroke="#5a5a5a"
          strokeWidth="0.8"
          className="animate-whisker"
        />

        {/* Whiskers - Right */}
        <line
          x1="85"
          y1="58"
          x2="68"
          y2="60"
          stroke="#5a5a5a"
          strokeWidth="0.8"
          className="animate-whisker"
        />
        <line
          x1="85"
          y1="63"
          x2="68"
          y2="63"
          stroke="#5a5a5a"
          strokeWidth="0.8"
          className="animate-whisker"
        />
        <line
          x1="85"
          y1="68"
          x2="68"
          y2="66"
          stroke="#5a5a5a"
          strokeWidth="0.8"
          className="animate-whisker"
        />
      </svg>
    </div>
  );
}
