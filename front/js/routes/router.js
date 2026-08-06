import { createElement } from "../components/createElement.js";
import { getState, subscribe, setRouteModule, getRouteModule, hasRouteModule } from "../state/state.js";
import { staticRoutes, dynamicRoutes } from "./newRoutes.js";
import { navigate } from "./index.js";
import { legalRoutes } from "./legalRoutes.js";
import { track } from "../services/activity/metrics.js";

/** --- Reactive login state --- */
let isLoggedIn = Boolean(getState("token"));

/** Render a simple error message */
function renderError(container, message = "404 Not Found") {
  container.replaceChildren(createElement("h1", {}, [message]));
}

/**
 * Invokes and caches a page's render function.
 * Evaluates dynamic states (like auth and target container) cleanly upon call.
 */
async function handleRoute({ path, moduleImport, functionName, routeParams = [], contentContainer, cache }) {
  const startTime = performance.now();

  try {
    // 1. If cached, retrieve the render function and execute with fresh states
    if (cache && hasRouteModule(path)) {
      const cachedRender = getRouteModule(path).render;
      contentContainer.replaceChildren();
      await cachedRender(isLoggedIn, ...routeParams, contentContainer);
      
      const duration = Math.round(performance.now() - startTime);
      track("route_render_time", { path, duration_ms: duration, cached: true });
      return;
    }

    // 2. Fetch the chunk over the network before tearing down existing DOM
    const mod = await moduleImport();
    const renderFn = mod[functionName];
    if (typeof renderFn !== "function") {
      throw new Error(`Export '${functionName}' not found in module.`);
    }

    // 3. Clear container ONLY when new content is ready to inject
    contentContainer.replaceChildren();

    // Assemble arguments dynamically
    const fullArgs = [isLoggedIn, ...routeParams, contentContainer];
    await renderFn(...fullArgs);

    // 4. Cache the raw render function pointer
    if (cache) {
      setRouteModule(path, {
        render: (freshIsLoggedIn, ...paramsAndContainer) => {
          return renderFn(freshIsLoggedIn, ...paramsAndContainer);
        }
      });
    }

    const duration = Math.round(performance.now() - startTime);
    track("route_render_time", { path, duration_ms: duration, cached: false });

  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    track("route_render_error", { path, duration_ms: duration, error: err.message });
    throw err;
  }
}

/**
 * Resolves and renders the appropriate route.
 */
export async function render(rawPath, contentContainer) {
  let cleanPath = decodeURIComponent(String(rawPath).split(/[?#]/)[0]);
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // 0) Legal routes
  const legalRoute = legalRoutes[cleanPath];
  if (legalRoute) {
    try {
      await handleRoute({ 
        path: cleanPath, 
        moduleImport: legalRoute.moduleImport, 
        functionName: legalRoute.functionName, 
        routeParams: [], 
        contentContainer, 
        cache: true 
      });
    } catch (err) {
      console.error("Legal route error:", err);
      renderError(contentContainer, "500 Internal Error");
    }
    return;
  }

  // 1) Static routes
  const staticRoute = staticRoutes[cleanPath];
  if (staticRoute) {
    if (staticRoute.protected && !isLoggedIn) {
      localStorage.setItem("redirectAfterLogin", cleanPath);
      return navigate("/login");
    }

    try {
      await handleRoute({ 
        path: cleanPath, 
        moduleImport: staticRoute.moduleImport, 
        functionName: staticRoute.functionName, 
        routeParams: [], 
        contentContainer, 
        cache: true 
      });
    } catch (err) {
      console.error("Static route error:", err);
      renderError(contentContainer, "500 Internal Error");
    }
    return;
  }

  // 2) Dynamic routes
  for (const route of dynamicRoutes) {
    const match = cleanPath.match(route.pattern);
    if (!match) continue;

    if (route.protected && !isLoggedIn) {
      localStorage.setItem("redirectAfterLogin", cleanPath);
      return navigate("/login");
    }

    const routeParams = typeof route.argBuilder === "function" 
      ? route.argBuilder(match) 
      : match.slice(1);

    try {
      await handleRoute({ 
        path: cleanPath, 
        moduleImport: route.moduleImport, 
        functionName: route.moduleImport ? route.functionName : undefined,
        routeParams, 
        contentContainer, 
        cache: true 
      });
    } catch (err) {
      console.error("Dynamic route error:", err);
      renderError(contentContainer, "500 Internal Error");
    }
    return;
  }

  // 3) No match
  track("route_not_found", { path: cleanPath });
  renderError(contentContainer);
}

/* ------------------------------------------------------
    Unified Subscriber (Handles post-login redirects)
--------------------------------------------------------- */
subscribe("token", (token) => {
  isLoggedIn = Boolean(token);

  if (!token) return;

  const redirect = localStorage.getItem("redirectAfterLogin");
  if (!redirect) return;

  localStorage.removeItem("redirectAfterLogin");
  const target = redirect.startsWith("/") && redirect !== "/login" && redirect !== "/logout" 
    ? redirect 
    : "/home";

  navigate(target);
});