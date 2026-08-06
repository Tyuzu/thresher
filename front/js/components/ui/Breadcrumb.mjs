import "../../../css/ui/Breadcrumb.css";
import { navigate } from "../../routes/index.js";

/** Map static paths or route prefixes to user-friendly titles */
const ROUTE_NAME_MAP = {
  "": "Home",
  "home": "Home",
  "farms": "Farms",
  "grocery": "Grocery",
  "recipes": "Recipes",
  "places": "Places",
  "events": "Events",
  "artists": "Artists",
  "posts": "Posts",
  "baitos": "Baito Jobs",
  "hire": "Hire",
  "profile": "My Profile",
  "settings": "Settings",
  "cart": "Shopping Cart",
  "my-orders": "My Orders",
  "deliveries": "Deliveries",
  "booking": "Bookings",
  "wallet": "Wallet",
  "search": "Search"
};

/**
 * Capitalizes and formats raw URL identifiers (e.g. "user-profile" -> "User Profile")
 */
function formatSegmentLabel(segment) {
  if (ROUTE_NAME_MAP[segment]) {
    return ROUTE_NAME_MAP[segment];
  }
  // If segment looks like a UUID or numeric ID, display a fallback label
  if (/^[\d+a-fA-F-]+$/.test(segment) && segment.length > 8) {
    return "Details";
  }
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Parses current location path into structured breadcrumb trail array
 */
export function getBreadcrumbSegments(pathname = window.location.pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const segments = [{ label: "Home", path: "/" }];

  let accumulatedPath = "";
  parts.forEach((part) => {
    accumulatedPath += `/${part}`;
    segments.push({
      label: formatSegmentLabel(part),
      path: accumulatedPath
    });
  });

  return segments;
}

/**
 * Renders the DOM element for Breadcrumbs
 */
export function createBreadcrumb(customSegments = null) {
  const nav = document.createElement("nav");
  nav.ariaLabel = "Breadcrumb";
  nav.className = "breadcrumb";

  const ol = document.createElement("ol");
  ol.className = "breadcrumb__list";

  const segments = customSegments || getBreadcrumbSegments();

  segments.forEach((item, index) => {
    const isLast = index === segments.length - 1;
    const li = document.createElement("li");
    li.className = `breadcrumb__item${isLast ? " breadcrumb__item--active" : ""}`;

    if (isLast) {
      const span = document.createElement("span");
      span.className = "breadcrumb__text";
      span.textContent = item.label;
      span.setAttribute("aria-current", "page");
      li.appendChild(span);
    } else {
      const anchor = document.createElement("a");
      anchor.className = "breadcrumb__link";
      anchor.href = item.path;
      anchor.textContent = item.label;
      anchor.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(item.path);
      });
      li.appendChild(anchor);

      // Separator Chevron
      const separator = document.createElement("span");
      separator.className = "breadcrumb__separator";
      separator.innerHTML = " &rsaquo; ";
      separator.setAttribute("aria-hidden", "true");
      li.appendChild(separator);
    }

    ol.appendChild(li);
  });

  nav.appendChild(ol);
  return nav;
}

/*
import { createBreadcrumb } from "./components/breadcrumb.js";

// Basic auto-parsed generation based on window.location.pathname:
const container = document.getElementById("app-header");
container.appendChild(createBreadcrumb());

// Or pass custom segment overrides for dynamic resource pages (e.g., /farms/123):
const customSegments = [
  { label: "Home", path: "/" },
  { label: "Farms", path: "/farms" },
  { label: "Green Valley Farm", path: "/farms/123" }
];
container.appendChild(createBreadcrumb(customSegments));
*/