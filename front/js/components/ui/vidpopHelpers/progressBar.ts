import { createElement } from "../../createElement.js";

export function createProgressBar() {
  const bar = createElement("div", { class: "progress-bar" }, []);
  const progress = createElement("div", { class: "progress" }, []);
  bar.appendChild(progress);
  return { bar, progress };
}
