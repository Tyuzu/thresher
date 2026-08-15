import {
  createheader
} from "../components/layout/header.js";

import {
  createNav,
  highlightActiveNav
} from "../components/layout/navigation.js";

import { render } from "./router.js";

import {
  getState,
  setState,
  getRouteState,
  saveScroll,
  restoreScroll,
  subscribe
} from "../state/state.js";

import {
  Footer
} from "../components/layout/footer.js";

import {
  track
} from "../services/activity/metrics.js";

import {
  startPerfMonitoring
} from "../services/activity/perfMonitor.js";

import {
  abortInflightApiRequests
} from "../api/api.js";

/* =========================================================
   LAYOUT STATE
========================================================= */

const layoutState = {
  isHydrated: false,
  headerRendered: false,
  navRendered: false,
  footerRendered: false,
  isNavigating: false
};

const elements = {
  header: null,
  nav: null,
  main: null,
  footer: null
};

/* =========================================================
   ELEMENT LOOKUP
========================================================= */

function getElements() {
  if (!elements.main) {
    elements.header =
      document.getElementById(
        "pageheader"
      );

    elements.nav =
      document.getElementById(
        "primary-nav"
      );

    elements.main =
      document.getElementById(
        "content"
      );

    elements.footer =
      document.getElementById(
        "pagefooter"
      );
  }

  return elements;
}

/* =========================================================
   LOCATION HELPERS
========================================================= */

/**
 * Returns the application's current route.
 *
 * History mode:
 *   /products/1?tab=reviews
 *
 * Hash mode:
 *   #/products/1?tab=reviews
 */
export function getCurrentAppLocation() {
  if (
    window.location.hash.startsWith("#/")
  ) {
    return window.location.hash.slice(1);
  }

  return (
    window.location.pathname +
    window.location.search
  );
}

/**
 * Parse any supported application URL.
 */
export function parseAppLocation(rawLocation) {
  let value = String(
    rawLocation || "/"
  );

  let mode = "history";

  if (value.startsWith("#/")) {
    mode = "hash";
    value = value.slice(1);
  }

  if (!value.startsWith("/")) {
    value = `/${value}`;
  }

  const hashIndex =
    value.indexOf("#");

  const beforeHash =
    hashIndex >= 0
      ? value.slice(0, hashIndex)
      : value;

  const routeHash =
    hashIndex >= 0
      ? value.slice(hashIndex)
      : "";

  const queryIndex =
    beforeHash.indexOf("?");

  const pathname =
    queryIndex >= 0
      ? beforeHash.slice(
          0,
          queryIndex
        )
      : beforeHash;

  const search =
    queryIndex >= 0
      ? beforeHash.slice(queryIndex)
      : "";

  let normalizedPath =
    pathname || "/";

  if (
    normalizedPath.length > 1 &&
    normalizedPath.endsWith("/")
  ) {
    normalizedPath =
      normalizedPath.slice(0, -1);
  }

  return {
    mode,
    path: normalizedPath,
    search,
    hash: routeHash,
    fullPath:
      normalizedPath +
      search
  };
}

/**
 * Convert an internal route target into a browser URL.
 */
function toBrowserTarget(
  target,
  mode = "history"
) {
  const rawTarget =
    String(target || "/");

  if (rawTarget.startsWith("#/")) {
    return rawTarget;
  }

  if (mode === "hash") {
    const parsed =
      parseAppLocation(rawTarget);

    return `#${parsed.fullPath}`;
  }

  return rawTarget;
}

/* =========================================================
   AUTH HYDRATION
========================================================= */

export function hydrateAuthState(
  force = false
) {
  if (
    layoutState.isHydrated &&
    !force
  ) {
    return;
  }

  const state =
    getState() || {};

  const auth =
    state.auth || {};

  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    null;

  const userRaw =
    sessionStorage.getItem("user") ||
    localStorage.getItem("user") ||
    null;

  let user = null;

  if (userRaw) {
    try {
      const trimmed =
        userRaw.trim();

      if (
        trimmed.startsWith("{") ||
        trimmed.startsWith("[")
      ) {
        user =
          JSON.parse(trimmed);
      } else {
        user = userRaw;
      }
    } catch (error) {
      console.warn(
        "Failed parsing stored user JSON:",
        error
      );

      user = userRaw;
    }
  }

  setState(
    {
      token,
      user,
      auth: {
        ...auth,
        accessToken:
          token ||
          auth.accessToken ||
          null,
        isAuthenticated:
          Boolean(
            token ||
            auth.accessToken
          ),
        user:
          user ||
          auth.user ||
          null
      }
    },
    true
  );

  layoutState.isHydrated = true;
}

/* =========================================================
   STATIC LAYOUT
========================================================= */

function renderStaticLayout() {
  const {
    header,
    nav,
    footer
  } = getElements();

  if (
    !header ||
    !nav ||
    !footer
  ) {
    return;
  }

  if (!layoutState.headerRendered) {
    const h =
      createheader();

    if (h) {
      header.replaceChildren(h);
    }

    layoutState.headerRendered =
      true;
  }

  if (!layoutState.navRendered) {
    const n =
      createNav();

    if (n) {
      nav.replaceChildren(n);
    }

    layoutState.navRendered =
      true;
  }

  if (!layoutState.footerRendered) {
    const f =
      Footer();

    if (f) {
      footer.replaceChildren(f);
    }

    layoutState.footerRendered =
      true;
  }
}

