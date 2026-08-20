import { createElement } from "../../createElement.ts";

export function createProgressBar() {
  const bar = createElement("div", { class: "progress-bar" }, []);
  const progress = createElement("div", { class: "progress" }, []);
  bar.appendChild(progress);
  return { bar, progress };
}
