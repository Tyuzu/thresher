import { createElement } from "../createElement.js";
import "../../../css/ui/VidPlay.css";
import { generateVideoPlayer, QualityOption } from "./vidpopHelpers/index.js";
import { SubtitleSource as SubtitleOption } from "./vidpopHelpers/subtitles.js";
import { CleanableElement } from "./Vidpop.js";

interface HistoryState {
  isVidPlayOpen?: boolean;
  instanceId?: string;
}

const VidPlay = (
  videoSrc: string,
  poster?: string | null,
  qualities: QualityOption[] = [],
  subtitles: SubtitleOption[] = [],
  videoid?: string
): CleanableElement => {
  // Create a predictable unique instance key
  const instanceId: string = `vidplay-${videoid || "default"}-${Date.now()}`;

  // Establish modal state context flags
  const stateData: HistoryState = { isVidPlayOpen: true, instanceId };
  history.pushState(stateData, "");

  // Declare close button with event handlers and attributes via createElement
  const closeButton = createElement(
    "button",
    {
      class: "video-close-btn",
      events: {
        click: () => closeVidPlay(true)
      }
    },
    ["X"]
  );

  // Build root container with the close button attached initially
  const player: CleanableElement = createElement(
    "div",
    {
      class: "video-player-container"
    },
    [closeButton]
  );

  // Variable to store dynamic video player shell for clean disposal
  let activeVideoElement: CleanableElement | null = null;

  // Append the generated video player asynchronously
  generateVideoPlayer(
    videoSrc,
    poster || "",
    qualities,
    subtitles,
    videoid || "default"
  )
    .then((videoPlayer: CleanableElement) => {
      activeVideoElement = videoPlayer;
      player.appendChild(videoPlayer);
    })
    .catch((err: unknown) => {
      console.error("Failed to generate player container:", err);
    });

  // Master modal destructor engine
  function closeVidPlay(triggerBack: boolean = false): void {
    window.removeEventListener("popstate", onPopState);

    // Safely execute component internal cleanups if exposed
    if (activeVideoElement && typeof activeVideoElement.cleanup === "function") {
      try {
        activeVideoElement.cleanup();
      } catch (err) {
        console.error("Failed to run video player structural cleanups:", err);
      }
    }

    if (player.parentNode) {
      player.remove();
    }

    // Synchronize programmatic clicks back onto the historical map tracking matrix
    if (triggerBack) {
      history.back();
    }
  }

  // Close when the modal state marker is no longer active in the window stack
  function onPopState(event: PopStateEvent): void {
    const state = event.state as HistoryState | null;
    const isModalActive =
      state && state.isVidPlayOpen && state.instanceId === instanceId;

    if (!isModalActive) {
      closeVidPlay(false);
    }
  }

  window.addEventListener("popstate", onPopState);

  // Expose an external cleanup hook on the wrapper component root
  player.cleanup = () => closeVidPlay(false);

  return player;
};

export default VidPlay;
export { VidPlay as VidPlayComponent };