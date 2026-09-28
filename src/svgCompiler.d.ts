/**
 * v4-ir-to-svg: Canonical Semantic CAD IR to Standards-Compliant SVG Compiler
 *
 * Implements the 6 industry-standard presets:
 *   1. web-cad-interactive     (Cloud viewer with data tags and non-scaling strokes)
 *   2. print-document          (Paper submittal with true ISO metric line weights)
 *   3. fabrication-laser-cnc   (1:1 color-coded flattened geometry for laser/CNC)
 *   4. facility-bim-indoor     (Wayfinding indoor floor plans)
 *   5. patent-technical-lineart(Strict 100% black/white line art)
 *   6. thumbnail-preview       (Optimized asset thumbnails)
 *
 * Mathematical Invariants:
 *   - Cartesian-to-Screen Y-axis inversion (CAD Y-up -> Screen Y-down)
 *   - Exact bulge-to-arc trigonometry
 *   - Instanced scene graph (<defs><g> + <use>) with affine matrix mapping
 *   - Non-scaling stroke preservation for infinite zoom in browsers
 */
import type { SemanticCadIR } from './schema.js';
import { type SvgRenderOptions } from './svgTypes.js';
export interface SvgCompilationResult {
    svg: string;
    viewBox: string;
    width: number;
    height: number;
    entityCount: number;
    preset: string;
    theme: string;
}
/**
 * Compiles a Semantic CAD IR document into an industry-standard vector SVG.
 *
 * @param ir - The canonical Semantic CAD IR document
 * @param options - Custom render options or one of the 6 standard presets
 * @returns SVG string, viewBox, dimensions, and execution metadata
 */
export declare function compileCadIrToSvg(ir: SemanticCadIR, options?: SvgRenderOptions): SvgCompilationResult;
//# sourceMappingURL=svgCompiler.d.ts.map