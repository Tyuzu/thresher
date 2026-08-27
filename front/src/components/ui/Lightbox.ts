import "../../../css/ui/Sightbox.css";
import { createElement } from "../../components/createElement.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import { xSVG } from "../svgs/featherSVGs";

export type LightBoxContent = HTMLElement | DocumentFragment | Node;

const LightBox = (div: LightBoxContent): HTMLDivElement | undefined => {
  // Prevent duplicate instance
  if (document.getElementById("sightbox")) {
    return undefined;
  }

  // --- Close Button ---
  const closeButton = createIconButton({
    classSuffix: "sightbox-close",
    svgMarkup: xSVG,
    onClick: () => closeLightBox(),
    label: "",
    ariaLabel: "Close",
  }) as HTMLElement;

  // --- Content Container ---
  const content = createElement("div", {
    class: "sightbox-content",
    tabindex: "-1",
  }, [div, closeButton]) as HTMLDivElement;

  // --- Overlay ---
  const overlay = createElement("div", {
    class: "sightbox-overlay",
    events: {
      click: () => closeLightBox(),
    },
  });

  // --- Root LightBox Container ---
  const lightbox = createElement("div", {
    id: "sightbox",
    class: "sightbox",
  }, [overlay, content]) as HTMLDivElement;

  // Append DOM
  const appRoot = document.getElementById("app") || document.body;
  appRoot.appendChild(lightbox);

  // Focus trap
  content.focus();

  // History push
  history.pushState({ lightboxOpen: true }, "");

  // ESC + focus trap listener
  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      closeLightBox();
    } else if (e.key === "Tab") {
      // Trap focus inside content
      const focusable = [closeButton];
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && currentIndex === 0) {
        e.preventDefault();
        const lastEl = focusable[focusable.length - 1];
        if (lastEl) lastEl.focus();
      } else if (!e.shiftKey && currentIndex === focusable.length - 1) {
        e.preventDefault();
        const firstEl = focusable[0];
        if (firstEl) firstEl.focus();
      }
    }
  }

  // Back button listener
  function onPopState(e: PopStateEvent): void {
    if (e.state && (e.state as { lightboxOpen?: boolean }).lightboxOpen) {
      closeLightBox(true);
    }
  }

  // Clean close
  function closeLightBox(fromPop = false): void {
    if (!document.body.contains(lightbox)) {
      return;
    }
    lightbox.remove();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("popstate", onPopState);
    if (!fromPop) {
      history.back();
    }
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("popstate", onPopState);

  return lightbox;
};

export default LightBox;