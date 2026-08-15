import {
  setState,
  clearState,
  subscribeDeep,
  getState
} from "../../state/state.js";

import {
  validateInputs,
  isValidUsername,
  isValidEmail,
  isValidPassword
} from "../../utils/utils.js";

import {
  fetchProfile
} from "../profile/fetchProfile.js";

import Notify from "../../components/ui/Notify.mjs";

import {
  apiFetch,
  refreshToken
} from "../../api/api.js";

import LoadingSpinner from "../../components/ui/LoadingSpinner.mjs";

/* =========================================================
   REACTIVE ROLE STATE
========================================================= */

subscribeDeep(
  "userProfile.role",
  (role) => {
    const roles =
      Array.isArray(role)
        ? role
        : role
        ? [role]
        : [];

    const isAdmin =
      roles.includes("admin");

    document.body.dataset.isAdmin =
      isAdmin
        ? "true"
        : "false";
  }
);

/* =========================================================
   HELPERS
========================================================= */

function normalizeRoles(
  value
) {
  if (
    Array.isArray(value)
  ) {
    return value.filter(
      Boolean
    );
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return [value];
  }

  return [];
}

function normalizePermissions(
  value
) {
  if (
    Array.isArray(value)
  ) {
    return value.filter(
      Boolean
    );
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return [value];
  }

  return [];
}

function parseJwtPayload(
  token
) {
  try {
    const parts =
      token?.split(".");

    if (
      !parts ||
      parts.length < 2
    ) {
      return null;
    }

    const base64 =
      parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padded =
      base64 +
      "=".repeat(
        (4 -
          (base64.length % 4)) %
          4
      );

    return JSON.parse(
      atob(padded)
    );
  } catch {
    return null;
  }
}

function extractAuthPayload(
  response,
  username
) {
  const token =
    response?.token ||
    response?.Token ||
    response?.data?.token ||
    response?.data?.Token;

  if (!token) {
    throw new Error(
      "Invalid response format from server."
    );
  }

  const jwt =
    parseJwtPayload(token) ||
    {};

  const userId =
    response?.user_id ||
    response?.userid ||
    response?.userId ||
    response?.UserID ||
    response?.data?.user_id ||
    response?.data?.userId ||
    jwt.userId ||
    jwt.userID ||
    jwt.user_id ||
    jwt.sub ||
    "";

  const roles =
    normalizeRoles(
      response?.roles ||
      response?.role ||
      response?.data?.roles ||
      response?.data?.role ||
      jwt.roles ||
      jwt.role
    );

  const permissions =
    normalizePermissions(
      response?.permissions ||
      response?.data?.permissions ||
      jwt.permissions
    );

  return {
    token,
    user: userId || null,
    userId: userId || null,
    username:
      response?.username ||
      response?.data?.username ||
      jwt.username ||
      username ||
      "",

    roles,
    permissions,

    auth: {
      isAuthenticated: true,
      accessToken: token,
      user: userId || null,
      roles,
      permissions
    }
  };
}

/* =========================================================
   SIGNUP
========================================================= */

export async function signup(
  payload
) {
  let username =
    payload?.username;

  let email =
    payload?.email;

  let password =
    payload?.password;

  if (
    payload?.preventDefault
  ) {
    payload.preventDefault();

    username =
      document
        .getElementById(
          "signup-username"
        )
        ?.value
        ?.trim() || "";

    email =
      document
        .getElementById(
          "signup-email"
        )
        ?.value
        ?.trim() || "";

    password =
      document
        .getElementById(
          "signup-password"
        )
        ?.value || "";
  }

  const errors =
    validateInputs([
      {
        value: username,
        validator: isValidUsername,
        message:
          "Username must be between 3 and 20 characters."
      },

      {
        value: email,
        validator: isValidEmail,
        message:
          "Please enter a valid email."
      },

      {
        value: password,
        validator: isValidPassword,
        message:
          "Password must be at least 6 characters long."
      }
    ]);

  const hasErrors =
    Array.isArray(errors)
      ? errors.length > 0
      : errors &&
        Object.keys(
          errors
        ).length > 0;

  if (hasErrors) {
    const errorMessage =
      Array.isArray(errors)
        ? errors.join(", ")
        : String(errors);

    Notify(
      errorMessage,
      {
        type: "error",
        duration: 3000,
        dismissible: true
      }
    );

    return false;
  }

  const hideSpinner =
    LoadingSpinner();

  try {
    /*
     * auth:false prevents an old access token
     * from being attached to registration.
     */
    await apiFetch(
      "/auth/register",
      "POST",
      {
        username,
        email,
        password
      },
      {
        credentials: "include",
        auth: false
      }
    );

    Notify(
      "Signup successful! You can now log in.",
      {
        type: "success",
        duration: 3000,
        dismissible: true
      }
    );

    return true;
  } catch (error) {
    const message =
      typeof error === "string"
        ? error
        : error?.message ||
          error?.error ||
          "Signup failed.";

    Notify(
      message,
      {
        type: "error",
        duration: 3000,
        dismissible: true
      }
    );

    return false;
  } finally {
    if (
      typeof hideSpinner ===
      "function"
    ) {
      hideSpinner();
    }
  }
}