function refreshStaticLayout() {
  const {
    header,
    nav
  } = getElements();

  if (header) {
    const updatedHeader =
      createheader();

    if (updatedHeader) {
      header.replaceChildren(
        updatedHeader
      );
    }
  }

  if (nav) {
    const updatedNav =
      createNav();

    if (updatedNav) {
      nav.replaceChildren(
        updatedNav
      );
    }
  }
}

/* =========================================================
   CONTENT LOADING
========================================================= */

export async function loadContent(
  rawLocation = getCurrentAppLocation(),
  {
    redirectDepth = 0
  } = {}
) {
  const {
    main
  } = getElements();

  if (!main) {
    throw new Error(
      "SPA content container #content was not found."
    );
  }

  hydrateAuthState();
  renderStaticLayout();

  const parsed =
    parseAppLocation(
      rawLocation
    );

  /*
   * Render route.
   * router.js never performs navigation itself.
   * It returns a redirect instruction.
   */
  const result =
    await render(
      parsed.fullPath,
      main
    );

  /* =======================================================
     ROUTER REDIRECT
  ======================================================= */

  if (
    result?.redirect
  ) {
    if (redirectDepth >= 10) {
      throw new Error(
        "Too many consecutive route redirects."
      );
    }

    const browserTarget =
      toBrowserTarget(
        result.redirect,
        parsed.mode
      );

    history.replaceState(
      null,
      "",
      browserTarget
    );

    track(
      "route_redirect",
      {
        from: parsed.fullPath,
        to: result.redirect
      }
    );

    await loadContent(
      getCurrentAppLocation(),
      {
        redirectDepth:
          redirectDepth + 1
      }
    );

    return result;
  }

  /* =======================================================
     NAVIGATION UI
  ======================================================= */

  highlightActiveNav(
    parsed.path
  );

  /* =======================================================
     SCROLL RESTORATION
  ======================================================= */

  const routeState =
    getRouteState(
      getCurrentAppLocation()
    );

  if (routeState) {
    requestAnimationFrame(() => {
      restoreScroll(
        main,
        routeState
      );
    });
  }

  return result;
}

/* =========================================================
   NAVIGATION
========================================================= */

export async function navigate(
  path,
  {
    storeRedirect = false,
    replace = false
  } = {}
) {
  if (!path) {
    return;
  }

  const target =
    String(path);

  const current =
    getCurrentAppLocation();

  /*
   * Normalize comparisons so:
   *
   * /home/
   * /home
   *
   * aren't treated as two separate routes.
   */
  const currentParsed =
    parseAppLocation(current);

  const targetParsed =
    parseAppLocation(target);

  const targetInternal =
    targetParsed.fullPath;

  if (
    currentParsed.fullPath ===
    targetInternal &&
    currentParsed.mode ===
    targetParsed.mode
  ) {
    return;
  }

  if (
    layoutState.isNavigating
  ) {
    return;
  }

  layoutState.isNavigating =
    true;

  try {
    /*
     * Cancel network requests belonging
     * to the old page.
     */
    abortInflightApiRequests();

    const {
      main
    } = getElements();

    /*
     * Save the exact application location,
     * including query parameters and hash mode.
     */
    if (main) {
      saveScroll(
        main,
        current
      );
    }

    /*
     * Temporary login redirect.
     */
    if (
      storeRedirect &&
      currentParsed.path !== "/" &&
      currentParsed.path !== "/login" &&
      currentParsed.path !== "/logout"
    ) {
      sessionStorage.setItem(
        "redirectAfterLogin",
        current
      );
    }

    /*
     * Explicit #/target always selects
     * hash routing.
     */
    const browserTarget =
      target.startsWith("#/")
        ? target
        : target.startsWith("/")
        ? target
        : `/${target}`;

    if (replace) {
      history.replaceState(
        null,
        "",
        browserTarget
      );
    } else {
      history.pushState(
        null,
        "",
        browserTarget
      );
    }

    await loadContent(
      getCurrentAppLocation()
    );

    track(
      "pageview",
      {
        path:
          getCurrentAppLocation()
      }
    );
  } catch (error) {
    console.error(
      "Navigation rendering failed:",
      error
    );

    throw error;
  } finally {
    layoutState.isNavigating =
      false;
  }
}

/* =========================================================
   INITIAL RENDER API
========================================================= */

export async function renderPage() {
  startPerfMonitoring();

  await loadContent(
    getCurrentAppLocation()
  );
}

/* =========================================================
   AUTH REACTIVITY
========================================================= */

subscribe(
  "token",
  (token) => {
    refreshStaticLayout();

    /*
     * Only perform an automatic login redirect
     * when the user is actually on the login page.
     *
     * This prevents hydration from unexpectedly
     * redirecting users already on another page.
     */
    if (!token) {
      return;
    }

    const current =
      parseAppLocation(
        getCurrentAppLocation()
      );

    if (
      current.path !== "/login"
    ) {
      return;
    }

    const redirect =
      sessionStorage.getItem(
        "redirectAfterLogin"
      );

    sessionStorage.removeItem(
      "redirectAfterLogin"
    );

    const target =
      redirect &&
      redirect.startsWith("/") &&
      redirect !== "/login" &&
      redirect !== "/logout"
        ? redirect
        : "/";

    queueMicrotask(() => {
      navigate(
        target,
        {
          replace: true
        }
      ).catch((error) => {
        console.error(
          "Post-login redirect failed:",
          error
        );
      });
    });
  }
);

/* =========================================================
   CROSS-TAB AUTH SYNC
========================================================= */

window.addEventListener(
  "storage",
  (event) => {
    if (
      event.key === "token" ||
      event.key === "user"
    ) {
      hydrateAuthState(true);
      refreshStaticLayout();
    }
  }
);