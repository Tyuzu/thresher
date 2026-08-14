import { createElement } from "../components/createElement.js";
import { getState, subscribe, setRouteModule, getRouteModule, hasRouteModule } from "../state/state.js";
import { routes } from "./newRoutes.js";
import { navigate } from "./index.js";
import { track } from "../services/activity/metrics.js";

let isLoggedIn = Boolean(getState("token"));

/**
 * Extracts route parameters matching `:param` and `*wildcard` tokens.
 */
function matchRoute(routePath, currentPath) {
  const paramNames = [];
  const regexPath = routePath
    .replace(/\/+/g, "/")
    .replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return "([^/]+)";
    })
    .replace(/\*([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return "(.*)";
    });

  const match = currentPath.match(new RegExp(`^${regexPath}$`));
  if (!match) return null;

  const params = {};
  paramNames.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1]);
  });

  return params;
}

/**
 * Executes the route middleware pipeline.
 */
async function runMiddleware(route, context) {
  const middlewareStack = [...(route.middleware || [])];

  for (const fn of middlewareStack) {
    const result = await fn(context);
    if (result === false) return false;           // Halt navigation
    if (typeof result === "string") return result; // Redirect URL
  }

  return true;
}

function renderError(container, message = "404 Not Found") {
  container.replaceChildren(createElement("h1", { class: "error-heading" }, [message]));
}

/**
 * Helper to execute component render with or without route parameters.
 */
function invokeRender(renderFn, auth, params, container) {
  const hasParams = params && Object.keys(params).length > 0;
  return hasParams
    ? renderFn(auth, params, container)
    : renderFn(auth, container);
}

/**
 * Main route resolver and renderer.
 */
export async function render(rawPath, contentContainer) {
  let cleanPath = decodeURIComponent(String(rawPath).split(/[?#]/)[0]);
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }

  let matchedRoute = null;
  let routeParams = {};

  for (const route of routes) {
    const params = matchRoute(route.path, cleanPath);
    if (params) {
      matchedRoute = route;
      routeParams = params;
      break;
    }
  }

  if (!matchedRoute) {
    track("route_not_found", { path: cleanPath });
    renderError(contentContainer, "404 Not Found");
    return;
  }

  const context = { path: cleanPath, params: routeParams, route: matchedRoute };

  // Execute middleware pipeline
  const guardResult = await runMiddleware(matchedRoute, context);
  if (guardResult === false) return; // Halt rendering
  if (typeof guardResult === "string") {
    return navigate(guardResult);
  }

  // Lifecycle Hook: beforeEnter
  if (typeof matchedRoute.beforeEnter === "function") {
    const hookRes = await matchedRoute.beforeEnter(context);
    if (hookRes === false) return;
    if (typeof hookRes === "string") return navigate(hookRes);
  }

  const startTime = performance.now();

  try {
    // Check module cache
    if (hasRouteModule(cleanPath)) {
      const cachedRender = getRouteModule(cleanPath).render;
      contentContainer.replaceChildren();
      await cachedRender(isLoggedIn, routeParams, contentContainer);
    } else {
      const mod = await matchedRoute.component();
      const exportName = matchedRoute.functionName || "default";
      const renderFn = mod[exportName] || mod.default;

      if (typeof renderFn !== "function") {
        throw new Error(`Export '${exportName}' not found in component module.`);
      }

      contentContainer.replaceChildren();
      await invokeRender(renderFn, isLoggedIn, routeParams, contentContainer);

      setRouteModule(cleanPath, {
        render: (freshAuth, freshParams, container) =>
          invokeRender(renderFn, freshAuth, freshParams, container)
      });
    }

    const duration = Math.round(performance.now() - startTime);
    track("route_render_time", { path: cleanPath, duration_ms: duration });

    // Lifecycle Hook: afterEnter
    if (typeof matchedRoute.afterEnter === "function") {
      matchedRoute.afterEnter(context);
    }
  } catch (err) {
    console.error("Route execution error:", err);
    track("route_render_error", { path: cleanPath, error: err.message });
    renderError(contentContainer, "500 Internal Error");
  }
}

// Reactive auth syncing for route guards
subscribe("token", (token) => {
  isLoggedIn = Boolean(token);
  if (!token) return;

  const redirect = localStorage.getItem("redirectAfterLogin");
  if (!redirect) return;

  localStorage.removeItem("redirectAfterLogin");
  const target =
    redirect.startsWith("/") && redirect !== "/login" && redirect !== "/logout"
      ? redirect
      : "/home";

  navigate(target);
});

/**
 * Safely extracts regex capture groups and filters out undefined values.
 */
export function safeArgBuilder(match) {
  if (!match) return [];
  return match.slice(1).filter((val) => val !== undefined);
}