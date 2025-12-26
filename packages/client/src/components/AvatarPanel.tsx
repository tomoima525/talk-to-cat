import { CatAvatar } from "./avatar/CatAvatar";
import { RoomBackground } from "./avatar/RoomBackground";
import { AvatarProps } from "./avatar/types";

/**
 * Container panel for the avatar.
 * Composes the cozy room background with the cat avatar.
 */
export function AvatarPanel({ amplitudeRef }: Pick<AvatarProps, "amplitudeRef">) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Room background layer */}
      <RoomBackground />

      {/* Title overlay */}
      <header className="absolute top-16 left-0 right-0 p-4 flex items-center justify-center z-10">
        <h1 className="text-6xl font-semibold text-amber-100 drop-shadow-lg">Talk to Cat</h1>
      </header>

      {/* Cat avatar layer - positioned on the carpet */}
      <div className="absolute inset-0 flex items-end justify-center pb-[20%]">
        <div className="w-[80%] max-w-[560px]">
          <CatAvatar amplitudeRef={amplitudeRef} />
        </div>
      </div>
    </div>
  );
}
