import { createFilterSelector } from "./filters.js";
import { createProgressBar } from "./progressBar.js";
import { createQualitySelector, QualityOption } from "./qualitySelector.js";
import { createSpeedDropdown } from "./speedDropdown.js";
import { toggleFullScreen, setupFullscreenControls } from "./fullscreen.js";
import { createElement } from "../../createElement.js";
import { createIconButton } from "../../../utils/svgIconButton.js";
import {
  maximizeSVG,
  muteSVG,
  vol2SVG,
  settingsSVG,
  skipBackSVG,
  skipForwardSVG,
} from "../../../components/svgs/featherSVGs";


export function appendElements(
  parent: HTMLElement,
  children: Array<HTMLElement | null | undefined>
): void {
  children.forEach((child) => child && parent.appendChild(child));
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function createControls(
  video: HTMLVideoElement,
  mediaSrc: string,
  qualities: QualityOption[],
  videoid: string | number,
  videoPlayer: HTMLElement
): HTMLElement {
  const controls = createElement("div", { class: "controlcon" }) as HTMLElement;

  // --- Time Display ---
  const timeDisplay = createElement("div", { class: "time-display" }, [
    "0:00 / 0:00",
  ]) as HTMLElement;

  // --- Progress Bar ---
  const { bar: progressBar } = createProgressBar();

  // Buttons container
  const buttons = createElement("div", { class: "buttons" }) as HTMLElement;

  // Optional Quality Selector
  const qualitySelector = qualities.length
    ? createQualitySelector(video, qualities)
    : null;

  const speedDropdown = createSpeedDropdown(video);
  const filterSelector = createFilterSelector(video);

  // --- Mute Button ---
  const muteButton = createIconButton({
    classSuffix: "mute bonw",
    svgMarkup: video.muted ? muteSVG : vol2SVG,
    onClick: () => {
      video.muted = !video.muted;
      muteButton.innerHTML = video.muted ? muteSVG : vol2SVG;
      muteButton.setAttribute("aria-label", video.muted ? "Muted" : "Unmuted");
    },
    label: "",
  });

  // --- Fullscreen Button ---
  const fullscreenButton = createIconButton({
    classSuffix: "fullscreen bonw",
    svgMarkup: maximizeSVG,
    onClick: () => toggleFullScreen(videoPlayer),
    label: "",
    ariaLabel: "Toggle Fullscreen",
  });

  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement === videoPlayer) {
      fullscreenButton.setAttribute("aria-label", "Exit Fullscreen");
    } else {
      fullscreenButton.setAttribute("aria-label", "Enter Fullscreen");
    }
  });

  // --- Skip Buttons ---
  const skipBackButton = createIconButton({
    classSuffix: "skipback bonw",
    svgMarkup: skipBackSVG,
    onClick: () => {
      video.currentTime = Math.max(video.currentTime - 10, 0);
    },
    label: "",
    ariaLabel: "Skip Back 10 seconds",
  });

  const skipForwardButton = createIconButton({
    classSuffix: "skipforward bonw",
    svgMarkup: skipForwardSVG,
    onClick: () => {
      video.currentTime = Math.min(video.currentTime + 10, video.duration);
    },
    label: "",
    ariaLabel: "Skip Forward 10 seconds",
  });

  // --- Dropup Menu ---
  const dropupMenu = createElement("div", {
    class: "dropup-menu hidden",
  }) as HTMLElement;
  appendElements(dropupMenu, [speedDropdown, filterSelector]);

  const settingsButton = createIconButton({
    classSuffix: "settings bonw",
    svgMarkup: settingsSVG,
    onClick: () => {
      dropupMenu.classList.toggle("hidden");
    },
    label: "",
    ariaLabel: "Settings",
  });

  document.addEventListener("click", (e: MouseEvent) => {
    if (
      !dropupMenu.contains(e.target as Node) &&
      !settingsButton.contains(e.target as Node)
    ) {
      dropupMenu.classList.add("hidden");
    }
  });

  // --- Append all buttons ---
  appendElements(
    buttons,
    [
      qualitySelector,
      muteButton,
      skipBackButton,
      skipForwardButton,
      settingsButton,
      fullscreenButton,
    ].filter(Boolean) as HTMLElement[]
  );

  buttons.appendChild(dropupMenu);

  // --- Append to controls ---
  appendElements(controls, [timeDisplay, progressBar, buttons]);

  // --- Update Time Display ---
  const updateTime = (): void => {
    const elapsed = formatTime(video.currentTime);
    const total = formatTime(video.duration || 0);
    timeDisplay.textContent = `${elapsed} / ${total}`;
  };

  video.addEventListener("timeupdate", updateTime);
  video.addEventListener("loadedmetadata", updateTime);

  // Fullscreen controls logic
  setupFullscreenControls(videoPlayer, controls);

  return controls;
}