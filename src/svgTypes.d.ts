/**
 * SVG Compiler Options & Preset Definitions
 *
 * Defines the 6 industry-standard presets and fine-grained controls
 * for compiling Semantic CAD IR into SVG.
 */
import type { SvgTheme } from './aciPalette.js';
export type SvgPreset = 'web-cad-interactive' | 'print-document' | 'fabrication-laser-cnc' | 'facility-bim-indoor' | 'patent-technical-lineart' | 'thumbnail-preview';
export type SvgSpace = 'model' | {
    layout: string;
};
export interface SvgRenderOptions {
    /** High-level industry preset (auto-configures theme, structure, metadata) */
    preset?: SvgPreset;
    /** Visual color theme (overrides preset default if set) */
    theme?: SvgTheme;
    /** Target space to render: 'model' (default) or a layout sheet name */
    space?: SvgSpace;
    /** Whether to inject semantic data attributes (data-handle, data-layer, data-id) */
    interactive?: boolean;
    /**
     * If true, expands all block instances into standalone paths.
     * Required for laser cutters/CNC and tools like Illustrator/Figma that have broken <use> support.
     * If false, emits reusable blocks into <defs><g> and uses <use href="...">.
     */
    flattenBlocks?: boolean;
    /** Optional layer whitelist. If specified, only these layers are rendered */
    layerFilter?: string[];
    /** Percentage margin to add around the drawing extents (default: 2%) */
    marginPercent?: number;
    /** Optional fixed canvas width (for thumbnails or fixed exports) */
    targetWidth?: number;
    /** Optional fixed canvas height */
    targetHeight?: number;
    /** CSS stroke-width override (or 'non-scaling-stroke' for zoomable web SVG) */
    useNonScalingStroke?: boolean;
}
/** Pre-configured settings for each industry preset */
export interface ResolvedSvgConfig {
    theme: SvgTheme;
    space: SvgSpace;
    interactive: boolean;
    flattenBlocks: boolean;
    layerFilter?: string[] | undefined;
    marginPercent: number;
    useNonScalingStroke: boolean;
    targetWidth?: number | undefined;
    targetHeight?: number | undefined;
    includeBackground: boolean;
}
/** Resolves user options + preset defaults into a fully populated configuration */
export declare function resolveSvgConfig(options?: SvgRenderOptions): ResolvedSvgConfig;
//# sourceMappingURL=svgTypes.d.ts.map