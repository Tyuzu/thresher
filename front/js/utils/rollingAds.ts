import { apiFetch } from "../api/api.js";
import Imagex from "../components/base/Imagex.js";
import { createElement } from "../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "./imagePaths.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */

export interface RollingAdData {
  title?: string;
  description?: string;
  image?: string;
  link?: string;
}

interface AdInstance {
  ads: RollingAdData[];
  currentIndex: number;
  intervalId: ReturnType<typeof setInterval> | null;
  isPaused: boolean;
}

/* =========================================================
   STATE & CONSTANTS
========================================================= */

const adCache: Record<string, RollingAdData[]> = {};
const adInstances = new Map<HTMLElement, AdInstance>();
const DISPLAY_TIME = 5000; // rotate every 5s

/* =========================================================
   DOM BUILDERS & ROTATION ENGINE
========================================================= */

/**
 * Builds the structural DOM trees safely for individual data maps
 */
function buildAdElement(currentAd: RollingAdData): HTMLElement {
  const imageUrl = resolveImagePath(EntityType.ADVT, PictureType.THUMB, currentAd.image || "");

  const imageElement = Imagex({
    src: imageUrl,
    alt: currentAd.title || "Ad",
    loading: "lazy"
  }) as HTMLElement;

  return createElement("div", { class: "rolling-ad-area" }, [
    createElement(
      "a",
      {
        href: currentAd.link || "#",
        target: "_blank",
        rel: "noopener noreferrer", // Window isolation mitigation
        class: "rolling-ad-link"
      },
      [
        imageElement,
        createElement("div", { class: "rolling-ad-caption" }, [
          createElement("h3", {}, [currentAd.title || ""]),
          createElement("p", {}, [currentAd.description || ""])
        ])
      ]
    ) as HTMLElement
  ]) as HTMLElement;
}

/**
 * Handles transitioning structural layouts smoothly
 */
function transitionToAd(container: HTMLElement, instance: AdInstance): void {
  const currentAdData = instance.ads[instance.currentIndex];
  if (!currentAdData) return;

  const newAdNode = buildAdElement(currentAdData);

  // Set starting point state for CSS animation sequence
  newAdNode.classList.add("fade-out");

  const existingAdNode = container.querySelector<HTMLElement>(".rolling-ad-area");

  if (existingAdNode) {
    existingAdNode.classList.remove("fade-in");
    existingAdNode.classList.add("fade-out");

    // Listen for completion of the fade out transition instead of guessing with a setTimeout
    existingAdNode.addEventListener(
      "transitionend",
      function handleFade() {
        existingAdNode.removeEventListener("transitionend", handleFade);
        container.innerHTML = "";
        container.appendChild(newAdNode);

        // Force layout reflow processing to trigger entry animation
        void newAdNode.offsetWidth;
        newAdNode.classList.remove("fade-out");
        newAdNode.classList.add("fade-in");
      },
      { once: true }
    );
  } else {
    container.innerHTML = "";
    container.appendChild(newAdNode);
    void newAdNode.offsetWidth;
    newAdNode.classList.remove("fade-out");
    newAdNode.classList.add("fade-in");
  }
}

/**
 * Registers tracking loops and hooks persistent event observers once
 */
function initAdInstance(container: HTMLElement, ads: RollingAdData[]): void {
  if (adInstances.has(container)) return;

  const instance: AdInstance = {
    ads,
    currentIndex: 0,
    intervalId: null,
    isPaused: false
  };

  adInstances.set(container, instance);

  const triggerNextRotation = (): void => {
    if (instance.isPaused) return;
    instance.currentIndex = (instance.currentIndex + 1) % instance.ads.length;
    transitionToAd(container, instance);
  };

  // Render initialization display layer
  transitionToAd(container, instance);
  instance.intervalId = setInterval(triggerNextRotation, DISPLAY_TIME);

  // Attach event listeners exactly once per initialization
  container.addEventListener("mouseenter", () => {
    instance.isPaused = true;
    if (instance.intervalId !== null) {
      clearInterval(instance.intervalId);
      instance.intervalId = null;
    }
  });

  container.addEventListener("mouseleave", () => {
    instance.isPaused = false;
    if (instance.intervalId === null) {
      instance.intervalId = setInterval(triggerNextRotation, DISPLAY_TIME);
    }
  });
}

function loadAndDisplayRollingAds(container: HTMLElement, category = "default"): void {
  if (adCache[category]) {
    initAdInstance(container, adCache[category]!);
    return;
  }

  apiFetch(`/sda/sda?category=${category}`)
    .then((ads: unknown) => {
      // Normalise potential wrapping array variants
      const dataPayload = (ads as { data?: RollingAdData[] })?.data || (ads as RollingAdData[]);

      if (!Array.isArray(dataPayload) || !dataPayload.length) {
        container.remove();
        return;
      }
      adCache[category] = dataPayload;
      initAdInstance(container, dataPayload);
    })
    .catch((error: unknown) => {
      console.error(`Error fetching rolling ads for category '${category}':`, error);
      container.remove();
    });
}

export function initRollingAds(): void {
  const adElements = document.querySelectorAll<HTMLElement>(".rolling-advertisement");
  if (adElements.length === 0) {
    console.warn("No rolling advertisement containers found!");
    return;
  }

  adElements.forEach((container) => {
    const category = container.getAttribute("data-category") || "default";
    loadAndDisplayRollingAds(container, category);
  });
}