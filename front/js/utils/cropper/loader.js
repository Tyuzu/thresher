// loader.js

import {
  JS_SRC,
  CSS_HREF
} from "./constants.js";

import { createElement } from "../../components/createElement.js";

let addedScript = null;
let addedLink = null;

export function getAddedAssets() {
  return {
    script: addedScript,
    link: addedLink
  };
}

export function clearAddedAssets() {
  addedScript = null;
  addedLink = null;
}

export function loadScript(src = JS_SRC) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);

    if (existing) {
      if (window.Cropper) {
        resolve(existing);
        return;
      }

      existing.addEventListener(
        "load",
        () => resolve(existing),
        { once: true }
      );

      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load CropperJS script")),
        { once: true }
      );

      return;
    }

    const script = createElement("script", {
      src
    });

    script.async = true;

    script.addEventListener(
      "load",
      () => resolve(script),
      { once: true }
    );

    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load script: ${src}`)),
      { once: true }
    );

    addedScript = script;

    document.head.appendChild(script);
  });
}

export function loadCss(href = CSS_HREF) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[href="${href}"]`);

    if (existing) {
      resolve(existing);
      return;
    }

    const link = createElement("link", {
      rel: "stylesheet",
      href
    });

    link.dataset.cropperCss = "1";

    link.addEventListener(
      "load",
      () => resolve(link),
      { once: true }
    );

    link.addEventListener(
      "error",
      () => reject(new Error(`Failed to load stylesheet: ${href}`)),
      { once: true }
    );

    addedLink = link;

    document.head.appendChild(link);
  });
}

export async function ensureCropper() {
  if (window.Cropper) {
    await loadCss();
    return;
  }

  await Promise.all([
    loadCss(),
    loadScript()
  ]);
}