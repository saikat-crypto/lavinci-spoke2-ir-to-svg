/**
 * ============================================================
 * LA VINCI — SEMANTIC CAD INTERMEDIATE REPRESENTATION (IR)
 * ============================================================
 *
 * This file defines the TypeScript schema for Layer 2 of our 3-layer
 * compiler pipeline:
 *
 *   Layer 1: Source Preservation  (raw LibreDWG JSON, handles intact)
 *   Layer 2: Semantic CAD IR      ← YOU ARE HERE
 *   Layer 3: Render IR            (evaluated, context-specific, paintable)
 *
 * DESIGN RULES FOR THIS SCHEMA:
 *
 *  ✅ Coordinates stay in LOCAL entity space. Never baked into World space.
 *  ✅ Colors stay as symbolic references (ByLayer, ByBlock). Never pre-resolved.
 *  ✅ Block definitions are stored ONCE. Instances reference them by ID.
 *  ✅ NURBS / splines stay as exact analytic curves. No Bézier conversion yet.
 *  ✅ Proxy/unknown entities are preserved verbatim. Nothing is silently dropped.
 *  ✅ Every entity knows its source handle (for traceability back to raw DWG).
 *
 *  ❌ Do NOT put resolved RGB colors here.
 *  ❌ Do NOT put world-space baked coordinates here.
 *  ❌ Do NOT put flattened/expanded hatch lines here.
 *  ❌ Do NOT put tessellated NURBS curves here.
 */
export {};
//# sourceMappingURL=schema.js.map