import { createheader } from "../components/layout/header.ts";
import { createNav, highlightActiveNav } from "../components/layout/navigation.ts";
import { Footer } from "../components/layout/footer.ts";
import { render } from "./router.ts";
import { getState, setState, restoreScroll, subscribe } from "../state/state.ts";
import { track } from "../services/activity/metrics.ts";
import { startPerfMonitoring } from "../services/activity/perfMonitor.ts";
import {
    getCurrentAppLocation,
    parseAppLocation,
    toBrowserTarget,
    navigate,
    registerContentLoader
} from "./navigate.ts";

/* Re-export navigation utilities for external modules */
export { getCurrentAppLocation, parseAppLocation, navigate } from "./navigate.ts";

/* =========================================================
   ROUTE STATE HELPER
========================================================= */
function getRouteStateHelper(location: string): unknown {
    const state = getState() || {};
    const routeStates = state.routeState || state.scrollPositions || {};
    return routeStates[location] || null;
}

/* =========================================================
   LAYOUT STATE & ELEMENTS
========================================================= */
const layoutState = {
    isHydrated: false,
    headerRendered: false,
    navRendered: false,
    footerRendered: false
};

interface LayoutElements {
    header: HTMLElement | null;
    nav: HTMLElement | null;
    main: HTMLElement | null;
    footer: HTMLElement | null;
}

const elements: LayoutElements = {
    header: null,
    nav: null,
    main: null,
    footer: null
};

function getElements(): LayoutElements {
    if (!elements.main) {
        elements.header = document.getElementById("pageheader");
        elements.nav = document.getElementById("primary-nav");
        elements.main = document.getElementById("content");
        elements.footer = document.getElementById("pagefooter");
    }
    return elements;
}

/* =========================================================
   AUTH HYDRATION
========================================================= */
export function hydrateAuthState(force = false): void {
    if (layoutState.isHydrated && !force) return;

    const state = getState() || {};
    const auth = state.auth || {};
    const token = sessionStorage.getItem("token") || localStorage.getItem("token") || null;
    const userRaw = sessionStorage.getItem("user") || localStorage.getItem("user") || null;
    let user: unknown = null;

    if (userRaw) {
        try {
            const trimmed = userRaw.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                user = JSON.parse(trimmed);
            } else {
                user = userRaw;
            }
        } catch (error) {
            console.warn("Failed parsing stored user JSON:", error);
            user = userRaw;
        }
    }

    setState(
        {
            token,
            user,
            auth: {
                ...auth,
                accessToken: token || auth.accessToken || null,
                isAuthenticated: Boolean(token || auth.accessToken),
                user: user || auth.user || null
            }
        },
        true
    );

    layoutState.isHydrated = true;
}

/* =========================================================
   STATIC LAYOUT RENDERERS
========================================================= */
function renderStaticLayout(): void {
    const { header, nav, footer } = getElements();
    if (!header || !nav || !footer) return;

    if (!layoutState.headerRendered) {
        const h = createheader();
        if (h) header.replaceChildren(h);
        layoutState.headerRendered = true;
    }
    if (!layoutState.navRendered) {
        const n = createNav();
        if (n) nav.replaceChildren(n);
        layoutState.navRendered = true;
    }
    if (!layoutState.footerRendered) {
        const f = Footer();
        if (f) footer.replaceChildren(f);
        layoutState.footerRendered = true;
    }
}

function refreshStaticLayout(): void {
    const { header, nav } = getElements();
    if (header) {
        const updatedHeader = createheader();
        if (updatedHeader) header.replaceChildren(updatedHeader);
    }
    if (nav) {
        const updatedNav = createNav();
        if (updatedNav) nav.replaceChildren(updatedNav);
    }
}

/* =========================================================
   CONTENT LOADING
========================================================= */
export async function loadContent(
    rawLocation: string = getCurrentAppLocation(),
    { redirectDepth = 0 }: { redirectDepth?: number } = {}
): Promise<unknown> {
    const { main } = getElements();
    if (!main) {
        throw new Error("SPA content container #content was not found.");
    }

    hydrateAuthState();
    renderStaticLayout();

    const parsed = parseAppLocation(rawLocation);
    const result = await render(parsed.fullPath, main);

    /* --- ROUTER REDIRECT --- */
    if (result?.redirect) {
        if (redirectDepth >= 10) {
            throw new Error("Too many consecutive route redirects.");
        }
        const browserTarget = toBrowserTarget(result.redirect, parsed.mode);
        history.replaceState(null, "", browserTarget);

        track("route_redirect", {
            from: parsed.fullPath,
            to: result.redirect
        });

        await loadContent(getCurrentAppLocation(), {
            redirectDepth: redirectDepth + 1
        });
        return result;
    }

    /* --- NAVIGATION UI --- */
    highlightActiveNav(parsed.path);

    /* --- SCROLL RESTORATION --- */
    const routeState = getRouteStateHelper(getCurrentAppLocation());
    if (routeState) {
        requestAnimationFrame(() => {
            restoreScroll(main, routeState);
        });
    }

    return result;
}

// Register loader with navigate module to avoid circular dependency
registerContentLoader((location) => loadContent(location));

/* =========================================================
   INITIAL RENDER API
========================================================= */
export async function renderPage(): Promise<void> {
    startPerfMonitoring();
    await loadContent(getCurrentAppLocation());
}

/* =========================================================
   AUTH REACTIVITY & CROSS-TAB SYNC
========================================================= */
subscribe("token", (token: unknown) => {
    refreshStaticLayout();

    if (!token) return;

    const current = parseAppLocation(getCurrentAppLocation());
    if (current.path !== "/login") return;

    const redirect = sessionStorage.getItem("redirectAfterLogin");
    sessionStorage.removeItem("redirectAfterLogin");

    const target =
        redirect && redirect.startsWith("/") && redirect !== "/login" && redirect !== "/logout"
            ? redirect
            : "/";

    queueMicrotask(() => {
        navigate(target, { replace: true }).catch((error) => {
            console.error("Post-login redirect failed:", error);
        });
    });
});

window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === "token" || event.key === "user") {
        hydrateAuthState(true);
        refreshStaticLayout();
    }
});