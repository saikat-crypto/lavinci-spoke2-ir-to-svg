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

import type {
  SemanticCadIR,
  Entity,
  GeometricEntity,
  TextEntity,
  MTextEntity,
  BlockInstance,
  BlockDefinition,
  LayerEntry,
  GeoLine,
  GeoCircle,
  GeoArc,
  GeoPolyline2D,
  BoundingBox2D,
} from './schema.js';
import { resolveColorToHex, getThemeBackgroundColor } from './aciPalette.js';
import { bulgeToSvgArc, circularArcToSvgPath } from './bulgeMath.js';
import { resolveSvgConfig, type SvgRenderOptions, type ResolvedSvgConfig } from './svgTypes.js';

export interface SvgCompilationResult {
  svg: string;
  viewBox: string;
  width: number;
  height: number;
  entityCount: number;
  preset: string;
  theme: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bounding box & Coordinate framing
// ─────────────────────────────────────────────────────────────────────────────

interface Framing {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  flipY: (cadY: number) => number;
}

function calculateFraming(ir: SemanticCadIR, marginPercent: number): Framing {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // 1. Try drawing header extents first
  const ext = ir.meta.modelExtents;
  if (ext && ext.minX < ext.maxX && ext.minY < ext.maxY && Math.abs(ext.maxX - ext.minX) > 1e-4) {
    minX = ext.minX;
    minY = ext.minY;
    maxX = ext.maxX;
    maxY = ext.maxY;
  } else {
    // 2. Compute bounding box by scanning model space entities
    for (const ent of ir.modelSpace.entities) {
      if (ent.kind === 'geometric') {
        const geo = ent.geometry;
        if (geo.kind === 'line') {
          minX = Math.min(minX, geo.start.x, geo.end.x);
          maxX = Math.max(maxX, geo.start.x, geo.end.x);
          minY = Math.min(minY, geo.start.y, geo.end.y);
          maxY = Math.max(maxY, geo.start.y, geo.end.y);
        } else if (geo.kind === 'circle' || geo.kind === 'arc') {
          minX = Math.min(minX, geo.center.x - geo.radius);
          maxX = Math.max(maxX, geo.center.x + geo.radius);
          minY = Math.min(minY, geo.center.y - geo.radius);
          maxY = Math.max(maxY, geo.center.y + geo.radius);
        } else if (geo.kind === 'polyline2d') {
          for (const v of geo.vertices) {
            minX = Math.min(minX, v.point.x);
            maxX = Math.max(maxX, v.point.x);
            minY = Math.min(minY, v.point.y);
            maxY = Math.max(maxY, v.point.y);
          }
        }
      } else if (ent.kind === 'blockInstance') {
        minX = Math.min(minX, ent.insertionPoint.x);
        maxX = Math.max(maxX, ent.insertionPoint.x);
        minY = Math.min(minY, ent.insertionPoint.y);
        maxY = Math.max(maxY, ent.insertionPoint.y);
      }
    }
  }

  // Fallback if drawing is completely empty
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || minX >= maxX || minY >= maxY) {
    minX = 0; minY = 0; maxX = 1000; maxY = 1000;
  }

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const marginX = spanX * (marginPercent / 100);
  const marginY = spanY * (marginPercent / 100);

  const paddedMinX = minX - marginX;
  const paddedMaxX = maxX + marginX;
  const paddedMinY = minY - marginY;
  const paddedMaxY = maxY + marginY;

  const width = paddedMaxX - paddedMinX;
  const height = paddedMaxY - paddedMinY;

  // Invert Y: Cartesian paddedMaxY becomes screen 0; Cartesian paddedMinY becomes screen height
  const flipY = (cadY: number) => paddedMaxY - cadY;

