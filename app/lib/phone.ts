/**
 * Indian mobile numbers: optional national 10 digits (6–9 first digit),
 * stored as E.164 +91XXXXXXXXXX.
 */

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/** Strip to digits, max 10 — for controlled kiosk input */
export function sanitizeIndianPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

/** Empty is valid (optional). Otherwise exactly 10 digits, valid Indian mobile range. */
export function isValidOptionalIndianPhoneNational(nationalDigits: string): boolean {
  const d = nationalDigits.replace(/\D/g, "");
  if (!d) return true;
  return d.length === 10 && INDIAN_MOBILE.test(d);
}

/**
 * Normalize to +91XXXXXXXXXX. Empty input → null.
 * Accepts: 10 national digits, 91XXXXXXXXXX, +91…, optional leading 0 on national.
 */
export function normalizeIndianMobile(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10 && INDIAN_MOBILE.test(digits)) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    const national = digits.slice(2);
    if (INDIAN_MOBILE.test(national)) return `+91${national}`;
    return null;
  }

  return null;
}
