import { LowPolyHead } from './LowPolyHead';
import { AvatarProps } from './types';

/**
 * Main 3D scene setup for the avatar.
 * This component renders within a React Three Fiber Canvas context.
 */
export function Avatar3D({ amplitudeRef }: Pick<AvatarProps, 'amplitudeRef'>) {
  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.8} />

      {/* Main directional light from top-right */}
      <directionalLight position={[5, 5, 5]} intensity={1.2} />

      {/* Accent rim light from left side with cyan tint */}
      <pointLight position={[-5, 0, 5]} intensity={0.6} color="#4fc3f7" />

      {/* Fill light from below */}
      <pointLight position={[0, -3, 3]} intensity={0.4} color="#ffffff" />

      {/* The low-poly head model */}
      <LowPolyHead amplitudeRef={amplitudeRef} />
    </>
  );
}
