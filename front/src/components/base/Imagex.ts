import { createElement } from "../createElement.js";

export interface ImagexAttributes extends Omit<Partial<HTMLImageElement>, "events" | "loading" | "decoding"> {
  fallback?: string;
  decodeAsync?: boolean;
  classes?: string;
  class?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  events?: Record<string, (event: Event) => void> & {
    error?: (event: Event) => void;
  };
  [key: string]: unknown;
}

/**
 * Imagex component
 * - Async image decoding
 * - Single fallback attempt
 * - Prevents infinite error loops
 * - Leverages declarative events and attributes from createElement
 */
const Imagex = (attributes: ImagexAttributes = {}): HTMLElement => {
  const {
    fallback = "/assets/icon-192.png",
    decodeAsync = true,
    classes,
    class: className,
    loading = "lazy",
    events = {},
    ...rest
  } = attributes;

  // 1. Normalize class strings for createElement to parse cleanly
  const mergedClass = [className, classes].filter(Boolean).join(" ").trim();
  if (mergedClass) {
    rest.class = mergedClass;
  }

  // 2. Set loading and decoding attributes declaratively
  rest.loading = loading;
  if (decodeAsync) {
    rest.decoding = "async";
  }

  let triedFallback = false;

  // 3. Inject our error-handling lifecycle into the events dictionary
  rest.events = {
    ...events,
    error: (event: Event) => {
      const img = event.currentTarget as HTMLImageElement | null;

      if (img) {
        if (triedFallback) {
          img.onerror = null;
          img.removeAttribute("src");
          img.alt = img.alt || "Image unavailable";
          img.classList.add("image-error");
        } else {
          triedFallback = true;
          if (typeof fallback === "string" && fallback.trim() !== "") {
            img.src = fallback;
          }
        }
      }

      // Execute the consumer's original error event handler if provided
      if (typeof events.error === "function") {
        events.error(event);
      }
    }
  };

  return createElement("img", rest);
};

export default Imagex;
export { Imagex as ImagexComponent };