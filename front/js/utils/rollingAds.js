// rollingAds.js (module)
import { apiFetch } from "../api/api";
import Imagex from "../components/base/Imagex";
import { createElement } from "../components/createElement";
import { resolveImagePath, EntityType, PictureType } from "./imagePaths.js";

const adCache = {};
const adInstances = new Map(); // Tracks structural context configuration models
const DISPLAY_TIME = 5000; // rotate every 5s

/**
 * Builds the structural DOM trees safely for individual data maps
 */
function buildAdElement(currentAd) {
  const imageUrl = resolveImagePath(EntityType.ADVT, PictureType.THUMB, currentAd.image);

  return createElement("div", { class: "rolling-ad-area" }, [
    createElement(
      "a",
      {
        href: currentAd.link || "#",
        target: "_blank",
        rel: "noopener noreferrer", // Fixed: Added complete window isolation mitigation
        class: "rolling-ad-link",
      },
      [
        Imagex({
          src: imageUrl,
          alt: currentAd.title || "Ad",
          loading: "lazy",
          style: "width:100%;height:auto;object-fit:cover;border-radius:6px;display:block;",
        }),
        createElement("div", { class: "rolling-ad-caption" }, [
          createElement("h3", {}, [currentAd.title || ""]),
          createElement("p", {}, [currentAd.description || ""]),
        ]),
      ]
    ),
  ]);
}

/**
 * Handles transitioning structural layouts smoothly
 */
function transitionToAd(container, instance) {
  const currentAdData = instance.ads[instance.currentIndex];
  const newAdNode = buildAdElement(currentAdData);
  
  // Set starting point state for CSS animation sequence
  newAdNode.classList.add("fade-out");

  const existingAdNode = container.querySelector(".rolling-ad-area");

  if (existingAdNode) {
    existingAdNode.classList.remove("fade-in");
    existingAdNode.classList.add("fade-out");

    // Listen for completion of the fade out transition instead of guessing with a setTimeout
    existingAdNode.addEventListener("transitionend", function handleFade() {
      existingAdNode.removeEventListener("transitionend", handleFade);
      container.innerHTML = "";
      container.appendChild(newAdNode);
      
      // Force layout layout reflow processing to trigger entry animation
      void newAdNode.offsetWidth;
      newAdNode.classList.remove("fade-out");
      newAdNode.classList.add("fade-in");
    }, { once: true });
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
function initAdInstance(container, ads) {
  if (adInstances.has(container)) return;

  const instance = {
    ads,
    currentIndex: 0,
    intervalId: null,
    isPaused: false
  };

  adInstances.set(container, instance);

  const triggerNextRotation = () => {
    if (instance.isPaused) return;
    instance.currentIndex = (instance.currentIndex + 1) % instance.ads.length;
    transitionToAd(container, instance);
  };

  // Render initialization display layer
  transitionToAd(container, instance);
  instance.intervalId = setInterval(triggerNextRotation, DISPLAY_TIME);

  // FIXED: Event listeners are attached exactly once per initialization
  container.addEventListener("mouseenter", () => {
    instance.isPaused = true;
    if (instance.intervalId) {
      clearInterval(instance.intervalId);
      instance.intervalId = null;
    }
  });

  container.addEventListener("mouseleave", () => {
    instance.isPaused = false;
    if (!instance.intervalId) {
      instance.intervalId = setInterval(triggerNextRotation, DISPLAY_TIME);
    }
  });
}

function loadAndDisplayRollingAds(container, category = "default") {
  if (adCache[category]) {
    initAdInstance(container, adCache[category]);
    return;
  }

  apiFetch(`/sda/sda?category=${category}`)
    .then((ads) => {
      // Normalise potential wrapping array variants
      const dataPayload = ads?.data || ads;

      if (!Array.isArray(dataPayload) || !dataPayload.length) {
        container.remove();
        return;
      }
      adCache[category] = dataPayload;
      initAdInstance(container, dataPayload);
    })
    .catch((error) => {
      console.error(`Error fetching rolling ads for category '${category}':`, error);
      container.remove();
    });
}

export function initRollingAds() {
  const adElements = document.querySelectorAll(".rolling-advertisement");
  if (adElements.length === 0) {
    console.warn("No rolling advertisement containers found!");
    return;
  }

  adElements.forEach((container) => {
    const category = container.getAttribute("data-category") || "default";
    loadAndDisplayRollingAds(container, category);
  });
}