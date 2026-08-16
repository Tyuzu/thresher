import {
  apiConfig
} from "../config/env.js";
export const {
  MAIN_URL,
  EMBED_URL,
  BANNERDROP_URL,
  API_URL,
  STRIPE_URL,
  AD_URL,
  SEARCH_URL,
  MERE_URL,
  MERE_WS,
  CHAT_URL,
  CHAT_WS,
  MUSIC_URL,
  LIVE_URL,
  SRC_URL,
  FILEDROP_URL,
  CHATDROP_URL
} = apiConfig;
/* =========================================================
   ALLOWED STATE
========================================================= */
const allowedKeys = new Set(["token", "user", "username", "userProfile", "socket", "roles", "permissions", "auth", "environment", "lang", "lastPath", "currentRoute", "routeCache", "routeState", "currentChatId", "isLoading", "userId", "unreadMessages", "unreadNotifications"]);
const PERSISTED_KEYS = new Set(["token", "userProfile", "user", "username", "roles", "permissions", "unreadMessages", "unreadNotifications"]);
/* =========================================================
   SAFE STORAGE
========================================================= */
function readStorage(key) {
  try {
    return (sessionStorage.getItem(key) ?? localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
      return;
    }
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    sessionStorage.setItem(key, serialized);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.warn(`Failed persisting state key "${key}":`, error);
  }
}

