#!/usr/bin/env node

/**
 * Bundle Size Measurement Script
 *
 * Measures bundle sizes for different command configurations
 * to track tree-shaking progress during Hybrid Tree-Shaking initiative.
 *
 * Usage:
 *   node scripts/measure-bundle-size.mjs
 *   node scripts/measure-bundle-size.mjs --config minimal
 *   node scripts/measure-bundle-size.mjs --save
 *
 * Options:
 *   --config <name>  Measure specific configuration (minimal, standard, full)
 *   --save           Save results to file with timestamp
 *   --compare <file> Compare with previous results
 *   --verbose        Show detailed output
 */

import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const corePackage = path.join(projectRoot, 'packages', 'core');
const resultsDir = path.join(corePackage, 'bundle-results');

// ========== Configuration Definitions ==========

const configurations = {
  baseline: {
    name: 'Baseline (Original Runtime)',
    description: 'Original Runtime with all V1 commands',
    commands: null, // Special case: import original runtime
    imports: `
      import { Runtime } from './packages/core/src/runtime/runtime';
      const runtime = new Runtime();
      (window as any).runtime = runtime;
    `,
  },

  minimal: {
    name: 'Minimal (hide, show, log)',
    description: 'Just hide, show, and log commands - testing tree-shaking effectiveness',
    commands: ['hide', 'show', 'log'],
    imports: `
      import { createMinimalRuntime } from './packages/core/src/runtime/runtime-minimal';
      const runtime = createMinimalRuntime();
      (window as any).runtime = runtime;
    `,
  },

  standard: {
    name: 'Standard (7 commands)',
    description: 'Common commands for typical apps',
    commands: ['hide', 'show', 'log', 'add', 'remove', 'set', 'wait'],
    imports: `
      import { RuntimeBase } from './packages/core/src/runtime/runtime-base';
      import { HideCommand } from './packages/core/src/commands-v2/dom/hide-standalone';
      import { ShowCommand } from './packages/core/src/commands-v2/dom/show-standalone';
      import { LogCommand } from './packages/core/src/commands-v2/utility/log-standalone';
      import { AddCommand } from './packages/core/src/commands-v2/dom/add-standalone';
      import { RemoveCommand } from './packages/core/src/commands-v2/dom/remove-standalone';
      import { SetCommand } from './packages/core/src/commands-v2/data/set-standalone';
      import { WaitCommand } from './packages/core/src/commands-v2/async/wait-standalone';

      const runtime = new RuntimeBase({
        registry: {
          commands: {
            hide: new HideCommand(),
            show: new ShowCommand(),
            log: new LogCommand(),
            add: new AddCommand(),
            remove: new RemoveCommand(),
            set: new SetCommand(),
            wait: new WaitCommand(),
          },
        },
      });

      (window as any).runtime = runtime;
    `,
  },

  full: {
    name: 'Full (10 commands)',
    description: 'All rewritten commands',
    commands: ['hide', 'show', 'log', 'add', 'remove', 'set', 'wait', 'trigger', 'increment', 'decrement'],
    imports: `
      import { RuntimeBase } from './packages/core/src/runtime/runtime-base';
      import { HideCommand } from './packages/core/src/commands-v2/dom/hide-standalone';
      import { ShowCommand } from './packages/core/src/commands-v2/dom/show-standalone';
      import { LogCommand } from './packages/core/src/commands-v2/utility/log-standalone';
      import { AddCommand } from './packages/core/src/commands-v2/dom/add-standalone';
      import { RemoveCommand } from './packages/core/src/commands-v2/dom/remove-standalone';
      import { SetCommand } from './packages/core/src/commands-v2/data/set-standalone';
      import { WaitCommand } from './packages/core/src/commands-v2/async/wait-standalone';
      import { TriggerCommand } from './packages/core/src/commands-v2/events/trigger-standalone';
      import { IncrementCommand } from './packages/core/src/commands-v2/data/increment-standalone';
      import { DecrementCommand } from './packages/core/src/commands-v2/data/decrement-standalone';

      const runtime = new RuntimeBase({
        registry: {
          commands: {
            hide: new HideCommand(),
            show: new ShowCommand(),
            log: new LogCommand(),
            add: new AddCommand(),
            remove: new RemoveCommand(),
            set: new SetCommand(),
            wait: new WaitCommand(),
            trigger: new TriggerCommand(),
            increment: new IncrementCommand(),
            decrement: new DecrementCommand(),
          },
        },
      });

      (window as any).runtime = runtime;
    `,
  },
};

