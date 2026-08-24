import "../../../css/layout/navi.css";
import { navigate } from "../../routes/navigate.js";
import { getCurrentAllowedFeatures } from "../../config/domainFeatures.js";

export interface NavItemConfig {
  href: string;
  label: string;
  feature?: string;
}

/** Highlight current active link */
export const highlightActiveNav = (path: string): void => {
  document.querySelectorAll<HTMLAnchorElement>(".navigation__link").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === path);
  });
};

/** Handle navigation */
const handleNavigation = (event: MouseEvent, href: string): void => {
  event.preventDefault();
  if (!href) {
    console.error("🚨 handleNavigation received null href!");
    return;
  }
  navigate(href);
};

/** Save nav order in localStorage */
const saveNavOrder = (order: string[]): void => {
  localStorage.setItem("navOrder", JSON.stringify(order));
};

/** Get nav order from localStorage */
const getNavOrder = (): string[] | null => {
  const stored = localStorage.getItem("navOrder");
  return stored ? (JSON.parse(stored) as string[]) : null;
};

/** Create one navigation item */
const createNavItem = (href: string, label: string): HTMLLIElement => {
  const li = document.createElement("li");
  li.className = "navigation__item";

  // Start as non-draggable so normal clicks fire cleanly
  li.setAttribute("draggable", "false");

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.className = "navigation__link";
  anchor.textContent = label;
  anchor.addEventListener("click", (e: MouseEvent) => handleNavigation(e, href));

  li.appendChild(anchor);
  return li;
};

/** Enable drag & drop only when toggle is checked */
const enableDragDrop = (ul: HTMLUListElement, toggle: HTMLInputElement): void => {
  let draggingEl: HTMLLIElement | null = null;
  const placeholder = document.createElement("li");
  placeholder.className = "navigation__placeholder";

  const updateDraggableState = (): void => {
    const isEditable = toggle.checked;
    ul.querySelectorAll<HTMLLIElement>(".navigation__item").forEach((item) => {
      item.setAttribute("draggable", isEditable ? "true" : "false");
    });
  };

  toggle.addEventListener("change", updateDraggableState);

  const onDragStart = (e: DragEvent): void => {
    if (!toggle.checked) return;
    const target = e.target as HTMLElement | null;
    draggingEl = target?.closest<HTMLLIElement>("li") || null;
    if (!draggingEl) return;

    draggingEl.classList.add("dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const onDragEnd = (): void => {
    if (draggingEl) {
      draggingEl.classList.remove("dragging");
    }
    draggingEl = null;
    placeholder.remove();

    // Save order
    const order = Array.from(ul.children)
      .filter((el): el is HTMLLIElement => el !== placeholder && el instanceof HTMLLIElement)
      .map((el) => {
        const anchor = el.querySelector("a");
        return anchor?.getAttribute("href") || "";
      })
      .filter(Boolean);

    saveNavOrder(order);
  };

  const onDragOver = (e: DragEvent): void => {
    if (!toggle.checked) return;
    e.preventDefault();

    const target = (e.target as HTMLElement | null)?.closest<HTMLLIElement>("li");
    if (!target || target === draggingEl || target === placeholder) return;

    const rect = target.getBoundingClientRect();
    const next = (e.clientX - rect.left) / rect.width > 0.5;
    ul.insertBefore(placeholder, next ? target.nextSibling : target);
  };

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    if (!toggle.checked) return;
    if (placeholder.parentNode && draggingEl) {
      ul.insertBefore(draggingEl, placeholder);
    }
    placeholder.remove();
  };

  ul.addEventListener("dragstart", onDragStart);
  ul.addEventListener("dragend", onDragEnd);
  ul.addEventListener("dragover", onDragOver);
  ul.addEventListener("drop", onDrop);
};

/** Filter nav items according to the active domain's feature flags */
const getPermittedNavItems = (allNavItems: NavItemConfig[]): NavItemConfig[] => {
  const allowed: string[] = getCurrentAllowedFeatures();

  // If domain allows ALL features, return everything
  if (allowed.includes("ALL")) {
    return allNavItems;
  }

  return allNavItems.filter((item) => {
    // Shared core items without a feature key are always shown
    if (!item.feature) return true;
    return allowed.includes(item.feature);
  });
};

/** Create navigation bar */
const createNav = (): HTMLDivElement => {
  // 1. Master list of navigation items mapped to feature keys
  const allNavItems: NavItemConfig[] = [
    { href: "/farms", label: "Farms", feature: "farms" },
    { href: "/grocery", label: "Grocery", feature: "farms" },
    { href: "/recipes", label: "Recipes", feature: "farms" },
  ];

  // 2. Filter available items based on domain permissions
  const defaultNavItems = getPermittedNavItems(allNavItems);

  // 3. Apply custom drag-and-drop ordering (stored in localStorage)
  const savedOrder = getNavOrder();
  let navItems = defaultNavItems;

  if (savedOrder) {
    navItems = savedOrder
      .map((href) => defaultNavItems.find((item) => item.href === href))
      .filter((item): item is NavItemConfig => Boolean(item));

    defaultNavItems.forEach((item) => {
      if (!navItems.find((i) => i.href === item.href)) {
        navItems.push(item);
      }
    });
  }

  const nav = document.createElement("div");
  nav.className = "navigation";

  const toggle = document.createElement("input");
  toggle.className = "toggle";
  toggle.type = "checkbox";
  toggle.id = "more";
  toggle.setAttribute("tabindex", "-1");

  const inner = document.createElement("div");
  inner.className = "navigation__inner";

  const ul = document.createElement("ul");
  ul.className = "navigation__list horizontal";

  navItems.forEach(({ href, label }) => ul.appendChild(createNavItem(href, label)));

  enableDragDrop(ul, toggle);

  const toggleLabelWrapper = document.createElement("div");
  toggleLabelWrapper.className = "navigation__toggle";

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "navigation__link";
  toggleLabel.setAttribute("for", "more");
  toggleLabel.innerText = "More";

  toggleLabelWrapper.appendChild(toggleLabel);
  inner.appendChild(ul);
  inner.appendChild(toggleLabelWrapper);
  nav.appendChild(toggle);
  nav.appendChild(inner);

  highlightActiveNav(window.location.pathname);

  return nav;
};

export { createNav, createNavItem };