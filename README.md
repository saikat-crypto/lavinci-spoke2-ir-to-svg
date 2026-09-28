# v4-ir-to-svg: High-Fidelity Vector CAD to SVG Compiler

<div align="center">

[![TypeScript: 5.x](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zero C Dependencies](https://img.shields.io/badge/Dependencies-Pure%20TypeScript%20%7C%20Zero%20C-2ED573.svg?style=for-the-badge)](#)
[![Architecture: Hub-and-Spoke](https://img.shields.io/badge/Architecture-Outbound%20Spoke%20v4-6C5CE7.svg?style=for-the-badge)](#)
[![Presets: 6 Industry Standards](https://img.shields.io/badge/Presets-6%20Industry%20Standards-FFA502.svg?style=for-the-badge)](#)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](#)

**High-fidelity, pure TypeScript CAD-to-SVG compiler. Converts canonical Semantic CAD Intermediate Representation (IR) into standards-compliant, publication-grade vector SVG graphics across 6 industry-standard presets.**

*Part of the La Vinci CAD processing ecosystem (v4).*

</div>

---

## 🏛️ Role in the Architecture

`v4-ir-to-svg` is the **First Outbound Spoke** in the La Vinci ecosystem. It consumes the canonical `SemanticCadIR` produced by `v4-dwg-to-ir` and lowers it into clean SVG code:

```
┌────────────────────────────────────────────────────────┐
│  CANONICAL SEMANTIC CAD IR (The Hub)                   │
│  Exact Analytic Geometry • Symbolic Properties         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  v4-ir-to-svg (Outbound Compiler)                      │
│  - Cartesian-to-Screen Y-axis Inversion                │
│  - Full 256-color AutoCAD Color Index (ACI) Mapping    │
│  - Polyline Bulge-to-Arc Trigonometry (tan(θ/4) -> A)  │
│  - Instanced Scene Graph (<defs><g> + <use>)           │
│  - Non-Scaling Stroke Preservation                     │
│  - 6 Industry-Standard Rendering Presets               │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  STANDARDS-COMPLIANT VECTOR SVG                        │
│  Chrome • Edge • Safari • Illustrator • Laser/CNC      │
└────────────────────────────────────────────────────────┘
```

---

## 🎛️ The 6 Industry-Standard Presets (99%+ Coverage)

| Preset Name | Target Use Case | Theme | Background | Structure | Line Weights | Interactivity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`web-cad-interactive`** | Cloud / SaaS CAD Viewers | `cad-dark` | `#1e1e1e` | Instanced (`<use>`) | `non-scaling-stroke` | Yes (`data-handle`, `data-layer`) |
| **`print-document`** | Submittals, RFIs, PDF | `paper-light` | `#ffffff` | Instanced | True Metric (`0.25mm`) | No (Clean Static Vector) |
| **`fabrication-laser-cnc`** | Laser Cutting / CNC | `fabrication-coded` | None | **Flattened Paths** | Hairline (`0.01mm`) | No (Closed Cut/Score Loops) |
| **`facility-bim-indoor`** | Wayfinding / Floor Plans | `paper-light` | `#ffffff` | Instanced | `non-scaling-stroke` | Yes (Room & Area Metadata) |
| **`patent-technical-lineart`** | USPTO/EPO Patent Drawings | `monochrome` | `#ffffff` | Instanced | High Contrast B&W | No (Strict 100% Black/White) |
| **`thumbnail-preview`** | DMS / Asset Previews | `cad-dark` | `#1e1e1e` | Instanced | `non-scaling-stroke` | No (Lightweight < 50 KB) |

---

## ⚡ Core Computational Invariants

1. **Y-Axis Inversion:**
   * In CAD (Cartesian), Y goes **up**.
   * In SVG (Screen space), Y goes **down**.
   * The compiler maps coordinates analytically so the engineering drawing is never inverted or mirrored.

2. **Scene Graph Instancing via `<defs>` and `<use>`:**
   * Reusable blocks (doors, windows, light fixtures, furniture) are emitted once into `<defs><g id="block_...">`.
   * Each occurrence is placed via a lightweight `<use href="#block_..." transform="matrix(a, b, c, d, tx, ty)"/>`.
   * Reduces DOM size by up to **90%** compared to naive flattened geometry.

3. **Bulge-to-Arc Trigonometry:**
   * AutoCAD polylines store arc segments as $b = \tan(\theta/4)$.
   * The compiler converts $b$ and chord endpoints $(P_1, P_2)$ into exact SVG Arc parameters:
     $$R = \frac{d \cdot (1 + b^2)}{4 |b|}, \quad \text{largeArcFlag} = |b| > 1 ? 1 : 0$$

4. **Pure TypeScript (Zero C Dependencies):**
   * Unlike `v4-dwg-to-ir`, this compiler requires **no C binaries, no WebAssembly, and no native libraries**.
   * Runs natively in Node.js, AWS Lambda (pure Node runtime), Cloudflare Workers, or modern web browsers.

---

## 🚀 Programmatic Usage

```typescript
import { compileCadIrToSvg } from '@lavinci/v4-ir-to-svg';
import type { SemanticCadIR } from '@lavinci/v4-ir-to-svg';

// Compile with the default interactive web preset
const result = compileCadIrToSvg(ir, {
  preset: 'web-cad-interactive',
});

console.log(result.svg);      // The full XML SVG string
console.log(result.viewBox);  // e.g. "1062.89 0 91.47 115.70"
console.log(result.width);    // Exact width in drawing units
```

### Generating a Specific Preset (e.g. Laser Cutting)

```typescript
const cncCutFile = compileCadIrToSvg(ir, {
  preset: 'fabrication-laser-cnc',
  marginPercent: 0, // Strict 1:1 physical scale
});
```

---

## 🛠️ CLI Runner

You can compile any Semantic CAD IR JSON into SVG using the CLI tool:

```bash
# Compile to default interactive web SVG
npx tsx src/testSvgRunner.ts path/to/model_semantic_ir.json

# Compile to a specific preset
npx tsx src/testSvgRunner.ts path/to/model_semantic_ir.json --preset print-document

# Compile all 6 presets at once
npx tsx src/testSvgRunner.ts path/to/model_semantic_ir.json --all-presets
```

---

## 📜 License

ISC © Saikat Dutta Chowdhury.
