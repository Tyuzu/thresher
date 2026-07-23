import { createElement } from "../components/createElement.js";
import { makeDraggableScroll } from "./dragnav.js"; // Import your drag-scroll helper

function createMenuItem(itemConfig, onSelect) {
  const { label, callback, href, active } = itemConfig;

  const link = createElement(
    "a",
    {
      class: "nav-link",
      href: href || "#",
      "aria-current": active ? "page" : "false"
    },
    [label]
  );

  const li = createElement(
    "li",
    { class: `nav-item${active ? " active" : ""}` },
    [link]
  );

  link.addEventListener("click", (e) => {
    e.preventDefault();

    onSelect(li, link);

    if (typeof callback === "function") {
      callback(itemConfig);
    } else if (href) {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new Event("popstate"));
    }
  });

  return { element: li, isActive: Boolean(active) };
}

export function createSecondaryNav(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const currentPath = window.location.pathname;
  let activeItemEl = null;

  const handleActive = (selectedLi, selectedLink) => {
    if (activeItemEl) {
      activeItemEl.classList.remove("active");
      activeItemEl.querySelector("a")?.setAttribute("aria-current", "false");
    }

    selectedLi.classList.add("active");
    selectedLink.setAttribute("aria-current", "page");
    activeItemEl = selectedLi;
  };

  const menuItems = items.map((item) => {
    const isMatchingPath = item.href && item.href === currentPath;
    const config = {
      ...item,
      active: item.active ?? isMatchingPath
    };

    const { element, isActive } = createMenuItem(config, handleActive);
    if (isActive) {
      activeItemEl = element;
    }
    return element;
  });

  const menuList = createElement("ul", { class: "menu-list" }, menuItems);
  const nav = createElement("nav", { class: "secnav-nav", "aria-label": "Secondary navigation" }, [menuList]);
  const container = createElement("section", { class: "secnav" }, [nav]);

  // Attach drag-to-scroll to the scrollable container (usually the <nav> or <ul>)
  const destroyDrag = makeDraggableScroll(nav);

  // Optional: Store the cleanup method on the returned element in case you unmount/destroy it later
  container._cleanupDrag = destroyDrag;

  return container;
}

export { createSecondaryNav as secnav };