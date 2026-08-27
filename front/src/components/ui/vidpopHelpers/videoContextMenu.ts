import ContextMenu from "../ContextMenu.js";
import { togglePictureInPicture } from "./vutils.js";

const CONTEXT_HANDLER = Symbol("videoContextHandler");

export interface ContextMenuItem {
  label: string;
  action: () => void;
}

export interface VideoElementWithHandler extends HTMLVideoElement {
  [CONTEXT_HANDLER]?: (e: MouseEvent) => void;
}

export function setupVideoContextMenu(
  video: VideoElementWithHandler,
  _videoId: string = ""
): void {
  const existingHandler = video[CONTEXT_HANDLER];
  if (existingHandler) {
    video.removeEventListener("contextmenu", existingHandler);
  }

  let statsVisible = false;

  const toggleStats = (): void => {
    statsVisible = !statsVisible;
  };

  const safeClipboardWrite = async (text: string): Promise<void> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Ignore clipboard write failures
    }
  };

  const escapeAttr = (str: string): string =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const handler = (e: MouseEvent): void => {
    e.preventDefault();

    const currentTime = Math.floor(video.currentTime);
    const src = video.currentSrc;

    const options: ContextMenuItem[] = [
      {
        label: video.paused ? "Play" : "Pause",
        action: () => (video.paused ? void video.play() : video.pause())
      },
      {
        label: video.muted ? "Unmute" : "Mute",
        action: () => {
          video.muted = !video.muted;
        }
      },
      {
        label: video.loop ? "Disable Loop" : "Enable Loop",
        action: () => {
          video.loop = !video.loop;
        }
      },
      {
        label: "Copy Video URL",
        action: () => void safeClipboardWrite(src)
      },
      {
        label: "Copy Timestamped URL",
        action: () => void safeClipboardWrite(`${src}#t=${currentTime}`)
      },
      {
        label: "Copy Embed Code",
        action: () => {
          const safeSrc = escapeAttr(src);
          const embed = `<iframe src="${safeSrc}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;
          void safeClipboardWrite(embed);
        }
      },
      {
        label: "Picture in Picture",
        action: () => {
          if (document.pictureInPictureEnabled && typeof (video.requestPictureInPicture as any) === "function") {
            togglePictureInPicture(video);
          }
        }
      },
      {
        label: statsVisible ? "Hide Stats" : "Show Stats",
        action: toggleStats
      }
    ];

    ContextMenu(options, e.pageX, e.pageY);
  };

  video[CONTEXT_HANDLER] = handler;
  video.addEventListener("contextmenu", handler);
}