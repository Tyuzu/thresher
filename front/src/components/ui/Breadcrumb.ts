import "../../../css/ui/Breadcrumb.css";
import { navigate } from "../../routes/navigate.js";

export interface BreadcrumbSegment {
  label: string;
  path: string;
}

/** Map static paths or route prefixes to user-friendly titles */
const ROUTE_NAME_MAP: Record<string, string> = {
  "": "Home",
  home: "Home",
  farms: "Farms",
  grocery: "Grocery",
  recipes: "Recipes",
  places: "Places",
  events: "Events",
  artists: "Artists",
  posts: "Posts",
  baitos: "Baito Jobs",
  hire: "Hire",
  profile: "My Profile",
  settings: "Settings",
  cart: "Shopping Cart",
  "my-orders": "My Orders",
  deliveries: "Deliveries",
  booking: "Bookings",
  wallet: "Wallet",
  search: "Search",
};

/**
 * Capitalizes and formats raw URL identifiers (e.g. "user-profile" -> "User Profile")
 */
function formatSegmentLabel(segment: string): string {
  if (ROUTE_NAME_MAP[segment]) {
    return ROUTE_NAME_MAP[segment];
  }
  // If segment looks like a UUID or numeric ID, display a fallback label
  if (/^[\d+a-fA-F-]+$/.test(segment) && segment.length > 8) {
    return "Details";
  }
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Parses current location path into structured breadcrumb trail array
 */
export function getBreadcrumbSegments(
  pathname: string = window.location.pathname
): BreadcrumbSegment[] {
  const parts = pathname.split("/").filter(Boolean);
  const segments: BreadcrumbSegment[] = [{ label: "Home", path: "/" }];

  let accumulatedPath = "";
  parts.forEach((part) => {
    accumulatedPath += `/${part}`;
    segments.push({
      label: formatSegmentLabel(part),
      path: accumulatedPath,
    });
  });

  return segments;
}

/**
 * Renders the DOM element for Breadcrumbs
 */
export function createBreadcrumb(
  customSegments: BreadcrumbSegment[] | null = null
): HTMLElement {
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Breadcrumb");
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
      anchor.addEventListener("click", (e: MouseEvent) => {
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