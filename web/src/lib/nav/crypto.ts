import { createHash, createCipheriv, randomBytes } from 'node:crypto';

export function sha512(text: string): string {
  return createHash('sha512').update(text, 'utf8').digest('hex').toUpperCase();
}

export function sha3_512(text: string): string {
  return createHash('sha3-512').update(text, 'utf8').digest('hex').toUpperCase();
}

export function aes128ecb(data: Buffer, key: Buffer): Buffer {
  const cipher = createCipheriv('aes-128-ecb', key, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

// CRC32 using polynomial table method (no external imports)
const CRC32_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table.push(c);
  }
  return table;
})();

export function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function generateRequestId(): string {
  const rb = randomBytes(16);
  rb[6] = (rb[6] & 0x0f) | 0x40; // version 4
  rb[8] = (rb[8] & 0x3f) | 0x80; // variant
  return rb.toString('hex').toUpperCase();
}

export function navTimestamp(): string {
  const now = new Date();
  const pad = (n: number, len = 2): string => String(n).padStart(len, '0');
  return (
    `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}Z`
  );
}

export function passwordHash(plainPassword: string): string {
  return sha512(plainPassword.toUpperCase());
}

export function requestSignature(
  requestId: string,
  timestamp: string,
  signatureKey: string,
  invoiceCrc32Hex?: string,
): string {
  // Timestamp without dashes/colons/Z: YYYYMMDDHHMMSS
  const ts = timestamp
    .replace(/-/g, '')
    .replace(/:/g, '')
    .replace('T', '')
    .replace('Z', '');
  let concat = requestId + ts + signatureKey;
  if (invoiceCrc32Hex !== undefined) {
    concat += invoiceCrc32Hex;
  }
  return sha3_512(concat);
}
