import { secnav } from "../../components/layout/secNav.js";

// Define the interface for navigation items
export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

// Custom element interface to support the optional cleanup hook
export interface NavContainerElement extends HTMLElement {
  _cleanupDrag?: () => void;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/dash/overview", active: true },
  { label: "Analytics", href: "/dash/analytics" },
  { label: "Settings", href: "/dash/settings" }
];

const targetContainer = document.getElementById("secnav");

if (targetContainer) {
  // Clear any existing nav instance & run cleanup if re-rendering
  const existingChild = targetContainer.firstElementChild as NavContainerElement | null;
  if (existingChild?._cleanupDrag) {
    existingChild._cleanupDrag();
  }
  
  targetContainer.innerHTML = "";

  // Create and append the draggable secondary navigation
  const secondaryNavElement = secnav(navItems) as HTMLElement;
  targetContainer.appendChild(secondaryNavElement);

  // Optional: Auto-scroll active item into view on load
  const activeLink = secondaryNavElement.querySelector<HTMLElement>(".nav-item.active");
  if (activeLink) {
    activeLink.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}