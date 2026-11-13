/**
 * Reads the pixel dimensions of a remote image from its first bytes (JPEG,
 * PNG, GIF, WebP) without downloading the whole file.
 */

import { safeFetch } from '@/lib/ingestion/safe-fetch';

const MAX_BYTES = 128 * 1024;

function parseDimensions(b: Uint8Array): { width: number; height: number } | null {
  const u16be = (i: number) => (b[i] << 8) | b[i + 1];
  const u16le = (i: number) => b[i] | (b[i + 1] << 8);
  const u24le = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  const u32be = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const ascii = (i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

  // PNG
  if (b.length >= 24 && b[0] === 0x89 && ascii(1, 3) === 'PNG') {
    return { width: u32be(16), height: u32be(20) };
  }
  // GIF
  if (b.length >= 10 && ascii(0, 4) === 'GIF8') {
    return { width: u16le(6), height: u16le(8) };
  }
  // WebP
  if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4);
    if (chunk === 'VP8 ') return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') return { width: u24le(24) + 1, height: u24le(27) + 1 };
    return null;
  }
  // JPEG: walk the markers until a start-of-frame segment.
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const length = u16be(i + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return { height: u16be(i + 5), width: u16be(i + 7) };
      i += 2 + length;
    }
  }
  return null;
}

export async function probeImageSize(url: string, timeoutMs = 6000): Promise<{ width: number; height: number } | null> {
  try {
    const { response } = await safeFetch(url, {
      headers: { Range: `bytes=0-${MAX_BYTES - 1}`, 'User-Agent': 'Mozilla/5.0 (compatible; PersonalNewsAggregator/2.0)' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok || !response.body) return null;

    // Servers that ignore Range send the whole file; stop reading early.
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    try {
      while (received < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        const merged = concat(chunks, received);
        const dims = parseDimensions(merged);
        if (dims) return dims;
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    return parseDimensions(concat(chunks, received));
  } catch {
    return null;
  }
}

function concat(chunks: Uint8Array[], length: number): Uint8Array {
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export const __test__ = { parseDimensions };
