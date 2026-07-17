import "../../../css/ui/Modal.css";
import { createElement } from "../../components/createElement.js";

let activeModalCount = 0;
let uniqueInstanceIdCounter = 0;
let bodyStyleEl = null;

function lockBodyScroll() {
  if (!bodyStyleEl) {
    bodyStyleEl = createElement("style", { id: "modal-body-style" }, [
      document.createTextNode("body { overflow: hidden !important; }")
    ]);
    document.head.appendChild(bodyStyleEl);
  }
}

function unlockBodyScroll() {
  if (activeModalCount === 0 && bodyStyleEl) {
    bodyStyleEl.remove();
    bodyStyleEl = null;
  }
}

function makeHeader(title, onClose, instanceId, showCloseButton) {
  if (!title && !showCloseButton) {
    return null;
  }

  const heading = title
    ? createElement("h3", { id: `modal-title-${instanceId}` }, [title])
    : null;

  const closeBtn = showCloseButton
    ? createElement("button", {
        class: "modal-close",
        "aria-label": "Close"
      }, ["×"])
    : null;

  closeBtn?.addEventListener("click", onClose);

  return {
    header: createElement(
      "div",
      { class: "modal-header" },
      [heading, closeBtn].filter(Boolean)
    ),
    titleId: heading?.id || null
  };
}

function makeBody(content, instanceId) {
  const node = typeof content === "function" ? content() : content;
  let children = [];

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
  );

  return { body, descId: body.id };
}

function simpleDurationMs(el) {
  const cs = window.getComputedStyle(el);
  const toMs = v => {
    if (!v) return 0;
    v = v.split(",")[0].trim();
    if (v.endsWith("ms")) return parseFloat(v) || 0;
    if (v.endsWith("s")) return (parseFloat(v) || 0) * 1000;
    return parseFloat(v) || 0;
  };
  return Math.max(
    toMs(cs.animationDuration) + toMs(cs.animationDelay),
    toMs(cs.transitionDuration) + toMs(cs.transitionDelay),
    0
  );
}

export default function Modal({
  title = "",
  content = "",
  onClose = null,
  onConfirm = null,
  onOpen = null,
  size = "medium",
  closeOnOverlayClick = true,
  autofocusSelector = null,
  returnDataOnClose = false,
  actions = null,
  force = false,

  variant = "default",          // default | theater | alert | sheet
  showHeader = true,
  showCloseButton = true,
  autofocus = true,
  flushBody = false,
  onBeforeClose = null,
  onAfterClose = null
} = {}) {
  activeModalCount += 1;
  uniqueInstanceIdCounter += 1;
  
  // Fixed: Collision-free instance IDs separate from active layout count
  const instanceId = uniqueInstanceIdCounter;

  const zBase = 1000;
  const zIndex = zBase + activeModalCount * 10;

  const overlay = createElement("div", { class: "modal-overlay" });
  const dialog = createElement("div", {
    class: "modal-dialog",
    tabindex: "-1",
    role: "dialog"
  });

  const modal = createElement("div", {
    class: `modal modal--${size} modal--${variant}`,
    style: `z-index:${zIndex};`
  }, [overlay, dialog]);

  lockBodyScroll();
  const previouslyFocused = document.activeElement;

  // Track closure execution to block duplicate invocation cycles
  let isClosing = false;

  const cleanup = () => {
    if (isClosing) return;
    isClosing = true;

    modal.classList.remove("modal--fade-in");
    modal.classList.add("modal--fade-out");

    const ms = Math.max(
      simpleDurationMs(modal),
      simpleDurationMs(dialog),
      300
    );

    setTimeout(() => {
      // Fixed: Keydown trap dismantled only when element leaves the view layer
      modal.removeEventListener("keydown", trap);
      modal.remove();
      
      activeModalCount = Math.max(0, activeModalCount - 1);
      unlockBodyScroll();
      
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
      onAfterClose?.();
    }, ms + 40);
  };

  const wrappedClose = (data) => {
    if (force || isClosing) return;
    onBeforeClose?.();
    cleanup();
    if (returnDataOnClose) {
      onClose?.(data);
    } else {
      onClose?.();
    }
  };

  if (closeOnOverlayClick && !force) {
    overlay.addEventListener("click", () => wrappedClose());
  }

  let titleId = null;
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

  function trap(e) {
    // Block input evaluations if the component is performing its exit animation
    if (isClosing) {
      e.preventDefault();
      return;
    }

    const focusables = Array
      .from(dialog.querySelectorAll(focusableSel))
      .filter(n => !n.disabled && n.tabIndex !== -1 && n.offsetWidth > 0 && n.offsetHeight > 0);

    if (e.key === "Escape" && !force) {
      e.preventDefault();
      wrappedClose();
      return;
    }

    if (e.key === "Enter" && onConfirm && variant !== "theater") {
      // Direct text editing inputs should pass standard Enter events
      if (document.activeElement.tagName === "TEXTAREA" || document.activeElement.tagName === "INPUT") {
        return;
      }
      e.preventDefault();
      onConfirm();
      return;
    }

    if (e.key === "Tab") {
      if (!focusables.length) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Fixed: Listener bound onto high-level root wrapper node capturing peripheral paths
  modal.addEventListener("keydown", trap);

  const container = document.getElementById("modalcon");
  if (!container) {
    modal.removeEventListener("keydown", trap);
    activeModalCount = Math.max(0, activeModalCount - 1);
    unlockBodyScroll();
    throw new Error('No element with id "modalcon" found');
  }

  modal.classList.add("modal--fade-in");
  container.appendChild(modal);

  onOpen?.();

  if (autofocus) {
    setTimeout(() => {
      if (autofocusSelector) {
        dialog.querySelector(autofocusSelector)?.focus();
      } else {
        dialog.focus();
      }
    }, 0);
  }

  if (returnDataOnClose) {
    let resolve;
    const closed = new Promise(r => (resolve = r));
    const close = (data) => {
      wrappedClose(data);
      resolve(data);
    };
    return { modal, dialog, overlay, close, closed };
  }

  return { modal, dialog, overlay, close: wrappedClose };
}