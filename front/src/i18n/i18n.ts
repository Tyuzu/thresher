import { setState } from "../state/state.js";

type TranslationDictionary = {
  [key: string]: string | TranslationDictionary;
};

type InterpolationVars = {
  count?: number;
  [key: string]: any;
};

let translations: TranslationDictionary = {};
let currentLang: string = "en";
let activeRequest: number = 0;
const cache = new Map<string, Promise<TranslationDictionary>>();
let cachedPluralRules: Intl.PluralRules | null = null;

const SUPPORTED_LANGS: readonly string[] = ["en", "es", "fr", "hi", "ar", "ja"];
const FALLBACK_LANG: string = "en";

function fetchTranslations(lang: string): Promise<TranslationDictionary> {
  return fetch(`/i18n/${lang}.json`, {
    cache: "no-cache"
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${lang}: ${res.status}`);
      return res.json() as Promise<TranslationDictionary>;
    })
    .catch((err) => {
      cache.delete(lang);
      throw err;
    });
}

async function loadTranslations(lang: string): Promise<void> {
  const requestId = ++activeRequest;
  try {
    if (!cache.has(lang)) {
      cache.set(lang, fetchTranslations(lang));
    }
    const data = await cache.get(lang);
    if (requestId !== activeRequest) return;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error(`Invalid translation data for ${lang}`);
    }
    translations = data;
    currentLang = lang;
    cachedPluralRules = null;
    localStorage.setItem("lang", lang);
    setState("lang", lang);
  } catch (err) {
    cache.delete(lang);
    if (requestId !== activeRequest) return;
    console.error(`Failed to load translations for "${lang}"`, err);
    if (lang !== FALLBACK_LANG) {
      return loadTranslations(FALLBACK_LANG);
    }
    translations = {};
    currentLang = FALLBACK_LANG;
    cachedPluralRules = null;
  }
}

export async function setLanguage(lang: string): Promise<void> {
  const targetLang = SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
  await loadTranslations(targetLang);
}

export function detectLanguage(): string {
  const saved = localStorage.getItem("lang");
  if (saved && SUPPORTED_LANGS.includes(saved)) {
    return saved;
  }
  const langs = navigator.languages || [navigator.language];
  for (const lang of langs) {
    if (SUPPORTED_LANGS.includes(lang)) {
      return lang;
    }
    const base = lang.split("-")[0];
    if (SUPPORTED_LANGS.includes(base)) {
      return base;
    }
  }
  return FALLBACK_LANG;
}

export const getCurrentLanguage = (): string => currentLang;

function getNested(obj: TranslationDictionary, path: string): unknown {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }
  return path.split(".").reduce<unknown>((value, key) => {
    if (value === null || value === undefined || typeof value !== "object") {
      return undefined;
    }
    return (value as Record<string, unknown>)[key];
  }, obj);
}

export function t(key: string, vars: InterpolationVars = {}, fallback: string = ""): string {
  const isDev = (import.meta as any).env?.DEV;

  if (typeof key !== "string" || !key.trim()) {
    if (isDev) {
      console.warn("Missing or non-string translation key:", key);
    }
    return fallback || "";
  }

  let template: unknown = getNested(translations, key);

  if (typeof vars.count === "number") {
    if (!cachedPluralRules) {
      cachedPluralRules = new Intl.PluralRules(currentLang);
    }
    const rule = cachedPluralRules.select(vars.count);
    const pluralKey = `${key}.${rule}`;
    const plural = getNested(translations, pluralKey);
    if (typeof plural === "string") {
      template = plural;
    }
  }

  if (typeof template !== "string") {
    if (isDev) {
      console.warn(`Missing or non-string translation key: ${key}`, {
        language: currentLang,
        value: template,
        availableRootKeys: Object.keys(translations || {}),
      });
    }
    template = fallback || key;
  }

  // Explicit type assertion ensures TypeScript recognizes template as a string
  return (template as string).replace(/\{(\w+)\}/g, (_, variable: string) => {
    return Object.prototype.hasOwnProperty.call(vars, variable)
      ? String(vars[variable])
      : `{${variable}}`;
  });
}

export async function initI18n(): Promise<void> {
  await setLanguage(detectLanguage());
}