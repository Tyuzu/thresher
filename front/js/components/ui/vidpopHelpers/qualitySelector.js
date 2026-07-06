import { createElement } from "../../createElement";

export function createQualitySelector(video, qualities) {
  const container = createElement("div", {}, []);

  const label = createElement(
    "label",
    { for: "quality-selector" },
    ["Quality:"]
  );

  const select = createElement(
    "select",
    {
      id: "quality-selector",
      class: "quality-selector",
    },
    []
  );

  // Infer current quality from video src
  const currentSrc = video.currentSrc || video.src;
  const inferred = qualities.find((q) => currentSrc.includes(q.src))?.label;

  // Fallback: stored preference or first available quality
  const stored = localStorage.getItem("videoQuality");
  const initial = inferred || stored || qualities[0]?.label;

  qualities.forEach(({ label }) => {
    const opt = createElement("option", { value: label }, [label]);
    opt.selected = label === initial;
    select.appendChild(opt);
  });

  select.addEventListener("change", (e) => {
    const selected = qualities.find((q) => q.label === e.target.value);

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