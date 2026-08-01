import "../../../css/ui/SightboxZoom.css";
import { createZoomableMedia } from "./createZoomableMedia";
import { createElement } from "../../components/createElement";
import { createIconButton } from "../../utils/svgIconButton";
import { xSVG } from "../svgs";

const Sightbox = (mediaSrc, mediaType = "image") => {
  if (document.getElementById("sightbox")) {
    return;
  }

  // Preserve reference to whichever element opened the modal
  const previouslyFocusedElement = document.activeElement;

  const overlay = createElement("div", { 
    class: "sightboxz-overlay", 
    events: { click: () => closeSightbox() } 
  });

  const { container, resetZoomBtn } = createZoomableMedia(mediaSrc, mediaType);

  const closeButton = createIconButton({
    classSuffix: "sightboxz-close bonw",
    svgMarkup: xSVG,
    onClick: closeSightbox,
    label: "",
    ariaLabel: "Close"
  });

  const content = createElement("div", { 
    class: "sightboxz-content", 
    tabindex: "-1" 
  }, [container, closeButton, resetZoomBtn]);

  const sightbox = createElement("div", { 
    id: "sightbox", 
    class: "sightboxz",
    role: "dialog",
    "aria-modal": "true"
  }, [
    overlay,
    content
  ]);

  const appContainer = document.getElementById("app") || document.body;
  appContainer.appendChild(sightbox);

  // Focus the modal content shell on start
  content.focus();

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSightbox();
      return;
    } 
    
    if (e.key === "Tab") {
      // Included 'content' as it holds initial focus before user interaction
      const focusableElements = [content, closeButton, resetZoomBtn].filter(Boolean);
      const currentIndex = focusableElements.indexOf(document.activeElement);

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

  function closeSightbox() {
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