import { CatAvatar } from './avatar/CatAvatar';
import { AvatarProps } from './avatar/types';

/**
 * Container panel for the avatar.
 * Uses SVG-based CatAvatar with CSS animations.
 */
export function AvatarPanel({
  amplitudeRef,
}: Pick<AvatarProps, 'amplitudeRef'>) {
  return (
    <div className="h-full w-full bg-gradient-to-b from-gray-900 to-black">
      <CatAvatar amplitudeRef={amplitudeRef} />
    </div>
  );
}
