/**
 * SVG Compiler Options & Preset Definitions
 *
 * Defines the 6 industry-standard presets and fine-grained controls
 * for compiling Semantic CAD IR into SVG.
 */
/** Resolves user options + preset defaults into a fully populated configuration */
export function resolveSvgConfig(options) {
    const preset = options?.preset ?? 'web-cad-interactive';
    // Base defaults per preset
    let theme = 'cad-dark';
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
//# sourceMappingURL=svgTypes.js.map