import { randomBytes, createHmac } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? "";
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? "";
  }

  return output;
}

function decodeBase32(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/=+$/g, "");

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number, digits = 6): string {
  const counterBuffer = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;

  counterBuffer.writeUInt32BE(high, 0);
  counterBuffer.writeUInt32BE(low, 4);

  const digest = createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binCode =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    (((digest[offset + 1] ?? 0) & 0xff) << 16) |
    (((digest[offset + 2] ?? 0) & 0xff) << 8) |
    ((digest[offset + 3] ?? 0) & 0xff);

  const otp = binCode % 10 ** digits;
  return otp.toString().padStart(digits, "0");
}

export function generateTotpSecret(byteLength = 20): string {
  return encodeBase32(randomBytes(byteLength));
}

export function buildOtpAuthUrl(params: {
  secret: string;
  accountName: string;
  issuer: string;
  digits?: number;
  period?: number;
}): string {
  const digits = params.digits ?? 6;
  const period = params.period ?? 30;
  const label = `${params.issuer}:${params.accountName}`;

  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: "SHA1",
    digits: String(digits),
    period: String(period)
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
}

export function verifyTotp(params: {
  secret: string;
  token: string;
  digits?: number;
  period?: number;
  window?: number;
}): boolean {
  const digits = params.digits ?? 6;
  const period = params.period ?? 30;
  const window = params.window ?? 1;
  const token = params.token.replace(/\s+/g, "");

  if (!/^\d+$/.test(token) || token.length !== digits) {
    return false;
  }

  const secret = decodeBase32(params.secret);
  const currentCounter = Math.floor(Date.now() / 1000 / period);

  for (let offset = -window; offset <= window; offset += 1) {
    const counter = currentCounter + offset;
    if (counter < 0) continue;

    if (hotp(secret, counter, digits) === token) {
      return true;
    }
  }

  return false;
}
