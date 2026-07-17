/**
 * Normalizes and converts diverse hex string formatting into standard RGB channels
 * @param {string} hex 
 * @returns {Array<number>|null} [r, g, b] channels calibrated from 0 to 255
 */
function parseHexToRgb(hex) {
    if (typeof hex !== "string") return null;

    // Strip leading hash character if present
    let cleanHex = hex.trim().replace(/^#/, "");

    // Validate absolute format length criteria strings
    if (cleanHex.length === 3 || cleanHex.length === 4) {
        cleanHex = cleanHex.split("").map(char => char + char).join("");
    }

    // Handle hex alpha extensions smoothly by slicing off trailing channels
    if (cleanHex.length === 8) {
        cleanHex = cleanHex.substring(0, 6);
    }

    if (cleanHex.length !== 6) {
        return null; // Invalid pattern structure caught safely
    }

    const num = parseInt(cleanHex, 16);
    if (Number.isNaN(num)) return null;

    return [
        (num >> 16) & 255,
        (num >> 8) & 255,
        num & 255
    ];
}

/**
 * Calculates the relative luminance of a color according to W3C WCAG 2.x standards.
 * @param {string} hexColor - A 3, 4, 6, or 8 digit hex color string.
 * @returns {number} Relative luminance value between 0.0 (darkest black) and 1.0 (lightest white).
 */
export function getRelativeLuminance(hexColor) {
    const rgb = parseHexToRgb(hexColor);
    if (!rgb) return 0; // Safe runtime fallback: assume black background on processing failure

    // Transform channels to sRGB linear color space
    const [R, G, B] = rgb.map(val => {
        const channel = val / 255;
        return channel <= 0.03928 
            ? channel / 12.92 
            : ((channel + 0.055) / 1.055) ** 2.4;
    });

    // Standard human spectral weight coefficients (Rec. 709)
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Determines whether black or white text provides optimal contrast against a background.
 * @param {string} bgColor - Hex code of background color
 * @returns {string} Hex code for highest contrast layout text ("#000000" or "#FFFFFF")
 */
export function getContrastColor(bgColor) {
    const luminance = getRelativeLuminance(bgColor);
    
    // WCAG standard linear contrast midpoint weight boundary calculation
    // Colors yielding > 0.179 mid-space translate to a > 0.5 power translation pass.
    return luminance > 0.179 ? "#000000" : "#FFFFFF";
}

/**
 * Applies background, border, and optimized text colors to a DOM element.
 * @param {HTMLElement} element - Target element node
 * @param {string} bgColor - Target hex background color string
 */
export function applyButtonColors(element, bgColor) {
    if (!element || !element.style) {
        console.warn("[ContrastUtility] Provided target element node is invalid.");
        return;
    }

    const contrastColor = getContrastColor(bgColor);
    
    // Batch layout visual updates synchronously to prevent style thrashing
    element.style.backgroundColor = bgColor;
    element.style.color = contrastColor;
    element.style.borderColor = contrastColor;
}