import { apiConfig } from "../config/env.js";

export const {
  MAIN_URL, EMBED_URL, BANNERDROP_URL, API_URL, STRIPE_URL, AD_URL,
  SEARCH_URL, MERE_URL, MERE_WS, CHAT_URL, CHAT_WS, MUSIC_URL,
  LIVE_URL, SRC_URL, FILEDROP_URL, CHATDROP_URL
} = apiConfig;

// --- Allowed and persisted keys ---
const allowedKeys = new Set([
  "token", "user", "username", "userProfile", "socket", "roles", "permissions", "auth",
  "environment", "lang", "lastPath", "currentRoute", "routeCache", "routeState", 
  "currentChatId", "isLoading", "userId", "unreadMessages", "unreadNotifications"
]);

const PERSISTED_KEYS = new Set([
  "token", "userProfile", "user", "username", "roles", "permissions", "unreadMessages", "unreadNotifications"
]);

// --- Safe JSON parse ---
function safeParse(key) {
  try {
    const item = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!item) return null;
    return item.startsWith("{") || item.startsWith("[") ? JSON.parse(item) : item;
  } catch {
    return null;
  }
}

// --- Listeners ---
const listeners = new Map(); 
const deepListeners = new Map(); 

// --- Batched notifications ---
const notifyQueue = new Set();
let notifyPending = false;

function getValueByPath(path) {
  return path.split(".").reduce((acc, part) => acc?.[part], state);
}

function scheduleNotify(key) {
  notifyQueue.add(key);
  if (!notifyPending) {
    notifyPending = true;
    queueMicrotask(() => {
      for (const queueKey of notifyQueue) {
        const val = queueKey.includes(".") ? getValueByPath(queueKey) : state[queueKey];
        
        // 1. Top level listeners
        listeners.get(queueKey)?.forEach(fn => fn(val, state));

        // 2. Deep path processing
        for (const [path, fns] of deepListeners) {
          if (path === queueKey || path.startsWith(queueKey + ".") || queueKey.startsWith(path + ".")) {
            const deepVal = getValueByPath(path);
            fns.forEach(fn => fn(deepVal, state));
          }
        }
      }
      notifyQueue.clear();
      notifyPending = false;
    });
  }
}

