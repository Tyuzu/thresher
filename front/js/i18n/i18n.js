import { setState } from "../state/state.js";

let translations = {};
let currentLang = "en";
let activeRequest = 0;

// Cache the Promises rather than data objects to resolve race-condition fetches
const cache = new Map();
// Cache the PluralRules instance to save massive CPU iteration cycles
let cachedPluralRules = null;

const SUPPORTED_LANGS = ["en", "es", "fr", "hi", "ar", "ja"];
const FALLBACK_LANG = "en";

function fetchTranslations(lang) {
  return fetch(`/static/i18n/${lang}.json`).then(res => {
    if (!res.ok) throw new Error(`Failed to load ${lang}`);
    return res.json();
  });
}

async function loadTranslations(lang) {
  const requestId = ++activeRequest;

  try {
    // 1. Store the Promise in cache immediately. Prevents concurrent duplicate fetches.
    if (!cache.has(lang)) {
      cache.set(lang, fetchTranslations(lang));
    }

    const data = await cache.get(lang);

    if (requestId !== activeRequest) return;
    
    translations = data;
    
    if (currentLang !== lang) {
      currentLang = lang;
      cachedPluralRules = null; // Flush PluralRules constructor snapshot on update
    }

    localStorage.setItem("lang", lang);
    setState("lang", lang);

  } catch (err) {
    if (requestId !== activeRequest) return;

    if (lang !== FALLBACK_LANG) {
      return loadTranslations(FALLBACK_LANG);
    }

    translations = {};
  }
}

export async function setLanguage(lang) {
  const targetLang = SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
  await loadTranslations(targetLang);
}

export function detectLanguage() {
  const saved = localStorage.getItem("lang");
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;

  const langs = navigator.languages || [navigator.language];
  for (let i = 0; i < langs.length; i++) {
    const l = langs[i];
    if (SUPPORTED_LANGS.includes(l)) return l;
    
    const base = l.split("-")[0];
    if (SUPPORTED_LANGS.includes(base)) return base;
  }

  return FALLBACK_LANG;
}

export const getCurrentLanguage = () => currentLang;

// Flatten object string lookups loops cleanly
function getNested(obj, path) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

export function t(key, vars = {}, fallback = "") {
  let template = getNested(translations, key);

  if (typeof vars.count === "number") {
    // Reuse constructor context to avoid runtime memory thrashing
    if (!cachedPluralRules) {
      cachedPluralRules = new Intl.PluralRules(currentLang);
    }
    const rule = cachedPluralRules.select(vars.count);
    const plural = getNested(translations, `${key}.${rule}`);
    if (plural) template = plural;
  }

  if (!template) {
    // process.env checking checks safely depending on standard bundle outputs
    if (import.meta.env?.DEV) {
      console.warn(`Missing translation: ${key}`);
    }
    template = fallback || key;
  }

  return String(template).replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? vars[k] : `{${k}}`
  );
}

export async function initI18n() {
  await setLanguage(detectLanguage());
}