function removeStorage(key) {
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function safeParse(key) {
  try {
    const item = readStorage(key);
    if (!item) {
      return null;
    }
    if (item.startsWith("{") || item.startsWith("[")) {
      return JSON.parse(item);
    }
    return item;
  } catch {
    return null;
  }
}
/* =========================================================
   LISTENERS
========================================================= */
const listeners = new Map();
const deepListeners = new Map();
const notifyQueue = new Set();
let notifyPending = false;

function getValueByPath(path) {
  return path.split(".").reduce(
    (acc, part) => acc?.[part], state);
}

function scheduleNotify(key) {
  notifyQueue.add(key);
  if (notifyPending) {
    return;
  }
  notifyPending = true;
  queueMicrotask(() => {
    try {
      for (const queueKey of notifyQueue) {
        const value = queueKey.includes(".") ? getValueByPath(queueKey) : state[queueKey];
        listeners.get(queueKey)?.forEach((fn) => {
          try {
            fn(value, state);
          } catch (error) {
            console.error("State listener failed:", error);
          }
        });
        for (const [
          path,
          fns
        ] of deepListeners) {
          if (path === queueKey || path.startsWith(queueKey + ".") || queueKey.startsWith(path + ".")) {
            const deepValue = getValueByPath(path);
            fns.forEach(
              (fn) => {
                try {
                  fn(deepValue, state);
                } catch (error) {
                  console.error("Deep state listener failed:", error);
                }
              });
          }
        }
      }
    } finally {
      notifyQueue.clear();
      notifyPending = false;
    }
  });
}
/* =========================================================
   REACTIVE OBJECT
========================================================= */
function createReactiveObject(obj, path = []) {
  if (obj === null || typeof obj !== "object" || obj instanceof Map || obj instanceof Set) {
    return obj;
  }
  return new Proxy(obj, {
    get(target, prop) {
      if (typeof prop === "symbol") {
        return target[prop];
      }
      const value = target[prop];
      if (value && typeof value === "object" && !(value instanceof Map) && !(value instanceof Set)) {
        return createReactiveObject(value, path.concat(prop));
      }
      return value;
    },
    set(target, prop, value) {
      if (target[prop] === value) {
        return true;
      }
      target[prop] = value;
      const fullPath = path.concat(prop).join(".");
      scheduleNotify(fullPath);
      if (path.length > 0) {
        scheduleNotify(path[0]);
      }
      return true;
    },
    deleteProperty(target, prop) {
      if (!(prop in target)) {
        return true;
      }
      delete target[prop];
      const fullPath = path.concat(prop).join(".");
      scheduleNotify(fullPath);
      if (path.length > 0) {
        scheduleNotify(path[0]);
      }
      return true;
    }
  });
}
/* =========================================================
   INITIAL STATE
========================================================= */
const initialToken = readStorage("token");
const initialRolesRaw = safeParse("roles");
const initialPermissionsRaw = safeParse("permissions");
const initialRoles = Array.isArray(initialRolesRaw) ? initialRolesRaw : initialRolesRaw ? [initialRolesRaw] : [];
const initialPermissions = Array.isArray(initialPermissionsRaw) ? initialPermissionsRaw : initialPermissionsRaw ? [initialPermissionsRaw] : [];
const initialUser = safeParse("user");
const initialProfile = safeParse("userProfile");
const rawState = {
  token: initialToken || null,
  user: initialUser || null,
  username: readStorage("username") || "",
  userProfile: initialProfile || {},
  socket: null,
  roles: initialRoles,
  permissions: initialPermissions,
  auth: {
    isAuthenticated: Boolean(initialToken),
    loading: false,
    accessToken: initialToken || null,
    user: initialUser || null,
    roles: initialRoles,
    permissions: initialPermissions
  },
  environment: {},
  lastPath: typeof window !== "undefined" ? window.location.pathname : "/",
  lang: "en",
  currentRoute: null,
  routeCache: new Map(),
  routeState: new Map(),
  currentChatId: null,
  isLoading: false,
  userId: null,
  unreadMessages: Number(safeParse("unreadMessages")) || 0,
  unreadNotifications: Number(safeParse("unreadNotifications")) || 0
};
const state = createReactiveObject(rawState);
/* =========================================================
   AUTH SYNC
========================================================= */
function syncAuthState() {
  const currentAuth = state.auth || {};
  state.auth = {
    ...currentAuth,
    isAuthenticated: Boolean(state.token),
    accessToken: state.token || null,
    user: state.user || currentAuth.user || null,
    loading: state.isLoading,
    roles: Array.isArray(state.roles) ? state.roles : [],
    permissions: Array.isArray(state.permissions) ? state.permissions : []
  };
  scheduleNotify("auth");
}
/* =========================================================
   GET STATE
========================================================= */
function getState(key) {
  if (!key) {
    return {
      ...state
    };
  }
  const rootKey = key.split(".")[0];
  if (!allowedKeys.has(rootKey)) {
    throw new Error(`Invalid state key: ${key}`);
  }
  return key.includes(".") ? getValueByPath(key) : state[key];
}
/* =========================================================
   SET STATE
========================================================= */
function setState(keyOrObject, persistOrValue = false, maybeValue = undefined) {
  let persist = false;
  const updateSingleKey = (key, value) => {
    if (!allowedKeys.has(key)) {
      throw new Error(`Invalid state key: ${key}`);
    }
    if (key === "routeCache" || key === "routeState") {
      return;
    }
    state[key] = value;
    if (key === "token" || key === "user" || key === "roles" || key === "permissions" || key === "isLoading") {
      syncAuthState();
    }
    if (persist && PERSISTED_KEYS.has(key)) {
      writeStorage(key, value);
    }
  };
  if (typeof keyOrObject === "object" && keyOrObject !== null) {
    persist = Boolean(persistOrValue);
    for (const [
      key,
      value
    ] of Object.entries(keyOrObject)) {
      updateSingleKey(key, value);
    }
  } else {
    persist = Boolean(maybeValue);
    updateSingleKey(keyOrObject, persistOrValue);
  }
}
/* =========================================================
   SUBSCRIPTIONS
========================================================= */
function subscribe(key, fn) {
  const rootKey = key.split(".")[0];
  if (!allowedKeys.has(rootKey)) {
    throw new Error(`Cannot subscribe to invalid key: ${key}`);
  }
  if (key.includes(".")) {
    return subscribeDeep(key, fn);
  }
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(fn);
  return () => unsubscribe(key, fn);
}

function unsubscribe(key, fn) {
  listeners.get(key)?.delete(fn);
  if (listeners.get(key)?.size === 0) {
    listeners.delete(key);
  }
}

function subscribeDeep(path, fn) {
  if (!deepListeners.has(path)) {
    deepListeners.set(path, new Set());
  }
  deepListeners.get(path).add(fn);
  return () => unsubscribeDeep(path, fn);
}

function unsubscribeDeep(path, fn) {
  deepListeners.get(path)?.delete(fn);
  if (deepListeners.get(path)?.size === 0) {
    deepListeners.delete(path);
  }
}

function clearAllListeners() {
  listeners.clear();
  deepListeners.clear();
}
/* =========================================================
   ROUTE CACHE / STATE
========================================================= */
function getRouteModule(path) {
  return state.routeCache.get(path);
}

function setRouteModule(path, moduleData) {
  state.routeCache.set(path, moduleData);
}

function hasRouteModule(path) {
  return state.routeCache.has(path);
}

function clearRouteCache() {
  state.routeCache.clear();
  state.routeState.clear();
  scheduleNotify("routeCache");
  scheduleNotify("routeState");
}

function getRouteState(path) {
  let route = state.routeState.get(path);
  if (!route) {
    route = Object.create(null);
    state.routeState.set(path, route);
  }
  return route;
}

function setRouteState(path, value) {
  if (state.routeState.get(path) === value) {
    return;
  }
  state.routeState.set(path, value);
  scheduleNotify("routeState");
}
/* =========================================================
   CLEAR AUTH / STATE
========================================================= */
function clearState(preserveKeys = []) {
  const preserved = {};
  for (const key of preserveKeys) {
    if (PERSISTED_KEYS.has(key)) {
      const value = readStorage(key);
      if (value !== null) {
        preserved[key] = value;
      }
    }
  }
  /*
   * IMPORTANT:
   *
   * Do not call localStorage.clear().
   * Other parts of the application may own
   * keys such as feature flags, UI preferences,
   * environment caches, etc.
   */
  for (const key of PERSISTED_KEYS) {
    if (preserveKeys.includes(key)) {
      continue;
    }
    removeStorage(key);
  }
  for (const key of Object.keys(rawState)) {
    if (preserveKeys.includes(key)) {
      continue;
    }
    if (key === "routeCache" || key === "routeState") {
      state[key].clear();
      continue;
    }
    if (key === "roles" || key === "permissions") {
      state[key] = [];
      continue;
    }
    if (key === "userProfile") {
      state[key] = {};
      continue;
    }
    if (key === "auth") {
      continue;
    }
    if (typeof rawState[key] === "number") {
      state[key] = 0;
    } else if (typeof rawState[key] === "boolean") {
      state[key] = false;
    } else {
      state[key] = null;
    }
  }
  state.username = "";
  state.token = null;
  state.user = null;
  state.roles = [];
  state.permissions = [];
  state.userProfile = {};
  state.auth = {
    isAuthenticated: false,
    loading: false,
    accessToken: null,
    user: null,
    roles: [],
    permissions: []
  };
  scheduleNotify("auth");
  for (const [
    key,
    value
  ] of Object.entries(preserved)) {
    try {
      const parsed = value.startsWith("{") || value.startsWith("[") ? JSON.parse(value) : value;
      state[key] = parsed;
    } catch {
      state[key] = value;
    }
  }
  syncAuthState();
}
/* =========================================================
   SCROLL
========================================================= */
function saveScroll(container, routeKey) {
  if (!container || !routeKey) {
    return;
  }
  const key = typeof routeKey === "string" ? routeKey : window.location.pathname;
  const route = getRouteState(key);
  route.scrollY = container.scrollTop ?? 0;
  route.scrollX = container.scrollLeft ?? 0;
}

function restoreScroll(container, routeKey) {
  if (!container || !routeKey) {
    return;
  }
  const key = typeof routeKey === "string" ? routeKey : window.location.pathname;
  const route = state.routeState.get(key);
  if (!route || (!("scrollY" in route) && !("scrollX" in route))) {
    return;
  }
  const top = route.scrollY || 0;
  const left = route.scrollX || 0;
  if (typeof container.scrollTo === "function") {
    container.scrollTo({
      top,
      left,
      behavior: "auto"
    });
  } else {
    container.scrollTop = top;
    container.scrollLeft = left;
  }
}
/* =========================================================
   AUTH HELPERS
========================================================= */
function hasRole(...requiredRoles) {
  const currentRoles = Array.isArray(state.roles) ? state.roles : Array.isArray(state.auth?.roles) ? state.auth.roles : [];
  if (currentRoles.length === 0) {
    return false;
  }
  return requiredRoles.some(
    (role) => currentRoles.includes(role));
}

function hasPermission(...requiredPermissions) {
  const currentPermissions = Array.isArray(state.permissions) ? state.permissions : Array.isArray(state.auth?.permissions) ? state.auth.permissions : [];
  if (currentPermissions.length === 0) {
    return false;
  }
  return requiredPermissions.every(
    (permission) => currentPermissions.includes(permission));
}
const isAdmin = () => hasRole("admin");
const getGlobalSnapshot = () => Object.freeze({
  ...state
});
const setLoading = (value) => {
  setState("isLoading", Boolean(value));
};
/* =========================================================
   EXPORTS
========================================================= */
export {
  state,
  getState,
  setState,
  clearState,
  getGlobalSnapshot,
  subscribe,
  unsubscribe,
  subscribeDeep,
  unsubscribeDeep,
  clearAllListeners,
  saveScroll,
  restoreScroll,
  getRouteModule,
  setRouteModule,
  hasRouteModule,
  clearRouteCache,
  getRouteState,
  setRouteState,
  hasRole,
  hasPermission,
  isAdmin,
  setLoading
};