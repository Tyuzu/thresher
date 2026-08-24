import "../../../css/ui/MultiView.css";
// @ts-ignore - Assuming createElement doesn't have strict type definitions exported
import { createElement } from "../../components/createElement.js"; 
import { SRC_URL } from "../../api/api.js";

export interface MultiViewResult {
  element: HTMLDivElement;
  destroy: () => void;
}

const MultiView = (images: string[]): MultiViewResult | null => {
  if (!images || images.length < 2) return null;

  let isSliderDragging: boolean = false;
  let currentPercentage: number = 50;

  // Base image layer
  const bottomImg = createElement("img", {
    src: `${SRC_URL}/${images[0]}`,
    alt: "Original Base Image",
    style: {
      display: "block",
      width: "100%",
      height: "auto"
    }
  }) as HTMLImageElement;

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
  }) as HTMLImageElement;

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
      transform: "translateX(-50%)",
      zIndex: "2"
    }
  }) as HTMLDivElement;

  // Container holding media & slider
  const multiContainer = createElement("div", {
    class: "multiview-container",
    style: {
      position: "relative",
      overflow: "hidden"
    }
  }, [bottomImg, topImg, slider]) as HTMLDivElement;

  // Close button setup
  const closeButton = createElement("button", {
    class: "multiview-close-btn",
    "aria-label": "Close comparison view",
    events: {
      click: () => destroy()
    }
  }, ["✖"]) as HTMLButtonElement;

  // Overlay inner content shell
  const content = createElement("div", {
    class: "multiview-content"
  }, [multiContainer, closeButton]) as HTMLDivElement;

  // Root overlay container
  const isDarkMode: boolean = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const multiview = createElement("div", {
    class: `multiview-overlay${isDarkMode ? " dark-mode" : ""}`,
    style: {
      opacity: "0",
      transition: "opacity 0.3s ease",
      position: "fixed",
      inset: "0",
      zIndex: "9999"
    }
  }, [content]) as HTMLDivElement;

  // Dynamic layout calculation handlers
  const updateSplitPosition = (percentage: number): void => {
    currentPercentage = Math.max(0, Math.min(100, percentage));
    slider.style.left = `${currentPercentage}%`;
    topImg.style.clipPath = `inset(0 ${100 - currentPercentage}% 0 0)`;
    slider.setAttribute("aria-valuenow", Math.round(currentPercentage).toString());
  };

  const handleMove = (clientX: number): void => {
    const containerRect = multiContainer.getBoundingClientRect();
    if (containerRect.width === 0) return;
    const percentage = ((clientX - containerRect.left) / containerRect.width) * 100;
    updateSplitPosition(percentage);
  };

  // Event listeners
  const onMouseMove = (e: MouseEvent): void => { 
    if (isSliderDragging) handleMove(e.clientX); 
  };
  
  const onMouseUp = (): void => { 
    isSliderDragging = false; 
  };
  
  const onMouseDown = (): void => { 
    isSliderDragging = true; 
  };

  const onTouchMove = (e: TouchEvent): void => {
    if (!isSliderDragging) return;
    e.preventDefault(); 
    if (e.touches.length > 0) handleMove(e.touches[0].clientX);
  };

  const onSliderKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      updateSplitPosition(currentPercentage - 5);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      updateSplitPosition(currentPercentage + 5);
    }
  };

  const onGlobalKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      destroy();
    }
  };

  // Bind Event Listeners
  slider.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  slider.addEventListener("touchstart", onMouseDown, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: false }); 
  document.addEventListener("touchend", onMouseUp);
  slider.addEventListener("keydown", onSliderKeyDown);
  
  document.addEventListener("keydown", onGlobalKeyDown);

  const destroy = (): void => {
    multiview.style.opacity = "0";
    setTimeout(() => {
      // Explicit cleanup to prevent memory leaks
      slider.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      slider.removeEventListener("touchstart", onMouseDown);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onMouseUp);
      slider.removeEventListener("keydown", onSliderKeyDown);
      document.removeEventListener("keydown", onGlobalKeyDown);

      if (multiview.parentNode) {
        multiview.parentNode.removeChild(multiview);
      }
    }, 300);
  };

  const appRoot: HTMLElement | null = document.getElementById("app");
  if (appRoot) {
    appRoot.appendChild(multiview);
  }

  // Smooth entry transition execution
  requestAnimationFrame(() => {
    multiview.style.opacity = "1";
    slider.focus(); 
  });

  return {
    element: multiview,
    destroy: destroy
  };
};

export default MultiView;