  return {
    minX: paddedMinX,
    minY: paddedMinY,
    maxX: paddedMaxX,
    maxY: paddedMaxY,
    width,
    height,
    flipY,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lineweight resolution
// ─────────────────────────────────────────────────────────────────────────────

function getStrokeWidth(ent: Entity, config: ResolvedSvgConfig, framing?: Framing): string {
  if (config.useNonScalingStroke) {
    return '1';
  }

  const dim = framing ? Math.min(framing.width, framing.height) : 1000;
  const lw = ent.visual.lineWeight;
  const mmWeight = lw.kind === 'mm100' ? Math.max(lw.value / 100, 0.13) : 0.25;

  // Proportional line weight scaled to drawing coordinate system
  const strokeUnits = Math.max((dim / 600) * (mmWeight / 0.25), 0.001);
  return strokeUnits.toFixed(3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity to SVG conversion
// ─────────────────────────────────────────────────────────────────────────────

function renderLine(
  line: GeoLine,
  ent: Entity,
  layerEntry: LayerEntry | undefined,
  config: ResolvedSvgConfig,
  framing: Framing
): string {
  const x1 = line.start.x.toFixed(3);
  const y1 = framing.flipY(line.start.y).toFixed(3);
  const x2 = line.end.x.toFixed(3);
  const y2 = framing.flipY(line.end.y).toFixed(3);

  const color = resolveColorToHex(ent.visual.color, layerEntry?.color, config.theme);
  const strokeWidth = getStrokeWidth(ent, config, framing);
  const nonScaling = config.useNonScalingStroke ? ' vector-effect="non-scaling-stroke"' : '';
  const dataTags = config.interactive
    ? ` data-handle="${ent.sourceHandle}" data-id="${ent.id}"`
    : '';

  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}"${nonScaling}${dataTags}/>`;
}

function renderCircle(
  circle: GeoCircle,
  ent: Entity,
  layerEntry: LayerEntry | undefined,
  config: ResolvedSvgConfig,
  framing: Framing
): string {
  const cx = circle.center.x.toFixed(3);
  const cy = framing.flipY(circle.center.y).toFixed(3);
  const r = circle.radius.toFixed(3);

  const color = resolveColorToHex(ent.visual.color, layerEntry?.color, config.theme);
  const strokeWidth = getStrokeWidth(ent, config, framing);
  const nonScaling = config.useNonScalingStroke ? ' vector-effect="non-scaling-stroke"' : '';
  const dataTags = config.interactive
    ? ` data-handle="${ent.sourceHandle}" data-id="${ent.id}"`
    : '';

  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${nonScaling}${dataTags}/>`;
}

function renderArc(
  arc: GeoArc,
  ent: Entity,
  layerEntry: LayerEntry | undefined,
  config: ResolvedSvgConfig,
  framing: Framing
): string {
  const pathD = circularArcToSvgPath(
    arc.center.x,
    arc.center.y,
    arc.radius,
    arc.startAngleDeg,
    arc.endAngleDeg,
    framing.flipY
  );

  const color = resolveColorToHex(ent.visual.color, layerEntry?.color, config.theme);
  const strokeWidth = getStrokeWidth(ent, config, framing);
  const nonScaling = config.useNonScalingStroke ? ' vector-effect="non-scaling-stroke"' : '';
  const dataTags = config.interactive
    ? ` data-handle="${ent.sourceHandle}" data-id="${ent.id}"`
    : '';

  return `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${nonScaling}${dataTags}/>`;
}

function renderPolyline(
  poly: GeoPolyline2D,
  ent: Entity,
  layerEntry: LayerEntry | undefined,
  config: ResolvedSvgConfig,
  framing: Framing
): string {
  if (poly.vertices.length === 0) return '';

  const pathCommands: string[] = [];
  const v0 = poly.vertices[0]!;
  pathCommands.push(`M ${v0.point.x.toFixed(3)} ${framing.flipY(v0.point.y).toFixed(3)}`);

  for (let i = 0; i < poly.vertices.length; i++) {
    const curr = poly.vertices[i]!;
    const isLast = i === poly.vertices.length - 1;
    if (isLast && !poly.isClosed) break;

    const next = poly.vertices[(i + 1) % poly.vertices.length]!;
    const x1 = curr.point.x;
    const y1 = framing.flipY(curr.point.y);
    const x2 = next.point.x;
    const y2 = framing.flipY(next.point.y);

    if (curr.bulge && Math.abs(curr.bulge) > 1e-9) {
      // Curved segment with bulge
      const arc = bulgeToSvgArc(x1, y1, x2, y2, curr.bulge, true);
      if (arc) {
        pathCommands.push(`A ${arc.radius.toFixed(3)} ${arc.radius.toFixed(3)} 0 ${arc.largeArcFlag} ${arc.sweepFlag} ${arc.endX.toFixed(3)} ${arc.endY.toFixed(3)}`);
      } else {
        pathCommands.push(`L ${x2.toFixed(3)} ${y2.toFixed(3)}`);
      }
    } else {
      // Straight segment
      pathCommands.push(`L ${x2.toFixed(3)} ${y2.toFixed(3)}`);
    }
  }

  if (poly.isClosed) {
    pathCommands.push('Z');
  }

  const color = resolveColorToHex(ent.visual.color, layerEntry?.color, config.theme);
  const strokeWidth = getStrokeWidth(ent, config, framing);
  const nonScaling = config.useNonScalingStroke ? ' vector-effect="non-scaling-stroke"' : '';
  const dataTags = config.interactive
    ? ` data-handle="${ent.sourceHandle}" data-id="${ent.id}"`
    : '';

  // Check if this was a SOLID fill (e.g. arrowheads)
  const isSolidFill = ent.id.startsWith('solid_');
  const fill = isSolidFill ? color : 'none';
  const stroke = isSolidFill ? 'none' : color;

  return `<path d="${pathCommands.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${nonScaling}${dataTags}/>`;
}

function renderText(
  txt: TextEntity,
  layerEntry: LayerEntry | undefined,
  config: ResolvedSvgConfig,
  framing: Framing
): string {
  const x = txt.position.x.toFixed(3);
  const y = framing.flipY(txt.position.y).toFixed(3);
  const color = resolveColorToHex(txt.visual.color, layerEntry?.color, config.theme);
  const fontSize = txt.height > 0 ? txt.height.toFixed(2) : '12';

  // Inverted rotation for screen Y-down
  const rot = -txt.rotation;
  const transform = Math.abs(rot) > 1e-4 ? ` transform="rotate(${rot.toFixed(2)} ${x} ${y})"` : '';
  const dataTags = config.interactive
    ? ` data-handle="${txt.sourceHandle}" data-id="${txt.id}"`
    : '';

  // Clean XML special chars
  const escaped = txt.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="${color}"${transform}${dataTags}>${escaped}</text>`;
}

function renderMText(
  txt: MTextEntity,
  layerEntry: LayerEntry | undefined,
  config: ResolvedSvgConfig,
  framing: Framing
): string {
  const x = txt.insertionPoint.x.toFixed(3);
  const y = framing.flipY(txt.insertionPoint.y).toFixed(3);
  const color = resolveColorToHex(txt.visual.color, layerEntry?.color, config.theme);
  const fontSize = txt.height > 0 ? txt.height.toFixed(2) : '12';
  const dataTags = config.interactive
    ? ` data-handle="${txt.sourceHandle}" data-id="${txt.id}"`
    : '';

  const escaped = txt.plainText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="${color}"${dataTags}>${escaped}</text>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Block Definition Renderer (for <defs>)
// ─────────────────────────────────────────────────────────────────────────────

function renderBlockDef(
  block: BlockDefinition,
  layers: Map<string, LayerEntry>,
  config: ResolvedSvgConfig
): string {
  const elements: string[] = [];

  // Local identity framing for block templates
  const localFraming: Framing = {
    minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100,
    flipY: (y: number) => -y, // Cartesian local Y points up; local SVG Y points down
  };

  for (const ent of block.entities) {
    const layer = layers.get(ent.layerName);
    if (ent.kind === 'geometric') {
      const g = ent.geometry;
      if (g.kind === 'line') elements.push(renderLine(g, ent, layer, config, localFraming));
      else if (g.kind === 'circle') elements.push(renderCircle(g, ent, layer, config, localFraming));
      else if (g.kind === 'arc') elements.push(renderArc(g, ent, layer, config, localFraming));
      else if (g.kind === 'polyline2d') elements.push(renderPolyline(g, ent, layer, config, localFraming));
    }
  }

  return `    <g id="${block.id}">\n      ${elements.join('\n      ')}\n    </g>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Compiler Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compiles a Semantic CAD IR document into an industry-standard vector SVG.
 * 
 * @param ir - The canonical Semantic CAD IR document
 * @param options - Custom render options or one of the 6 standard presets
 * @returns SVG string, viewBox, dimensions, and execution metadata
 */
export function compileCadIrToSvg(
  ir: SemanticCadIR,
  options?: SvgRenderOptions
): SvgCompilationResult {
  const config = resolveSvgConfig(options);
  const framing = calculateFraming(ir, config.marginPercent);

  const viewBox = `${framing.minX.toFixed(3)} 0 ${framing.width.toFixed(3)} ${framing.height.toFixed(3)}`;
  const svgElements: string[] = [];
  const defElements: string[] = [];

  // 1. Background fill
  if (config.includeBackground) {
    const bgColor = getThemeBackgroundColor(config.theme);
    if (bgColor) {
      svgElements.push(`  <rect x="${framing.minX.toFixed(3)}" y="0" width="${framing.width.toFixed(3)}" height="${framing.height.toFixed(3)}" fill="${bgColor}"/>`);
    }
  }

  // 2. Build <defs> for block definitions if instanced
  if (!config.flattenBlocks && ir.blockDefinitions.size > 0) {
    for (const block of ir.blockDefinitions.values()) {
      if (block.entities.length > 0) {
        defElements.push(renderBlockDef(block, ir.symbols.layers, config));
      }
    }
  }

  // 3. Group model space entities by Layer
  const entitiesByLayer = new Map<string, Entity[]>();
  for (const ent of ir.modelSpace.entities) {
    // Apply layer filter if present
    if (config.layerFilter && !config.layerFilter.includes(ent.layerName)) {
      continue;
    }

    if (!entitiesByLayer.has(ent.layerName)) {
      entitiesByLayer.set(ent.layerName, []);
    }
    entitiesByLayer.get(ent.layerName)!.push(ent);
  }

  let totalRendered = 0;

  // 4. Render each layer as an SVG <g>
  for (const [layerName, layerEntities] of entitiesByLayer) {
    const layerEntry = ir.symbols.layers.get(layerName);
    const isHidden = layerEntry?.isOff || layerEntry?.isFrozen;

    // For non-interactive presets, completely skip hidden layers
    if (isHidden && !config.interactive) {
      continue;
    }

    const layerClass = isHidden ? 'cad-layer cad-layer-hidden' : 'cad-layer';
    const layerStyle = isHidden ? ' style="display: none;"' : '';
    const layerGroupHeader = `  <g id="layer_${layerName.replace(/[^a-zA-Z0-9_-]/g, '_')}" class="${layerClass}" data-layer="${layerName}"${layerStyle}>`;

    const layerElements: string[] = [];

    for (const ent of layerEntities) {
      totalRendered++;

      if (ent.kind === 'geometric') {
        const geo = ent.geometry;
        switch (geo.kind) {
          case 'line':
            layerElements.push('    ' + renderLine(geo, ent, layerEntry, config, framing));
            break;
          case 'circle':
            layerElements.push('    ' + renderCircle(geo, ent, layerEntry, config, framing));
            break;
          case 'arc':
            layerElements.push('    ' + renderArc(geo, ent, layerEntry, config, framing));
            break;
          case 'polyline2d':
            layerElements.push('    ' + renderPolyline(geo, ent, layerEntry, config, framing));
            break;
        }
      } else if (ent.kind === 'text') {
        layerElements.push('    ' + renderText(ent, layerEntry, config, framing));
      } else if (ent.kind === 'mtext') {
        layerElements.push('    ' + renderMText(ent, layerEntry, config, framing));
      } else if (ent.kind === 'blockInstance') {
        // Block instance: transform affine matrix into SVG matrix
        // CAD matrix: [a, b, c, d, tx, ty]
        // SVG screen matrix with inverted Y:
        //   x' = a*x + c*y + tx
        //   y' = -b*x - d*y + (paddedMaxY - ty)
        const t = ent.transform;
        const tx = t.tx.toFixed(3);
        const ty = framing.flipY(t.ty).toFixed(3);
        const mStr = `matrix(${t.a.toFixed(4)}, ${(-t.b).toFixed(4)}, ${(-t.c).toFixed(4)}, ${t.d.toFixed(4)}, ${tx}, ${ty})`;
        const dataTags = config.interactive
          ? ` data-handle="${ent.sourceHandle}" data-block="${ent.blockName}"`
          : '';

        layerElements.push(`    <use href="#${ent.blockDefinitionId}" transform="${mStr}"${dataTags}/>`);
      }
    }

    if (layerElements.length > 0) {
      svgElements.push(layerGroupHeader);
      svgElements.push(...layerElements);
      svgElements.push('  </g>');
    }
  }

  // 5. Assemble final SVG document
  const defsSection = defElements.length > 0
    ? `  <defs>\n${defElements.join('\n')}\n  </defs>\n`
    : '';

  const widthAttr = config.targetWidth ? ` width="${config.targetWidth}"` : '';
  const heightAttr = config.targetHeight ? ` height="${config.targetHeight}"` : '';

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- Generated by La Vinci v4-ir-to-svg | Preset: ${config.theme} -->`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}"${widthAttr}${heightAttr} preserveAspectRatio="xMidYMid meet">`,
    defsSection + svgElements.join('\n'),
    `</svg>`,
  ].join('\n');

  return {
    svg,
    viewBox,
    width: framing.width,
    height: framing.height,
    entityCount: totalRendered,
    preset: config.theme,
    theme: config.theme,
  };
}
