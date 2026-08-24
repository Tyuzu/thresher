import { createElement } from "../../createElement.js";

export interface QualityOption {
  label: string;
  src: string;
  [key: string]: unknown;
}

export function createQualitySelector(
  video: HTMLVideoElement,
  qualities: QualityOption[]
): HTMLElement {
  const container = createElement("div", {}, []) as HTMLElement;

  const label = createElement(
    "label",
    { for: "quality-selector" },
    ["Quality:"]
  ) as HTMLLabelElement;

  const select = createElement(
    "select",
    {
      id: "quality-selector",
      class: "quality-selector",
    },
    []
  ) as HTMLSelectElement;

  // Infer current quality from video src
  const currentSrc = video.currentSrc || video.src;
  const inferred = qualities.find((q) => currentSrc.includes(q.src))?.label;

  // Fallback: stored preference or first available quality
  const stored = localStorage.getItem("videoQuality");
  const initial = inferred || stored || qualities[0]?.label;

  qualities.forEach(({ label: qualityLabel }) => {
    const opt = createElement("option", { value: qualityLabel }, [
      qualityLabel,
    ]) as HTMLOptionElement;
    opt.selected = qualityLabel === initial;
    select.appendChild(opt);
  });

  select.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const selected = qualities.find((q) => q.label === target.value);

    if (!selected) {
      return;
    }

    // Only reload if actual src differs
    if (video.src !== selected.src) {
      localStorage.setItem("videoQuality", selected.label);
      const { currentTime, paused } = video;

      video.src = selected.src;
      video.setAttribute("data-quality", selected.label);

      video.addEventListener(
        "loadedmetadata",
        () => {
          video.currentTime = currentTime;

          if (!paused) {
            video.play();
          }
        },
        { once: true }
      );
    } else {
      // Still update the attribute and localStorage even if src is the same
      video.setAttribute("data-quality", selected.label);
      localStorage.setItem("videoQuality", selected.label);
    }
  });

  container.appendChild(label);
  container.appendChild(select);

  return container;
}