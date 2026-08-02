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
const THEME_STYLE_ID = "dynamic-theme-style";

// Vite glob import: map each theme file relative to this script
// Make sure this relative path correctly points to your CSS files folder!
const themeModules = import.meta.glob("../../css/themes/*.css", { query: "?inline" });

async function loadThemeStylesheet(theme) {
  try {
    const importPath = `../../css/themes/${theme}.css`;
    
    if (!themeModules[importPath]) {
      console.error(`Theme CSS file not found at path: ${importPath}`);
      return;
    }

    // Lazy load the specific theme chunk
    const module = await themeModules[importPath]();
    
    let styleElement = document.getElementById(THEME_STYLE_ID);
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = THEME_STYLE_ID;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = module.default || module;
    document.documentElement.dataset.theme = theme;
  } catch (err) {
    console.error(`Failed to load theme: ${theme}`, err);
  }
}

export function applyTheme(theme) {
  if (!themes.includes(theme)) return;
  currentThemeIndex = themes.indexOf(theme);
  loadThemeStylesheet(theme);
}

export function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved && themes.includes(saved)) {
    applyTheme(saved);
  } else {
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