import type React from "react";
import { isValidPhoneNumber } from "libphonenumber-js";

/** Keys that should always be allowed regardless of field type */
const ALWAYS_ALLOW = new Set([
  "Backspace", "Delete", "Tab", "Enter",
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
  "Home", "End", "Escape",
  "Dead", // for accents
]);

/**
 * Prevents anything but letters, spaces, hyphens, apostrophes and periods from being typed in name fields.
 */
export function blockInvalidNameCharsOnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (ALWAYS_ALLOW.has(e.key)) return;
  // Allow Ctrl/Cmd combos (copy, paste, etc.)
  if (e.ctrlKey || e.metaKey) return;
  if (e.key.length === 1 && !/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s\-'.]+$/.test(e.key)) {
    e.preventDefault();
  }
}

/**
 * Prevents anything that isn't a digit from being entered in a phone field.
 */
export function blockNonDigitsOnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (ALWAYS_ALLOW.has(e.key)) return;
  if (e.ctrlKey || e.metaKey) return;
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

/**
 * Sanitizes a phone value: strips all non-digit characters and limits to `maxDigits`.
 * @param value Raw input value
 * @param maxDigits Maximum number of digit characters (default: 10)
 */
export function sanitizePhone(value: string, maxDigits = 10): string {
  return value.replace(/\D/g, "").slice(0, maxDigits);
}

/**
 * Sanitizes a name value: strips out digit characters.
 */
export function sanitizeName(value: string): string {
  return value.replace(/\d/g, "");
}

/**
 * Validates a phone number for Mexico.
 */
export function validatePhoneMX(phone: string): boolean {
  if (!phone) return false;
  try {
    return isValidPhoneNumber(phone, "MX");
  } catch (e) {
    return false;
  }
}
