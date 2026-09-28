/**
 * Computational Geometry for CAD-to-SVG Arc & Bulge Conversion
 *
 * In AutoCAD polylines (LWPOLYLINE), curved segments are defined by a single
 * scalar known as the "bulge":
 *
 *   bulge = tan(theta / 4)
 *
 * where theta is the included angle of the arc segment.
 *   - bulge = 0: straight line
 *   - bulge = 1: 180° semicircle (counter-clockwise)
 *   - bulge = -1: 180° semicircle (clockwise)
 *   - |bulge| > 1: arc with sweep angle > 180° (large arc flag = 1)
 */
export interface SvgArcSegment {
    radius: number;
    largeArcFlag: 0 | 1;
    sweepFlag: 0 | 1;
    endX: number;
    endY: number;
}
/**
 * Converts an AutoCAD polyline bulge segment into SVG Arc command parameters.
 *
 * @param x1 - Start X in screen coordinates
 * @param y1 - Start Y in screen coordinates
 * @param x2 - End X in screen coordinates
 * @param y2 - End Y in screen coordinates
 * @param bulge - AutoCAD bulge value = tan(theta / 4)
 * @param isScreenYFlipped - True if Y coordinates have been inverted for screen (standard for CAD-to-SVG)
 */
export declare function bulgeToSvgArc(x1: number, y1: number, x2: number, y2: number, bulge: number, isScreenYFlipped?: boolean): SvgArcSegment | null;
/**
 * Converts a CAD circular arc (Center, Radius, StartAngle, EndAngle) into an SVG path 'd' string.
 *
 * @param cx - Center X
 * @param cy - Center Y (already screen-flipped)
 * @param radius - Arc radius
 * @param startAngleDeg - Start angle in degrees (CCW from positive X-axis in CAD)
 * @param endAngleDeg - End angle in degrees (CCW from positive X-axis in CAD)
 * @param flipY - Function that converts a Cartesian Y coordinate into screen Y
 */
export declare function circularArcToSvgPath(cx: number, cadCenterY: number, radius: number, startAngleDeg: number, endAngleDeg: number, flipY: (y: number) => number): string;
//# sourceMappingURL=bulgeMath.d.ts.map