/**
 * The paintings shown in the front page's welcome, one chosen at random for each visit. All are
 * public domain or CC0 (sources in docs/ASSETS.md), cropped to 1000 x 800 in public/plates.
 * `focus` keeps the reader in view when phones show the picture as a wider strip.
 * Their descriptions and credits are in the dictionaries under `landing.pictures`.
 */
export const WELCOME_PLATES = [
  { key: 'breakfast', focus: '50% 30%' },
  { key: 'armchair', focus: '50% 30%' },
  { key: 'figaro', focus: '50% 40%' },
  { key: 'farmers', focus: '50% 20%' },
  { key: 'grandfather', focus: '50% 0%' },
] as const;

export type WelcomePlate = (typeof WELCOME_PLATES)[number];

export function pickWelcomePlate(): WelcomePlate {
  return WELCOME_PLATES[Math.floor(Math.random() * WELCOME_PLATES.length)];
}
