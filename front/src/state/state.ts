import { apiConfig } from "../config/env.js";

/* =========================================================
    TYPES & INTERFACES
========================================================= */
export interface User {
    id?: string | number;
    userid?: string | number;
    username?: string;
    name?: string;
    [key: string]: any;
}

export interface AuthState {
    isAuthenticated: boolean;
    loading: boolean;
    accessToken: string | null;
    user: User | null;
    roles: string[];
    permissions: string[];
}

export interface AppState {
    auth: AuthState;
    userProfile: Record<string, any>;
    socket: any | null;
    environment: Record<string, any>;
    lang: string;
    lastPath: string;
    currentRoute: any | null;
    routeCache: Map<any, any>;
    routeState: Map<any, any>;
    currentChatId: string | number | null;
    isLoading: boolean;
    unreadMessages: number;
    unreadNotifications: number;
    isLoggedIn: boolean;
    [key: string]: any; // To allow fallback for dynamically accessed properties
}

export type StateListener = (value: any, state: AppState) => void;

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
const allowedKeys = new Set<string>([
    "token", "user", "username", "userProfile", "socket",
    "roles", "permissions", "auth", "environment", "lang",
    "lastPath", "currentRoute", "routeCache", "routeState",
    "currentChatId", "isLoading", "userid", "unreadMessages",
    "unreadNotifications", "isLoggedIn"
]);

const PERSISTED_KEYS = new Set<string>([
    "userProfile", "user", "roles", "permissions",
    "unreadMessages", "unreadNotifications"
]);

const SESSION_KEYS = new Set<string>(["token"]);

const AUTH_ALIAS_KEYS = new Set<string>([
    "token", "user", "roles", "permissions", "username", "userid", "isLoggedIn"
]);

const ROUTE_CACHE_KEY = "routeCache";
const ROUTE_STATE_KEY = "routeState";

