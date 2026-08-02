import VideoPlayer from '../../components/ui/VideoPlayer.mjs';

/**
 * Renders one or more video players into a container.
 * @param {HTMLElement} mediaContainer
 * @param {string[]} media - Array of video URLs
 * @param {string|string[]} [media_url=""]
 * @param {Array} [resolutions=[]]
 * @param {Array} [subtits=[]]
 * @param {string} [posterPath=""]
 * @returns {Promise<HTMLElement[]>}
 */
async function RenderVideoPost(mediaContainer, media = [], media_url = "", resolutions = [], subtits = [], posterPath = "") {
    if (!mediaContainer || !(mediaContainer instanceof HTMLElement)) {
        console.error("RenderVideoPost: Invalid or missing mediaContainer.", mediaContainer);
        return [];
    }

    if (!Array.isArray(media) || media.length === 0) {
        console.warn("RenderVideoPost: No valid media sources provided.");
        createVideoFallback(mediaContainer, "No video source available.");
        return [];
    }

    const players = [];

    for (const videoSrc of media) {
        try {
            if (!videoSrc) {
                continue;
            }

            const player = VideoPlayer({
                src: videoSrc,
                className: 'post-video',
                poster: posterPath,
                loop: true,
                controls: false,
                subtitles: subtits,
                availableResolutions: resolutions
            }, media_url);

            if (!player) {
                throw new Error("VideoPlayer instantiation returned null or undefined.");
            }

            // Error handling / fallback for the underlying HTML5 video tag
            const videoEl = player instanceof HTMLVideoElement ? player : player.querySelector("video");
            
            if (videoEl) {
                videoEl.onerror = (e) => {
                    console.error(`Video failed to load: ${videoSrc}`, e);
                    const fallback = document.createElement("div");
                    fallback.classList.add("video-error");
                    fallback.textContent = "Video failed to load.";
                    
                    if (player.parentNode) {
                        player.replaceWith(fallback);
                    }
                };
            }

            mediaContainer.appendChild(player);
            players.push(player);
        } catch (err) {
            console.error(`RenderVideoPost error processing source (${videoSrc}):`, err);
            createVideoFallback(mediaContainer, "Failed to initialize video player.");
        }
    }

    return players;
}

/**
 * Helper to append a simple error fallback message inside media container
 */
function createVideoFallback(container, message) {
    const fallback = document.createElement("div");
    fallback.classList.add("video-error");
    fallback.textContent = message;
    container.appendChild(fallback);
}

export { RenderVideoPost };