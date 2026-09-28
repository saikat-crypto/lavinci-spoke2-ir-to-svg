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
export function bulgeToSvgArc(x1, y1, x2, y2, bulge, isScreenYFlipped = true) {
    if (Math.abs(bulge) < 1e-9) {
        return null; // Straight line segment
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const chordLength = Math.hypot(dx, dy);
    if (chordLength < 1e-9) {
        return null; // Coincident points
    }
    // Radius = (chordLength / 2) * ((1 + bulge^2) / (2 * |bulge|))
    //        = (chordLength * (1 + bulge^2)) / (4 * |bulge|)
    const radius = (chordLength * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
    // In AutoCAD: |bulge| > 1 means included angle |theta| > 180 degrees
    const largeArcFlag = Math.abs(bulge) > 1 ? 1 : 0;
    // In CAD (Cartesian Y-up):
    //   bulge > 0 means CCW
    //   bulge < 0 means CW
    // When flipping Y for SVG screen space (Y-down):
    //   Cartesian CCW becomes SVG Clockwise (sweep=1)
    //   Cartesian CW becomes SVG Counter-Clockwise (sweep=0)
    let sweepFlag;
    if (isScreenYFlipped) {
        sweepFlag = bulge > 0 ? 1 : 0;
    }
    else {
        sweepFlag = bulge > 0 ? 0 : 1;
    }
    return {
        radius,
        largeArcFlag,
        sweepFlag,
        endX: x2,
        endY: y2,
    };
}
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
export function circularArcToSvgPath(cx, cadCenterY, radius, startAngleDeg, endAngleDeg, flipY) {
    const toRad = Math.PI / 180;
    const startRad = startAngleDeg * toRad;
    const endRad = endAngleDeg * toRad;
    // Calculate Cartesian start & end points
    const startX = cx + radius * Math.cos(startRad);
    const cadStartY = cadCenterY + radius * Math.sin(startRad);
    const endX = cx + radius * Math.cos(endRad);
    const cadEndY = cadCenterY + radius * Math.sin(endRad);
    // Flip Y to screen coordinates
    const screenStartY = flipY(cadStartY);
    const screenEndY = flipY(cadEndY);
    // Compute angular sweep in CCW direction
    let sweepAngle = endAngleDeg - startAngleDeg;
    while (sweepAngle < 0)
        sweepAngle += 360;
    while (sweepAngle >= 360)
        sweepAngle -= 360;
    // If sweep angle is 0, it's either a point or full circle
    if (sweepAngle < 1e-4) {
        sweepAngle = 360;
    }
    const largeArcFlag = sweepAngle > 180 ? 1 : 0;
    // In screen space (Y flipped), CCW arc travels clockwise (sweepFlag = 1)
    const sweepFlag = 1;
    return `M ${startX.toFixed(3)} ${screenStartY.toFixed(3)} A ${radius.toFixed(3)} ${radius.toFixed(3)} 0 ${largeArcFlag} ${sweepFlag} ${endX.toFixed(3)} ${screenEndY.toFixed(3)}`;
}
//# sourceMappingURL=bulgeMath.js.map