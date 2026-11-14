export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Default accent for section labels: printer's oxblood. */
export const DEFAULT_ACCENT = '#8B1E1E';

/** Printing-ink colours used for the accent and avatar pickers. */
export const COLOR_PRESETS = [
  { name: 'Oxblood', value: '#8B1E1E' },
  { name: 'Vermilion', value: '#B03A2E' },
  { name: 'Burnt orange', value: '#B45309' },
  { name: 'Ochre', value: '#A16207' },
  { name: 'Forest', value: '#2F5233' },
  { name: 'Teal ink', value: '#115E59' },
  { name: 'Navy', value: '#1E3A5F' },
  { name: 'Cobalt', value: '#2E5090' },
  { name: 'Plum', value: '#5B2A4E' },
  { name: 'Sepia', value: '#7A5230' },
  { name: 'Steel', value: '#3F4E5A' },
  { name: 'Ink', value: '#1C1917' },
] as const;

function clamp(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

/** Mixes a hex colour with black (amount > 0) or white (amount < 0). */
export function shade(hex: string, amount: number): string {
  if (!HEX_COLOR.test(hex)) return hex;
  const target = amount > 0 ? 0 : 255;
  const weight = Math.abs(amount);
  const channels = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return `#${channels
    .map((c) => clamp(c + (target - c) * weight).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Relative luminance check so text on custom colours stays readable. */
export function isLightColor(hex: string): boolean {
  if (!HEX_COLOR.test(hex)) return false;
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.62;
}

/**
 * CSS variables for the reader's accent colour. Light colours are darkened for
 * the morning edition, dark colours lightened for the night edition, so the
 * accent always reads well on the paper.
 */
export function accentVariables(hex: string | null | undefined): React.CSSProperties {
  const base = hex && HEX_COLOR.test(hex) ? hex : DEFAULT_ACCENT;
  const day = isLightColor(base) ? shade(base, 0.45) : base;
  // The default oxblood turns a dusty pink when lightened; on the navy night paper a warm rose reads better.
  const night = base.toUpperCase() === DEFAULT_ACCENT ? '#E6A395' : shade(base, -0.45);
  return { '--accent-day': day, '--accent-night': night } as React.CSSProperties;
}

/** Preview background used by the accent picker. */
export function bannerGradient(hex: string): string {
  const base = HEX_COLOR.test(hex) ? hex : DEFAULT_ACCENT;
  return `linear-gradient(120deg, ${base} 0%, ${shade(base, 0.35)} 100%)`;
}
