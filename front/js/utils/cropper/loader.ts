import { JS_SRC, CSS_HREF } from "./constants.js";
import { createElement } from "../../components/createElement.js";

let scriptPromise: Promise<HTMLScriptElement> | null = null;
let cssPromise: Promise<HTMLLinkElement> | null = null;

export function loadScript(src: string = JS_SRC): Promise<HTMLScriptElement> {
  if (window.Cropper) {
    return Promise.resolve(document.createElement("script"));
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<HTMLScriptElement>((resolve, reject) => {
    const script = createElement("script", { src }) as HTMLScriptElement;
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

export function loadCss(href: string = CSS_HREF): Promise<HTMLLinkElement> {
  if (cssPromise) return cssPromise;

  cssPromise = new Promise<HTMLLinkElement>((resolve, reject) => {
    const link = createElement("link", { rel: "stylesheet", href }) as HTMLLinkElement;

    link.addEventListener("load", () => resolve(link), { once: true });
    link.addEventListener("error", () => {
      cssPromise = null;
      reject(new Error(`Failed to load stylesheet: ${href}`));
    }, { once: true });

    document.head.appendChild(link);
  });

  return cssPromise;
}

export async function ensureCropper(): Promise<void> {
  await Promise.all([loadCss(), loadScript()]);
}