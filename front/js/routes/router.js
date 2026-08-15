// router.js
import { createElement } from "../components/createElement.js";
import { getState, subscribe, setRouteModule, getRouteModule, hasRouteModule } from "../state/state.js";
import { routes } from "./newRoutes.js";
import { navigate } from "./index.js";
import { track } from "../services/activity/metrics.js";

let isLoggedIn = Boolean(getState("token"));

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

async function runMiddleware(route, context) {
  const middlewareStack = [...(route.middleware || [])];

  for (const fn of middlewareStack) {
    const result = await fn(context);
    if (result === false) return false;
    if (typeof result === "string") return result;
  }

  return true;
}

function renderError(container, message = "404 Not Found") {
  container.replaceChildren(createElement("h1", { class: "error-heading" }, [message]));
}

function invokeRender(renderFn, auth, params, container) {
  const hasParams = params && Object.keys(params).length > 0;
  return hasParams
    ? renderFn(auth, params, container)
    : renderFn(auth, container);
}

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

  // 1. Run Middleware Stack (including metaGuard if configured)
  const guardResult = await runMiddleware(matchedRoute, context);
  if (guardResult === false) return;
  if (typeof guardResult === "string") {
    return navigate(guardResult);
  }

  // 2. Run Route Lifecycle Hooks
  if (typeof matchedRoute.beforeEnter === "function") {
    const hookRes = await matchedRoute.beforeEnter(context);
    if (hookRes === false) return;
    if (typeof hookRes === "string") return navigate(hookRes);
  }

  const startTime = performance.now();

  try {
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

    if (typeof matchedRoute.afterEnter === "function") {
      matchedRoute.afterEnter(context);
    }
  } catch (err) {
    console.error("Route execution error:", err);
    track("route_render_error", { path: cleanPath, error: err.message });
    renderError(contentContainer, "500 Internal Error");
  }
}

// Reactive auth syncing for post-login redirects
subscribe("token", (token) => {
  isLoggedIn = Boolean(token);
  if (!token) return;

  // Retrieve stored target from sessionStorage (aligned with middleware.js)
  const redirect = sessionStorage.getItem("redirectAfterLogin") || localStorage.getItem("redirectAfterLogin");
  sessionStorage.removeItem("redirectAfterLogin");
  localStorage.removeItem("redirectAfterLogin");

  const target =
    redirect && redirect.startsWith("/") && redirect !== "/login" && redirect !== "/logout"
      ? redirect
      : "/";

  setTimeout(() => navigate(target), 0);
});

export function safeArgBuilder(match) {
  if (!match) return [];
  return match.slice(1).filter((val) => val !== undefined);
}