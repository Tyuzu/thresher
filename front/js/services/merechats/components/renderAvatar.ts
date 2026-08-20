import Imagex from "../../../components/base/Imagex.ts";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.ts";

export function renderAvatar(msg, { isMine }) {
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
