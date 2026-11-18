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

// Generate color shades: lightest Creative → darkest Delivery in equal steps
export function generateColorShades(baseColor: string): ColorShades {
  return {
    base: baseColor,
    creativeDev: lightenColor(baseColor, 60),
    preProduction: lightenColor(baseColor, 40),
    shoot: lightenColor(baseColor, 20),
    postProduction: baseColor,
    delivery: darkenColor(baseColor, 20),
    misc: '#F0F0F0',
  };
}

// Helper: blend color toward white by percent (keeps the hue visible)
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const p = percent / 100;
  const R = Math.round((num >> 16) + (255 - (num >> 16)) * p);
  const G = Math.round((num >> 8 & 0x00FF) + (255 - (num >> 8 & 0x00FF)) * p);
  const B = Math.round((num & 0x0000FF) + (255 - (num & 0x0000FF)) * p);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Helper: blend color toward black by percent
function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const p = 1 - percent / 100;
  const R = Math.round((num >> 16) * p);
  const G = Math.round((num >> 8 & 0x00FF) * p);
  const B = Math.round((num & 0x0000FF) * p);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
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
