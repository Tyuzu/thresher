import {
    setState
} from "../state/state.ts";
let translations = {};
let currentLang = "en";
let activeRequest = 0;
const cache = new Map();
let cachedPluralRules = null;
const SUPPORTED_LANGS = ["en", "es", "fr", "hi", "ar", "ja"];
const FALLBACK_LANG = "en";

function fetchTranslations(lang) {
    return fetch(`/i18n/${lang}.json`, {
        cache: "no-cache"
    }).then(res => {
        if (!res.ok) throw new Error(`Failed to load ${lang}: ${res.status}`);
        return res.json();
    }).catch(err => {
        cache.delete(lang);
        throw err;
    });
}
async function loadTranslations(lang) {
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
export async function setLanguage(lang) {
    const targetLang = SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
    await loadTranslations(targetLang);
}
export function detectLanguage() {
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
export const getCurrentLanguage = () => currentLang;

function getNested(obj, path) {
    if (!obj || typeof obj !== "object") {
        return undefined;
    }
    return path.split(".").reduce((value, key) => {
        if (value === null || value === undefined) {
            return undefined;
        }
        return value[key];
    }, obj);
}
export function t(key, vars = {}, fallback = "") {
    if (typeof key !== "string" || !key.trim()) {
        if (import.meta.env?.DEV) {
            console.warn("Missing or non-string translation key:", key);
        }
        return fallback || "";
    }
    let template = getNested(translations, key);
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
        if (import.meta.env?.DEV) {
            console.warn(`Missing or non-string translation key: ${key}`, {
                language: currentLang,
                value: template,
                availableRootKeys: Object.keys(translations || {}),
            });
        }
        template = fallback || key;
    }
    return template.replace(/\{(\w+)\}/g, (_, variable) => {
        return Object.prototype.hasOwnProperty.call(vars, variable) ? String(vars[variable]) : `{${variable}}`;
    });
}
export async function initI18n() {
    await setLanguage(detectLanguage());
}