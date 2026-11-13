import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Feeds are third-party content: the URLs inside them (article links, images,
 * redirects) decide which addresses this server contacts. Without a guard, a
 * hostile or hacked feed could point the server at its own network
 * (http://localhost, cloud metadata at 169.254.169.254, a database port, ...).
 *
 * safeFetch() only talks to public internet addresses over http(s) on the
 * standard ports, and re-checks every redirect hop.
 *
 * Known limit: the DNS check and the connection are two separate lookups, so a
 * DNS answer that changes in between (DNS rebinding) is not caught. Responses
 * are never shown to users (only an image URL or image size is extracted),
 * which keeps that residual risk low.
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

const ALLOWED_PORTS = new Set(['', '80', '443']);
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home', '.intranet'];
const MAX_REDIRECTS = 5;

function isPrivateV4(octets: number[]): boolean {
  const [a, b, c] = octets;
  return (
    a === 0 || // "this network"
    a === 10 || // private
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // IETF protocol assignments, TEST-NET-1
    (a === 192 && b === 88 && c === 99) || // 6to4 relay
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // TEST-NET-3
    a >= 224 // multicast, reserved, broadcast
  );
}

function parseV4(address: string): number[] | null {
  const parts = address.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
  return octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? octets : null;
}

/** Expands an IPv6 address to its eight 16-bit groups, or null when it is not valid. */
function parseV6(address: string): number[] | null {
  if (address.includes('%')) return null; // zone ids only make sense for local addresses
  let text = address;

  // Trailing dotted IPv4 (::ffff:192.168.0.1) becomes two groups.
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseV4(tail);
    if (!v4) return null;
    text = `${text.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }

  const halves = text.split('::');
  if (halves.length > 2) return null;
  const toGroups = (part: string) => (part === '' ? [] : part.split(':'));
  const head = toGroups(halves[0]);
  const rest = halves.length === 2 ? toGroups(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;

  const groups = [...head, ...new Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...rest];
  const numbers = groups.map((group) => (/^[0-9a-f]{1,4}$/i.test(group) ? Number.parseInt(group, 16) : NaN));
  return numbers.length === 8 && numbers.every((n) => Number.isInteger(n)) ? numbers : null;
}

function isPrivateV6(groups: number[]): boolean {
  const [g0, g1, g2] = groups;
  const embedded = (hi: number, lo: number) => isPrivateV4([hi >> 8, hi & 0xff, lo >> 8, lo & 0xff]);

  if (groups.slice(0, 5).every((g) => g === 0)) {
    // ::, ::1, IPv4-compatible (::a.b.c.d) and IPv4-mapped (::ffff:a.b.c.d)
    if (groups[5] === 0 || groups[5] === 0xffff) return embedded(groups[6], groups[7]);
    return true;
  }
  if ((g0 & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
  if ((g0 & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((g0 & 0xff00) === 0xff00) return true; // multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // documentation
  if (g0 === 0x2001 && g1 === 0) return true; // Teredo tunnelling
  if (g0 === 0x2002) return embedded(g1, g2); // 6to4 carries an IPv4 address
  if (g0 === 0x0064 && g1 === 0xff9b && groups.slice(2, 6).every((g) => g === 0)) return embedded(groups[6], groups[7]); // NAT64
  return false;
}

/** True for loopback, private, link-local and other addresses that are not on the public internet. */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const octets = parseV4(address);
    return octets ? isPrivateV4(octets) : true;
  }
  if (version === 6) {
    const groups = parseV6(address);
    return groups ? isPrivateV6(groups) : true;
  }
  return true; // not an IP address at all
}

/** Checks everything that can be checked without a DNS lookup. Returns the parsed URL. */
export function checkUrlShape(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('That is not a valid web address.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http:// and https:// addresses are allowed.');
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('Addresses with a username or password are not allowed.');
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new UnsafeUrlError(`Port ${url.port} is not allowed (only the standard web ports are).`);
  }

  // "localhost." (fully qualified, with a trailing dot) is the same host as "localhost".
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '').toLowerCase();
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError('Private and local network addresses are not allowed.');
  } else if (host === 'localhost' || !host.includes('.') || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new UnsafeUrlError('Private and local network addresses are not allowed.');
  }
  return url;
}

/** Throws UnsafeUrlError unless the URL points at a public internet host. */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  const url = checkUrlShape(rawUrl);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return url;

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError(`The address ${host} could not be found.`);
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new UnsafeUrlError('Private and local network addresses are not allowed.');
  }
  return url;
}

export type SafeFetchResult = { response: Response; finalUrl: string };

/**
 * fetch() for third-party URLs: validates the address, follows redirects by
 * hand (validating each hop) and never sends cookies or credentials.
 */
export async function safeFetch(rawUrl: string, init: Omit<RequestInit, 'redirect'> = {}): Promise<SafeFetchResult> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const response = await fetch(url, { ...init, redirect: 'manual', credentials: 'omit', cache: 'no-store' });

    const location = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
    if (!location) return { response, finalUrl: url.toString() };

    await response.body?.cancel().catch(() => {});
    try {
      current = new URL(location, url).toString();
    } catch {
      throw new UnsafeUrlError('The address redirected to an invalid location.');
    }
  }
  throw new UnsafeUrlError('Too many redirects.');
}

/** Reads a response body up to `maxBytes`; returns null when it is larger. */
export async function readLimited(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) return null;
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