// --- Deep Proxy Configuration ---
function createReactiveObject(obj, path = []) {
  if (obj instanceof Map || obj instanceof Set || obj === null || typeof obj !== "object") {
    return obj;
  }

  return new Proxy(obj, {
    get(target, prop) {
      if (typeof prop === "symbol") return target[prop];
      const val = target[prop];
      if (val && typeof val === "object" && !(val instanceof Map) && !(val instanceof Set)) {
        return createReactiveObject(val, path.concat(prop));
      }
      return val;
    },
    set(target, prop, value) {
      if (target[prop] === value) return true;

      target[prop] = value;
      const fullPath = path.concat(prop).join(".");
      
      scheduleNotify(fullPath);
      if (path.length > 0) {
        scheduleNotify(path[0]);
      }
      return true;
    },
    deleteProperty(target, prop) {
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

// --- Raw initial state ---
const initialToken = localStorage.getItem("token") || sessionStorage.getItem("token") || null;
const initialRoles = safeParse("roles") || [];
const initialPermissions = safeParse("permissions") || [];

const rawState = {
  token: initialToken,
  userProfile: safeParse("userProfile") || {},
  user: safeParse("user") || {},
  username: localStorage.getItem("username") || sessionStorage.getItem("username") || "",
  roles: Array.isArray(initialRoles) ? initialRoles : [initialRoles].filter(Boolean),
  permissions: Array.isArray(initialPermissions) ? initialPermissions : [],
  auth: {
    isAuthenticated: Boolean(initialToken),
    loading: false,
    roles: Array.isArray(initialRoles) ? initialRoles : [initialRoles].filter(Boolean),
    permissions: Array.isArray(initialPermissions) ? initialPermissions : []
  },
  socket: null,
  environment: {},
  lastPath: typeof window !== "undefined" ? window.location.pathname : "/",
  lang: "en",
  currentRoute: null,
  routeCache: new Map(),
  routeState: new Map(),
  currentChatId: null,
  userId: null,
  isLoading: false,
  unreadMessages: Number(safeParse("unreadMessages")) || 0,
  unreadNotifications: Number(safeParse("unreadNotifications")) || 0,
};

const state = createReactiveObject(rawState);

// --- Core state access ---
function getState(key) {
  if (!key) return { ...state };
  
  const rootKey = key.split(".")[0];
  if (!allowedKeys.has(rootKey)) {
    throw new Error(`Invalid state key: ${key}`);
  }

  return key.includes(".") ? getValueByPath(key) : state[key];
}

// --- Core state manipulation ---
function setState(keyOrObj, persistOrValue = false, maybeValue = undefined) {
  let persist = false;

  const updateSingleKey = (k, v) => {
    if (!allowedKeys.has(k)) throw new Error(`Invalid state key: ${k}`);
    if (k === "routeCache" || k === "routeState") return;

    state[k] = v;

    // Automatically sync composite `auth` state object when tokens or roles update
    if (k === "token" || k === "roles" || k === "permissions") {
      state.auth = {
        isAuthenticated: Boolean(state.token),
        loading: state.isLoading,
        roles: state.roles || [],
        permissions: state.permissions || []
      };
      scheduleNotify("auth");
    }

    if (persist && PERSISTED_KEYS.has(k)) {
      if (v === null || v === undefined) {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      } else {
        const str = typeof v === "string" ? v : JSON.stringify(v);
        sessionStorage.setItem(k, str);
        localStorage.setItem(k, str);
      }
    }
  };

  if (typeof keyOrObj === "object" && keyOrObj !== null) {
    persist = Boolean(persistOrValue);
    for (const [key, val] of Object.entries(keyOrObj)) {
      updateSingleKey(key, val);
    }
  } else {
    persist = Boolean(maybeValue);
    updateSingleKey(keyOrObj, persistOrValue);
  }
}

// --- Subscriptions ---
function subscribe(key, fn) {
  const rootKey = key.split(".")[0];
  if (!allowedKeys.has(rootKey)) throw new Error(`Cannot subscribe to invalid key: ${key}`);
  
  if (key.includes(".")) {
    return subscribeDeep(key, fn);
  }

  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);

  return () => unsubscribe(key, fn);
}

function unsubscribe(key, fn) {
  listeners.get(key)?.delete(fn);
  if (listeners.get(key)?.size === 0) listeners.delete(key);
}

function subscribeDeep(path, fn) {
  if (!deepListeners.has(path)) deepListeners.set(path, new Set());
  
  deepListeners.get(path).add(fn);
  return () => unsubscribeDeep(path, fn);
}

function unsubscribeDeep(path, fn) {
  deepListeners.get(path)?.delete(fn);
  if (deepListeners.get(path)?.size === 0) deepListeners.delete(path);
}

function clearAllListeners() {
  listeners.clear();
  deepListeners.clear();
}

/* =========================
   ROUTE CACHE & STATE
========================= */
function getRouteModule(path) { return state.routeCache.get(path); }
function setRouteModule(path, moduleData) { state.routeCache.set(path, moduleData); }
function hasRouteModule(path) { return state.routeCache.has(path); }

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
  if (state.routeState.get(path) === value) return;
  state.routeState.set(path, value);
  scheduleNotify("routeState");
}

/* =========================
   CLEAR STATE
========================= */
function clearState(preserveKeys = []) {
  const preserved = {};

  for (const key of preserveKeys) {
    if (PERSISTED_KEYS.has(key)) {
      const val = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (val !== null) preserved[key] = val;
    }
  }

  sessionStorage.clear();
  localStorage.clear();

  for (const key of allowedKeys) {
    if (preserveKeys.includes(key)) continue;

    if (key === "routeCache" || key === "routeState") {
      state[key].clear?.();
      continue;
    }

    state[key] = typeof rawState[key] === "number" ? 0 : Array.isArray(rawState[key]) ? [] : null;
  }

  // Reset derived auth state
  state.auth = {
    isAuthenticated: false,
    loading: false,
    roles: [],
    permissions: []
  };

  for (const [key, value] of Object.entries(preserved)) {
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
    try {
      state[key] = JSON.parse(value);
    } catch {
      state[key] = value;
    }
  }
}

/* =========================
   SCROLL & UTILS
========================= */
function saveScroll(container, routeKey) {
  if (!container || !routeKey) return;
  const key = typeof routeKey === "string" ? routeKey : window.location.pathname;
  const route = getRouteState(key);
  route.scrollY = container.scrollTop ?? container.scrollY ?? 0;
  route.scrollX = container.scrollLeft ?? container.scrollX ?? 0;
}

function restoreScroll(container, routeKey) {
  if (!container || !routeKey) return;
  const key = typeof routeKey === "string" ? routeKey : window.location.pathname;
  const route = state.routeState.get(key);
  if (route && ("scrollY" in route || "scrollX" in route)) {
    container.scrollTo({
      top: route.scrollY || 0,
      left: route.scrollX || 0,
      behavior: "instant"
    });
  }
}

function hasRole(...requiredRoles) {
  const currentRoles = state.roles || state.auth?.roles || [];
  if (!currentRoles.length) return false;
  return requiredRoles.some(r => currentRoles.includes(r));
}

function hasPermission(...requiredPermissions) {
  const currentPerms = state.permissions || state.auth?.permissions || [];
  if (!currentPerms.length) return false;
  return requiredPermissions.every(p => currentPerms.includes(p));
}

const isAdmin = () => hasRole("admin");
const getGlobalSnapshot = () => Object.freeze({ ...state });
const setLoading = (val) => setState("isLoading", val);

export {
  state, getState, setState, clearState, getGlobalSnapshot,
  subscribe, unsubscribe, subscribeDeep, unsubscribeDeep, clearAllListeners,
  saveScroll, restoreScroll,
  getRouteModule, setRouteModule, hasRouteModule, clearRouteCache,
  getRouteState, setRouteState,
  hasRole, hasPermission, isAdmin, setLoading
};