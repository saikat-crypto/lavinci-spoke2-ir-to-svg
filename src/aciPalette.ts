/**
 * AutoCAD Color Index (ACI) Palette & Theme Color Resolver
 * 
 * AutoCAD supports 256 indexed colors (ACI 0–255), TrueColor (24-bit RGB),
 * and symbolic inheritance ('byLayer', 'byBlock').
 * 
 * Standard ACI Color Assignments:
 *   1 = Red (#FF0000)
 *   2 = Yellow (#FFFF00)
 *   3 = Green (#00FF00)
 *   4 = Cyan (#00FFFF)
 *   5 = Blue (#0000FF)
 *   6 = Magenta (#FF00FF)
 *   7 = White / Black (#FFFFFF in dark mode, #000000 in light mode)
 *   8 = Dark Gray (#808080)
 *   9 = Light Gray (#C0C0C0)
 *   10-249 = Spectral color cube (Hues, Saturation, Lightness)
 *   250-255 = Grayscale ramp
 */

import type { CadColor } from './schema.js';

export type SvgTheme =
  | 'cad-dark'           // Dark charcoal background (#1e1e1e), vibrant CAD colors
  | 'paper-light'        // Pure white background (#ffffff), ACI 7 = black, darkened yellows/cyans
  | 'monochrome'         // White background, all strokes 100% black (#000000)
  | 'blueprint'          // Deep navy (#0b2545) background, white and cyan lines
  | 'grayscale'          // White background, luminance-weighted grayscale
  | 'fabrication-coded'; // Laser/CNC: Red=Cut, Blue=Score, Black=Engrave

/** Standard ACI 1–9 base colors */
const BASE_ACI_COLORS: Record<number, [number, number, number]> = {
  1: [255, 0, 0],       // Red
  2: [255, 255, 0],     // Yellow
  3: [0, 255, 0],       // Green
  4: [0, 255, 255],     // Cyan
  5: [0, 0, 255],       // Blue
  6: [255, 0, 255],     // Magenta
  7: [255, 255, 255],   // White (in dark mode)
  8: [128, 128, 128],   // Dark Gray
  9: [192, 192, 192],   // Light Gray
};

/** Grayscale ramp for ACI 250–255 */
const GRAYSCALE_RAMP: Record<number, number> = {
  250: 51,
  251: 91,
  252: 132,
  253: 173,
  254: 214,
  255: 255,
};

/**
 * Generate full 256-color ACI palette according to the AutoCAD specification:
 * Colors 10-249: 24 hues × 5 lightness levels × 2 saturation levels.
 */
function buildFullAciPalette(): Array<[number, number, number]> {
  const palette: Array<[number, number, number]> = new Array(256);

  // 0 = ByBlock (default to white/black placeholder)
  palette[0] = [255, 255, 255];

  // 1-9 = Base colors
  for (let i = 1; i <= 9; i++) {
    palette[i] = BASE_ACI_COLORS[i] ?? [255, 255, 255];
  }

  // 10-249: Standard AutoCAD HSL color wheel
  for (let colorIndex = 10; colorIndex <= 249; colorIndex++) {
    const hueIndex = Math.floor((colorIndex - 10) / 10); // 0 to 23
    const shadeIndex = (colorIndex - 10) % 10;           // 0 to 9

    const hue = (hueIndex * 15) % 360; // 0, 15, 30 ... 345 degrees
    const isHalfSaturated = shadeIndex % 2 === 1;
    const lightnessLevel = Math.floor(shadeIndex / 2); // 0 to 4: 100%, 80%, 60%, 50%, 33%

    const saturation = isHalfSaturated ? 0.5 : 1.0;
    const lightnessMap = [1.0, 0.8, 0.6, 0.45, 0.3];
    const lightness = lightnessMap[lightnessLevel] ?? 0.5;

    palette[colorIndex] = hslToRgb(hue, saturation, lightness);
  }

  // 250-255: Grayscale
  for (let i = 250; i <= 255; i++) {
    const v = GRAYSCALE_RAMP[i] ?? 128;
    palette[i] = [v, v, v];
  }

  return palette;
}

