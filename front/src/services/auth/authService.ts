import {
  setState,
  clearState,
  subscribe,
  getState
} from "../../state/state.js";
import {
  validateInputs,
  isValidUsername,
  isValidEmail,
  isValidPassword
} from "../../utils/utils.js";
import { fetchProfile } from "../profile/fetchProfile.js";
import Notify from "../../components/ui/Notify.js";
import { registerUser, loginUser, logoutUser } from "./api.js";
import LoadingSpinner from "../../components/ui/LoadingSpinner.js";
import { navigate } from "../../routes/navigate.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */

export interface JwtPayload {
  userid?: string;
  userID?: string;
  user_id?: string;
  sub?: string;
  username?: string;
  roles?: string | string[];
  role?: string | string[];
  permissions?: string | string[];
  [key: string]: unknown;
}

export interface RawUserRecord {
  id?: string;
  userid?: string;
  username?: string;
  roles?: string | string[];
  role?: string | string[];
  permissions?: string | string[];
  [key: string]: unknown;
}

export interface AuthResponseData {
  token?: string;
  Token?: string;
  user_id?: string;
  userid?: string;
  UserID?: string;
  username?: string;
  roles?: string | string[];
  role?: string | string[];
  permissions?: string | string[];
  user?: RawUserRecord;
  data?: AuthResponseData;
  [key: string]: unknown;
}

export interface AuthUser extends RawUserRecord {
  userid?: string;
  username: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string;
  user: AuthUser;
  roles: string[];
  permissions: string[];
  loading: boolean;
}

export interface ExtractedAuthPayload {
  token: string;
  user: AuthUser;
  userId: string | null;
  username: string;
  roles: string[];
  permissions: string[];
  auth: AuthState;
}

export interface SignupPayload {
  username?: string;
  email?: string;
  password?: string;
  preventDefault?: () => void;
}

export interface LoginPayload {
  username?: string;
  password?: string;
  preventDefault?: () => void;
}

/* =========================================================
   REACTIVE ROLE STATE
========================================================= */

function updateAdminState(roles: unknown): void {
  const normalizedRoles = Array.isArray(roles)
    ? roles
    : typeof roles === "string"
    ? [roles]
    : [];
  const isAdmin = normalizedRoles.includes("admin");

  if (typeof document !== "undefined") {
    document.body.dataset.isAdmin = isAdmin ? "true" : "false";
  }
}

subscribe("roles", updateAdminState);
updateAdminState(getState("roles"));

/* =========================================================
   HELPERS
========================================================= */

function normalizeRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .filter((role): role is string => role !== null && role !== undefined && String(role).trim() !== "")
          .map((role) => String(role).trim())
      )
    ];
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function normalizePermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .filter(
            (permission): permission is string =>
              permission !== null && permission !== undefined && String(permission).trim() !== ""
          )
          .map((permission) => String(permission).trim())
      )
    ];
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token?.split(".");
    if (!parts || parts.length < 2) {
      return null;
    }
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function extractAuthPayload(response: AuthResponseData, fallbackUsername = ""): ExtractedAuthPayload {
  const data = response?.data && typeof response.data === "object" ? response.data : response;
  const token = response?.token ?? response?.Token ?? data?.token ?? data?.Token;

  if (!token) {
    throw new Error("Invalid response format from server.");
  }

  const jwt = parseJwtPayload(token) || {};
  const userId =
    response?.user_id ??
    response?.userid ??
    response?.UserID ??
    data?.user_id ??
    data?.userid ??
    data?.UserID ??
    jwt.userid ??
    jwt.userID ??
    jwt.user_id ??
    jwt.sub ??
    "";

  const username = response?.username ?? data?.username ?? jwt.username ?? fallbackUsername ?? "";
  const roles = normalizeRoles(
    response?.roles ?? response?.role ?? data?.roles ?? data?.role ?? jwt.roles ?? jwt.role
  );
  const permissions = normalizePermissions(
    response?.permissions ?? data?.permissions ?? jwt.permissions
  );

  const rawUser =
    response?.user && typeof response.user === "object"
      ? response.user
      : data?.user && typeof data.user === "object"
      ? data.user
      : null;

  const user: AuthUser = rawUser
    ? {
        ...rawUser,
        userid: String(rawUser.id ?? rawUser.userid ?? userId),
        username: String(rawUser.username ?? username)
      }
    : {
        userid: userId || undefined,
        username: username || ""
      };

  return {
    token,
    user,
    userId: userId || user.userid || null,
    username: user.username || username || "",
    roles,
    permissions,
    auth: {
      isAuthenticated: true,
      accessToken: token,
      user,
      roles,
      permissions,
      loading: false
    }
  };
}

/* =========================================================
   SIGNUP
========================================================= */

