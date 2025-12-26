/**
 * Cozy room background SVG with lamp, sofa, and carpet.
 */
export function RoomBackground() {
  return (
    <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax slice">
      <defs>
        {/* Wall gradient - warm cozy tone */}
        <linearGradient id="wallGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a3f35" />
          <stop offset="100%" stopColor="#3d342c" />
        </linearGradient>

        {/* Floor gradient */}
        <linearGradient id="floorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2d2520" />
          <stop offset="100%" stopColor="#1a1512" />
        </linearGradient>

        {/* Lamp light glow */}
        <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#fcd34d" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
        </radialGradient>

        {/* Lamp shade gradient */}
        <linearGradient id="lampShadeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="100%" stopColor="#b8956a" />
        </linearGradient>

        {/* Sofa gradient */}
        <linearGradient id="sofaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5c4a3d" />
          <stop offset="100%" stopColor="#4a3c32" />
        </linearGradient>

        {/* Carpet gradient */}
        <linearGradient id="carpetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5a3c" />
          <stop offset="50%" stopColor="#a0694a" />
          <stop offset="100%" stopColor="#8b5a3c" />
        </linearGradient>

        {/* Carpet pattern */}
        <pattern id="carpetPattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#9a6448" />
          <rect x="0" y="0" width="10" height="10" fill="#8b5a3c" opacity="0.5" />
          <rect x="10" y="10" width="10" height="10" fill="#8b5a3c" opacity="0.5" />
        </pattern>
      </defs>

      {/* Wall */}
      <rect x="0" y="0" width="300" height="250" fill="url(#wallGradient)" />

      {/* Floor */}
      <rect x="0" y="250" width="300" height="150" fill="url(#floorGradient)" />

      {/* Baseboard */}
      <rect x="0" y="245" width="300" height="8" fill="#2a2118" />

      {/* Lamp glow effect (behind lamp) */}
      <ellipse cx="240" cy="80" rx="60" ry="80" fill="url(#lampGlow)" />

      {/* Pendant lamp cord */}
      <line x1="240" y1="0" x2="240" y2="35" stroke="#1a1a1a" strokeWidth="2" />

      {/* Lamp shade */}
      <path d="M 215 35 L 222 70 L 258 70 L 265 35 Z" fill="url(#lampShadeGradient)" />
      {/* Lamp shade inner glow */}
      <path d="M 218 37 L 224 68 L 256 68 L 262 37 Z" fill="#ffe4c4" opacity="0.3" />
      {/* Lamp bulb glow */}
      <ellipse cx="240" cy="75" rx="12" ry="8" fill="#fff7ed" opacity="0.6" />

      {/* Carpet */}
      <ellipse cx="150" cy="300" rx="130" ry="50" fill="url(#carpetPattern)" />
      {/* Carpet border */}
      <ellipse cx="150" cy="300" rx="130" ry="50" fill="none" stroke="#704830" strokeWidth="3" />
      {/* Carpet inner border */}
      <ellipse cx="150" cy="300" rx="120" ry="45" fill="none" stroke="#b8956a" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
