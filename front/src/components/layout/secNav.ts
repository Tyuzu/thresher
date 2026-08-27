import { createElement } from "../createElement.js";
import { makeDraggableScroll } from "../dragnav.js";

export interface NavItemConfig {
  label: string;
  href?: string;
  callback?: (config: NavItemConfig) => void;
  active?: boolean;
}

export interface MenuItemResult {
  element: HTMLLIElement;
  isActive: boolean;
}

export interface SecondaryNavElement extends HTMLElement {
  _cleanupDrag?: () => void;
}

type OnSelectHandler = (selectedLi: HTMLLIElement, selectedLink: HTMLAnchorElement) => void;

function createMenuItem(
  itemConfig: NavItemConfig,
  onSelect: OnSelectHandler
): MenuItemResult {
  const { label, callback, href, active } = itemConfig;

  const link = createElement(
    "a",
    {
      class: "nav-link",
      href: href || "#",
      "aria-current": active ? "page" : "false"
    },
    [label]
  ) as HTMLAnchorElement;

  const li = createElement(
    "li",
    { class: active ? "nav-item active" : "nav-item" },
    [link]
  ) as HTMLLIElement;

  link.addEventListener("click", (e: MouseEvent) => {
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

export function createSecondaryNav(items: NavItemConfig[] = []): SecondaryNavElement | null {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const currentPath = window.location.pathname;
  let activeItemEl: HTMLLIElement | null = null;

  const handleActive: OnSelectHandler = (selectedLi, selectedLink) => {
    if (activeItemEl) {
      activeItemEl.classList.remove("active");
      activeItemEl.querySelector("a")?.setAttribute("aria-current", "false");
    }

    selectedLi.classList.add("active");
    selectedLink.setAttribute("aria-current", "page");
    activeItemEl = selectedLi;
  };

  const menuItems = items.map((item) => {
    // Explicitly coerce to a boolean using Boolean() 👇
    const isMatchingPath = Boolean(item.href && item.href === currentPath);
    const config: NavItemConfig = {
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
  const container = createElement("section", { class: "secnav" }, [nav]) as SecondaryNavElement;

  // Attach drag-to-scroll to the scrollable container
  const destroyDrag = makeDraggableScroll(nav);

  // Store cleanup method safely using custom HTMLElement interface extension
  container._cleanupDrag = destroyDrag;

  return container;
}

export { createSecondaryNav as secnav };