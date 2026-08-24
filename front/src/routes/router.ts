import { createElement } from "../components/createElement.js";
import { getState } from "../state/state.js";
import { routes } from "./newRoutes.js";
import { track } from "../services/activity/metrics.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */
export type RouteParams = Record<string, string | undefined>;
export type ParsedQuery = Record<string, string>;

export interface RouteContext {
  path: string;
  search: string;
  query: ParsedQuery;
  fullPath: string;
  params: RouteParams;
  route: Route;
}

export type MiddlewareFn = (
  context: RouteContext
) => Promise<boolean | string | void> | boolean | string | void;

export type HookFn = (
  context: RouteContext
) => Promise<boolean | string | void> | boolean | string | void;

export type RenderFunction = (
  auth: boolean,
  ...args: any[]
) => Promise<void> | void;

export interface Route {
  path: string;
  component: () => Promise<Record<string, any>>;
  functionName?: string;
  middleware?: MiddlewareFn[];
  beforeEnter?: HookFn;
  afterEnter?: HookFn;
}

export interface RouteModuleData {
  render: (
    freshAuth: boolean,
    freshParams: RouteParams,
    container: HTMLElement,
    freshContext: RouteContext
  ) => Promise<any> | any;
}

export interface CompiledRoute {
  regex: RegExp;
  paramNames: string[];
  score: number;
}

export type MiddlewareResult =
  | { type: "abort" }
  | { type: "redirect"; target: string }
  | { type: "allow" };

export type RenderResult =
  | { status: "rendered"; path: string; params: RouteParams; query: ParsedQuery; search: string; route: Route }
  | { status: "not-found"; path: string }
  | { status: "aborted"; path: string }
  | { status: "redirect"; redirect: string }
  | { status: "error"; path?: string; error?: unknown };

/* =========================================================
   ROUTE CACHE HELPERS
========================================================= */
function getRouteCacheMap(): Map<string, RouteModuleData> {
  return getState("routeCache") || new Map<string, RouteModuleData>();
}

function hasRouteModule(path: string): boolean {
  return getRouteCacheMap().has(path);
}

function getRouteModule(path: string): RouteModuleData | undefined {
  return getRouteCacheMap().get(path);
}

function setRouteModule(path: string, moduleData: RouteModuleData): void {
  getRouteCacheMap().set(path, moduleData);
}

/* =========================================================
   PATH UTILITIES
========================================================= */
function normalizePath(path?: string | null): string {
  let value = String(path || "/");
  if (value.length > 1 && value.endsWith("/")) {
    value = value.slice(0, -1);
  }
  return value || "/";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* =========================================================
   ROUTE COMPILATION
========================================================= */
const compiledRoutes = new Map<string, CompiledRoute>();

function compileRoute(routePath: string): CompiledRoute {
  const normalized = normalizePath(String(routePath));
  const existing = compiledRoutes.get(routePath);
  if (existing) {
    return existing;
  }
  if (normalized === "/") {
    const compiled: CompiledRoute = {
      regex: /^\/$/,
      paramNames: [],
      score: 1000
    };
    return compiled;
  }
  const segments = normalized.replace(/^\/+/, "").split("/");
  const paramNames: string[] = [];
  let score = 0;
  const pattern = segments
    .map((segment) => {
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
    })
    .join("/");
  const compiled: CompiledRoute = {
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
export function matchRoute(routePath: string, currentPath: string): RouteParams | null {
  const normalized = normalizePath(currentPath);
  const { regex, paramNames } = compileRoute(routePath);
  const match = normalized.match(regex);
  if (!match) {
    return null;
  }
  const params: RouteParams = {};
  paramNames.forEach((name, index) => {
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
function parseQuery(search: string): ParsedQuery {
  const query: ParsedQuery = {};
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
interface ParsedRouteInput {
  path: string;
  search: string;
  query: ParsedQuery;
  fullPath: string;
}

function parseRouteInput(rawPath?: string | null): ParsedRouteInput {
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
async function runMiddleware(
  route: Route,
  context: RouteContext
): Promise<MiddlewareResult> {
  const stack = [...(route.middleware || [])];
  for (const middleware of stack) {
    if (typeof middleware !== "function") {
      continue;
    }
    const result = await middleware(context);
    if (result === false) {
      return { type: "abort" };
    }
    if (typeof result === "string") {
      return { type: "redirect", target: result };
    }
  }
  return { type: "allow" };
}

/* =========================================================
   ERROR RENDER
========================================================= */
function renderError(container: HTMLElement, message = "404 Not Found"): void {
  container.replaceChildren(
    createElement("h1", { class: "error-heading" }, [message])
  );
}

/* =========================================================
   RENDER INVOCATION
========================================================= */
function invokeRender(
  renderFn: RenderFunction,
  auth: boolean,
  params: RouteParams,
  container: HTMLElement,
  context: RouteContext
): Promise<void> | void {
  const hasParams = params && Object.keys(params).length > 0;
  if (hasParams) {
    return renderFn(auth, params, container, context);
  }
  return renderFn(auth, container, context);
}

/* =========================================================
   AUTH SNAPSHOT
========================================================= */
function getIsAuthenticated(): boolean {
  const state = getState() || {};
  const auth = state.auth || {};
  return Boolean(auth.isAuthenticated || auth.accessToken || state.token);
}

/* =========================================================
   MAIN ROUTER
========================================================= */
export async function render(
  rawPath: string,
  contentContainer: HTMLElement | null
): Promise<RenderResult> {
  if (!contentContainer) {
    throw new Error("Router received no content container.");
  }
  let parsed: ParsedRouteInput;
  try {
    parsed = parseRouteInput(rawPath);
  } catch (error) {
    console.error("Failed parsing route:", error);
    renderError(contentContainer, "400 Bad Request");
    return { status: "error" };
  }
  const { path: cleanPath, search, query, fullPath } = parsed;

  /* =======================================================
     ROUTE MATCH
  ======================================================= */
  let matchedRoute: Route | null = null;
  let routeParams: RouteParams = {};
  for (const route of (routes as Route[])) {
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
  const context: RouteContext = {
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
      const renderFn: RenderFunction = module[exportName] || module.default;
      if (typeof renderFn !== "function") {
        throw new Error(`Export '${exportName}' not found in component module.`);
      }
      contentContainer.replaceChildren();
      await invokeRender(renderFn, isLoggedIn, routeParams, contentContainer, context);
      setRouteModule(cleanPath, {
        render: (freshAuth, freshParams, container, freshContext) =>
          invokeRender(renderFn, freshAuth, freshParams, container, freshContext)
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
      error: error instanceof Error ? error.message : String(error)
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
export function safeArgBuilder(match: RegExpMatchArray | null): string[] {
  if (!match) {
    return [];
  }
  return match.slice(1).filter((value): value is string => value !== undefined);
}