/**
 * Publishers often put their full-resolution originals in feeds (we have seen
 * 12000x6750 pixel JPEGs used as thumbnails). Decoding those makes scrolling
 * janky and costs hundreds of MB of memory, so we ask each image CDN for a
 * version close to the size we display. Unknown hosts are left untouched.
 */

type Rule = { test: (url: URL) => boolean; resize: (url: URL, width: number) => void };

const BBC_WIDTHS = [240, 320, 480, 624, 800, 976];
const SKY_SIZES = [
  [384, 216],
  [768, 432],
  [1600, 900],
];
const pick = (widths: number[], width: number) => widths.find((w) => w >= width) ?? widths[widths.length - 1];

const RULES: Rule[] = [
  // WordPress VIP / Jetpack Photon (Deadline, Variety, The Verge, TechCrunch, The Hill, Al Jazeera, NASA, STAT)
  {
    test: (u) => u.pathname.includes('/wp-content/uploads/') && !u.hostname.endsWith('arstechnica.net'),
    resize: (u, w) => {
      u.searchParams.delete('resize');
      u.searchParams.delete('fit');
      u.searchParams.delete('h');
      u.searchParams.set('w', String(w));
    },
  },
  // Condé Nast (Wired): .../master/pass/file.jpg -> .../master/w_640,c_limit/file.jpg
  {
    test: (u) => u.hostname === 'media.wired.com' && u.pathname.includes('/master/pass/'),
    resize: (u, w) => {
      u.pathname = u.pathname.replace('/master/pass/', `/master/w_${w},c_limit/`);
    },
  },
  // Future plc (Live Science): ...-1920-80.png -> ...-800-80.png (the extension must stay the same)
  {
    test: (u) => u.hostname.endsWith('futurecdn.net') && /-\d+-\d+\.(png|jpe?g|webp)$/i.test(u.pathname),
    resize: (u, w) => {
      u.pathname = u.pathname.replace(/-\d+-(\d+)\.(png|jpe?g|webp)$/i, `-${w}-$1.$2`);
    },
  },
  // CNBC
  {
    test: (u) => u.hostname === 'image.cnbcfm.com',
    resize: (u, w) => {
      u.searchParams.set('w', String(w));
      u.searchParams.set('h', String(Math.round((w * 9) / 16)));
    },
  },
  // Forbes
  {
    test: (u) => u.hostname === 'imageio.forbes.com',
    resize: (u, w) => u.searchParams.set('width', String(w)),
  },
  // NASA dynamic images
  {
    test: (u) => u.hostname === 'assets.science.nasa.gov' && u.pathname.startsWith('/dynamicimage/'),
    resize: (u, w) => u.searchParams.set('w', String(w)),
  },
  // Sky Sports: /26/11/1920x1080/file.jpg
  {
    test: (u) => /^e\d\.365dm\.com$/.test(u.hostname) && /\/\d+x\d+\//.test(u.pathname),
    resize: (u, w) => {
      const [sw, sh] = SKY_SIZES.find(([sw]) => sw >= w * 0.9) ?? SKY_SIZES[SKY_SIZES.length - 1];
      u.pathname = u.pathname.replace(/\/\d+x\d+\//, `/${sw}x${sh}/`);
    },
  },
  // BBC: /ace/standard/976/...
  {
    test: (u) => u.hostname === 'ichef.bbci.co.uk' && /\/(ace|news)\/(standard|ws)\/\d+\//.test(u.pathname),
    resize: (u, w) => {
      u.pathname = u.pathname.replace(/\/(ace|news)\/(standard|ws)\/\d+\//, `/$1/$2/${pick(BBC_WIDTHS, w)}/`);
    },
  },
  // ESPN combiner
  {
    test: (u) => /^a\d?\.espncdn\.com$/.test(u.hostname) && u.pathname.startsWith('/combiner/'),
    resize: (u, w) => {
      u.searchParams.set('w', String(w));
      u.searchParams.set('h', String(Math.round((w * 9) / 16)));
      u.searchParams.set('scale', 'crop');
      u.searchParams.set('cquality', '80');
    },
  },
];

/** True when we know how to request a smaller version of this image. */
export function canResizeImage(src: string): boolean {
  try {
    const url = new URL(src);
    return RULES.some((r) => r.test(url));
  } catch {
    return false;
  }
}

/** URL of a version of `src` that is about `width` pixels wide. */
export function sizedImageUrl(src: string | null | undefined, width: number): string | null {
  if (!src) return null;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  const rule = RULES.find((r) => r.test(url));
  if (!rule) return src;
  rule.resize(url, Math.round(width));
  return url.toString();
}
