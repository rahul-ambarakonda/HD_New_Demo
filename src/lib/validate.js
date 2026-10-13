/**
 * Exports `isValidEmail(value)` for email validation.
 */

export function isValidEmail(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmedLowercased = value.trim().toLowerCase();
  if (trimmedLowercased.length === 0 || trimmedLowercased.length > 254) {
    return false;
  }
  // Deliberately permissive regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedLowercased);
}
