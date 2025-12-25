import { CatAvatar } from "./avatar/CatAvatar";
import { AvatarProps } from "./avatar/types";

/**
 * Container panel for the avatar.
 * Uses SVG-based CatAvatar with CSS animations.
 */
export function AvatarPanel({ amplitudeRef }: Pick<AvatarProps, "amplitudeRef">) {
  return (
    <div className="h-full w-full bg-linear-to-b from-gray-900 to-black">
      <header className="p-4 flex items-center justify-center">
        <h1 className="text-3xl font-semibold text-white items-center">Talk to Cat</h1>
      </header>
      <CatAvatar amplitudeRef={amplitudeRef} />
    </div>
  );
}
