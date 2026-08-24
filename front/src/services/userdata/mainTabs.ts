import { createElement } from "../../components/createElement.js";
import type { MainTabsResult } from "./types.js";

/**
 * Initializes the main tab container.
 */
function initializeMainTabs(content: HTMLElement): MainTabsResult {
  const mainTabContainer = createElement("div", { class: "main-tab-container" });
  const mainTabButtons = createElement("div", { class: "main-tab-buttons" });
  const mainTabContents = createElement("div", { class: "main-tab-contents" });

  mainTabContainer.append(mainTabButtons, mainTabContents);
  content.appendChild(mainTabContainer);

  return { mainTabContainer, mainTabButtons, mainTabContents };
}

/**
 * Activates a main tab given its index.
 */
function activateMainTab(
  index: number,
  mainTabButtons: HTMLElement,
  mainTabContents: HTMLElement
): void {
  const sections = Array.from(mainTabContents.children) as HTMLElement[];
  const buttons = Array.from(mainTabButtons.children) as HTMLElement[];

  sections.forEach((section, i) => {
    section.style.display = i === index ? "block" : "none";
  });

  buttons.forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });
}

export { initializeMainTabs, activateMainTab };