/** Helper: HSL (0-360, 0-1, 0-1) to RGB (0-255) */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;

  if (hp >= 0 && hp < 1) { r = c; g = x; }
  else if (hp >= 1 && hp < 2) { r = x; g = c; }
  else if (hp >= 2 && hp < 3) { g = c; b = x; }
  else if (hp >= 3 && hp < 4) { g = x; b = c; }
  else if (hp >= 4 && hp < 5) { r = x; b = c; }
  else if (hp >= 5 && hp < 6) { r = c; b = x; }

  const m = l - c / 2;
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

const ACI_TABLE = buildFullAciPalette();

/** Format RGB tuple as #RRGGBB */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Resolves a CadColor (symbolic ByLayer/ByBlock, ACI, or TrueColor) to an RGB hex string
 * tailored for the given theme.
 * 
 * @param entityColor - Color assigned directly to the entity
 * @param layerColor - Color of the entity's layer (used for ByLayer resolution)
 * @param theme - Visual rendering theme
 * @param blockColor - Optional color of enclosing block instance (used for ByBlock resolution)
 */
export function resolveColorToHex(
  entityColor: CadColor,
  layerColor: CadColor | undefined,
  theme: SvgTheme,
  blockColor?: CadColor
): string {
  // 1. Strict Monochrome Theme overrides all colors to black
  if (theme === 'monochrome') {
    return '#000000';
  }

  // 2. Blueprint Theme overrides lines to white / cyan
  if (theme === 'blueprint') {
    if (entityColor.kind === 'aci' && (entityColor.index === 1 || entityColor.index === 2)) {
      return '#8da9c4'; // Light accent cyan for highlights
    }
    return '#ffffff';   // Crisp white for main geometry
  }

  // 3. Resolve symbolic inheritance
  let effective = entityColor;
  if (effective.kind === 'byLayer') {
    effective = layerColor ?? { kind: 'aci', index: 7 };
  } else if (effective.kind === 'byBlock') {
    effective = blockColor ?? layerColor ?? { kind: 'aci', index: 7 };
  }

  // If layer itself is byBlock, fall back to ACI 7
  if (effective.kind === 'byBlock' || effective.kind === 'byLayer') {
    effective = { kind: 'aci', index: 7 };
  }

  // 4. Resolve to RGB numbers
  let r = 255, g = 255, b = 255;

  if (effective.kind === 'trueColor') {
    r = effective.r;
    g = effective.g;
    b = effective.b;
  } else if (effective.kind === 'aci') {
    const idx = effective.index;
    const base = ACI_TABLE[idx] ?? [255, 255, 255];
    r = base[0];
    g = base[1];
    b = base[2];

    // Theme-specific adjustments:
    if (theme === 'paper-light') {
      // In paper/light mode:
      // ACI 7 (White) becomes Black (#000000)
      if (idx === 7) {
        return '#000000';
      }
      // ACI 2 (Yellow) on white paper is unreadable: darken to rich amber
      if (idx === 2) {
        return '#997a00';
      }
      // ACI 4 (Cyan) on white paper: darken to deep cyan
      if (idx === 4) {
        return '#008b8b';
      }
      // ACI 3 (Green) on white paper: darken to forest green
      if (idx === 3) {
        return '#008000';
      }
    } else if (theme === 'cad-dark') {
      // In dark CAD mode, ACI 7 is White
      if (idx === 7) {
        return '#ffffff';
      }
    }
  }

  // 5. Grayscale conversion if requested
  if (theme === 'grayscale') {
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    return rgbToHex(lum, lum, lum);
  }

  // 6. Fabrication mode (Color-coded for laser/CNC)
  if (theme === 'fabrication-coded') {
    // Keep Red for outer cut, Blue for score, Black for others
    if (effective.kind === 'aci') {
      if (effective.index === 1) return '#ff0000'; // Cut
      if (effective.index === 5) return '#0000ff'; // Score
    }
    return '#000000'; // Engrave
  }

  return rgbToHex(r, g, b);
}

/** Get background color for the given theme */
export function getThemeBackgroundColor(theme: SvgTheme): string | null {
  switch (theme) {
    case 'cad-dark':
      return '#1e1e1e'; // Dark charcoal (AutoCAD ModelSpace standard)
    case 'paper-light':
      return '#ffffff'; // Pure white
    case 'monochrome':
      return '#ffffff'; // Pure white
    case 'blueprint':
      return '#0b2545'; // Architectural deep navy
    case 'grayscale':
      return '#ffffff';
    case 'fabrication-coded':
      return '#ffffff';
    default:
      return null;
  }
}
