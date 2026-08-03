import { JS_SRC, CSS_HREF } from "./constants.js";
import { createElement } from "../../components/createElement.js";

let scriptPromise = null;
let cssPromise = null;

export function loadScript(src = JS_SRC) {
  if (window.Cropper) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = createElement("script", { src });
    script.async = true;

    script.addEventListener("load", () => resolve(script), { once: true });
    script.addEventListener("error", () => {
      scriptPromise = null;
      reject(new Error(`Failed to load script: ${src}`));
    }, { once: true });

    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function loadCss(href = CSS_HREF) {
  if (cssPromise) return cssPromise;

  cssPromise = new Promise((resolve, reject) => {
    const link = createElement("link", { rel: "stylesheet", href });

    link.addEventListener("load", () => resolve(link), { once: true });
    link.addEventListener("error", () => {
      cssPromise = null;
      reject(new Error(`Failed to load stylesheet: ${href}`));
    }, { once: true });

    document.head.appendChild(link);
  });

  return cssPromise;
}

export async function ensureCropper() {
  await Promise.all([loadCss(), loadScript()]);
}