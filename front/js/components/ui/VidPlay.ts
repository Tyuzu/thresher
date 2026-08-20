import { createElement } from "../createElement.ts"; 
import "../../../css/ui/VidPlay.css";
import { generateVideoPlayer } from "./vidpopHelpers";

const VidPlay = (videoSrc, poster, qualities, subtitles, videoid) => {
  // Create a predictable unique instance key
  const instanceId = `vidplay-${videoid}-${Date.now()}`;

  // Establish modal state context flags
  history.pushState({ isVidPlayOpen: true, instanceId }, "");

  // Declare close button with event handlers and attributes via createElement
  const closeButton = createElement("button", {
    class: "video-close-btn",
    events: {
      click: () => closeVidPlay(true)
    }
  }, ["X"]);

  // Build root container with the close button attached initially
  const player = createElement("div", {
    class: "video-player-container"
  }, [closeButton]);

  // Variable to store dynamic video player shell for clean disposal
  let activeVideoElement = null;

  // Append the generated video player asynchronously
  generateVideoPlayer(videoSrc, poster, qualities, subtitles, videoid).then((videoPlayer) => {
    activeVideoElement = videoPlayer;
    player.appendChild(videoPlayer);
  });

  // Master modal destructor engine
  function closeVidPlay(triggerBack = false) {
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
  function onPopState(event) {
    const isModalActive = event.state && event.state.isVidPlayOpen && event.state.instanceId === instanceId;
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