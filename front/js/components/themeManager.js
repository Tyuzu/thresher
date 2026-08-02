// Theme Manager Utility
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

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  currentThemeIndex = themes.indexOf(theme);
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

export { themes };