/* =========================================================
    STORAGE
========================================================= */
function readSessionStorage(key: string): string | null {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function readLocalStorage(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function readStorage(key: string): string | null {
    if (SESSION_KEYS.has(key)) {
        return readSessionStorage(key);
    }
    return readLocalStorage(key);
}

function serializeValue(value: any): string | null {
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

function writeSessionStorage(key: string, value: any): boolean {
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

function writeLocalStorage(key: string, value: any): boolean {
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

function writeStorage(key: string, value: any): boolean {
    if (SESSION_KEYS.has(key)) {
        return writeSessionStorage(key, value);
    }
    if (PERSISTED_KEYS.has(key)) {
        return writeLocalStorage(key, value);
    }
    return false;
}

function removeStorage(key: string): void {
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

function safeParseFromStorage<T = any>(key: string, fallback: T | null = null): T | string | null {
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

function readPersistentJSON<T = any>(key: string, fallback: T | null = null): T | null {
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

function readPersistentNumber(key: string, fallback = 0): number {
    const value = readPersistentJSON(key, fallback);
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

/* =========================================================
    LEGACY TOKEN MIGRATION
========================================================= */
function migrateLegacyToken(): void {
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
const routeCache = new Map<any, any>();
const routeState = new Map<any, any>();
const scrollPositions = new Map<any, { top: number; left: number }>();

export function saveScroll(container: HTMLElement | null, location: any): void {
    if (!container) return;
    scrollPositions.set(location, {
        top: container.scrollTop || window.scrollY || 0,
        left: container.scrollLeft || window.scrollX || 0
    });
}

export function restoreScroll(container: HTMLElement | null, location: any): void {
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
const listeners = new Map<string, Set<StateListener>>();
const deepListeners = new Map<string, Set<StateListener>>();
const notifyQueue = new Set<string>();
let notifyPending = false;

/* =========================================================
    PATH ACCESS
========================================================= */
function getValueByPath(path: string, source: any = state): any {
    if (!path) {
        return source;
    }
    return path.split(".").reduce((current, part) => current?.[part], source);
}

/* =========================================================
    NOTIFICATION QUEUE
========================================================= */
function scheduleNotify(key: string): void {
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

            const deepCalls = new Map<string, Set<StateListener>>();
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
function normalizeRoles(roles: any): string[] {
    if (!Array.isArray(roles)) {
        return roles == null ? [] : [roles];
    }
    return [...new Set(roles.filter(
        (role) => role !== null && role !== undefined && String(role).length > 0))];
}

function normalizePermissions(permissions: any): string[] {
    if (!Array.isArray(permissions)) {
        return permissions == null ? [] : [permissions];
    }
    return [...new Set(permissions.filter(
        (permission) => permission !== null && permission !== undefined && String(permission).length > 0))];
}

function normalizeAuth(authValue: Partial<AuthState> = {}, previousAuth: Partial<AuthState> = {}): AuthState {
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
const initialUser = readPersistentJSON<User>("user", null);
const initialProfile = readPersistentJSON<Record<string, any>>("userProfile", {});
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

const rawState: AppState = {
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
    unreadNotifications: initialUnreadNotifications,
    isLoggedIn: Boolean(initialToken || initialUser?.id || initialUser?.userid)
};

/* =========================================================
    AUTH ALIAS HELPERS
========================================================= */
function getAuthAlias(key: string): any {
    switch (key) {
        case "token":
            return (rawState.auth?.accessToken || null);
        case "user":
            return (rawState.auth?.user || null);
        case "roles":
            return Array.isArray(rawState.auth?.roles) ? rawState.auth.roles : [];
        case "permissions":
            return Array.isArray(rawState.auth?.permissions) ? rawState.auth.permissions : [];
        case "isLoggedIn": {
            const user = rawState.auth?.user;
            const hasUserValidId = Boolean(user && typeof user === "object" && (user.id || user.userid));
            return Boolean(rawState.auth?.isAuthenticated || rawState.auth?.accessToken || hasUserValidId);
        }
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

function updateAuthUserProperty(property: string, value: any): void {
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

function triggerAuthNotifications(): void {
    scheduleNotify("token");
    scheduleNotify("user");
    scheduleNotify("username");
    scheduleNotify("userid");
    scheduleNotify("roles");
    scheduleNotify("permissions");
    scheduleNotify("isLoggedIn");
    scheduleNotify("auth");
}

function setAuthAlias(key: string, value: any): void {
    const currentAuth = rawState.auth;
    switch (key) {
        case "token": {
            const token = value || null;
            rawState.auth = normalizeAuth({
                ...currentAuth,
                accessToken: token,
                isAuthenticated: Boolean(token)
            }, currentAuth);
            triggerAuthNotifications();
            break;
        }
        case "user": {
            rawState.auth = normalizeAuth({
                ...currentAuth,
                user: value || null
            }, currentAuth);
            triggerAuthNotifications();
            break;
        }
        case "isLoggedIn": {
            const isLoggedIn = Boolean(value);
            if (!isLoggedIn) {
                rawState.auth = normalizeAuth({
                    ...currentAuth,
                    accessToken: null,
                    user: null,
                    isAuthenticated: false
                }, currentAuth);
            } else {
                rawState.auth = normalizeAuth({
                    ...currentAuth,
                    isAuthenticated: true
                }, currentAuth);
            }
            triggerAuthNotifications();
            break;
        }
        case "roles": {
            rawState.auth = normalizeAuth({
                ...currentAuth,
                roles: normalizeRoles(value)
            }, currentAuth);
            scheduleNotify("roles");
            scheduleNotify("isLoggedIn");
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
            scheduleNotify("isLoggedIn");
            scheduleNotify("auth");
            break;
        }
        case "userid": {
            updateAuthUserProperty("userid", value ?? null);
            scheduleNotify("userid");
            scheduleNotify("user");
            scheduleNotify("auth.user");
            scheduleNotify("isLoggedIn");
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
const proxyCache = new WeakMap<object, Map<string, any>>();

function getCachedProxy<T extends object>(target: T, path: string[]): T {
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

function isObjectLike(value: any): boolean {
    return (value !== null && typeof value === "object");
}

function shouldProxy(value: any): boolean {
    return (isObjectLike(value) && !(value instanceof Map) && !(value instanceof Set) && !(value instanceof Date) && !(value instanceof RegExp));
}
function createReactiveObject<T extends object>(obj: T, path: string[] = []): T {
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

            if (shouldProxy(value as any)) {
                return getCachedProxy(value as any, path.concat(String(prop)));
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
                const previous = (target as any).auth;
                (target as any).auth = normalizeAuth(value, previous);
                triggerAuthNotifications();
                return true;
            }
            if (path.length === 0 && key === "isLoading") {
                const changed = (target as any)[key] !== Boolean(value);
                if (!changed) {
                    return true;
                }
                Reflect.set(target, prop, Boolean(value), receiver);
                (target as any).auth = normalizeAuth({
                    ...(target as any).auth,
                    loading: Boolean(value)
                }, (target as any).auth);
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
                    scheduleNotify("isLoggedIn");
                }
                if (path[1] === "accessToken") {
                    scheduleNotify("token");
                    scheduleNotify("isLoggedIn");
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
const state = getCachedProxy(rawState, []) as AppState;

/* =========================================================
    PUBLIC STATE READ
========================================================= */
function getStateValue(key: string): any {
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
function persistStateKey(key: string, value: any): void {
    if (SESSION_KEYS.has(key)) {
        writeSessionStorage(key, value);
        return;
    }
    if (PERSISTED_KEYS.has(key)) {
        writeLocalStorage(key, value);
    }
}

function broadcastAuthChange(reason = "updated"): void {
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

function setAuthState(value: Partial<AuthState>, persist = false): void {
    const previous = rawState.auth;
    const next = normalizeAuth(value, previous);
    rawState.auth = next;
    triggerAuthNotifications();
    if (persist) {
        persistStateKey("token", next.accessToken);
        persistStateKey("user", next.user);
        persistStateKey("roles", next.roles);
        persistStateKey("permissions", next.permissions);
        broadcastAuthChange(next.isAuthenticated ? "login" : "logout");
    }
}

function setState(keyOrObject: string | Record<string, any>, persistOrValue: boolean | any = false, maybeValue: any = undefined): void {
    const updates: Record<string, any> = typeof keyOrObject === "object" && keyOrObject !== null ? keyOrObject : {
        [keyOrObject as string]: persistOrValue
    };
    const persist = typeof keyOrObject === "object" && keyOrObject !== null ? Boolean(persistOrValue) : Boolean(maybeValue);

    const authUpdates: Partial<AuthState> = {};
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
                case "isLoggedIn":
                    if (!value) {
                        authUpdates.accessToken = null;
                        authUpdates.user = null;
                        authUpdates.isAuthenticated = false;
                    } else {
                        authUpdates.isAuthenticated = true;
                    }
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
function buildPublicSnapshot(): Partial<AppState> & Record<string, any> {
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
        unreadNotifications: state.unreadNotifications,
        isLoggedIn: getAuthAlias("isLoggedIn")
    };
}

function getState(key?: string | null): any {
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
function subscribe(key: string, fn: StateListener): () => void {
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
    listeners.get(key)!.add(fn);
    return () => unsubscribe(key, fn);
}

function unsubscribe(key: string, fn: StateListener): void {
    const set = listeners.get(key);
    if (!set) {
        return;
    }
    set.delete(fn);
    if (set.size === 0) {
        listeners.delete(key);
    }
}

function subscribeDeep(path: string, fn: StateListener): () => void {
    if (typeof fn !== "function") {
        throw new TypeError("State subscriber must be a function.");
    }
    if (!deepListeners.has(path)) {
        deepListeners.set(path, new Set());
    }
    deepListeners.get(path)!.add(fn);
    return () => unsubscribeDeep(path, fn);
}

function unsubscribeDeep(path: string, fn: StateListener): void {
    const set = deepListeners.get(path);
    if (!set) {
        return;
    }
    set.delete(fn);
    if (set.size === 0) {
        deepListeners.delete(path);
    }
}

function clearAllListeners(): void {
    listeners.clear();
    deepListeners.clear();
    notifyQueue.clear();
    notifyPending = false;
}

function clearState(persist = true): void {
    setState({
        token: null,
        user: null,
        isLoggedIn: false,
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