// ========== Bundle Building ==========

async function buildBundle(configName, config) {
  console.log(`\n📦 Building ${config.name}...`);

  // Create virtual entry file
  const entryCode = config.imports;

  try {
    const bundle = await rollup({
      input: 'virtual:entry',
      plugins: [
        {
          name: 'virtual',
          resolveId(id) {
            if (id === 'virtual:entry') return id;
            return null;
          },
          load(id) {
            if (id === 'virtual:entry') return entryCode;
            return null;
          },
        },
        nodeResolve({
          extensions: ['.ts', '.tsx', '.js', '.mjs'],
        }),
        typescript({
          tsconfig: path.join(corePackage, 'tsconfig.json'),
          compilerOptions: {
            declaration: false,
            declarationMap: false,
          },
        }),
        terser({
          compress: {
            passes: 2,
            pure_getters: true,
            unsafe: true,
          },
          mangle: true,
        }),
      ],
      onwarn(warning) {
        // Suppress common warnings
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        console.warn(warning.message);
      },
    });

    const { output } = await bundle.generate({
      format: 'iife',
      name: 'HyperFixi',
      sourcemap: false,
    });

    const code = output[0].code;
    const size = Buffer.byteLength(code, 'utf8');
    const sizeKB = (size / 1024).toFixed(2);

    // Estimate gzipped size (rough approximation)
    const gzippedSize = Math.floor(size * 0.35); // ~35% compression ratio
    const gzippedKB = (gzippedSize / 1024).toFixed(2);

    return {
      config: configName,
      name: config.name,
      description: config.description,
      commands: config.commands || 'all',
      size,
      sizeKB: parseFloat(sizeKB),
      gzippedSize,
      gzippedKB: parseFloat(gzippedKB),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error building ${config.name}:`, error.message);
    return null;
  }
}

// ========== Results Processing ==========

function calculateComparison(results) {
  const baseline = results.find(r => r.config === 'baseline');

  if (!baseline) {
    return results;
  }

  return results.map(result => {
    if (result.config === 'baseline') {
      return { ...result, reduction: 0, reductionPercent: '0.00' };
    }

    const reduction = baseline.size - result.size;
    const reductionPercent = ((reduction / baseline.size) * 100).toFixed(2);

    return {
      ...result,
      reduction,
      reductionKB: (reduction / 1024).toFixed(2),
      reductionPercent,
    };
  });
}

function formatResults(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 Bundle Size Results');
  console.log('='.repeat(80));

  const withComparison = calculateComparison(results);

  // Table header
  console.log('\n| Configuration | Size | Gzipped | vs Baseline | Status |');
  console.log('|--------------|------|---------|-------------|--------|');

  // Targets for status
  const targets = {
    minimal: 100,      // Target: < 100 KB
    standard: 170,     // Target: < 170 KB
    full: 180,         // Target: < 180 KB
  };

  for (const result of withComparison) {
    const status = result.config === 'baseline'
      ? '-'
      : result.sizeKB < (targets[result.config] || 999)
        ? '✅'
        : '⚠️';

    const vsBaseline = result.config === 'baseline'
      ? '-'
      : `-${result.reductionPercent}%`;

    console.log(
      `| ${result.name.padEnd(12)} ` +
      `| ${result.sizeKB.toString().padStart(3)} KB ` +
      `| ${result.gzippedKB.toString().padStart(3)} KB ` +
      `| ${vsBaseline.padStart(11)} ` +
      `| ${status.padStart(6)} |`
    );
  }

  console.log('\n' + '='.repeat(80));

  // Summary
  const minimal = withComparison.find(r => r.config === 'minimal');
  const standard = withComparison.find(r => r.config === 'standard');
  const full = withComparison.find(r => r.config === 'full');

  console.log('\n🎯 Progress Summary:');
  console.log(
    `   Minimal Bundle: ${minimal?.sizeKB || '?'} KB (target: < 100 KB) ` +
    (minimal && minimal.sizeKB < 100 ? '✅' : '⚠️')
  );
  console.log(
    `   Standard Bundle: ${standard?.sizeKB || '?'} KB (target: < 170 KB) ` +
    (standard && standard.sizeKB < 170 ? '✅' : '⚠️')
  );
  console.log(
    `   Full Bundle: ${full?.sizeKB || '?'} KB (target: < 180 KB) ` +
    (full && full.sizeKB < 180 ? '✅' : '⚠️')
  );

  console.log('\n');

  return withComparison;
}

async function saveResults(results) {
  await fs.mkdir(resultsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `bundle-results-${timestamp}.json`;
  const filepath = path.join(resultsDir, filename);

  await fs.writeFile(filepath, JSON.stringify(results, null, 2));

  console.log(`💾 Results saved to: ${path.relative(projectRoot, filepath)}`);

  // Also save as "latest"
  const latestPath = path.join(resultsDir, 'bundle-results-latest.json');
  await fs.writeFile(latestPath, JSON.stringify(results, null, 2));

  return filepath;
}

async function compareWithPrevious(results, previousFile) {
  const previousData = JSON.parse(await fs.readFile(previousFile, 'utf8'));

  console.log('\n' + '='.repeat(80));
  console.log('📈 Comparison with Previous Results');
  console.log('='.repeat(80));
  console.log(`Previous: ${new Date(previousData[0].timestamp).toLocaleString()}`);
  console.log(`Current:  ${new Date(results[0].timestamp).toLocaleString()}\n`);

  console.log('| Configuration | Previous | Current | Change |');
  console.log('|--------------|----------|---------|--------|');

  for (const current of results) {
    const previous = previousData.find(p => p.config === current.config);

    if (!previous) {
      console.log(`| ${current.name.padEnd(12)} | - | ${current.sizeKB} KB | NEW |`);
      continue;
    }

    const change = current.sizeKB - previous.sizeKB;
    const changePercent = ((change / previous.sizeKB) * 100).toFixed(2);
    const changeStr = change > 0
      ? `+${change.toFixed(2)} KB (+${changePercent}%)`
      : change < 0
        ? `${change.toFixed(2)} KB (${changePercent}%)`
        : 'No change';

    const emoji = change > 0 ? '⚠️' : change < 0 ? '✅' : '-';

    console.log(
      `| ${current.name.padEnd(12)} ` +
      `| ${previous.sizeKB.toString().padStart(3)} KB ` +
      `| ${current.sizeKB.toString().padStart(3)} KB ` +
      `| ${changeStr.padEnd(20)} ${emoji} |`
    );
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// ========== Main ==========

async function main() {
  const args = process.argv.slice(2);
  const options = {
    config: null,
    save: args.includes('--save'),
    compare: args.includes('--compare') ? args[args.indexOf('--compare') + 1] : null,
    verbose: args.includes('--verbose'),
  };

  // Parse --config option
  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    options.config = args[configIndex + 1];
  }

  console.log('🔧 Hybrid Tree-Shaking: Bundle Size Measurement');
  console.log('   Goal: Achieve 60% bundle reduction through standalone V2 commands\n');

  // Determine which configurations to build
  const configsToBuild = options.config
    ? { [options.config]: configurations[options.config] }
    : configurations;

  // Build bundles
  const results = [];

  for (const [name, config] of Object.entries(configsToBuild)) {
    const result = await buildBundle(name, config);
    if (result) {
      results.push(result);
    }
  }

  if (results.length === 0) {
    console.error('❌ No bundles were successfully built');
    process.exit(1);
  }

  // Format and display results
  const formattedResults = formatResults(results);

  // Save if requested
  if (options.save) {
    await saveResults(formattedResults);
  }

  // Compare if requested
  if (options.compare) {
    await compareWithPrevious(formattedResults, options.compare);
  }

  console.log('✅ Bundle size measurement complete!\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
