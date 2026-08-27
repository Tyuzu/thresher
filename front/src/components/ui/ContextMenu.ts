import "../../../css/ui/ContextMenu.css";
import { createElement } from "../../components/createElement.js";

export interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

export interface ActionMenuItem extends HTMLDivElement {
  _action?: () => void;
}

const ContextMenu = (() => {
  let menu: HTMLDivElement | null = null;

  const createMenu = (options: ContextMenuItem[], x: number, y: number): void => {
    removeMenu();

    menu = createElement("div", {
      class: "context-ctx",
      role: "menu",
    }) as HTMLDivElement;

    options.forEach(({ label, action, disabled = false }) => {
      const item = createElement(
        "div",
        {
          class: `ctx-item${disabled ? " disabled" : ""}`,
          role: "menuitem",
          tabindex: disabled ? -1 : 0,
        },
        label
      ) as ActionMenuItem;

      if (!disabled) {
        item._action = action;
      }

      menu?.appendChild(item);
    });

    document.body.appendChild(menu);
    positionMenu(x, y);
    setupEventListeners();
    focusFirstItem();
  };

  const positionMenu = (x: number, y: number): void => {
    if (!menu) return;

    const { offsetWidth, offsetHeight } = menu;
    const { innerWidth, innerHeight, scrollX, scrollY } = window;

    const left = Math.min(x, scrollX + innerWidth - offsetWidth);
    const top = Math.min(y, scrollY + innerHeight - offsetHeight);

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  const setupEventListeners = (): void => {
    if (!menu) return;

    // 1. Element-bound listeners (Automatically garbage collected when menu is removed)
    menu.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const item = target?.closest<ActionMenuItem>(".ctx-item:not(.disabled)");
      if (!item) return;
      item._action?.();
      removeMenu();
    });

    menu.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!menu) return;

      const items = Array.from(
        menu.querySelectorAll<ActionMenuItem>(".ctx-item:not(.disabled)")
      );
      const current = document.activeElement as ActionMenuItem | null;
      const idx = current ? items.indexOf(current) : -1;

      if (e.key === "Escape") {
        e.preventDefault();
        removeMenu();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextItem = items[(idx + 1) % items.length];
        if (nextItem) nextItem.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevItem = items[(idx - 1 + items.length) % items.length];
        if (prevItem) prevItem.focus();
      } else if (e.key === "Enter" && current?._action) {
        e.preventDefault();
        current._action();
        removeMenu();
      }
    });

    // 2. Global Document/Window listeners
    document.addEventListener("mousedown", outsideClickHandler);
    window.addEventListener("scroll", windowCloseHandler, { passive: true });
    window.addEventListener("resize", windowCloseHandler);
  };

  // Safe orchestrators to decouple cleanups from global browser event structures
  const outsideClickHandler = (e: MouseEvent): void => {
    if (menu && !menu.contains(e.target as Node | null)) {
      removeMenu();
    }
  };

  const windowCloseHandler = (): void => {
    removeMenu();
  };

  const focusFirstItem = (): void => {
    if (!menu) return;
    const first = menu.querySelector<ActionMenuItem>(".ctx-item:not(.disabled)");
    first?.focus();
  };

  const removeMenu = (): void => {
    if (menu) {
      // Clean up global window/document bindings cleanly
      document.removeEventListener("mousedown", outsideClickHandler);
      window.removeEventListener("scroll", windowCloseHandler);
      window.removeEventListener("resize", windowCloseHandler);

      menu.remove();
      menu = null;
    }
  };

  return createMenu;
})();

export default ContextMenu;