import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { accentVariables, DEFAULT_ACCENT } from '../lib/colors';
import { canResizeImage, sizedImageUrl } from '../lib/images';
import { __test__ } from '../lib/ingestion/image-size';

const { parseDimensions } = __test__;

describe('sizedImageUrl', () => {
  it('asks WordPress / Photon for the display width and drops fixed crops', () => {
    const out = new URL(sizedImageUrl('https://deadline.com/wp-content/uploads/2026/11/a.jpg?resize=12000,6750&h=6750', 800)!);
    assert.equal(out.searchParams.get('w'), '800');
    assert.equal(out.searchParams.has('resize'), false);
    assert.equal(out.searchParams.has('h'), false);
  });

  it('rewrites path-based CDNs and keeps the file extension', () => {
    assert.equal(
      sizedImageUrl('https://media.wired.com/photos/x/master/pass/photo.jpg', 640),
      'https://media.wired.com/photos/x/master/w_640,c_limit/photo.jpg',
    );
    assert.equal(
      sizedImageUrl('https://cdn.mos.cms.futurecdn.net/abc-1920-80.png', 800),
      'https://cdn.mos.cms.futurecdn.net/abc-800-80.png',
    );
  });

  it('snaps to the sizes a CDN actually serves', () => {
    assert.equal(
      sizedImageUrl('https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/a.jpg', 700),
      'https://ichef.bbci.co.uk/ace/standard/800/cpsprodpb/a.jpg',
    );
    assert.equal(sizedImageUrl('https://e0.365dm.com/26/11/1920x1080/a.jpg', 800), 'https://e0.365dm.com/26/11/768x432/a.jpg');
  });

  it('leaves unknown hosts, empty values and invalid URLs alone', () => {
    assert.equal(sizedImageUrl('https://example.com/a.jpg', 800), 'https://example.com/a.jpg');
    assert.equal(sizedImageUrl('not a url', 800), 'not a url');
    assert.equal(sizedImageUrl(null, 800), null);
    assert.equal(canResizeImage('https://example.com/a.jpg'), false);
    assert.equal(canResizeImage('https://image.cnbcfm.com/api/v1/image/1.jpg'), true);
  });
});

describe('image size probe', () => {
  const bytes = (...parts: (number[] | string)[]) =>
    Uint8Array.from(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));

  it('reads PNG and GIF headers', () => {
    const png = bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13], 'IHDR', [0, 0, 0x2e, 0xe0, 0, 0, 0x1a, 0x5e]);
    assert.deepEqual(parseDimensions(png), { width: 12000, height: 6750 });
    const gif = bytes('GIF89a', [0x40, 0x01, 0xf0, 0x00]);
    assert.deepEqual(parseDimensions(gif), { width: 320, height: 240 });
  });

  it('walks JPEG markers to the start-of-frame segment', () => {
    const app0 = [0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0)];
    const sof0 = [0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x38, 0x07, 0x80, 0x03, ...new Array(9).fill(0)];
    assert.deepEqual(parseDimensions(Uint8Array.from([0xff, 0xd8, ...app0, ...sof0])), { width: 1920, height: 1080 });
  });

  it('reads extended WebP and rejects unknown data', () => {
    const vp8x = bytes('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8X', [10, 0, 0, 0, 0, 0, 0, 0], [0x7f, 0x07, 0x00, 0x37, 0x04, 0x00]);
    assert.deepEqual(parseDimensions(vp8x), { width: 1920, height: 1080 });
    assert.equal(parseDimensions(bytes('hello world, not an image')), null);
  });
});

describe('accent ink', () => {
  it('keeps dark inks for the day edition and lightens them for the night edition', () => {
    const vars = accentVariables('#1E3A5F') as Record<string, string>;
    assert.equal(vars['--accent-day'], '#1E3A5F');
    assert.notEqual(vars['--accent-night'], '#1E3A5F');
    assert.equal((accentVariables('nonsense') as Record<string, string>)['--accent-day'], DEFAULT_ACCENT);
  });
});
