import Datex from "../components/base/Datex";

/**
 * Safely escapes HTML characters to prevent DOM-based XSS.
 * Optimized to avoid DOM generation/memory thrashing.
 */
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (match) => {
        switch (match) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#x27;';
            default: return match;
        }
    });
}

/**
 * Validates a list of inputs against custom rules.
 * Returns a newline-separated string of errors, or null if all pass.
 */
function validateInputs(inputs) {
    if (!Array.isArray(inputs)) return null;
    
    const errors = [];

    inputs.forEach(({ value, validator, message }) => {
        if (typeof validator === 'function' && !validator(value)) {
            errors.push(message);
        }
    });

    return errors.length ? errors.join('\n') : null;
}

/* =========================
   VALIDATORS
========================= */
const isValidUsername = username => 
    typeof username === 'string' && username.length >= 3 && username.length <= 20;

const isValidEmail = email => 
    typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

const isValidPassword = password => 
    typeof password === 'string' && password.length >= 6;

/* =========================
   FORMATTERS & HANDLERS
========================= */
function formatDate(dateString) {
    return dateString ? Datex(dateString) : null;
}

function handleError(errorMessage) {
    // Extract message if an Error object is accidentally passed
    const msg = errorMessage instanceof Error ? errorMessage.message : errorMessage;
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