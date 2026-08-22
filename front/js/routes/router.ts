import {
    createElement
} from "../components/createElement.js";
import {
    getState
} from "../state/state.js";
import {
    routes
} from "./newRoutes.js";
import {
    track
} from "../services/activity/metrics.js";

/* =========================================================
   ROUTE CACHE HELPERS
========================================================= */
function getRouteCacheMap() {
    return getState("routeCache") || new Map();
}

function hasRouteModule(path) {
    return getRouteCacheMap().has(path);
}

function getRouteModule(path) {
    return getRouteCacheMap().get(path);
}

function setRouteModule(path, moduleData) {
    getRouteCacheMap().set(path, moduleData);
}

/* =========================================================
   PATH UTILITIES
========================================================= */
function normalizePath(path) {
    let value = String(path || "/");
    if (value.length > 1 && value.endsWith("/")) {
        value = value.slice(0, -1);
    }
    return value || "/";
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* =========================================================
   ROUTE COMPILATION
========================================================= */
const compiledRoutes = new Map();

function compileRoute(routePath) {
    const normalized = normalizePath(String(routePath));
    const existing = compiledRoutes.get(routePath);
    if (existing) {
        return existing;
    }
    if (normalized === "/") {
        const compiled = {
            regex: /^\/$/,
            paramNames: [],
            score: 1000
        };
        return compiled;
    }
    const segments = normalized.replace(/^\/+/, "").split("/");
    const paramNames = [];
    let score = 0;
    const pattern = segments.map((segment) => {
        /*
         * Wildcard:
         * /admin/*path
         */
        if (segment.startsWith("*")) {
            const name = segment.slice(1);
            paramNames.push(name);
            score += 1;
            return "(.*)";
        }
        /*
         * Dynamic:
         * /user/:id
         */
        if (segment.startsWith(":")) {
            const name = segment.slice(1);
            paramNames.push(name);
            score += 10;
            return "([^/]+)";
        }
        /*
         * Static segment
         */
        score += 100;
        return escapeRegex(segment);
    }).join("/");
    const compiled = {
        regex: new RegExp(`^/${pattern}$`),
        paramNames,
        score
    };
    compiledRoutes.set(routePath, compiled);
    return compiled;
}

/* =========================================================
   ROUTE MATCHING
========================================================= */
export function matchRoute(routePath, currentPath) {
    const normalized = normalizePath(currentPath);
    const {
        regex,
        paramNames
    } = compileRoute(routePath);
    const match = normalized.match(regex);
    if (!match) {
        return null;
    }
    const params = {};
    paramNames.forEach(
        (name, index) => {
            const rawValue = match[index + 1];
            if (rawValue === undefined) {
                params[name] = undefined;
                return;
            }
            try {
                params[name] = decodeURIComponent(rawValue);
            } catch (_error) {
                params[name] = rawValue;
            }
        });
    return params;
}

/* =========================================================
   QUERY STRING
========================================================= */
function parseQuery(search) {
    const query = {};
    if (!search) {
        return query;
    }
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    for (const [key, value] of params.entries()) {
        query[key] = value;
    }
    return query;
}

/* =========================================================
   ROUTE INPUT PARSING
========================================================= */
function parseRouteInput(rawPath) {
    let value = String(rawPath || "/");
    if (value.startsWith("#/")) {
        value = value.slice(1);
    }
    if (!value.startsWith("/")) {
        value = `/${value}`;
    }
    let search = "";
    const hashIndex = value.indexOf("#");
    if (hashIndex >= 0) {
        value = value.slice(0, hashIndex);
    }
    const queryIndex = value.indexOf("?");
    if (queryIndex >= 0) {
        search = value.slice(queryIndex);
        value = value.slice(0, queryIndex);
    }
    let path = normalizePath(value);
    if (!path) {
        path = "/";
    }
    return {
        path,
        search,
        query: parseQuery(search),
        fullPath: path + search
    };
}

/* =========================================================
   MIDDLEWARE
========================================================= */
async function runMiddleware(route, context) {
    const stack = [...(route.middleware || [])];
    for (const middleware of stack) {
        if (typeof middleware !== "function") {
            continue;
        }
        const result = await middleware(context);
        if (result === false) {
            return {
                type: "abort"
            };
        }
        if (typeof result === "string") {
            return {
                type: "redirect",
                target: result
            };
        }
    }
    return {
        type: "allow"
    };
}

/* =========================================================
   ERROR RENDER
========================================================= */
function renderError(container, message = "404 Not Found") {
    container.replaceChildren(createElement("h1", {
            class: "error-heading"
        },
        [message]));
}

/* =========================================================
   RENDER INVOCATION
========================================================= */
function invokeRender(renderFn, auth, params, container, context) {
    const hasParams = params && Object.keys(params).length > 0;
    if (hasParams) {
        return renderFn(auth, params, container, context);
    }
    return renderFn(auth, container, context);
}

/* =========================================================
   AUTH SNAPSHOT
========================================================= */
function getIsAuthenticated() {
    const state = getState() || {};
    const auth = state.auth || {};
    return Boolean(auth.isAuthenticated || auth.accessToken || state.token);
}

/* =========================================================
   MAIN ROUTER
========================================================= */
export async function render(rawPath, contentContainer) {
    if (!contentContainer) {
        throw new Error("Router received no content container.");
    }
    let parsed;
    try {
        parsed = parseRouteInput(rawPath);
    } catch (error) {
        console.error("Failed parsing route:", error);
        renderError(contentContainer, "400 Bad Request");
        return {
            status: "error"
        };
    }
    const {
        path: cleanPath,
        search,
        query,
        fullPath
    } = parsed;

    /* =======================================================
       ROUTE MATCH
    ======================================================= */
    let matchedRoute = null;
    let routeParams = {};
    for (const route of routes) {
        const params = matchRoute(route.path, cleanPath);
        if (params !== null) {
            matchedRoute = route;
            routeParams = params;
            break;
        }
    }
    if (!matchedRoute) {
        track("route_not_found", {
            path: cleanPath,
            search
        });
        renderError(contentContainer, "404 Not Found");
        return {
            status: "not-found",
            path: cleanPath
        };
    }

    /* =======================================================
       ROUTE CONTEXT
    ======================================================= */
    const context = {
        path: cleanPath,
        search,
        query,
        fullPath,
        params: routeParams,
        route: matchedRoute
    };

    /* =======================================================
       MIDDLEWARE
    ======================================================= */
    const middlewareResult = await runMiddleware(matchedRoute, context);
    if (middlewareResult.type === "abort") {
        return {
            status: "aborted",
            path: cleanPath
        };
    }
    if (middlewareResult.type === "redirect") {
        return {
            status: "redirect",
            redirect: middlewareResult.target
        };
    }

    /* =======================================================
       BEFORE ENTER
    ======================================================= */
    if (typeof matchedRoute.beforeEnter === "function") {
        const hookResult = await matchedRoute.beforeEnter(context);
        if (hookResult === false) {
            return {
                status: "aborted",
                path: cleanPath
            };
        }
        if (typeof hookResult === "string") {
            return {
                status: "redirect",
                redirect: hookResult
            };
        }
    }

    /* =======================================================
       RENDER
    ======================================================= */
    const startTime = performance.now();
    const isLoggedIn = getIsAuthenticated();
    try {
        if (hasRouteModule(cleanPath)) {
            const cached = getRouteModule(cleanPath);
            if (!cached?.render) {
                throw new Error(`Cached route module for '${cleanPath}' is invalid.`);
            }
            contentContainer.replaceChildren();
            await cached.render(isLoggedIn, routeParams, contentContainer, context);
        } else {
            const module = await matchedRoute.component();
            const exportName = matchedRoute.functionName || "default";
            const renderFn = module[exportName] || module.default;
            if (typeof renderFn !== "function") {
                throw new Error(`Export '${exportName}' not found in component module.`);
            }
            contentContainer.replaceChildren();
            await invokeRender(renderFn, isLoggedIn, routeParams, contentContainer, context);
            setRouteModule(cleanPath, {
                render: (freshAuth, freshParams, container, freshContext) => invokeRender(renderFn, freshAuth, freshParams, container, freshContext)
            });
        }
        const duration = Math.round(performance.now() - startTime);
        track("route_render_time", {
            path: cleanPath,
            duration_ms: duration
        });

        /* =====================================================
           AFTER ENTER
        ===================================================== */
        if (typeof matchedRoute.afterEnter === "function") {
            await matchedRoute.afterEnter(context);
        }
        return {
            status: "rendered",
            path: cleanPath,
            params: routeParams,
            query,
            search,
            route: matchedRoute
        };
    } catch (error) {
        console.error("Route execution error:", error);
        track("route_render_error", {
            path: cleanPath,
            error: error?.message || String(error)
        });
        renderError(contentContainer, "500 Internal Error");
        return {
            status: "error",
            path: cleanPath,
            error
        };
    }
}

/* =========================================================
   LEGACY HELPER
========================================================= */
export function safeArgBuilder(match) {
    if (!match) {
        return [];
    }
    return match.slice(1).filter(
        (value) => value !== undefined);
}