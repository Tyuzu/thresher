// themeManager.js

export const themes = [
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
const THEME_LINK_ID = "dynamic-theme-stylesheet";

/**
 * Dynamically injects or updates the stylesheet link in <head>
 */
function loadThemeStylesheet(theme) {
  let linkElement = document.getElementById(THEME_LINK_ID);

  if (!linkElement) {
    linkElement = document.createElement("link");
    linkElement.id = THEME_LINK_ID;
    linkElement.rel = "stylesheet";
    document.head.appendChild(linkElement);
  }

  // Adjust path according to your actual stylesheet folder structure
  linkElement.href = `/css/themes/${theme}.css`;
}

export function applyTheme(theme) {
  if (!themes.includes(theme)) return;

  // Set the data attribute for CSS target selectors
  document.documentElement.dataset.theme = theme;
  currentThemeIndex = themes.indexOf(theme);

  // Load the corresponding CSS file on demand
  loadThemeStylesheet(theme);
}

export function loadTheme() {
  const saved = localStorage.getItem("theme");

  if (saved && themes.includes(saved)) {
    applyTheme(saved);
  } else {
    // Fall back to OS preference if no theme is saved in local storage
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const defaultTheme = prefersDark ? "dark" : "light";
    applyTheme(defaultTheme);
  }
}

export function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  const theme = themes[currentThemeIndex];

  applyTheme(theme);
  localStorage.setItem("theme", theme);
}