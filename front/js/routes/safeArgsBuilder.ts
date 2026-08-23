/**
 * Safely extracts regex capture groups and filters out undefined values.
 * Returns an array of clean string arguments to pass directly to page initializers.
 */
export function safeArgBuilder(match: RegExpMatchArray | null): string[] {
  if (!match) return [];
  // Slice(1) extracts only the capture groups, omitting the full matched path at index 0.
  return match.slice(1).filter((val): val is string => val !== undefined);
}