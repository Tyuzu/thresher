import Datex from "../components/base/Datex.js";

/* =========================
   TYPES & INTERFACES
========================= */
export interface InputValidationRule<T = unknown> {
  value: T;
  validator: (val: T) => boolean;
  message: string;
}

/**
 * Safely escapes HTML characters to prevent DOM-based XSS.
 * Optimized to avoid DOM generation/memory thrashing.
 */
function escapeHTML(str: unknown): string {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"']/g, (match: string) => {
    switch (match) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#x27;";
      default: return match;
    }
  });
}

/**
 * Validates a list of inputs against custom rules.
 * Returns a newline-separated string of errors, or null if all pass.
 */
function validateInputs(inputs: InputValidationRule[]): string | null {
  if (!Array.isArray(inputs)) return null;

  const errors: string[] = [];

  inputs.forEach(({ value, validator, message }) => {
    if (typeof validator === "function" && !validator(value)) {
      errors.push(message);
    }
  });

  return errors.length ? errors.join("\n") : null;
}

/* =========================
   VALIDATORS
========================= */
const isValidUsername = (username: unknown): username is string =>
  typeof username === "string" && username.length >= 3 && username.length <= 20;

const isValidEmail = (email: unknown): email is string =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

const isValidPassword = (password: unknown): password is string =>
  typeof password === "string" && password.length >= 6;

/* =========================
   FORMATTERS & HANDLERS
========================= */
function formatDate(dateString: string | null | undefined): string | null {
  return dateString ? Datex(dateString, true) : null;
}

function handleError(errorMessage: unknown): void {
  // Extract message if an Error object is accidentally passed
  const msg = errorMessage instanceof Error ? errorMessage.message : String(errorMessage);
  console.error(`[App Error]: ${msg}`);
}

export {
  escapeHTML,
  validateInputs,
  isValidUsername,
  isValidEmail,
  isValidPassword,
  handleError,
  formatDate
};