import "../../../css/ui/Modal.css";
import { createElement } from "../../components/createElement.js";

let activeModalCount = 0;
let uniqueInstanceIdCounter = 0;
let bodyStyleEl: HTMLStyleElement | null = null;

function lockBodyScroll(): void {
  if (!bodyStyleEl) {
    bodyStyleEl = createElement("style", { id: "modal-body-style" }, [
      document.createTextNode("body { overflow: hidden !important; }")
    ]) as HTMLStyleElement;
    document.head.appendChild(bodyStyleEl);
  }
}

function unlockBodyScroll(): void {
  if (activeModalCount === 0 && bodyStyleEl) {
    bodyStyleEl.remove();
    bodyStyleEl = null;
  }
}

interface HeaderResult {
  header: HTMLElement;
  titleId: string | null;
}

function makeHeader(
  title: string,
  onClose: () => void,
  instanceId: number,
  showCloseButton: boolean
): HeaderResult | null {
  if (!title && !showCloseButton) return null;

  const heading = title
    ? (createElement("h3", { id: `modal-title-${instanceId}` }, [title]) as HTMLElement)
    : null;

  const closeBtn = showCloseButton
    ? (createElement("button", {
        class: "modal-close",
        "aria-label": "Close"
      }, ["×"]) as HTMLButtonElement)
    : null;

  closeBtn?.addEventListener("click", onClose);

  return {
    header: createElement(
      "div",
      { class: "modal-header" },
      [heading, closeBtn].filter((node): node is HTMLElement => node !== null)
    ) as HTMLElement,
    titleId: heading?.id || null
  };
}

export type ModalContent =
  | string
  | HTMLElement
  | DocumentFragment
  | (string | HTMLElement | DocumentFragment)[]
  | (() => string | HTMLElement | DocumentFragment | (string | HTMLElement | DocumentFragment)[]);

interface BodyResult {
  body: HTMLElement;
  descId: string;
}

function makeBody(content: ModalContent, instanceId: number): BodyResult {
  const node = typeof content === "function" ? content() : content;
  let children: (Node | string)[] = [];

  if (node instanceof HTMLElement || node instanceof DocumentFragment) {
    children = [node];
  } else if (Array.isArray(node)) {
    children = node;
  } else {
    children = [document.createTextNode(node === null || node === undefined ? "" : String(node))];
  }

  const body = createElement(
    "div",
    { class: "modal-body", id: `modal-desc-${instanceId}` },
    children
  ) as HTMLElement;

  return { body, descId: body.id };
}
function simpleDurationMs(el: HTMLElement): number {
  const cs = window.getComputedStyle(el);
  const toMs = (v: string): number => {
    if (!v) return 0;
    // Added optional chaining and fallback
    const valueStr = v.split(",")[0]?.trim() ?? ""; 
    if (valueStr.endsWith("ms")) return parseFloat(valueStr) || 0;
    if (valueStr.endsWith("s")) return (parseFloat(valueStr) || 0) * 1000;
    return parseFloat(valueStr) || 0;
  };
  return Math.max(
    toMs(cs.animationDuration) + toMs(cs.animationDelay),
    toMs(cs.transitionDuration) + toMs(cs.transitionDelay),
    0
  );
}

export type ModalSize = "small" | "medium" | "large" | "full" | string;
export type ModalVariant = "default" | "theater" | string;

export interface ModalProps<T = unknown> {
  title?: string;
  content?: ModalContent;
  onClose?: (data?: T) => void;
  onConfirm?: () => void;
  onOpen?: () => void;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  autofocusSelector?: string | null;
  returnDataOnClose?: boolean;
  actions?: (() => HTMLElement | DocumentFragment | null) | null;
  force?: boolean;
  variant?: ModalVariant;
  showHeader?: boolean;
  showCloseButton?: boolean;
  autofocus?: boolean;
  flushBody?: boolean;
  onBeforeClose?: () => void;
  onAfterClose?: () => void;
}

export interface ModalResult<T = unknown> {
  modal: HTMLElement;
  dialog: HTMLElement;
  overlay: HTMLElement;
  close: (data?: T) => void;
  closed?: Promise<T | undefined>;
}

