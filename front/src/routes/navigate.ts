import { abortInflightApiRequests } from "../api/apiAuth.js";
import { saveScroll } from "../state/state.js";
import { track } from "../services/activity/metrics.js";

/* =========================================================
   TYPES & NAVIGATION STATE
========================================================= */
export interface ParsedLocation {
    mode: "hash" | "history";
    path: string;
    search: string;
    hash: string;
    fullPath: string;
}

export interface NavigateOptions {
    storeRedirect?: boolean;
    replace?: boolean;
}

let isNavigating = false;
let loadContentHandler: ((location: string) => Promise<unknown>) | null = null;

export function registerContentLoader(loader: (location: string) => Promise<unknown>): void {
    loadContentHandler = loader;
}

export function getIsNavigating(): boolean {
    return isNavigating;
}

/* =========================================================
   LOCATION HELPERS
========================================================= */
export function getCurrentAppLocation(): string {
    if (window.location.hash.startsWith("#/")) {
        return window.location.hash.slice(1);
    }
    return window.location.pathname + window.location.search;
}

export function parseAppLocation(rawLocation?: string): ParsedLocation {
    let value = String(rawLocation || "/");
    let mode: "hash" | "history" = "history";

    if (value.startsWith("#/")) {
        mode = "hash";
        value = value.slice(1);
    }
    if (!value.startsWith("/")) {
        value = `/${value}`;
    }

    const hashIndex = value.indexOf("#");
    const beforeHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
    const routeHash = hashIndex >= 0 ? value.slice(hashIndex) : "";

    const queryIndex = beforeHash.indexOf("?");
    const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
    const search = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";

    let normalizedPath = pathname || "/";
    if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
        normalizedPath = normalizedPath.slice(0, -1);
    }

    return {
        mode,
        path: normalizedPath,
        search,
        hash: routeHash,
        fullPath: normalizedPath + search
    };
}

export function toBrowserTarget(target?: string, mode: "hash" | "history" = "history"): string {
    const rawTarget = String(target || "/");
    if (rawTarget.startsWith("#/")) {
        return rawTarget;
    }
    if (mode === "hash") {
        const parsed = parseAppLocation(rawTarget);
        return `#${parsed.fullPath}`;
    }
    return rawTarget;
}

/* =========================================================
   NAVIGATION API
========================================================= */
export async function navigate(path: string, options: NavigateOptions = {}): Promise<void> {
    const { storeRedirect = false, replace = false } = options;

    if (!path) return;

    const target = String(path);
    const current = getCurrentAppLocation();

    const currentParsed = parseAppLocation(current);
    const targetParsed = parseAppLocation(target);
    const targetInternal = targetParsed.fullPath;

    if (currentParsed.fullPath === targetInternal && currentParsed.mode === targetParsed.mode) {
        return;
    }

    if (isNavigating) return;
    isNavigating = true;

    try {
        abortInflightApiRequests();

        const main = document.getElementById("content");
        if (main) {
            saveScroll(main, current);
        }

        if (
            storeRedirect &&
            currentParsed.path !== "/" &&
            currentParsed.path !== "/login" &&
            currentParsed.path !== "/logout"
        ) {
            sessionStorage.setItem("redirectAfterLogin", current);
        }

        const browserTarget = target.startsWith("#/")
            ? target
            : target.startsWith("/")
            ? target
            : `/${target}`;

        if (replace) {
            history.replaceState(null, "", browserTarget);
        } else {
            history.pushState(null, "", browserTarget);
        }

        if (loadContentHandler) {
            await loadContentHandler(getCurrentAppLocation());
        }

        track("pageview", { path: getCurrentAppLocation() });
    } catch (error) {
        console.error("Navigation rendering failed:", error);
        throw error;
    } finally {
        isNavigating = false;
    }
}