import Imagex from "../../../components/base/Imagex.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";

interface Message {
  sender?: string | number | null;
  [key: string]: unknown;
}

interface RenderAvatarOptions {
  isMine: boolean;
}

export function renderAvatar(msg: Message, { isMine }: RenderAvatarOptions): ReturnType<typeof Imagex> | null {
  if (isMine || !msg.sender) {
    return null;
  }

  return Imagex(
    {
      classes: "avatar",
      src: resolveImagePath(
        EntityType.USER,
        PictureType.THUMB,
        String(msg.sender)
      ),
      alt: `${msg.sender}'s avatar`
    },
    []
  );
}