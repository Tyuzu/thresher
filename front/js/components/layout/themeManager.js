import { getActiveDomainMetadata } from "../../config/domainFeatures.js";

const themes = [
  "light",
  "dark",
  "dimmed",
  "solarized",
  "nord",
  "midnight",
  "emerald",
  "dracula",
  "catppuccin",
  "gruvbox",
  "tokyo-night",
  "cyberpunk",
  "latte",
  "rose-pine",
  "high-contrast"
];

let currentThemeIndex = 0;

/**
 * Applies a user theme mode and coordinates domain branding classes
 * 
 * @param {string} theme - The user theme key (e.g., 'dark', 'light')
 * @param {boolean} [save=true] - Whether to persist to localStorage
 */
export function applyTheme(theme, save = true) {
  if (!themes.includes(theme)) return;

  const root = document.documentElement;

  // 1. Set user color scheme attribute for CSS targeting
  root.dataset.theme = theme;
  currentThemeIndex = themes.indexOf(theme);

  // 2. Sync domain branding class from domainFeatures.js (e.g. 'theme-green', 'theme-purple')
  const domainMeta = getActiveDomainMetadata();
  if (domainMeta?.theme) {
    // Keep domain theme branding class on <html> without stripping user data-theme
    root.classList.add(domainMeta.theme);
  }

  // 3. Persist to localStorage if requested
  if (save) {
    localStorage.setItem("theme", theme);
  }
}

/**
 * Loads stored theme, falls back to OS preference, and applies domain theme
 */
export function loadTheme() {
  const saved = localStorage.getItem("theme");

  if (saved && themes.includes(saved)) {
    applyTheme(saved, false);
  } else {
    // Fall back to OS preference if no theme saved
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const defaultTheme = prefersDark ? "dark" : "light";
    applyTheme(defaultTheme, false);
  }
}

/**
 * Cycles through available themes
 */
export function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  const theme = themes[currentThemeIndex];
  applyTheme(theme, true);
}

/**
 * Reacts to system dark/light mode changes if the user hasn't set a explicit override
 */
export function listenForSystemThemeChanges() {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      applyTheme(e.matches ? "dark" : "light", false);
    }
  });
}

export { themes };