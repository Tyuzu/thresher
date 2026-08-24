import { initializeMainTabs, activateMainTab } from "./mainTabs.js";
import { createTabStructure, activateChildTab } from "./subTabs.js";
import type { EntityType } from "./types.js";

/**
 * Displays user profile data and initializes the tab system.
 */
async function displayUserProfileData(
  isLoggedIn: boolean,
  content: HTMLElement,
  username: string
): Promise<void> {
  content.replaceChildren(); // Clear any existing content

  const contentTabs: EntityType[] = ["userhome", "place", "event", "feedpost"];
  const subcontentTabs: EntityType[] = ["media", "ticket", "merch", "review"];

  // Initialize the main tab structure.
  const { mainTabButtons, mainTabContents } = initializeMainTabs(content);

  // Create tab structures for “Content” and “Subcontent.”
  const contentStructure = createTabStructure("Content", contentTabs, username);
  const subcontentStructure = createTabStructure("Subcontent", subcontentTabs, username);

  // Append main tab buttons and their corresponding sections.
  mainTabButtons.append(contentStructure.mainTabButton, subcontentStructure.mainTabButton);
  mainTabContents.append(contentStructure.tabSection, subcontentStructure.tabSection);

  // Set up event listeners for main tab buttons.
  const mainButtons = [contentStructure.mainTabButton, subcontentStructure.mainTabButton];
  mainButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      activateMainTab(index, mainTabButtons, mainTabContents);
    });
  });

  // Activate the first main tab.
  activateMainTab(0, mainTabButtons, mainTabContents);

  // Activate the first child tab of the first main tab, if available.
  if (contentStructure.childTabs && contentStructure.childTabs.length > 0) {
    activateChildTab(
      contentStructure.childTabs[0],
      contentStructure.tabContentContainers[0],
      username,
      contentTabs[0]
    );
  } else {
    console.warn("⚠️ No child tabs available to activate.");
  }
}

export { displayUserProfileData };