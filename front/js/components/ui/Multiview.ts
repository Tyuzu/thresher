import "../../../css/ui/MultiView.css";
import { createElement } from "../../components/createElement.ts"; // Adjust path as needed
import { SRC_URL } from "../../api/api.ts";

const MultiView = (images) => {
  if (!images || images.length < 2) return null;

  let isSliderDragging = false;
  let currentPercentage = 50;

  // Base image layer
  const bottomImg = createElement("img", {
    src: `${SRC_URL}/${images[0]}`,
    alt: "Original Base Image",
    style: {
      display: "block",
      width: "100%",
      height: "auto"
    }
  });

  // Comparison image layer
  const topImg = createElement("img", {
    src: `${SRC_URL}/${images[1]}`,
    alt: "Comparison Highlight Image",
    style: {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      pointerEvents: "none",
      clipPath: "inset(0 50% 0 0)"
    }
  });

  // Interactive split slider handle
  const slider = createElement("div", {
    class: "multiview-slider",
    role: "slider",
    tabindex: "0",
    "aria-label": "Image comparison split handle",
    "aria-valuenow": "50",
    "aria-valuemin": "0",
    "aria-valuemax": "100",
    style: {
      position: "absolute",
      top: "0",
      left: "50%",
      width: "4px",
      height: "100%",
      background: "#ffffff",
      cursor: "ew-resize",
      transform: "translateX(-50%)"
    }
  });

  // Container holding media & slider
  const multiContainer = createElement("div", {
    class: "multiview-container",
    style: {
      position: "relative",
      overflow: "hidden"
    }
  }, [bottomImg, topImg, slider]);

  // Close button setup
  const closeButton = createElement("button", {
    class: "multiview-close-btn",
    "aria-label": "Close comparison view",
    events: {
      click: () => destroy()
    }
  }, ["✖"]);

  // Overlay inner content shell
  const content = createElement("div", {
    class: "multiview-content"
  }, [multiContainer, closeButton]);

  // Root overlay container
  const isDarkMode = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const multiview = createElement("div", {
    class: `multiview-overlay${isDarkMode ? " dark-mode" : ""}`,
    style: {
      opacity: "0",
      transition: "opacity 0.3s ease"
    }
  }, [content]);

  // Dynamic layout calculation handlers
  const updateSplitPosition = (percentage) => {
    currentPercentage = Math.max(0, Math.min(100, percentage));
    slider.style.left = `${currentPercentage}%`;
    topImg.style.clipPath = `inset(0 ${100 - currentPercentage}% 0 0)`;
    slider.setAttribute("aria-valuenow", Math.round(currentPercentage).toString());
  };

  const handleMove = (clientX) => {
    const containerRect = multiContainer.getBoundingClientRect();
    if (containerRect.width === 0) return;
    const percentage = ((clientX - containerRect.left) / containerRect.width) * 100;
    updateSplitPosition(percentage);
  };

  // Event listeners
  const onMouseMove = (e) => { if (isSliderDragging) handleMove(e.clientX); };
  const onMouseUp = () => { isSliderDragging = false; };
  const onMouseDown = () => { isSliderDragging = true; };

  const onTouchMove = (e) => {
    if (!isSliderDragging) return;
    if (e.touches.length > 0) handleMove(e.touches[0].clientX);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      updateSplitPosition(currentPercentage - 5);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      updateSplitPosition(currentPercentage + 5);
    }
  };

  // Bind Event Listeners
  slider.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  slider.addEventListener("touchstart", onMouseDown, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: true });
  document.addEventListener("touchend", onMouseUp);
  slider.addEventListener("keydown", onKeyDown);

  const destroy = () => {
    multiview.style.opacity = "0";
    setTimeout(() => {
      // Explicit cleanup to prevent memory leaks
      slider.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      slider.removeEventListener("touchstart", onMouseDown);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onMouseUp);
      slider.removeEventListener("keydown", onKeyDown);

      if (multiview.parentNode) {
        multiview.parentNode.removeChild(multiview);
      }
    }, 300);
  };

  const appRoot = document.getElementById("app");
  if (appRoot) {
    appRoot.appendChild(multiview);
  }

  // Smooth entry transition execution
  requestAnimationFrame(() => {
    multiview.style.opacity = "1";
  });

  return {
    element: multiview,
    destroy: destroy
  };
};

export default MultiView;