export default function Modal<T = unknown>({
  title = "",
  content = "",
  onClose = undefined,
  onConfirm = undefined,
  onOpen = undefined,
  size = "medium",
  closeOnOverlayClick = true,
  autofocusSelector = null,
  returnDataOnClose = false,
  actions = null,
  force = false,
  variant = "default",
  showHeader = true,
  showCloseButton = true,
  autofocus = true,
  flushBody = false,
  onBeforeClose = undefined,
  onAfterClose = undefined
}: ModalProps<T> = {}): ModalResult<T> {
  const container = document.getElementById("modalcon");
  if (!container) {
    throw new Error('No element with id "modalcon" found');
  }

  activeModalCount += 1;
  uniqueInstanceIdCounter += 1;
  const instanceId = uniqueInstanceIdCounter;

  const zBase = 1000;
  const zIndex = zBase + activeModalCount * 10;

  const overlay = createElement("div", { class: "modal-overlay" }) as HTMLElement;
  const dialog = createElement("div", {
    class: "modal-dialog",
    tabindex: "-1",
    role: "dialog"
  }) as HTMLElement;

  const modal = createElement("div", {
    class: `modal modal--${size} modal--${variant}`,
    style: `z-index:${zIndex};`
  }, [overlay, dialog]) as HTMLElement;

  lockBodyScroll();
  const previouslyFocused = document.activeElement as HTMLElement | null;
  let isClosing = false;

  const cleanup = (data?: T): void => {
    if (isClosing) return;
    isClosing = true;

    onBeforeClose?.();

    modal.classList.remove("modal--fade-in");
    modal.classList.add("modal--fade-out");

    const ms = Math.max(
      simpleDurationMs(modal),
      simpleDurationMs(dialog),
      300
    );

    document.removeEventListener("keydown", trap, true);

    setTimeout(() => {
      modal.remove();

      activeModalCount = Math.max(0, activeModalCount - 1);
      unlockBodyScroll();

      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }

      onClose?.(data);
      onAfterClose?.();
    }, ms + 40);
  };

  const wrappedClose = (data?: T): void => {
    if (force || isClosing) return;
    cleanup(data);
  };

  if (closeOnOverlayClick && !force) {
    overlay.addEventListener("click", () => wrappedClose());
  }

  let titleId: string | null = null;
  if (showHeader) {
    const headerData = makeHeader(
      title,
      () => wrappedClose(),
      instanceId,
      showCloseButton
    );

    if (headerData) {
      dialog.appendChild(headerData.header);
      titleId = headerData.titleId;
    }
  }

  const { body, descId } = makeBody(content, instanceId);
  if (flushBody) {
    body.classList.add("modal-body--flush");
  }

  dialog.appendChild(body);

  if (typeof actions === "function") {
    const act = actions();
    if (act instanceof HTMLElement || act instanceof DocumentFragment) {
      const footer = createElement("div", { class: "modal-footer" }, [act]);
      dialog.appendChild(footer);
    }
  }

  dialog.setAttribute("aria-modal", "true");
  if (titleId) {
    dialog.setAttribute("aria-labelledby", titleId);
  }
  dialog.setAttribute("aria-describedby", descId);

  const focusableSel =
    "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

  function trap(e: KeyboardEvent): void {
    if (isClosing) {
      e.preventDefault();
      return;
    }

    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(focusableSel)
    ).filter(
      (n) =>
        !(n as HTMLInputElement | HTMLButtonElement).disabled &&
        n.tabIndex !== -1 &&
        n.offsetWidth > 0 &&
        n.offsetHeight > 0
    );

    if (e.key === "Escape" && !force) {
      e.preventDefault();
      wrappedClose();
      return;
    }

    if (e.key === "Enter" && onConfirm && variant !== "theater") {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputText =
        activeEl &&
        (activeEl.tagName === "TEXTAREA" ||
          (activeEl.tagName === "INPUT" &&
            !["button", "submit", "checkbox", "radio"].includes(
              (activeEl as HTMLInputElement).type
            )));

      if (!isInputText) {
        e.preventDefault();
        onConfirm();
        return;
      }
    }

    if (e.key === "Tab") {
      if (!focusables.length) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Bind capture listener to document to prevent focus leaks
  document.addEventListener("keydown", trap, true);

  modal.classList.add("modal--fade-in");
  container.appendChild(modal);

  onOpen?.();

  if (autofocus) {
    setTimeout(() => {
      if (autofocusSelector) {
        dialog.querySelector<HTMLElement>(autofocusSelector)?.focus();
      } else {
        const firstFocusable = dialog.querySelectorAll<HTMLElement>(focusableSel)[0];
        (firstFocusable || dialog).focus();
      }
    }, 0);
  }

  if (returnDataOnClose) {
    let resolve!: (value: T | undefined) => void;
    const closed = new Promise<T | undefined>((r) => (resolve = r));
    const close = (data?: T): void => {
      wrappedClose(data);
      resolve(data);
    };
    return { modal, dialog, overlay, close, closed };
  }

  return { modal, dialog, overlay, close: wrappedClose };
}