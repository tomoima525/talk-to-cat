import { useEffect, useRef } from "react";
import { LowPolyHeadProps } from "./types";

/**
 * SVG Cat Avatar with mouth animation driven by audio amplitude.
 * Uses direct DOM manipulation for smooth animation without React re-renders.
 */
export function CatAvatar({ amplitudeRef }: LowPolyHeadProps) {
  const mouthRef = useRef<SVGEllipseElement>(null);
  const animationRef = useRef<number | null>(null);

  // Animate mouth by directly manipulating DOM attributes (no React re-renders)
  useEffect(() => {
    const updateMouth = () => {
      const amplitude = amplitudeRef.current;
      if (mouthRef.current) {
        const mouthHeight = 2 + amplitude * 10;
        const mouthY = 67 + amplitude * 3;
        mouthRef.current.setAttribute("ry", String(mouthHeight));
        mouthRef.current.setAttribute("cy", String(mouthY - 5));
      }
      animationRef.current = requestAnimationFrame(updateMouth);
    };
    animationRef.current = requestAnimationFrame(updateMouth);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [amplitudeRef]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 140 90" className="w-[90%] h-[90%] max-w-[560px] max-h-[360px] animate-breathe">
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
          <linearGradient id="bodyFur" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a4a4a" />
            <stop offset="100%" stopColor="#2a2a2a" />
          </linearGradient>
        </defs>

        {/* Body - curled up, lying down */}
        <ellipse cx="90" cy="55" rx="40" ry="28" fill="url(#bodyFur)" />

        {/* Tail - curled around body */}
        <path
          d="M 118 65 Q 135 58, 130 42 Q 125 30, 105 35"
          fill="none"
          stroke="url(#catFur)"
          strokeWidth="10"
          strokeLinecap="round"
          className="animate-tail-wave"
        />

        {/* Front paws - tucked under head */}
        <ellipse cx="35" cy="74" rx="12" ry="7" fill="url(#catFur)" />
        <ellipse cx="56" cy="76" rx="10" ry="6" fill="url(#catFur)" />

        {/* Left Ear */}
        <polygon points="15,38 28,10 40,36" fill="url(#catFur)" className="animate-ear-twitch-left" />
        <polygon points="20,35 28,16 36,35" fill="url(#earInner)" />

        {/* Right Ear */}
        <polygon points="45,34 60,8 72,36" fill="url(#catFur)" className="animate-ear-twitch-right" />
        <polygon points="50,34 60,14 66,34" fill="url(#earInner)" />

        {/* Head - resting on paws */}
        <ellipse cx="43" cy="50" rx="32" ry="28" fill="url(#catFur)" />

        {/* Inner face - lighter area */}
        <ellipse cx="43" cy="55" rx="20" ry="16" fill="#3a3a3a" />

        {/* Left Eye */}
        <ellipse cx="32" cy="46" rx="5.5" ry="6.5" fill="#1a1a1a" />
        <ellipse cx="32" cy="46" rx="3.5" ry="4.5" fill="#4fc3f7" />
        <ellipse cx="33" cy="45" rx="1.3" ry="1.8" fill="#ffffff" />

        {/* Right Eye */}
        <ellipse cx="54" cy="46" rx="5.5" ry="6.5" fill="#1a1a1a" />
        <ellipse cx="54" cy="46" rx="3.5" ry="4.5" fill="#4fc3f7" />
        <ellipse cx="55" cy="45" rx="1.3" ry="1.8" fill="#ffffff" />

        {/* Mouth - animated via direct DOM manipulation */}
        <ellipse
          ref={mouthRef}
          cx="43"
          cy="62"
          rx="5.5"
          ry="2"
          fill="#FF0004"
        />
        {/* Cheek details */}
        <ellipse cx="46.5" cy="58" rx="4" ry="3.5" fill="#2a2a2a" />
        <ellipse cx="47.5" cy="57" rx="3.5" ry="3" fill="#3a3a3a" />
        <ellipse cx="39" cy="58" rx="4" ry="3.5" fill="#2a2a2a" />
        <ellipse cx="38.5" cy="57" rx="3.5" ry="3" fill="#3a3a3a" />

        {/* Nose */}
        <polygon points="43,57 40,52 46,52" fill="#2a2a2a" />

        {/* Whiskers - Left */}
        <line x1="8" y1="52" x2="24" y2="54" stroke="#5a5a5a" strokeWidth="0.8" className="animate-whisker" />
        <line x1="8" y1="56" x2="24" y2="56" stroke="#5a5a5a" strokeWidth="0.8" className="animate-whisker" />
        <line x1="8" y1="60" x2="24" y2="58" stroke="#5a5a5a" strokeWidth="0.8" className="animate-whisker" />

        {/* Whiskers - Right */}
        <line x1="78" y1="52" x2="62" y2="54" stroke="#5a5a5a" strokeWidth="0.8" className="animate-whisker" />
        <line x1="78" y1="56" x2="62" y2="56" stroke="#5a5a5a" strokeWidth="0.8" className="animate-whisker" />
        <line x1="78" y1="60" x2="62" y2="58" stroke="#5a5a5a" strokeWidth="0.8" className="animate-whisker" />
      </svg>
    </div>
  );
}
