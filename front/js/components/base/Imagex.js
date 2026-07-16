import { createElement } from "../createElement";

/**
 * Imagex component
 * - Async image decoding
 * - Single fallback attempt
 * - Prevents infinite error loops
 * - Leverages declarative events and attributes from createElement
 */
const Imagex = (attributes = {}) => {
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
        error: (event) => {
            const img = event.currentTarget;

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

            // Execute the consumer's original error event handler if provided
            if (typeof events.error === "function") {
                events.error(event);
            }
        }
    };

    return createElement("img", rest);
};

export default Imagex;
export { Imagex };