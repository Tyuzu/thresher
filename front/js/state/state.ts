import {
    apiConfig
} from "../config/env.ts";
/* =========================================================
   API CONFIG EXPORTS
========================================================= */
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
   STATE KEYS
========================================================= */
const allowedKeys = new Set([
    "token", "user", "username", "userProfile", "socket", 
    "roles", "permissions", "auth", "environment", "lang", 
    "lastPath", "currentRoute", "routeCache", "routeState", 
    "currentChatId", "isLoading", "userid", "unreadMessages", 
    "unreadNotifications"
]);

const PERSISTED_KEYS = new Set([
    "userProfile", "user", "roles", "permissions", 
    "unreadMessages", "unreadNotifications"
]);

const SESSION_KEYS = new Set(["token"]);

const AUTH_ALIAS_KEYS = new Set([
    "token", "user", "roles", "permissions", "username", "userid"
]);

const ROUTE_CACHE_KEY = "routeCache";
const ROUTE_STATE_KEY = "routeState";

/* =========================================================
   STORAGE
========================================================= */
function readSessionStorage(key) {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function readLocalStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function readStorage(key) {
    if (SESSION_KEYS.has(key)) {
        return readSessionStorage(key);
    }
    return readLocalStorage(key);
}

function serializeValue(value) {
    if (typeof value === "string") {
        return value;
    }
    try {
        return JSON.stringify(value);
    } catch (error) {
        console.warn(`[STATE] Unable to serialize state key "${String(error)}":`, error);
        return null;
    }
}

function writeSessionStorage(key, value) {
    try {
        if (value === null || value === undefined) {
            sessionStorage.removeItem(key);
            return true;
        }
        const serialized = serializeValue(value);
        if (serialized === null) {
            return false;
        }
        sessionStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        console.warn(`[STATE] Failed writing session key "${key}":`, error);
        return false;
    }
}

function writeLocalStorage(key, value) {
    try {
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
            return true;
        }
        const serialized = serializeValue(value);
        if (serialized === null) {
            return false;
        }
        localStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        console.warn(`[STATE] Failed writing persistent key "${key}":`, error);
        return false;
    }
}

function writeStorage(key, value) {
    if (SESSION_KEYS.has(key)) {
        return writeSessionStorage(key, value);
    }
    if (PERSISTED_KEYS.has(key)) {
        return writeLocalStorage(key, value);
    }
    return false;
}

function removeStorage(key) {
    try {
        sessionStorage.removeItem(key);
    } catch {
        // Ignore
    }
    try {
        localStorage.removeItem(key);
    } catch {
        // Ignore
    }
}

