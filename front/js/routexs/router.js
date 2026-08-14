import { createElement } from "../components/createElement.js";
import { getState, subscribe, setRouteModule, getRouteModule, hasRouteModule } from "../state/state.js";
import { staticRoutes, dynamicRoutes } from "./routes.js";
import { legalRoutes } from "./legalRoutes.js";
import { runRouteGuards } from "./guards.js";
import { navigate } from "./index.js";
import { track } from "../services/activity/metrics.js";

let isLoggedIn = Boolean(getState("token"));

function renderError(container, message = "404 Not Found") {
  container.replaceChildren(createElement("h1", {}, [message]));
}

async function handleRoute({ path, moduleImport, functionName, routeParams = [], contentContainer, cache }) {
  const startTime = performance.now();

  try {
    if (cache && hasRouteModule(path)) {
      const cachedRender = getRouteModule(path).render;
      contentContainer.replaceChildren();
      await cachedRender(isLoggedIn, ...routeParams, contentContainer);
      
      const duration = Math.round(performance.now() - startTime);
      track("route_render_time", { path, duration_ms: duration, cached: true });
      return;
    }

    // Fetch chunk before clearing existing view to prevent white flashes
    const mod = await moduleImport();
    const renderFn = mod[functionName];
    if (typeof renderFn !== "function") {
      throw new Error(`Export '${functionName}' not found in module.`);
    }

    contentContainer.replaceChildren();

    const fullArgs = [isLoggedIn, ...routeParams, contentContainer];
    await renderFn(...fullArgs);

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

export async function render(rawPath, contentContainer) {
  let cleanPath = decodeURIComponent(String(rawPath).split(/[?#]/)[0]);
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // 0. Legal routes
  const legalRoute = legalRoutes[cleanPath];
  if (legalRoute) {
    const guardResult = await runRouteGuards(legalRoute, cleanPath);
    if (!guardResult.allow) {
      if (guardResult.redirect) navigate(guardResult.redirect);
      return;
    }

    try {
      await handleRoute({ 
        path: cleanPath, 
        moduleImport: legalRoute.moduleImport, 
        functionName: legalRoute.functionName, 
        contentContainer, 
        cache: true 
      });
    } catch (err) {
      console.error("Legal route error:", err);
      renderError(contentContainer, "500 Internal Error");
    }
    return;
  }

  // 1. Static routes
  const staticRoute = staticRoutes[cleanPath];
  if (staticRoute) {
    const guardResult = await runRouteGuards(staticRoute, cleanPath);
    if (!guardResult.allow) {
      if (guardResult.redirect) navigate(guardResult.redirect);
      return;
    }

    try {
      await handleRoute({ 
        path: cleanPath, 
        moduleImport: staticRoute.moduleImport, 
        functionName: staticRoute.functionName, 
        contentContainer, 
        cache: true 
      });
    } catch (err) {
      console.error("Static route error:", err);
      renderError(contentContainer, "500 Internal Error");
    }
    return;
  }

  // 2. Dynamic routes
  for (const route of dynamicRoutes) {
    const match = cleanPath.match(route.pattern);
    if (!match) continue;

    const guardResult = await runRouteGuards(route, cleanPath);
    if (!guardResult.allow) {
      if (guardResult.redirect) navigate(guardResult.redirect);
      return;
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

  // 3. 404 Fallback
  track("route_not_found", { path: cleanPath });
  renderError(contentContainer);
}

// Post-login redirect sync
subscribe("token", (token) => {
  isLoggedIn = Boolean(token);
  if (!token) return;

  const redirect = localStorage.getItem("redirectAfterLogin");
  if (!redirect) return;

  localStorage.removeItem("redirectAfterLogin");
  const target = redirect.startsWith("/") && !["/login", "/logout"].includes(redirect) 
    ? redirect 
    : "/home";

  navigate(target);
});