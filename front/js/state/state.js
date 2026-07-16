import { apiConfig } from "../config/env.js";

export const webSiteName = "Farmium";

export const {
  MAIN_URL, EMBED_URL, BANNERDROP_URL, API_URL, STRIPE_URL, AD_URL,
  SEARCH_URL, MERE_URL, MERE_WS, CHAT_URL, CHAT_WS, MUSIC_URL,
  LIVE_URL, SRC_URL, FILEDROP_URL, CHATDROP_URL
} = apiConfig;

// --- Allowed and persisted keys ---
const allowedKeys = new Set([
  "token", "user", "username", "userProfile", "socket", "role", "environment",
  "lang", "lastPath", "currentRoute", "routeCache", "routeState", "currentChatId", 
  "isLoading", "userId", "unreadMessages", "unreadNotifications"
]);

const PERSISTED_KEYS = new Set(["token", "userProfile", "user", "username", "role", "unreadMessages", "unreadNotifications"]);

// --- Safe JSON parse ---
function safeParse(key) {
  try {
    const item = localStorage.getItem(key) || sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
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

function scheduleNotify(key, value) {
  notifyQueue.add(key);
  if (!notifyPending) {
    notifyPending = true;
    queueMicrotask(() => { // Using microtask instead of animation frame for faster, snappy UI states
      for (const queueKey of notifyQueue) {
        const val = queueKey.includes(".") ? getValueByPath(queueKey) : state[queueKey];
        
        // 1. Top level listeners
        listeners.get(queueKey)?.forEach(fn => fn(val));

        // 2. Deep path processing
        for (const [path, fns] of deepListeners) {
          if (path === queueKey || path.startsWith(queueKey + ".")) {
            const deepVal = getValueByPath(path);
            fns.forEach(fn => fn(deepVal));
          }
        }
      }
      notifyQueue.clear();
      notifyPending = false;
    });
  }
}

// --- Lean Deep Proxy Configuration ---
function createReactiveObject(obj, path = []) {
  if (obj instanceof Map || obj instanceof Set || obj === null || typeof obj !== "object") {
    return obj;
  }

  return new Proxy(obj, {
    get(target, prop) {
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
      
      scheduleNotify(fullPath, value);
      if (path.length > 0) {
        scheduleNotify(path[0], target);
      }
      return true;
    },
    deleteProperty(target, prop) {
      delete target[prop];
      const fullPath = path.concat(prop).join(".");
      scheduleNotify(fullPath);
      if (path.length > 0) {
        scheduleNotify(path[0], target);
      }
      return true;
    }
  });
}

// --- Initialize reactive state ---
const rawState = {
  token: localStorage.getItem("token") || sessionStorage.getItem("token") || null,
  userProfile: safeParse("userProfile") || {},
  user: safeParse("user") || {},
  lastPath: window.location.pathname,
  lang: "en",
  currentRoute: null,
  routeCache: new Map(),
  routeState: new Map(),
  isLoading: false,
  unreadMessages: 0,
  unreadNotifications: 0,
};
const state = createReactiveObject(rawState);

// --- Core state functions ---
function getState(key) {
  if (!allowedKeys.has(key)) throw new Error(`Invalid state key: ${key}`);
  return state[key];
}

// --- State manipulation ---
function setState(keyOrObj, persist = false, value = undefined) {
  if (typeof keyOrObj === "object" && keyOrObj !== null) {
    for (const [key, val] of Object.entries(keyOrObj)) {
      if (!allowedKeys.has(key)) throw new Error(`Invalid state key: ${key}`);
      if (key === "routeCache" || key === "routeState") continue;
      
      state[key] = val;

      if (persist && PERSISTED_KEYS.has(key)) {
        const str = typeof val === "string" ? val : JSON.stringify(val);
        sessionStorage.setItem(key, str);
        localStorage.setItem(key, str);
      }
    }
    return;
  }

  const key = keyOrObj;
  if (!allowedKeys.has(key)) throw new Error(`Invalid state key: ${key}`);
  if (key === "routeCache" || key === "routeState") return;

  state[key] = value;

  if (persist && PERSISTED_KEYS.has(key)) {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    sessionStorage.setItem(key, str);
    localStorage.setItem(key, str);
  }
}

// --- Subscriptions with automatic cleanup ---
function subscribe(key, fn) {
  if (!allowedKeys.has(key)) throw new Error(`Cannot subscribe to invalid key: ${key}`);
  if (!listeners.has(key)) listeners.set(key, new Set());
  
  listeners.get(key).add(fn);
  return () => {
    listeners.get(key)?.delete(fn);
    if (listeners.get(key)?.size === 0) listeners.delete(key);
  };
}

function unsubscribe(key, fn) {
  listeners.get(key)?.delete(fn);
  if (listeners.get(key)?.size === 0) listeners.delete(key);
}

function subscribeDeep(path, fn) {
  if (!deepListeners.has(path)) deepListeners.set(path, new Set());
  
  deepListeners.get(path).add(fn);
  return () => {
    deepListeners.get(path)?.delete(fn);
    if (deepListeners.get(path)?.size === 0) deepListeners.delete(path);
  };
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
function setRouteModule(path, module) { state.routeCache.set(path, module); }
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

    if (state[key] !== null) {
      state[key] = null;
    }
  }

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
function saveScroll(container, scrollState) {
  if (scrollState) scrollState.scrollY = container?.scrollTop ?? 0;
}

function restoreScroll(container, scrollState) {
  if (container && scrollState && "scrollY" in scrollState) {
    container.scrollTop = scrollState.scrollY;
  }
}

function hasRole(...roles) {
  const current = state.userProfile?.role;
  if (!current) return false;
  return roles.some(r => (Array.isArray(current) ? current : [current]).includes(r));
}

const isAdmin = () => hasRole("admin");
const getGlobalSnapshot = () => Object.freeze({ ...state });
const setLoading = (val) => setState("isLoading", false, val);

export {
  state, getState, setState, clearState, getGlobalSnapshot,
  subscribe, unsubscribe, subscribeDeep, unsubscribeDeep, clearAllListeners,
  saveScroll, restoreScroll,
  getRouteModule, setRouteModule, hasRouteModule, clearRouteCache,
  getRouteState, setRouteState,
  hasRole, isAdmin, setLoading
};