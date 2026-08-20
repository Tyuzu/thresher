import "../../../css/ui/Sightbox.css";
import { createElement } from "../../components/createElement.ts"; // Adjust path as needed
import { createIconButton } from "../../utils/svgIconButton";
import { xSVG } from "../svgs";

const LightBox = (div) => {
  // Prevent duplicate instance
  if (document.getElementById("sightbox")) {
    return;
  }

  // --- Close Button ---
  const closeButton = createIconButton({
    classSuffix: "sightbox-close",
    svgMarkup: xSVG,
    onClick: closeLightBox,
    label: "",
    ariaLabel: "Close"
  });

  // --- Content Container ---
  const content = createElement("div", {
    class: "sightbox-content",
    tabindex: "-1"
  }, [div, closeButton]);

  // --- Overlay ---
  const overlay = createElement("div", {
    class: "sightbox-overlay",
    events: {
      click: closeLightBox
    }
  });

  // --- Root LightBox Container ---
  const lightbox = createElement("div", {
    id: "sightbox",
    class: "sightbox"
  }, [overlay, content]);

  // Append DOM
  const appRoot = document.getElementById("app") || document.body;
  appRoot.appendChild(lightbox);

  // Focus trap
  content.focus();

  // History push
  history.pushState({ lightboxOpen: true }, "");

  // ESC + focus trap listener
  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeLightBox();
    } else if (e.key === "Tab") {
      // Trap focus inside content
      const focusable = [closeButton];
      const currentIndex = focusable.indexOf(document.activeElement);
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
  function onPopState(e) {
    if (e.state && e.state.lightboxOpen) {
      closeLightBox(true);
    }
  }

  // Clean close
  function closeLightBox(fromPop = false) {
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