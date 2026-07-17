import "../../../css/ui/VidPlay.css";
import { generateVideoPlayer } from "./vidpopHelpers";

const VidPlay = (videoSrc, poster, qualities, subtitles, videoid) => {
  const player = document.createElement("div");
  player.className = "video-player-container";

  // Create a predictable unique instance key
  const instanceId = `vidplay-${videoid}-${Date.now()}`;

  // Establish modal state context flags
  history.pushState({ isVidPlayOpen: true, instanceId }, "");

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.className = "video-close-btn";
  closeButton.textContent = "X";
  
  // Explicit close calls triggerBack to remove the history entry we added
  closeButton.addEventListener("click", () => closeVidPlay(true));
  player.appendChild(closeButton);

  // Variable to store dynamic video player shell for clean disposal
  let activeVideoElement = null;

  // Append the generated video player
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

  // Fixed: Close when the modal state marker is no longer active in the window stack
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