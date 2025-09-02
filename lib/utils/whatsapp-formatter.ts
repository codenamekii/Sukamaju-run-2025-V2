// lib/utils/whatsapp-formatter.ts

/**
 * Format WhatsApp number to Wablas format (62xxx)
 * Accepts: 08xxx, +628xxx, 628xxx
 * Returns: 628xxx format
 */
export function formatWhatsAppNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Handle various formats
  if (cleaned.startsWith('0')) {
    // 08xxx -> 628xxx
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('+62')) {
    // +628xxx -> 628xxx
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('62')) {
    // Already in correct format
    cleaned = cleaned;
  } else if (cleaned.startsWith('8')) {
    // 8xxx -> 628xxx (missing 0 prefix)
    cleaned = '62' + cleaned;
  } else {
    // Invalid format, return as is
    return cleaned;
  }

  return cleaned;
}

/**
 * Validate WhatsApp number format
 * Returns true if valid Indonesian WhatsApp number
 */
export function validateWhatsAppNumber(phone: string): boolean {
  const cleaned = formatWhatsAppNumber(phone);

  // Check if starts with 62
  if (!cleaned.startsWith('62')) {
    return false;
  }

  // Check if it's 10-13 digits after 62 (Indonesian mobile numbers)
  const numberPart = cleaned.substring(2);
  if (numberPart.length < 10 || numberPart.length > 13) {
    return false;
  }

  // Check if starts with valid Indonesian mobile prefix (8xx)
  if (!numberPart.startsWith('8')) {
    return false;
  }

  // Check if all characters are digits
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  return true;
}

/**
 * Display format for UI (adds +62 prefix for clarity)
 */
export function displayWhatsAppNumber(phone: string): string {
  const formatted = formatWhatsAppNumber(phone);
  return `+${formatted}`;
}

/**
 * Parse input and return formatted number with validation
 */
export function parseWhatsAppInput(input: string): {
  isValid: boolean;
  formatted: string;
  display: string;
  error?: string;
} {
  const formatted = formatWhatsAppNumber(input);
  const isValid = validateWhatsAppNumber(input);

  if (!isValid) {
    let error = 'Invalid WhatsApp number format';

    if (!input) {
      error = 'WhatsApp number is required';
    } else if (!formatted.startsWith('62')) {
      error = 'Number must be Indonesian format (08xx or +628xx)';
    } else if (formatted.length < 12 || formatted.length > 15) {
      error = 'Number must be 10-13 digits';
    }

    return {
      isValid: false,
      formatted: input,
      display: input,
      error
    };
  }

  return {
    isValid: true,
    formatted,
    display: displayWhatsAppNumber(formatted)
  };
}