import { secnav } from "../../components/secNav.js";

const navItems = [
  { label: "Overview", href: "/dash/overview", active: true },
  { label: "Analytics", href: "/dash/analytics" },
  { label: "Settings", href: "/dash/settings" }
];

const targetContainer = document.getElementById("secnav");

if (targetContainer) {
  // Clear any existing nav instance & run cleanup if re-rendering
  if (targetContainer.firstElementChild?._cleanupDrag) {
    targetContainer.firstElementChild._cleanupDrag();
  }
  targetContainer.innerHTML = "";

  // Create and append the draggable secondary navigation
  const secondaryNavElement = secnav(navItems);
  targetContainer.appendChild(secondaryNavElement);

  // Optional: Auto-scroll active item into view on load
  const activeLink = secondaryNavElement.querySelector(".nav-item.active");
  if (activeLink) {
    activeLink.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}