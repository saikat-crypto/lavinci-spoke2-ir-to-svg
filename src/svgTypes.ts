/**
 * SVG Compiler Options & Preset Definitions
 * 
 * Defines the 6 industry-standard presets and fine-grained controls
 * for compiling Semantic CAD IR into SVG.
 */

import type { SvgTheme } from './aciPalette.js';

export type SvgPreset =
  | 'web-cad-interactive'     // Cloud/browser viewer with interactive data tags
  | 'print-document'          // Clean paper submittal with ISO standard line weights
  | 'fabrication-laser-cnc'   // 1:1 color-coded flattened paths for laser/CNC
  | 'facility-bim-indoor'     // Wayfinding / indoor map (structural walls & rooms only)
  | 'patent-technical-lineart'// Strict black & white line art (USPTO/EPO compliant)
  | 'thumbnail-preview';      // Lightweight, simplified asset thumbnail

export type SvgSpace =
  | 'model'
  | { layout: string };

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
export function resolveSvgConfig(options?: SvgRenderOptions): ResolvedSvgConfig {
  const preset: SvgPreset = options?.preset ?? 'web-cad-interactive';

  // Base defaults per preset
  let theme: SvgTheme = 'cad-dark';
  let interactive = true;
  let flattenBlocks = false;
  let useNonScalingStroke = true;
  let marginPercent = 2;
  let includeBackground = true;

  switch (preset) {
    case 'web-cad-interactive':
      theme = 'cad-dark';
      interactive = true;
      flattenBlocks = false;
      useNonScalingStroke = true;
      marginPercent = 2;
      includeBackground = true;
      break;

    case 'print-document':
      theme = 'paper-light';
      interactive = false;
      flattenBlocks = false;
      useNonScalingStroke = false; // Use true millimeter line weights
      marginPercent = 3;
      includeBackground = true;
      break;

    case 'fabrication-laser-cnc':
      theme = 'fabrication-coded';
      interactive = false;
      flattenBlocks = true; // CAM drivers need flattened geometry!
      useNonScalingStroke = false;
      marginPercent = 0; // Strict 1:1 scale
      includeBackground = false; // No background rect for cutting machines
      break;

    case 'facility-bim-indoor':
      theme = 'paper-light';
      interactive = true;
      flattenBlocks = false;
      useNonScalingStroke = true;
      marginPercent = 2;
      includeBackground = true;
      break;

    case 'patent-technical-lineart':
      theme = 'monochrome';
      interactive = false;
      flattenBlocks = false;
      useNonScalingStroke = false;
      marginPercent = 5; // Standard patent margins
      includeBackground = true;
      break;

    case 'thumbnail-preview':
      theme = 'cad-dark';
      interactive = false;
      flattenBlocks = false;
      useNonScalingStroke = true;
      marginPercent = 4;
      includeBackground = true;
      break;
  }

  // Explicit overrides take priority over preset defaults
  return {
    theme: options?.theme ?? theme,
    space: options?.space ?? 'model',
    interactive: options?.interactive ?? interactive,
    flattenBlocks: options?.flattenBlocks ?? flattenBlocks,
    layerFilter: options?.layerFilter,
    marginPercent: options?.marginPercent ?? marginPercent,
    useNonScalingStroke: options?.useNonScalingStroke ?? useNonScalingStroke,
    targetWidth: options?.targetWidth,
    targetHeight: options?.targetHeight,
    includeBackground,
  };
}
