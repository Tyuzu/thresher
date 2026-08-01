import "../../../css/ui/MiniAudio.css";
import { pauseSVG, playSVG } from "../svgs.js";
import { createElement } from "../createElement.js";
import Imagex from "../base/Imagex.js";

function MiniAudio({ audioUrl, poster = "", title = "" }) {
  // Main Player Containers
  const player = createElement("div", { class: "mini-audio horizontal" });
  
  // State variables
  let audio = null; 
  let isLoaded = false;

  // --- Left Section (Play Button & Poster) ---
  const playBtn = createElement("button", { class: "play-btn" });
  playBtn.innerHTML = playSVG;

  const posterImg = Imagex({
    src: poster,
    alt: "Poster",
    classes: "mini-poster",
  });
  
  const left = createElement("div", { class: "left-controls" }, [playBtn, posterImg]);

  // --- Center Section (Title, Seek Bar, & Time Displays) ---
  const titleText = createElement("span", { class: "audio-title" }, [title]);

  const seekBar = createElement("input", {
    type: "range",
    class: "seek-bar",
    min: "0",
    max: "100",
    value: "0",
  });

  const currentTimeDisplay = createElement("span", { class: "current-time" }, ["00:00"]);
  const durationDisplay = createElement("span", { class: "duration-time" }, ["00:00"]);
  const timeDivider = createElement("span", { class: "time-divider" }, [" / "]);
  
  const timeContainer = createElement("div", { class: "time-container" }, [
    currentTimeDisplay,
    timeDivider,
    durationDisplay
  ]);

  const center = createElement("div", { class: "center-controls" }, [titleText, seekBar, timeContainer]);

  // --- Right Section (Volume, Speed, Loop) ---
  const muteBtn = createElement("button", { class: "btn mute-btn" }, ["🔊"]);
  const volumeSlider = createElement("input", {
    type: "range",
    class: "volume-slider",
    min: "0",
    max: "1",
    step: "0.05",
    value: "1",
  });

  const speedControl = createElement("select", { class: "speed-select" });
  [0.5, 1, 1.5, 2].forEach((rate) => {
    const opt = createElement("option", { value: rate.toString() }, [`${rate}x`]);
    if (rate === 1) opt.selected = true;
    speedControl.appendChild(opt);
  });

  const loopBtn = createElement("button", { class: "btn loop-btn" }, ["🔁"]);

  const volcon = createElement("div", { class: "hflex volume-container" }, [muteBtn, volumeSlider]);
  const loopcon = createElement("div", { class: "hflex macro-container" }, [speedControl, loopBtn]);
  const right = createElement("div", { class: "right-controls vflex" }, [volcon, loopcon]);

  // --- Audio Engine Initialization (Lazy Loaded) ---
  function initAudio() {
    if (isLoaded) return;
    
    audio = new Audio(audioUrl);
    audio.preload = "metadata";
    isLoaded = true;

    // Apply initial control states to the new Audio instance
    audio.volume = parseFloat(volumeSlider.value);
    audio.playbackRate = parseFloat(speedControl.value);
    audio.loop = loopBtn.classList.contains("active");

    // Event Listeners
    audio.addEventListener("loadedmetadata", () => {
      durationDisplay.textContent = formatTime(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      if (!audio.duration) return;
      seekBar.value = ((audio.currentTime / audio.duration) * 100).toString();
      currentTimeDisplay.textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener("ended", () => {
      if (!audio.loop) {
        playBtn.innerHTML = playSVG;
      }
    });
  }

  // --- UI Interaction Event Listeners ---
  playBtn.addEventListener("click", () => {
    if (!isLoaded) initAudio();

    if (audio.paused) {
      audio.play();
      playBtn.innerHTML = pauseSVG;
    } else {
      audio.pause();
      playBtn.innerHTML = playSVG;
    }
  });

  // Also play/pause when clicking the poster image
  posterImg.addEventListener("click", () => {
    playBtn.click();
  });

  seekBar.addEventListener("input", () => {
    if (isLoaded && audio.duration) {
      audio.currentTime = (parseFloat(seekBar.value) / 100) * audio.duration;
    }
  });

  muteBtn.addEventListener("click", () => {
    if (!isLoaded) initAudio();
    audio.muted = !audio.muted;
    muteBtn.textContent = audio.muted ? "🔇" : "🔊";
  });

  volumeSlider.addEventListener("input", () => {
    const val = parseFloat(volumeSlider.value);
    if (isLoaded) {
      audio.volume = val;
      audio.muted = val === 0;
    }
    muteBtn.textContent = val === 0 ? "🔇" : "🔊";
  });

  speedControl.addEventListener("change", () => {
    if (isLoaded) {
      audio.playbackRate = parseFloat(speedControl.value);
    }
  });

  loopBtn.addEventListener("click", () => {
    loopBtn.classList.toggle("active");
    if (isLoaded) {
      audio.loop = loopBtn.classList.contains("active");
    }
  });

  // Assemble and return DOM element
  player.append(left, center, right);
  return player;
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default MiniAudio;