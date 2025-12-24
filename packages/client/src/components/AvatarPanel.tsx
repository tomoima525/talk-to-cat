import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Avatar3D } from './avatar/Avatar3D';
import { AvatarProps } from './avatar/types';

/**
 * Container panel for the 3D avatar.
 * Provides the Canvas context and loading fallback.
 */
export function AvatarPanel({
  amplitudeRef,
}: Pick<AvatarProps, 'amplitudeRef'>) {
  return (
    <div className="h-full w-full">
      <Suspense
        fallback={
          <div className="h-full w-full flex items-center justify-center text-white text-sm">
            Loading avatar...
          </div>
        }
      >
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <Avatar3D amplitudeRef={amplitudeRef} />
        </Canvas>
      </Suspense>
    </div>
  );
}
