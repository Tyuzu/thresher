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
 * Converts paise to formatted INR string for UI display.
 * Example: formatCurrency(toPaise(5000)) => "₹5,000.00"
 */
export function formatCurrency(paise: Paise): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

/**
 * Converts rupees to paise for API requests.
 * Example: toPaise(5000.50) => 500050
 */
export function toPaise(rupees: number): Paise {
  return Math.round(Number((rupees * 100).toFixed(2))) as Paise;
}

/**
 * Converts paise to rupees.
 * Example: toRupees(500000 as Paise) => 5000
 */
export function toRupees(paise: Paise): number {
  return paise / 100;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const ApiValidation = {
  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isValidIndianPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, "").replace(/^91/, "");
    return /^[6-9]\d{9}$/.test(digits);
  },

  isValidAmount(paise: number): paise is Paise {
    return paise > 0 && Number.isInteger(paise);
  },

  isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uuid
    );
  },
};