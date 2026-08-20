import { createElement } from "../../createElement";

export function createSpeedDropdown(video) {
  const container = createElement("div", { class: "playback-speed-container" }, []);

  const label = createElement("label", { for: "playback-speed" }, []);
  label.textContent = "Speed:";

  const dropdown = createElement(
    "select",
    {
      id: "playback-speed",
      class: "playback-speed",
    },
    []
  );

  [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 2].forEach((speed) => {
    const opt = createElement("option", { value: speed }, []);
    opt.textContent = `${speed}`;

    if (speed === 1) {
      opt.selected = true;
    }

    dropdown.appendChild(opt);
  });

  dropdown.addEventListener("change", (e) => {
    video.playbackRate = parseFloat(e.target.value);
  });

  container.appendChild(label);
  container.appendChild(dropdown);

  return container;
}