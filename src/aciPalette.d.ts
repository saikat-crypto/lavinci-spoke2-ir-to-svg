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
export type SvgTheme = 'cad-dark' | 'paper-light' | 'monochrome' | 'blueprint' | 'grayscale' | 'fabrication-coded';
/** Format RGB tuple as #RRGGBB */
export declare function rgbToHex(r: number, g: number, b: number): string;
/**
 * Resolves a CadColor (symbolic ByLayer/ByBlock, ACI, or TrueColor) to an RGB hex string
 * tailored for the given theme.
 *
 * @param entityColor - Color assigned directly to the entity
 * @param layerColor - Color of the entity's layer (used for ByLayer resolution)
 * @param theme - Visual rendering theme
 * @param blockColor - Optional color of enclosing block instance (used for ByBlock resolution)
 */
export declare function resolveColorToHex(entityColor: CadColor, layerColor: CadColor | undefined, theme: SvgTheme, blockColor?: CadColor): string;
/** Get background color for the given theme */
export declare function getThemeBackgroundColor(theme: SvgTheme): string | null;
//# sourceMappingURL=aciPalette.d.ts.map