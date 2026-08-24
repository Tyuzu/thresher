import "../../../css/ui/Sightbox.css";
import { createElement } from "../../components/createElement.js"; // Adjust path as needed
import { createIconButton } from "../../utils/svgIconButton.js";
import Imagex from "../base/Imagex.js";
import { xSVG } from "../svgs/featherSVGs";

// ---- Types & Interfaces ----

export type SightboxMediaType = "image" | "video";

/**
 * Creates and displays a lightbox modal for images or videos.
 */
const Sightbox = (
  mediaSrc: string,
  mediaType: SightboxMediaType = "image"
): HTMLDivElement | void => {
  // Prevent duplicate instance
  if (document.getElementById("sightbox")) {
    return;
  }

  // --- Close Buttons ---
  const closeButton = createIconButton({
    classSuffix: "sightbox-close",
    svgMarkup: xSVG,
    onClick: () => closeSightbox(),
    label: "",
    ariaLabel: "Close",
  }) as HTMLElement;

  // --- Media Element ---
  let mediaEl: HTMLElement | undefined;
  if (mediaType === "image") {
    mediaEl = Imagex({
      src: mediaSrc,
      alt: "Sightbox Image",
      classes: "zoomable-image",
    }) as HTMLElement;
  } else if (mediaType === "video") {
    mediaEl = createElement("video", {
      src: mediaSrc,
      controls: true,
      muted: true,
    }) as HTMLVideoElement;
  }

  // --- Shell Layout Construction ---
  const content = createElement(
    "div",
    {
      class: "sightbox-content",
      tabindex: "-1",
    },
    mediaEl ? [mediaEl, closeButton] : [closeButton]
  ) as HTMLDivElement;

  const overlay = createElement("div", {
    class: "sightbox-overlay",
    events: {
      click: () => closeSightbox(),
    },
  });

  const sightbox = createElement(
    "div",
    {
      id: "sightbox",
      class: "sightbox",
    },
    [overlay, content]
  ) as HTMLDivElement;

  // Append DOM
  const appRoot = document.getElementById("app") || document.body;
  appRoot.appendChild(sightbox);

  // Focus trap
  content.focus();

  // History push
  history.pushState({ sightboxOpen: true }, "");

  // ESC + focus trap listener
  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSightbox();
    } else if (e.key === "Tab") {
      // Trap focus inside content
      const focusable: HTMLElement[] = [closeButton];
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && currentIndex === 0) {
        e.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!e.shiftKey && currentIndex === focusable.length - 1) {
        e.preventDefault();
        focusable[0].focus();
      }
    }
  }

  // Back button listener
  function onPopState(e: PopStateEvent): void {
    if (e.state && (e.state as { sightboxOpen?: boolean }).sightboxOpen) {
      closeSightbox(true);
    }
  }

  // Clean close
  function closeSightbox(fromPop = false): void {
    if (!document.body.contains(sightbox)) {
      return;
    }
    sightbox.remove();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("popstate", onPopState);
    if (!fromPop) {
      history.back();
    }
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("popstate", onPopState);

  return sightbox;
};

export default Sightbox;