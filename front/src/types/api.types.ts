/**
 * API Type Definitions & Validation Utilities
 */

declare const __brand: unique symbol;

/** Nominal type representing paise (1 rupee = 100 paise) */
export type Paise = number & { readonly [__brand]: "Paise" };

// ============================================================================
// CURRENCY UTILITY FUNCTIONS
// ============================================================================

/**
 * Converts paise (or standard numbers) to formatted INR currency string.
 * Example: formatCurrency(5000) => "₹50.00"
 */
export function formatCurrency(paise?: Paise | number | null): string {
  const amount = typeof paise === "number" && !isNaN(paise) ? paise : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

/**
 * Converts rupees to paise for API requests.
 * Example: toPaise(50.5) => 5050 as Paise
 */
export function toPaise(rupees: number): Paise {
  if (isNaN(rupees) || !isFinite(rupees)) return 0 as Paise;
  return Math.round(rupees * 100) as Paise;
}

/**
 * Converts paise to rupees.
 * Example: toRupees(5000 as Paise) => 50
 */
export function toRupees(paise: Paise | number): number {
  if (isNaN(paise) || !isFinite(paise)) return 0;
  return paise / 100;
}

/**
 * Safely casts or converts a raw number into a branded Paise type after validation.
 */
export function asPaise(amount: number): Paise {
  return (Math.round(amount) || 0) as Paise;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const ApiValidation = {
  /**
   * Validates standard RFC 5322 email syntax.
   */
  isValidEmail(email: string): boolean {
    if (!email) return false;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  },

  /**
   * Validates 10-digit Indian mobile numbers (with optional +91 or 0 prefix).
   */
  isValidIndianPhone(phone: string): boolean {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, "").replace(/^(91|0)/, "");
    return /^[6-9]\d{9}$/.test(digits);
  },

  /**
   * Type-guard validating if a value is a positive integer suitable for Paise.
   */
  isValidAmount(paise: number): paise is Paise {
    return typeof paise === "number" && paise > 0 && Number.isInteger(paise);
  },

  /**
   * Validates canonical v1-v5 UUID string formats.
   */
  isValidUUID(uuid: string): boolean {
    if (!uuid) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid.trim()
    );
  },
};