/* =========================================================
   LOGIN
========================================================= */

export async function login(
  payload
) {
  let username =
    payload?.username;

  let password =
    payload?.password;

  if (
    payload?.preventDefault
  ) {
    payload.preventDefault();

    username =
      document
        .getElementById(
          "login-username"
        )
        ?.value
        ?.trim() || "";

    password =
      document
        .getElementById(
          "login-password"
        )
        ?.value || "";
  }

  if (
    !username ||
    !password
  ) {
    Notify(
      "Username and password are required.",
      {
        type: "error",
        duration: 3000,
        dismissible: true
      }
    );

    return false;
  }

  const hideSpinner =
    LoadingSpinner();

  try {
    /*
     * Login is a public endpoint.
     */
    const response =
      await apiFetch(
        "/auth/login",
        "POST",
        {
          username,
          password
        },
        {
          credentials: "include",
          auth: false
        }
      );

    const authPayload =
      extractAuthPayload(
        response,
        username
      );

    /*
     * IMPORTANT:
     *
     * Commit the token BEFORE fetching
     * the profile, so apiFetch() can attach
     * Authorization: Bearer ...
     */
    setState(
      {
        token:
          authPayload.token,

        user:
          authPayload.user,

        userId:
          authPayload.userId,

        username:
          authPayload.username,

        roles:
          authPayload.roles,

        permissions:
          authPayload.permissions,

        auth:
          authPayload.auth
      },
      true
    );

    /*
     * Now the profile request can authenticate
     * using the newly committed access token.
     */
    try {
      const profile =
        await fetchProfile();

      if (profile) {
        setState(
          {
            userProfile:
              profile
          },
          true
        );

        /*
         * If profile supplies roles/permissions,
         * synchronize them.
         */
        const profileRoles =
          normalizeRoles(
            profile.roles ||
            profile.role
          );

        const profilePermissions =
          normalizePermissions(
            profile.permissions
          );

        if (
          profileRoles.length
        ) {
          setState(
            {
              roles:
                profileRoles
            },
            true
          );
        }

        if (
          profilePermissions.length
        ) {
          setState(
            {
              permissions:
                profilePermissions
            },
            true
          );
        }
      }
    } catch (error) {
      Notify(
        "Logged in, but profile details could not be loaded.",
        {
          type: "info",
          duration: 3000,
          dismissible: true
        }
      );
    }

    /*
     * Background refresh is started by api.js
     * after successful token state updates.
     *
     * The token subscription in routes/index.js
     * handles post-login navigation.
     */
    return true;
  } catch (error) {
    Notify(
      error?.message ||
        "Login failed.",
      {
        type: "error",
        duration: 3000,
        dismissible: true
      }
    );

    return false;
  } finally {
    if (
      typeof hideSpinner ===
      "function"
    ) {
      hideSpinner();
    }
  }
}

/* =========================================================
   MANUAL TOKEN REFRESH
========================================================= */

export async function refreshAccessToken() {
  const success =
    await refreshToken();

  return success
    ? getState("token")
    : null;
}

/* =========================================================
   LOGOUT
========================================================= */

export async function logout() {
  try {
    await apiFetch(
      "/auth/logout",
      "POST",
      null,
      {
        headers: {
          "X-Refresh-Intent": "1"
        },
        credentials: "include"
      }
    );
  } catch {
    // Logout should still clear local state.
  } finally {
    silentLogout(true);
  }
}

/* =========================================================
   LOCAL LOGOUT
========================================================= */

export function silentLogout(
  broadcast = true
) {
  clearState();

  if (
    broadcast &&
    typeof window !==
      "undefined"
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "auth:logout",
        {
          detail: {
            broadcast: true
          }
        }
      )
    );
  }

  /*
   * Do not preserve stale redirect state.
   */
  sessionStorage.removeItem(
    "redirectAfterLogin"
  );

  /*
   * Replace rather than push so the
   * protected page isn't left in history.
   */
  if (
    typeof window !==
    "undefined"
  ) {
    queueMicrotask(
      async () => {
        const {
          navigate
        } = await import(
          "../../routes/index.js"
        );

        navigate(
          "/login",
          {
            replace: true
          }
        ).catch(
          console.error
        );
      }
    );
  }
}

/* =========================================================
   AUTH UNAUTHORIZED EVENT
========================================================= */

window.addEventListener(
  "auth:unauthorized",
  () => {
    silentLogout();
  }
);