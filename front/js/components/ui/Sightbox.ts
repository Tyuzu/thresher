import "../../../css/ui/Sightbox.css";
import { createElement } from "../../components/createElement.ts"; // Adjust path as needed
import { createIconButton } from "../../utils/svgIconButton";
import Imagex from "../base/Imagex";
import { xSVG } from "../svgs";

const Sightbox = (mediaSrc, mediaType = "image") => {
  // Prevent duplicate instance
  if (document.getElementById("sightbox")) {
    return;
  }

  // --- Close Buttons ---
  const closeButton = createIconButton({
    classSuffix: "sightbox-close",
    svgMarkup: xSVG,
    onClick: closeSightbox,
    label: "",
    ariaLabel: "Close"
  });

  // --- Media Element ---
  let mediaEl;
  if (mediaType === "image") {
    mediaEl = Imagex({
      src: mediaSrc,
      alt: "Sightbox Image",
      classes: "zoomable-image",
    });
  } else if (mediaType === "video") {
    mediaEl = createElement("video", {
      src: mediaSrc,
      controls: true,
      muted: true
    });
  }

  // --- Shell Layout Construction ---
  const content = createElement(
    "div",
    {
      class: "sightbox-content",
      tabindex: "-1"
    },
    [mediaEl, closeButton]
  );

  const overlay = createElement("div", {
    class: "sightbox-overlay",
    events: {
      click: closeSightbox
    }
  });

  const sightbox = createElement(
    "div",
    {
      id: "sightbox",
      class: "sightbox"
    },
    [overlay, content]
  );

  // Append DOM
  const appRoot = document.getElementById("app") || document.body;
  appRoot.appendChild(sightbox);

  // Focus trap
  content.focus();

  // History push
  history.pushState({ sightboxOpen: true }, "");

  // ESC + focus trap listener
  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSightbox();
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
    if (e.state && e.state.sightboxOpen) {
      closeSightbox(true);
    }
  }

  // Clean close
  function closeSightbox(fromPop = false) {
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