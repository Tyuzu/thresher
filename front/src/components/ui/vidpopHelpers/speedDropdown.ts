import { createElement } from "../../createElement.js";

export function createSpeedDropdown(video: HTMLVideoElement): HTMLDivElement {
  const container = createElement("div", { class: "playback-speed-container" }, []) as HTMLDivElement;

  const label = createElement("label", { for: "playback-speed" }, []) as HTMLLabelElement;
  label.textContent = "Speed:";

  const dropdown = createElement(
    "select",
    {
      id: "playback-speed",
      class: "playback-speed",
    },
    []
  ) as HTMLSelectElement;

  const speeds: number[] = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 2];

  speeds.forEach((speed: number) => {
    const opt = createElement("option", { value: speed.toString() }, []) as HTMLOptionElement;
    opt.textContent = `${speed}x`;

    if (speed === 1) {
      opt.selected = true;
    }

    dropdown.appendChild(opt);
  });

  dropdown.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    if (target) {
      video.playbackRate = parseFloat(target.value);
    }
  });

  container.appendChild(label);
  container.appendChild(dropdown);

  return container;
}