export async function signup(payload: SignupPayload = {}): Promise<boolean> {
  let username = payload?.username;
  let email = payload?.email;
  let password = payload?.password;

  if (payload?.preventDefault && typeof document !== "undefined") {
    payload.preventDefault();
    username = (document.getElementById("signup-username") as HTMLInputElement)?.value?.trim() || "";
    email = (document.getElementById("signup-email") as HTMLInputElement)?.value?.trim() || "";
    password = (document.getElementById("signup-password") as HTMLInputElement)?.value || "";
  }

  const errors = validateInputs([
    {
      value: username,
      validator: isValidUsername,
      message: "Username must be between 3 and 20 characters."
    },
    {
      value: email,
      validator: isValidEmail,
      message: "Please enter a valid email."
    },
    {
      value: password,
      validator: isValidPassword,
      message: "Password must be at least 6 characters long."
    }
  ]);

  const hasErrors = Array.isArray(errors)
    ? errors.length > 0
    : Boolean(errors && Object.keys(errors).length > 0);

  if (hasErrors) {
    const errorMessage = Array.isArray(errors) ? errors.join(", ") : String(errors);
    Notify(errorMessage, {
      type: "error",
      duration: 3000,
      dismissible: true
    });
    return false;
  }

  const hideSpinner = LoadingSpinner();

  try {
    await registerUser(username as string, email as string, password as string);

    Notify("Signup successful! You can now log in.", {
      type: "success",
      duration: 3000,
      dismissible: true
    });
    return true;
  } catch (error) {
    const message =
      typeof error === "string"
        ? error
        : (error as Error)?.message || (error as { error?: string })?.error || "Signup failed.";
    Notify(message, {
      type: "error",
      duration: 3000,
      dismissible: true
    });
    return false;
  } finally {
    if (typeof hideSpinner === "function") {
      hideSpinner();
    }
  }
}

/* =========================================================
   LOGIN
========================================================= */

export async function login(payload: LoginPayload = {}): Promise<boolean> {
  let username = payload?.username;
  let password = payload?.password;

  if (payload?.preventDefault && typeof document !== "undefined") {
    payload.preventDefault();
    username = (document.getElementById("login-username") as HTMLInputElement)?.value?.trim() || "";
    password = (document.getElementById("login-password") as HTMLInputElement)?.value || "";
  }

  username = typeof username === "string" ? username.trim() : "";

  if (!username || !password) {
    Notify("Username and password are required.", {
      type: "error",
      duration: 3000,
      dismissible: true
    });
    return false;
  }

  const hideSpinner = LoadingSpinner();

  try {
    const response = (await loginUser(username, password)) as AuthResponseData;

    const authPayload = extractAuthPayload(response, username);

    setState(
      {
        token: authPayload.token,
        user: authPayload.user,
        userid: authPayload.userId,
        username: authPayload.username,
        roles: authPayload.roles,
        permissions: authPayload.permissions,
        auth: authPayload.auth
      },
      true
    );

    try {
      const profile = (await fetchProfile()) as RawUserRecord | null;
      if (profile) {
        setState({ userProfile: profile }, true);

        const profileRoles = normalizeRoles(profile.roles ?? profile.role);
        const profilePermissions = normalizePermissions(profile.permissions);

        if (profileRoles.length > 0) {
          setState({ roles: profileRoles }, true);
        }
        if (profilePermissions.length > 0) {
          setState({ permissions: profilePermissions }, true);
        }

        const currentUser = getState("user") as AuthUser | null;
        if (currentUser && typeof currentUser === "object") {
          setState(
            {
              user: {
                ...currentUser,
                ...profile,
                userid: currentUser.userid ?? (getState("userid") as string | null),
                username:
                  (profile.username as string) ??
                  currentUser.username ??
                  (getState("username") as string)
              }
            },
            true
          );
        }
      }
    } catch {
      Notify("Logged in, but profile details could not be loaded.", {
        type: "info",
        duration: 3000,
        dismissible: true
      });
    }
    return true;
  } catch (error) {
    const message = (error as Error)?.message || "Login failed.";
    Notify(message, {
      type: "error",
      duration: 3000,
      dismissible: true
    });
    return false;
  } finally {
    if (typeof hideSpinner === "function") {
      hideSpinner();
    }
  }
}

/* =========================================================
   LOGOUT
========================================================= */

export async function logout(): Promise<void> {
  try {
    await logoutUser();
  } catch {
    // Logout must clear local authentication even if the server request fails.
  } finally {
    silentLogout(true);
  }
}

/* =========================================================
   LOCAL LOGOUT
========================================================= */

export function silentLogout(broadcast = true): void {
  clearState();

  if (broadcast && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("auth:logout", {
        detail: {
          broadcast: true
        }
      })
    );
  }

  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem("redirectAfterLogin");
    } catch {
      // Ignore storage failures.
    }
  }

  if (typeof window !== "undefined") {
    queueMicrotask(async () => {
      try {
        await navigate("/login", {
          replace: true
        });
      } catch (error) {
        console.error("Logout navigation failed:", error);
      }
    });
  }
}

/* =========================================================
   AUTH UNAUTHORIZED EVENT
========================================================= */

if (typeof window !== "undefined") {
  window.addEventListener("auth:unauthorized", () => {
    silentLogout();
  });
}