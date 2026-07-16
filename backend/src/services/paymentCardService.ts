import { CardBrand } from "../types/business";

export function normalizeCardNumber(value: string) {
  return value.replace(/[\s-]+/g, "");
}

export function isValidCardNumber(value: string) {
  const digits = normalizeCardNumber(value);
  if (!/^\d{12,19}$/.test(digits)) {
    return false;
  }

  // Verification de Luhn : detecte les numeros mal saisis sans contacter
  // le moindre reseau bancaire.
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

export function detectCardBrand(value: string): CardBrand {
  const digits = normalizeCardNumber(value);

  if (/^4/.test(digits)) {
    return "visa";
  }

  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) {
    return "mastercard";
  }

  if (/^3[47]/.test(digits)) {
    return "amex";
  }

  return "cb";
}

export function getCardLast4(value: string) {
  return normalizeCardNumber(value).slice(-4);
}

export function isCardExpired(expiryMonth: number, expiryYear: number, reference = new Date()) {
  const endOfMonth = new Date(expiryYear, expiryMonth, 1);
  return endOfMonth.getTime() <= reference.getTime();
}
