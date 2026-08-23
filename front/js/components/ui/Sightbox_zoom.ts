import "../../../css/ui/SightboxZoom.css";
import { createZoomableMedia, ZoomableMediaType } from "./createZoomableMedia.js";
import { createElement } from "../../components/createElement.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import { xSVG } from "../svgs/featherSVGs.js";

/**
 * Creates and displays an accessible, zoomable media lightbox modal with a focus trap.
 */
const Sightbox = (
  mediaSrc: string,
  mediaType: ZoomableMediaType = "image"
): HTMLDivElement | void => {
  if (document.getElementById("sightbox")) {
    return;
  }

  // Preserve reference to whichever element opened the modal
  const previouslyFocusedElement = document.activeElement as HTMLElement | null;

  const overlay = createElement("div", {
    class: "sightboxz-overlay",
    events: { click: () => closeSightbox() },
  });

  const { container, resetZoomBtn } = createZoomableMedia(mediaSrc, mediaType);

  const closeButton = createIconButton({
    classSuffix: "sightboxz-close bonw",
    svgMarkup: xSVG,
    onClick: () => closeSightbox(),
    label: "",
    ariaLabel: "Close",
  }) as HTMLElement;

  const contentChildren: HTMLElement[] = [container, closeButton];
  if (resetZoomBtn) {
    contentChildren.push(resetZoomBtn as HTMLElement);
  }

  const content = createElement(
    "div",
    {
      class: "sightboxz-content",
      tabindex: "-1",
    },
    contentChildren
  ) as HTMLDivElement;

  const sightbox = createElement(
    "div",
    {
      id: "sightbox",
      class: "sightboxz",
      role: "dialog",
      "aria-modal": "true",
    },
    [overlay, content]
  ) as HTMLDivElement;

  const appContainer = document.getElementById("app") || document.body;
  appContainer.appendChild(sightbox);

  // Focus the modal content shell on start
  content.focus();

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSightbox();
      return;
    }

    if (e.key === "Tab") {
      // Included 'content' as it holds initial focus before user interaction
      const focusableElements = ([content, closeButton, resetZoomBtn] as (HTMLElement | null)[]).filter(
        (el): el is HTMLElement => Boolean(el)
      );
      
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

      if (e.shiftKey) {
        // Backward navigation: if at the beginning, loop to the end
        if (currentIndex <= 0) {
          e.preventDefault();
          focusableElements[focusableElements.length - 1].focus();
        }
      } else {
        // Forward navigation: if at the end, loop to the beginning
        if (currentIndex === -1 || currentIndex === focusableElements.length - 1) {
          e.preventDefault();
          focusableElements[0].focus();
        }
      }
    }
  }

  function closeSightbox(): void {
    if (!document.body.contains(sightbox)) {
      return;
    }

    window.removeEventListener("keydown", onKeyDown);
    sightbox.remove();

    // Smoothly restore client focus target state
    if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === "function") {
      previouslyFocusedElement.focus();
    }
  }

  window.addEventListener("keydown", onKeyDown);

  return sightbox;
};

export default Sightbox;