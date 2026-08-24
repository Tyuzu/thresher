import { renderTabContent } from "./tabRenderer.js";
import { createElement } from "../../components/createElement.js";
import type { EntityType, TabStructure } from "./types.js";

/**
 * Capitalizes the first letter of the given string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Activates a child tab and loads its content if not already loaded.
 */
function activateChildTab(
  tabButton: HTMLElement,
  contentContainer: HTMLElement,
  username: string,
  entityType?: EntityType
): void {
  if (!entityType) {
    console.error("❌ ERROR: entityType is undefined. Cannot activate tab.");
    return;
  }

  // Deactivate sibling tabs and hide their content.
  if (contentContainer.parentElement) {
    const allTabContainers = Array.from(contentContainer.parentElement.children) as HTMLElement[];
    allTabContainers.forEach((tab) => (tab.style.display = "none"));
  }

  if (tabButton.parentElement) {
    const allTabButtons = Array.from(tabButton.parentElement.children) as HTMLElement[];
    allTabButtons.forEach((btn) => btn.classList.remove("active"));
  }

  // Activate the selected tab.
  contentContainer.style.display = "block";
  tabButton.classList.add("active");

  // Load content if not already loaded.
  if (!contentContainer.dataset.loaded) {
    renderTabContent(contentContainer, username, entityType);
    contentContainer.dataset.loaded = "true";
  }
}

/**
 * Creates a child tab button and attaches its event listener.
 */
function createTabButton(
  entityType: EntityType,
  contentContainer: HTMLElement,
  username: string
): HTMLDivElement {
  const tabButton = createElement("div", { class: "tab-button" }, capitalize(entityType));
  tabButton.addEventListener("click", () => {
    activateChildTab(tabButton, contentContainer, username, entityType);
  });
  return tabButton;
}

/**
 * Creates a tab structure for a given section.
 */
function createTabStructure(
  title: string,
  tabs: EntityType[],
  username: string
): TabStructure {
  const sectionId = `${title.toLowerCase()}-section`;
  const tabSection = createElement("div", { id: sectionId, style: "display: none;" });
  const tabContainer = createElement("div", { class: `${title.toLowerCase()}-tab-container` });
  const tabButtons = createElement("div", { class: `${title.toLowerCase()}-tab-buttons` });
  const tabContents = createElement("div", { class: `${title.toLowerCase()}-tab-contents` });

  tabContainer.append(tabButtons, tabContents);
  tabSection.appendChild(tabContainer);

  const childTabs: HTMLDivElement[] = [];
  const tabContentContainers: HTMLDivElement[] = [];

  tabs.forEach((entityType) => {
    const tabContent = createElement("div", {
      id: `${entityType}-container`,
      class: "tabs-content",
      style: "display: none;"
    });
    tabContents.appendChild(tabContent);
    tabContentContainers.push(tabContent);

    const tabButton = createTabButton(entityType, tabContent, username);
    tabButtons.appendChild(tabButton);
    childTabs.push(tabButton);
  });

  const mainTabButton = createElement("div", { class: "main-tab-button" }, title);

  return { mainTabButton, tabSection, childTabs, tabContentContainers };
}

export { createTabStructure, activateChildTab };