import { createElement } from "../../components/createElement.js";

/**
 * Imagex component
 * - Async image decoding
 * - Single fallback attempt
 * - Prevents infinite error loops
 */
const Imagex = (attributes = {}) => {
    const {
        fallback = "/assets/icon-192.png",
        decodeAsync = true,
        classes,
        class: className,
        ...rest
    } = attributes;

    if (!rest.class && (className || classes)) {
        rest.class = className || classes;
    }

    const img = createElement("img", rest);

    if (decodeAsync) {
        img.decoding = "async";
    }

    img.loading ??= "lazy";

    let triedFallback = false;

    img.addEventListener("error", () => {
        if (triedFallback) {
            img.onerror = null;
            img.removeAttribute("src");

            img.alt =
                img.alt ||
                "Image unavailable";

            img.classList.add("image-error");

            return;
        }

        triedFallback = true;

        if (
            typeof fallback === "string" &&
            fallback.trim() !== ""
        ) {
            img.src = fallback;
        }
    });

    return img;
};

export default Imagex;
export { Imagex };