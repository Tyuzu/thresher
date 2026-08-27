import "../../../css/ui/AudioPlayer.css";
import { createElement } from "../../components/createElement.js";
import Imagex from "../base/Imagex.js";

export interface LyricLine {
  time: number;
  text: string;
}

export interface AudioSourceOptions {
  src: string;
  poster?: string;
  className?: string;
  controls?: boolean;
  muted?: boolean;
  lyricsData?: LyricLine[];
  resolutions?: string | number;
}

function AudioPlayer(audioSrc: AudioSourceOptions): HTMLDivElement {
  // === POSTER IMAGE ===
  const img = Imagex({
    src: audioSrc.poster || "",
    alt: "Audio Thumbnail",
    class: "audio-poster",
  }) as HTMLImageElement;

  // === AUDIO ELEMENT ===
  const audio = createElement("audio", {
    src: audioSrc.src,
    controls: false,
    preload: "metadata",
  }) as HTMLAudioElement;
  audio.playbackRate = 1;

  // === CONTROLS CONTAINER ===
  const playButton = createElement(
    "button",
    {
      events: {
        click: () => {
          if (audio.paused) {
            audio.play();
            playButton.textContent = "Pause";
          } else {
            audio.pause();
            playButton.textContent = "Play";
          }
        },
      },
    },
    ["Play"]
  ) as HTMLButtonElement;

  const muteButton = createElement(
    "button",
    {
      events: {
        click: () => {
          audio.muted = !audio.muted;
          muteButton.textContent = audio.muted ? "Unmute" : "Mute";
        },
      },
    },
    ["Mute"]
  ) as HTMLButtonElement;

  const seekBar = createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: "0",
    class: "seek-bar",
    events: {
      input: () => {
        if (!isNaN(audio.duration)) {
          audio.currentTime = (parseFloat(seekBar.value) / 100) * audio.duration;
        }
      },
    },
  }) as HTMLInputElement;

  const volumeSlider = createElement("input", {
    type: "range",
    min: "0",
    max: "1",
    step: "0.1",
    value: audio.volume.toString(),
    class: "volume-slider",
    events: {
      input: () => {
        audio.volume = parseFloat(volumeSlider.value);
      },
    },
  }) as HTMLInputElement;

  const speedSelectOptions = [0.5, 1, 1.5, 2].map((speed) =>
    createElement("option", { value: speed.toString() }, [`${speed}x`])
  );

  const speedSelect = createElement(
    "select",
    {
      class: "speed-select",
      value: "1",
      events: {
        change: () => {
          audio.playbackRate = parseFloat(speedSelect.value);
        },
      },
    },
    speedSelectOptions
  ) as HTMLSelectElement;
  speedSelect.value = "1";

  const timeDisplay = createElement(
    "span",
    {
      class: "time-display",
    },
    ["00:00 / 00:00"]
  ) as HTMLSpanElement;

  const updateTimeDisplay = (): void => {
    const format = (s: number): string => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };
    if (!isNaN(audio.duration)) {
      timeDisplay.textContent = `${format(audio.currentTime)} / ${format(audio.duration)}`;
    }
  };

  const bufferingIndicator = createElement(
    "span",
    {
      class: "buffering-indicator",
      style: { display: "none" },
    },
    ["Loading..."]
  ) as HTMLSpanElement;

  audio.addEventListener("timeupdate", () => {
    if (!isNaN(audio.duration)) {
      seekBar.value = ((audio.currentTime / audio.duration) * 100).toString();
    }
    updateTimeDisplay();
  });

  audio.addEventListener("waiting", () => {
    bufferingIndicator.style.display = "inline-block";
  });
  audio.addEventListener("playing", () => {
    bufferingIndicator.style.display = "none";
  });
  audio.addEventListener("seeking", () => {
    bufferingIndicator.style.display = "inline-block";
  });
  audio.addEventListener("seeked", () => {
    bufferingIndicator.style.display = "none";
  });

  const controlsContainer = createElement("div", { class: "controls-container" }, [
    playButton,
    muteButton,
    seekBar,
    timeDisplay,
    bufferingIndicator,
    volumeSlider,
    speedSelect,
  ]);

// === LYRICS ENGINE ===
  const linesData: LyricLine[] = audioSrc.lyricsData ?? [];
  const lineElements = linesData.map((lyric) =>
    createElement("p", {}, [lyric.text])
  ) as HTMLParagraphElement[];

  const lyricsContainer = createElement(
    "div",
    {
      id: "lyrics-container",
    },
    lineElements
  );

  let lastActiveIndex = -1;

  function updateLyrics(): void {
    const currentTime = audio.currentTime;
    let currentActiveIndex = -1;

    for (let i = 0; i < linesData.length; i++) {
      const line = linesData[i];
      if (line && currentTime >= line.time) {
        currentActiveIndex = i;
      } else {
        break;
      }
    }

    if (currentActiveIndex !== lastActiveIndex) {
      if (lastActiveIndex !== -1) {
        lineElements[lastActiveIndex]?.classList.remove("active");
      }

      if (currentActiveIndex !== -1) {
        const activeEl = lineElements[currentActiveIndex];
        if (activeEl) {
          activeEl.classList.add("active");
          activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      lastActiveIndex = currentActiveIndex;
    }
  }

  audio.addEventListener("timeupdate", updateLyrics);
  audio.addEventListener("seeking", () => {
    lastActiveIndex = -1;
  });

  // === DARK MODE TOGGLE ===
  let player: HTMLDivElement;
  const themeToggle = createElement(
    "button",
    {
      class: "theme-toggle",
      events: {
        click: () => {
          player.classList.toggle("dark-mode");
          themeToggle.textContent = player.classList.contains("dark-mode")
            ? "☀️ Light Mode"
            : "🌙 Dark Mode";
        },
      },
    },
    ["🌙 Dark Mode"]
  ) as HTMLButtonElement;

  // === ROOT CONTAINER ===
  player = createElement("div", {
    id: "audio-player-container",
    class: "mini-mode",
    role: "region",
    "aria-label": "Audio Player",
  }, [img, audio, controlsContainer, lyricsContainer, themeToggle]) as HTMLDivElement;

  return player;
}

export default AudioPlayer;
export { AudioPlayer as AudioPlayerComponent };