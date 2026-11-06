// Campaign color palette - pastel colors as requested
export const campaignColors = [
  '#FFB3B3', // Pastel red
  '#A8E6CF', // Pastel teal
  '#FFF9C4', // Pastel yellow
  '#B5EAD7', // Pastel mint
  '#FFCDD2', // Pastel coral
  '#C8E6C9', // Pastel green
  '#E1BEE7', // Pastel plum
  '#B2DFDB', // Pastel sea green
  '#FFF59D', // Pastel gold
  '#D1C4E9', // Pastel purple
  '#BBDEFB', // Pastel blue
  '#FFE0B2', // Pastel amber
  '#B2EBF2', // Pastel turquoise
  '#F8BBD0', // Pastel pink
  '#B2DFDB', // Pastel sea green
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

// Generate color shades based on base color
export function generateColorShades(baseColor: string): ColorShades {
  return {
    base: baseColor,
    creativeDev: lightenColor(baseColor, 30),
    preProduction: lightenColor(baseColor, 20),
    shoot: baseColor,
    postProduction: darkenColor(baseColor, 15),
    delivery: darkenColor(baseColor, 30),
    misc: '#E5E5E5', // Light grey for miscellaneous
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