function safeParseFromStorage(key, fallback = null) {
    const raw = readStorage(key);
    if (raw === null || raw === "") {
        return fallback;
    }
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

function readPersistentJSON(key, fallback = null) {
    const raw = readLocalStorage(key);
    if (raw === null || raw === "") {
        return fallback;
    }
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function readPersistentNumber(key, fallback = 0) {
    const value = readPersistentJSON(key, fallback);
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

/* =========================================================
   LEGACY TOKEN MIGRATION
========================================================= */
function migrateLegacyToken() {
    const sessionToken = readSessionStorage("token");
    const localToken = readLocalStorage("token");
    if (!sessionToken && localToken) {
        try {
            sessionStorage.setItem("token", localToken);
        } catch (error) {
            console.warn("[AUTH] Unable to migrate legacy token:", error);
        }
    }
    try {
        localStorage.removeItem("token");
    } catch {
        // Ignore.
    }
}
migrateLegacyToken();

/* =========================================================
   ROUTE CACHE & SCROLL STATE
========================================================= */
const routeCache = new Map();
const routeState = new Map();
const scrollPositions = new Map();

export function saveScroll(container, location) {
    if (!container) return;
    scrollPositions.set(location, {
        top: container.scrollTop || window.scrollY || 0,
        left: container.scrollLeft || window.scrollX || 0
    });
}

export function restoreScroll(container, location) {
    if (!container) return;
    const pos = scrollPositions.get(location);
    if (pos) {
        if (container === document.body || container === document.documentElement) {
            window.scrollTo(pos.left, pos.top);
        } else {
            container.scrollTop = pos.top;
            container.scrollLeft = pos.left;
        }
    } else {
        container.scrollTop = 0;
        window.scrollTo(0, 0);
    }
}

/* =========================================================
   LISTENERS
========================================================= */
const listeners = new Map();
const deepListeners = new Map();
const notifyQueue = new Set();
let notifyPending = false;

/* =========================================================
   PATH ACCESS
========================================================= */
function getValueByPath(path, source = state) {
    if (!path) {
        return source;
    }
    return path.split(".").reduce(
        (current, part) => current?.[part], source);
}

/* =========================================================
   NOTIFICATION QUEUE
========================================================= */
function scheduleNotify(key) {
    if (!key) {
        return;
    }
    notifyQueue.add(key);
    if (notifyPending) {
        return;
    }
    notifyPending = true;
    queueMicrotask(() => {
        try {
            const queuedKeys = new Set(notifyQueue);

            for (const queueKey of queuedKeys) {
                const value = queueKey.includes(".") ? getValueByPath(queueKey) : getStateValue(queueKey);
                const fns = listeners.get(queueKey);
                if (!fns) {
                    continue;
                }
                for (const fn of [...fns]) {
                    try {
                        fn(value, state);
                    } catch (error) {
                        console.error("[STATE] State listener failed:", error);
                    }
                }
            }

            const deepCalls = new Map();
            for (const [path, fns] of deepListeners) {
                let affected = false;
                for (const queueKey of queuedKeys) {
                    if (queueKey === path || queueKey.startsWith(`${path}.`) || path.startsWith(`${queueKey}.`)) {
                        affected = true;
                        break;
                    }
                }
                if (!affected) {
                    continue;
                }
                deepCalls.set(path, new Set(fns));
            }

            for (const [path, fns] of deepCalls) {
                const value = getValueByPath(path);
                for (const fn of fns) {
                    try {
                        fn(value, state);
                    } catch (error) {
                        console.error("[STATE] Deep state listener failed:", error);
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
   AUTH NORMALIZATION
========================================================= */
function normalizeRoles(roles) {
    if (!Array.isArray(roles)) {
        return roles == null ? [] : [roles];
    }
    return [...new Set(roles.filter(
        (role) => role !== null && role !== undefined && String(role).length > 0))];
}

function normalizePermissions(permissions) {
    if (!Array.isArray(permissions)) {
        return permissions == null ? [] : [permissions];
    }
    return [...new Set(permissions.filter(
        (permission) => permission !== null && permission !== undefined && String(permission).length > 0))];
}

function normalizeAuth(authValue = {}, previousAuth = {}) {
    const source = authValue && typeof authValue === "object" ? authValue : {};
    const previous = previousAuth && typeof previousAuth === "object" ? previousAuth : {};
    const accessToken = Object.prototype.hasOwnProperty.call(source, "accessToken") ? source.accessToken || null : previous.accessToken || null;
    const user = Object.prototype.hasOwnProperty.call(source, "user") ? source.user || null : previous.user || null;
    const roles = normalizeRoles(Object.prototype.hasOwnProperty.call(source, "roles") ? source.roles : previous.roles);
    const permissions = normalizePermissions(Object.prototype.hasOwnProperty.call(source, "permissions") ? source.permissions : previous.permissions);
    
    return {
        isAuthenticated: Object.prototype.hasOwnProperty.call(source, "isAuthenticated") ? Boolean(accessToken || source.isAuthenticated) : Boolean(accessToken),
        loading: Object.prototype.hasOwnProperty.call(source, "loading") ? Boolean(source.loading) : Boolean(previous.loading),
        accessToken,
        user,
        roles,
        permissions
    };
}

/* =========================================================
   INITIAL STATE
========================================================= */
const initialToken = readSessionStorage("token");
const initialUser = readPersistentJSON("user", null);
const initialProfile = readPersistentJSON("userProfile", {});
const initialRoles = normalizeRoles(readPersistentJSON("roles", []));
const initialPermissions = normalizePermissions(readPersistentJSON("permissions", []));
const initialUnreadMessages = readPersistentNumber("unreadMessages", 0);
const initialUnreadNotifications = readPersistentNumber("unreadNotifications", 0);

const initialAuth = normalizeAuth({
    accessToken: initialToken || null,
    user: initialUser || null,
    roles: initialRoles,
    permissions: initialPermissions,
    isAuthenticated: Boolean(initialToken),
    loading: false
});

const rawState = {
    auth: initialAuth,
    userProfile: initialProfile && typeof initialProfile === "object" ? initialProfile : {},
    socket: null,
    environment: {},
    lang: "en",
    lastPath: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
    currentRoute: null,
    routeCache,
    routeState,
    currentChatId: null,
    isLoading: false,
    unreadMessages: initialUnreadMessages,
    unreadNotifications: initialUnreadNotifications
};

/* =========================================================
   AUTH ALIAS HELPERS
========================================================= */
function getAuthAlias(key) {
    switch (key) {
        case "token":
            return (rawState.auth?.accessToken || null);
        case "user":
            return (rawState.auth?.user || null);
        case "roles":
            return Array.isArray(rawState.auth?.roles) ? rawState.auth.roles : [];
        case "permissions":
            return Array.isArray(rawState.auth?.permissions) ? rawState.auth.permissions : [];
        case "username": {
            const user = rawState.auth?.user;
            if (user && typeof user === "object") {
                return (user?.username ?? user?.name ?? "");
            }
            return typeof user === "string" ? user : "";
        }
        case "userid": {
            const user = rawState.auth?.user;
            if (user && typeof user === "object") {
                return (user?.id ?? user?.userid ?? null);
            }
            return null;
        }
        default:
            return undefined;
    }
}

function updateAuthUserProperty(property, value) {
    const currentUser = rawState.auth?.user;
    if (currentUser && typeof currentUser === "object" && !Array.isArray(currentUser)) {
        rawState.auth.user = {
            ...currentUser,
            [property]: value
        };
    } else {
        rawState.auth.user = {
            [property]: value
        };
    }
}

function setAuthAlias(key, value) {
    const currentAuth = rawState.auth;
    switch (key) {
        case "token": {
            const token = value || null;
            rawState.auth = normalizeAuth({
                ...currentAuth,
                accessToken: token,
                isAuthenticated: Boolean(token)
            }, currentAuth);
            scheduleNotify("token");
            scheduleNotify("auth");
            break;
        }
        case "user": {
            rawState.auth = normalizeAuth({
                ...currentAuth,
                user: value || null
            }, currentAuth);
            scheduleNotify("user");
            scheduleNotify("username");
            scheduleNotify("userid");
            scheduleNotify("auth");
            break;
        }
        case "roles": {
            rawState.auth = normalizeAuth({
                ...currentAuth,
                roles: normalizeRoles(value)
            }, currentAuth);
            scheduleNotify("roles");
            scheduleNotify("auth");
            break;
        }
        case "permissions": {
            rawState.auth = normalizeAuth({
                ...currentAuth,
                permissions: normalizePermissions(value)
            }, currentAuth);
            scheduleNotify("permissions");
            scheduleNotify("auth");
            break;
        }
        case "username": {
            updateAuthUserProperty("username", value ?? "");
            scheduleNotify("username");
            scheduleNotify("user");
            scheduleNotify("auth.user");
            scheduleNotify("auth");
            break;
        }
        case "userid": {
            updateAuthUserProperty("userid", value ?? null);
            scheduleNotify("userid");
            scheduleNotify("user");
            scheduleNotify("auth.user");
            scheduleNotify("auth");
            break;
        }
        default:
            break;
    }
}

/* =========================================================
   REACTIVE PROXY
========================================================= */
const proxyCache = new WeakMap();

function getCachedProxy(target, path) {
    let pathMap = proxyCache.get(target);
    if (!pathMap) {
        pathMap = new Map();
        proxyCache.set(target, pathMap);
    }
    const pathKey = path.join(".");
    const existing = pathMap.get(pathKey);
    if (existing) {
        return existing;
    }
    const proxy = createReactiveObject(target, path);
    pathMap.set(pathKey, proxy);
    return proxy;
}

function isObjectLike(value) {
    return (value !== null && typeof value === "object");
}

function shouldProxy(value) {
    return (isObjectLike(value) && !(value instanceof Map) && !(value instanceof Set) && !(value instanceof Date) && !(value instanceof RegExp));
}

function createReactiveObject(obj, path = []) {
    if (!shouldProxy(obj)) {
        return obj;
    }
    return new Proxy(obj, {
        get(target, prop, receiver) {
            const key = String(prop);
            if (path.length === 0 && AUTH_ALIAS_KEYS.has(key)) {
                return getAuthAlias(key);
            }
            const value = Reflect.get(target, prop, receiver);
            if (shouldProxy(value)) {
                return getCachedProxy(value, path.concat(String(prop)));
            }
            return value;
        },
        set(target, prop, value, receiver) {
            const key = String(prop);
            if (path.length === 0 && AUTH_ALIAS_KEYS.has(key)) {
                setAuthAlias(key, value);
                return true;
            }
            if (path.length === 0 && key === "auth") {
                const previous = target.auth;
                target.auth = normalizeAuth(value, previous);
                scheduleNotify("auth");
                scheduleNotify("token");
                scheduleNotify("user");
                scheduleNotify("username");
                scheduleNotify("userid");
                scheduleNotify("roles");
                scheduleNotify("permissions");
                return true;
            }
            if (path.length === 0 && key === "isLoading") {
                const changed = target[key] !== Boolean(value);
                if (!changed) {
                    return true;
                }
                Reflect.set(target, prop, Boolean(value), receiver);
                target.auth = normalizeAuth({
                    ...target.auth,
                    loading: Boolean(value)
                }, target.auth);
                scheduleNotify("isLoading");
                scheduleNotify("auth");
                return true;
            }
            const oldValue = Reflect.get(target, prop, receiver);
            if (Object.is(oldValue, value)) {
                return true;
            }
            const result = Reflect.set(target, prop, value, receiver);
            if (!result) {
                return false;
            }
            const fullPath = path.concat(key).join(".");
            scheduleNotify(fullPath);
            if (path.length > 0) {
                scheduleNotify(path[0]);
            }
            if (path[0] === "auth") {
                if (path[1] === "user") {
                    scheduleNotify("user");
                    scheduleNotify("username");
                    scheduleNotify("userid");
                }
                if (path[1] === "accessToken") {
                    scheduleNotify("token");
                }
                if (path[1] === "roles") {
                    scheduleNotify("roles");
                }
                if (path[1] === "permissions") {
                    scheduleNotify("permissions");
                }
            }
            return true;
        },
        deleteProperty(target, prop) {
            const key = String(prop);
            if (path.length === 0 && AUTH_ALIAS_KEYS.has(key)) {
                setAuthAlias(key, null);
                return true;
            }
            if (!Object.prototype.hasOwnProperty.call(target, prop)) {
                return true;
            }
            const deleted = Reflect.deleteProperty(target, prop);
            if (!deleted) {
                return false;
            }
            const fullPath = path.concat(key).join(".");
            scheduleNotify(fullPath);
            if (path.length > 0) {
                scheduleNotify(path[0]);
            }
            return true;
        }
    });
}

/* =========================================================
   CREATE PUBLIC STATE
========================================================= */
const state = getCachedProxy(rawState, []);

/* =========================================================
   PUBLIC STATE READ
========================================================= */
function getStateValue(key) {
    if (AUTH_ALIAS_KEYS.has(key)) {
        return getAuthAlias(key);
    }
    if (key === ROUTE_CACHE_KEY) {
        return routeCache;
    }
    if (key === ROUTE_STATE_KEY) {
        return routeState;
    }
    return state[key];
}

/* =========================================================
   SET STATE
========================================================= */
function persistStateKey(key, value) {
    if (SESSION_KEYS.has(key)) {
        writeSessionStorage(key, value);
        return;
    }
    if (PERSISTED_KEYS.has(key)) {
        writeLocalStorage(key, value);
    }
}

function broadcastAuthChange(reason = "updated") {
    try {
        localStorage.setItem("auth:changed", JSON.stringify({
            reason,
            ts: Date.now()
        }));
        localStorage.removeItem("auth:changed");
    } catch {
        // Ignore
    }
}

function setAuthState(value, persist = false) {
    const previous = rawState.auth;
    const next = normalizeAuth(value, previous);
    rawState.auth = next;
    scheduleNotify("auth");
    scheduleNotify("token");
    scheduleNotify("user");
    scheduleNotify("username");
    scheduleNotify("userid");
    scheduleNotify("roles");
    scheduleNotify("permissions");
    if (persist) {
        persistStateKey("token", next.accessToken);
        persistStateKey("user", next.user);
        persistStateKey("roles", next.roles);
        persistStateKey("permissions", next.permissions);
        broadcastAuthChange(next.isAuthenticated ? "login" : "logout");
    }
}

function setState(keyOrObject, persistOrValue = false, maybeValue = undefined) {
    const updates = typeof keyOrObject === "object" && keyOrObject !== null ? keyOrObject : {
        [keyOrObject]: persistOrValue
    };
    const persist = typeof keyOrObject === "object" && keyOrObject !== null ? Boolean(persistOrValue) : Boolean(maybeValue);
    
    const authUpdates = {};
    let hasAuthUpdate = false;

    for (const [key, value] of Object.entries(updates)) {
        if (!allowedKeys.has(key)) {
            throw new Error(`Invalid state key:${key}`);
        }
        if (key === ROUTE_CACHE_KEY || key === ROUTE_STATE_KEY) {
            throw new Error(`${key} is read-only. Use dedicated route cache helpers.`);
        }
        if (AUTH_ALIAS_KEYS.has(key)) {
            hasAuthUpdate = true;
            switch (key) {
                case "token":
                    authUpdates.accessToken = value || null;
                    break;
                case "user":
                    authUpdates.user = value || null;
                    break;
                case "roles":
                    authUpdates.roles = normalizeRoles(value);
                    break;
                case "permissions":
                    authUpdates.permissions = normalizePermissions(value);
                    break;
                case "username":
                    if (authUpdates.user === undefined) {
                        authUpdates.user = getAuthAlias("user");
                    }
                    if (authUpdates.user && typeof authUpdates.user === "object" && !Array.isArray(authUpdates.user)) {
                        authUpdates.user = {
                            ...authUpdates.user,
                            username: value ?? ""
                        };
                    } else {
                        authUpdates.user = {
                            username: value ?? ""
                        };
                    }
                    break;
                case "userid":
                    if (authUpdates.user === undefined) {
                        authUpdates.user = getAuthAlias("user");
                    }
                    if (authUpdates.user && typeof authUpdates.user === "object" && !Array.isArray(authUpdates.user)) {
                        authUpdates.user = {
                            ...authUpdates.user,
                            userid: value ?? null
                        };
                    } else {
                        authUpdates.user = {
                            userid: value ?? null
                        };
                    }
                    break;
                default:
                    break;
            }
            continue;
        }
        if (key === "auth") {
            hasAuthUpdate = true;
            if (value && typeof value === "object") {
                Object.assign(authUpdates, value);
            }
            continue;
        }
        state[key] = value;
        if (persist && PERSISTED_KEYS.has(key)) {
            persistStateKey(key, value);
        }
    }

    if (hasAuthUpdate) {
        setAuthState(authUpdates, persist);
    }

    if (Object.prototype.hasOwnProperty.call(updates, "isLoading")) {
        rawState.auth = normalizeAuth({
            ...rawState.auth,
            loading: Boolean(rawState.isLoading)
        }, rawState.auth);
        scheduleNotify("auth");
    }
}

/* =========================================================
   GET STATE
========================================================= */
function buildPublicSnapshot() {
    return {
        token: getAuthAlias("token"),
        user: getAuthAlias("user"),
        username: getAuthAlias("username"),
        userProfile: state.userProfile,
        socket: state.socket,
        roles: getAuthAlias("roles"),
        permissions: getAuthAlias("permissions"),
        auth: state.auth,
        environment: state.environment,
        lang: state.lang,
        lastPath: state.lastPath,
        currentRoute: state.currentRoute,
        routeCache,
        routeState,
        currentChatId: state.currentChatId,
        isLoading: state.isLoading,
        userid: getAuthAlias("userid"),
        unreadMessages: state.unreadMessages,
        unreadNotifications: state.unreadNotifications
    };
}

function getState(key) {
    if (key === undefined || key === null || key === "") {
        return buildPublicSnapshot();
    }
    const rootKey = String(key).split(".")[0];
    if (!allowedKeys.has(rootKey)) {
        throw new Error(`Invalid state key:${key}`);
    }
    if (key.includes(".")) {
        return getValueByPath(key);
    }
    return getStateValue(key);
}

/* =========================================================
   SUBSCRIPTIONS
========================================================= */
function subscribe(key, fn) {
    if (typeof fn !== "function") {
        throw new TypeError("State subscriber must be a function.");
    }
    const rootKey = String(key).split(".")[0];
    if (!allowedKeys.has(rootKey)) {
        throw new Error(`Cannot subscribe to invalid key:${key}`);
    }
    if (String(key).includes(".")) {
        return subscribeDeep(String(key), fn);
    }
    if (!listeners.has(key)) {
        listeners.set(key, new Set());
    }
    listeners.get(key).add(fn);
    return () => unsubscribe(key, fn);
}

function unsubscribe(key, fn) {
    const set = listeners.get(key);
    if (!set) {
        return;
    }
    set.delete(fn);
    if (set.size === 0) {
        listeners.delete(key);
    }
}

function subscribeDeep(path, fn) {
    if (typeof fn !== "function") {
        throw new TypeError("State subscriber must be a function.");
    }
    if (!deepListeners.has(path)) {
        deepListeners.set(path, new Set());
    }
    deepListeners.get(path).add(fn);
    return () => unsubscribeDeep(path, fn);
}

function unsubscribeDeep(path, fn) {
    const set = deepListeners.get(path);
    if (!set) {
        return;
    }
    set.delete(fn);
    if (set.size === 0) {
        deepListeners.delete(path);
    }
}

function clearAllListeners() {
    listeners.clear();
    deepListeners.clear();
    notifyQueue.clear();
    notifyPending = false;
}

function clearState(persist = true) {
    setState({
        token: null,
        user: null,
        userProfile: {},
        roles: [],
        permissions: [],
        currentChatId: null,
        unreadMessages: 0,
        unreadNotifications: 0
    }, persist);

    if (persist) {
        removeStorage("token");
        removeStorage("user");
        removeStorage("userProfile");
        removeStorage("roles");
        removeStorage("permissions");
        removeStorage("unreadMessages");
        removeStorage("unreadNotifications");
    }
}

export {
    getState,
    setState,
    clearState,
    subscribe,
    unsubscribe,
    clearAllListeners
};