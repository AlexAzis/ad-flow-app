// Campaign color palette - rich pastels matching Base44
export const campaignColors = [
  '#F2A4C0', // Pink
  '#8FD98F', // Green
  '#F0A860', // Orange
  '#B090E0', // Purple
  '#58B8B0', // Teal
  '#B8D848', // Lime
  '#F0D050', // Gold
  '#58A0E0', // Blue
  '#E060A8', // Magenta
  '#F08868', // Coral
  '#88A0F0', // Periwinkle
  '#C89858', // Tan
  '#D080A8', // Mauve
  '#9860D8', // Deep purple
];

export interface ColorShades {
  base: string;
  creativeDev: string;
  preProduction: string;
  shoot: string;
  postProduction: string;
  delivery: string;
  misc: string;
}

// Generate color shades: very pale Creative → darkest Delivery (matching Base44)
export function generateColorShades(baseColor: string): ColorShades {
  return {
    base: baseColor,
    creativeDev: lightenColor(baseColor, 78),
    preProduction: lightenColor(baseColor, 55),
    shoot: lightenColor(baseColor, 32),
    postProduction: lightenColor(baseColor, 12),
    delivery: darkenColor(baseColor, 15),
    misc: '#F0F0F0',
  };
}

// Helper function to lighten a hex color
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

// Helper function to darken a hex color
function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return '#' + (
    0x1000000 +
    (R > 0 ? (R > 255 ? 255 : R) : 0) * 0x10000 +
    (G > 0 ? (G > 255 ? 255 : G) : 0) * 0x100 +
    (B > 0 ? (B > 255 ? 255 : B) : 0)
  ).toString(16).slice(1);
}

// Get color for a specific stage
export function getStageColor(baseColor: string, stage: string): string {
  const shades = generateColorShades(baseColor);
  switch (stage) {
    case 'Creative Development':
      return shades.creativeDev;
    case 'Pre-Production':
      return shades.preProduction;
    case 'Shoot':
      return shades.shoot;
    case 'Post-Production':
      return shades.postProduction;
    case 'Delivery':
      return shades.delivery;
    default:
      return shades.misc;
  }
}

// Compute relative luminance of a hex color (0 = black, 1 = white)
function getLuminance(color: string): number {
  const num = parseInt(color.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Text color for event blocks: darker shade of bg for light colors, white for dark
export function getTextColor(bgColor: string): string {
  if (getLuminance(bgColor) < 0.55) return '#FFFFFF';
  return darkenColor(bgColor, 50);
}

// Subtle text color for secondary lines (person/notes)
export function getSubTextColor(bgColor: string): string {
  if (getLuminance(bgColor) < 0.55) return 'rgba(255, 255, 255, 0.8)';
  return darkenColor(bgColor, 35);
}
