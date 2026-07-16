import { createElement } from "../components/createElement.js";
import { getState, subscribe, setRouteModule, getRouteModule, hasRouteModule } from "../state/state.js";
import { staticRoutes, dynamicRoutes } from "./routes.js";
import { navigate } from "./index.js";
import { legalRoutes } from "./legalRoutes.js";

/** --- Reactive login state --- */
let isLoggedIn = Boolean(getState("token"));

/** Render a simple error message */
function renderError(container, message = "404 Not Found") {
  container.replaceChildren(createElement("h1", {}, [message]));
}

/**
 * Invokes and caches a page's render function.
 */
async function handleRoute({ path, moduleImport, functionName, args = [], contentContainer, cache }) {
  // 1. If cached, render synchronously and exit instantly
  if (cache && hasRouteModule(path)) {
    return getRouteModule(path).render(contentContainer);
  }

  // 2. Fetch the chunk over the network before tearing down the existing DOM
  const mod = await moduleImport();
  const renderFn = mod[functionName];
  if (typeof renderFn !== "function") {
    throw new Error(`Export '${functionName}' not found in module.`);
  }

  // 3. Clear container ONLY when new content is ready to inject (Prevents white flash)
  contentContainer.replaceChildren();

  const fullArgs = [...args, contentContainer];
  await renderFn(...fullArgs);

  if (cache) {
    setRouteModule(path, {
      render: (container) => {
        container.replaceChildren(); // Ensure cache hits clear previous views cleanly
        return renderFn(...args, container);
      }
    });
  }
}

/**
 * Resolves and renders the appropriate route.
 */
export async function render(rawPath, contentContainer) {
  // trackPageView();

  let cleanPath = decodeURIComponent(String(rawPath).split(/[?#]/)[0]);
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // 0) Legal routes
  const legalRoute = legalRoutes[cleanPath];
  if (legalRoute) {
    try {
      await handleRoute({ path: cleanPath, moduleImport: legalRoute.moduleImport, functionName: legalRoute.functionName, args: [], contentContainer, cache: true });
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
      await handleRoute({ path: cleanPath, moduleImport: staticRoute.moduleImport, functionName: staticRoute.functionName, args: [isLoggedIn], contentContainer, cache: true });
    } catch (err) {
      console.error("Static route error:", err);
      renderError(contentContainer, "500 Internal Error");
    }
    return;
  }

  // 2) Dynamic routes (Refactored to clean for...of to fix ReferenceError)
  for (const route of dynamicRoutes) {
    const match = cleanPath.match(route.pattern);
    if (!match) continue;

    if (route.protected && !isLoggedIn) {
      localStorage.setItem("redirectAfterLogin", cleanPath);
      return navigate("/login");
    }

    // Extract the raw URL parameters using the builder (or fallback to match chunks)
    const routeParams = typeof route.argBuilder === "function" 
      ? route.argBuilder(match) 
      : match.slice(1);

    // Explicitly inject the correct, dynamic reactive auth state right here
    const args = [isLoggedIn, ...routeParams];

    try {
      await handleRoute({ 
        path: cleanPath, 
        moduleImport: route.moduleImport, 
        functionName: route.moduleImport ? route.functionName : undefined, // fallback check
        args, 
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
  renderError(contentContainer);
}

/* ------------------------------------------------------
    Unified Subscriber (Replaces redundant subscribeDeep)
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