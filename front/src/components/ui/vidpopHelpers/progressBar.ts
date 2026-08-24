import { createElement } from "../../createElement.js";

export interface ProgressBarElements {
  bar: HTMLElement;
  progress: HTMLElement;
}

export function createProgressBar(): ProgressBarElements {
  const bar = createElement("div", { class: "progress-bar" });
  const progress = createElement("div", { class: "progress" });
  bar.appendChild(progress);
  return { bar, progress };
}