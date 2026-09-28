/**
 * CLI Test Runner for the v4-ir-to-svg Compiler
 * 
 * Usage:
 *   npx tsx src/compilers/to-svg/testSvgRunner.ts <path-to-dwg-or-ir-json> [--preset <preset-name>] [--all-presets]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { compileCadIrToSvg, type SvgPreset } from './index.js';
import type { SemanticCadIR } from './schema.js';

const ALL_PRESETS: SvgPreset[] = [
  'web-cad-interactive',
  'print-document',
  'fabrication-laser-cnc',
  'facility-bim-indoor',
  'patent-technical-lineart',
  'thumbnail-preview',
];

async function main() {
  const args = process.argv.slice(2);
  const inputFile = args.find(a => !a.startsWith('--'));
  const presetArg = args.includes('--preset') ? (args[args.indexOf('--preset') + 1] as SvgPreset) : undefined;
  const renderAll = args.includes('--all-presets');

  if (!inputFile) {
    console.error('Usage: npx tsx src/testSvgRunner.ts <path-to-semantic-ir-json> [--preset <preset>] [--all-presets]');
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputFile);
  console.log(`\n===============================================================`);
  console.log(`🎨 LA VINCI — v4-ir-to-svg COMPILER TEST RUNNER`);
  console.log(`===============================================================`);
  console.log(`Input: ${resolvedInput}`);

  if (!resolvedInput.endsWith('.json')) {
    console.error(`\n❌ Error: v4-ir-to-svg takes a Semantic CAD IR (.json) file as input.`);
    console.error(`Tip: Use v4-dwg-to-ir to convert .dwg to .json first:`);
    console.error(`     npx tsx src/ir/semantic/testRunner.ts drawing.dwg --save-json\n`);
    process.exit(1);
  }

  console.log(`Loading Semantic CAD IR JSON...`);
  const rawContent = await fs.readFile(resolvedInput, 'utf8');
  const parsed = JSON.parse(rawContent);

  // Reconstruct symbols.layers Map if parsed from JSON object
  if (parsed.symbols?.layers && !(parsed.symbols.layers instanceof Map)) {
    parsed.symbols.layers = new Map(Object.entries(parsed.symbols.layers));
  }
  if (parsed.symbols?.linetypes && !(parsed.symbols.linetypes instanceof Map)) {
    parsed.symbols.linetypes = new Map(Object.entries(parsed.symbols.linetypes));
  }
  if (parsed.symbols?.textStyles && !(parsed.symbols.textStyles instanceof Map)) {
    parsed.symbols.textStyles = new Map(Object.entries(parsed.symbols.textStyles));
  }
  if (parsed.blockDefinitions && !(parsed.blockDefinitions instanceof Map)) {
    parsed.blockDefinitions = new Map(Object.entries(parsed.blockDefinitions));
  }
  const ir = parsed as SemanticCadIR;

  const presetsToRun: SvgPreset[] = renderAll 
    ? ALL_PRESETS 
    : [presetArg ?? 'web-cad-interactive'];

  const baseName = path.basename(resolvedInput).replace(/(_semantic_ir)?\.(dwg|json)$/i, '');

  console.log(`\nCompiling ${presetsToRun.length} SVG preset(s)...`);

  for (const p of presetsToRun) {
    const start = Date.now();
    const result = compileCadIrToSvg(ir, { preset: p });
    const duration = Date.now() - start;

    const outFilename = `${baseName}_${p}.svg`;
    const outPath = path.join(process.cwd(), outFilename);
    await fs.writeFile(outPath, result.svg, 'utf8');

    const stat = await fs.stat(outPath);
    const sizeKb = (stat.size / 1024).toFixed(1);

    console.log(`  ✓ [${p.padEnd(24)}] -> ${outFilename.padEnd(36)} (${sizeKb.padStart(6)} KB, ${duration} ms, viewBox: ${result.viewBox})`);
  }

  console.log(`===============================================================\n`);
}

main().catch(err => {
  console.error('\n❌ Fatal error during SVG compilation:', err);
  process.exit(1);
});
