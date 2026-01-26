#!/usr/bin/env node

/**
 * Bundle Build Orchestrator
 * Builds critical browser bundles in parallel for CI efficiency
 *
 * Usage:
 *   node build-browser-bundles.mjs                    # Build all critical bundles in parallel
 *   node build-browser-bundles.mjs --verbose          # Show detailed output
 *   node build-browser-bundles.mjs --sequential       # Build sequentially
 *   node build-browser-bundles.mjs --only=main,multilingual  # Build specific bundles
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve as resolvePath } from 'path';

// Use process.cwd() since npm scripts run from the package directory
const projectRoot = process.cwd();

// Bundle configurations with metadata
const BUNDLES = {
  main: {
    name: 'main (lokascript-browser.js)',
    script: 'build:browser:main-only',
    config: 'rollup.browser.config.mjs',
    output: 'dist/lokascript-browser.js',
    critical: true,
  },
  'classic-i18n': {
    name: 'classic-i18n',
    script: 'build:browser:classic-i18n',
    config: 'rollup.browser-classic-i18n.config.mjs',
    output: 'dist/lokascript-browser-classic-i18n.js',
    critical: true,
  },
  multilingual: {
    name: 'multilingual',
    script: 'build:browser:multilingual',
    config: 'rollup.browser-multilingual.config.mjs',
    output: 'dist/lokascript-multilingual.js',
    critical: true,
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const isCI = process.env.CI === 'true';
const verbose = args.includes('--verbose') || isCI;
const sequential = args.includes('--sequential');
const bundleFilter = args.find(arg => arg.startsWith('--only='))?.split('=')[1];
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log(`
Bundle Build Orchestrator

Usage:
  node build-browser-bundles.mjs [options]

Options:
  --verbose           Show detailed build output (automatic in CI)
  --sequential        Build bundles sequentially instead of parallel
  --only=bundle1,bundle2   Only build specified bundles
  --help, -h          Show this help message

Available bundles:
  main                Main lokascript-browser.js bundle
  classic-i18n        Classic bundle with i18n support
  multilingual        Parser-free multilingual bundle

Examples:
  node build-browser-bundles.mjs
  node build-browser-bundles.mjs --verbose
  node build-browser-bundles.mjs --only=main,multilingual
  node build-browser-bundles.mjs --sequential
`);
  process.exit(0);
}

/**
 * Build a single bundle
 * @param {string} bundleKey - Bundle identifier
 * @param {object} config - Bundle configuration
 * @returns {Promise<object>} Build result with success status and duration
 */
function buildBundle(bundleKey, config) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    console.log(`[${config.name}] Starting build...`);

    // Check if rollup config exists
    const configPath = resolvePath(projectRoot, config.config);
    if (verbose) {
      console.log(`[${config.name}] Checking config at: ${configPath}`);
      console.log(`[${config.name}] projectRoot: ${projectRoot}`);
    }
    if (!existsSync(configPath)) {
      console.error(`[${config.name}] ✗ Config file not found: ${config.config}`);
      console.error(`[${config.name}] Full path checked: ${configPath}`);
      if (config.critical) {
        reject(new Error(`Critical bundle ${bundleKey} missing config: ${config.config}`));
      } else {
        resolve({ bundle: bundleKey, success: false, duration: 0, error: 'Config not found' });
      }
      return;
    }

    const proc = spawn('npm', ['run', config.script], {
      cwd: projectRoot,
      stdio: verbose ? 'inherit' : 'pipe',
      env: {
        ...process.env,
        FORCE_COLOR: '0',  // Disable colors in piped output
      },
      shell: process.platform === 'win32',
    });

    let output = '';
    if (!verbose && proc.stdout && proc.stderr) {
      proc.stdout.on('data', data => output += data.toString());
      proc.stderr.on('data', data => output += data.toString());
    }

    proc.on('error', (error) => {
      console.error(`[${config.name}] ✗ Failed to spawn process:`, error.message);
      if (config.critical) {
        reject(new Error(`Critical bundle ${bundleKey} failed to spawn: ${error.message}`));
      } else {
        resolve({ bundle: bundleKey, success: false, duration: 0, error: error.message });
      }
    });

    proc.on('close', code => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (code === 0) {
        // Verify output file exists
        const outputPath = resolvePath(projectRoot, config.output);
        if (!existsSync(outputPath)) {
          console.error(`[${config.name}] ✗ Build succeeded but output file not found: ${config.output}`);
          if (config.critical) {
            reject(new Error(`Critical bundle ${bundleKey} output missing: ${config.output}`));
          } else {
            resolve({ bundle: bundleKey, success: false, duration, error: 'Output file missing' });
          }
          return;
        }

        console.log(`[${config.name}] ✓ Build succeeded (${duration}s)`);
        resolve({ bundle: bundleKey, success: true, duration: parseFloat(duration) });
      } else {
        console.error(`[${config.name}] ✗ Build failed with exit code ${code} (${duration}s)`);

        // Show output if not in verbose mode
        if (!verbose && output) {
          console.error('\n--- Build output ---');
          console.error(output);
          console.error('--- End output ---\n');
        }

        if (config.critical) {
          reject(new Error(`Critical bundle ${bundleKey} failed with exit code ${code}`));
        } else {
          resolve({ bundle: bundleKey, success: false, duration: parseFloat(duration), error: `Exit code ${code}` });
        }
      }
    });
  });
}

/**
 * Main execution function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Browser Bundle Build Orchestrator');
  console.log('='.repeat(70));
  console.log(`Mode: ${sequential ? 'Sequential' : 'Parallel'}`);
  console.log(`CI: ${isCI ? 'Yes' : 'No'}`);
  console.log(`Verbose: ${verbose ? 'Yes' : 'No'}`);
  if (bundleFilter) {
    console.log(`Filter: ${bundleFilter}`);
  }
  console.log('');

  // Filter bundles based on --only parameter
  let bundlesToBuild = Object.entries(BUNDLES);
  if (bundleFilter) {
    const requestedBundles = bundleFilter.split(',').map(b => b.trim());
    bundlesToBuild = bundlesToBuild.filter(([key]) => requestedBundles.includes(key));

    if (bundlesToBuild.length === 0) {
      console.error('Error: No matching bundles found for filter:', bundleFilter);
      console.error('Available bundles:', Object.keys(BUNDLES).join(', '));
      process.exit(1);
    }
  }

  console.log(`Building ${bundlesToBuild.length} bundle(s):`);
  bundlesToBuild.forEach(([key, config]) => {
    console.log(`  - ${config.name}${config.critical ? ' (critical)' : ''}`);
  });
  console.log('');

  const startTime = Date.now();
  let results = [];

  try {
    if (sequential) {
      // Sequential builds
      console.log('Building sequentially...\n');
      for (const [key, config] of bundlesToBuild) {
        const result = await buildBundle(key, config);
        results.push(result);
      }
    } else {
      // Parallel builds
      console.log('Building in parallel...\n');
      results = await Promise.all(
        bundlesToBuild.map(([key, config]) => buildBundle(key, config))
      );
    }

    // Summary
    console.log('');
    console.log('='.repeat(70));
    console.log('Build Summary');
    console.log('='.repeat(70));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    results.forEach(r => {
      const status = r.success ? '✓' : '✗';
      const duration = r.duration.toFixed(1);
      const error = r.error ? ` (${r.error})` : '';
      console.log(`  ${status} ${r.bundle}: ${duration}s${error}`);
    });

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log(`Total time: ${totalDuration}s`);
    console.log(`Success: ${successful}/${results.length}`);

    if (failed > 0) {
      console.log(`Failed: ${failed}/${results.length}`);
      console.error('\n✗ Some bundles failed to build');
      process.exit(1);
    }

    console.log('\n✓ All bundles built successfully');

  } catch (error) {
    console.error('');
    console.error('='.repeat(70));
    console.error('Build Failed');
    console.error('='.repeat(70));
    console.error(`Error: ${error.message}`);
    console.error('');
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
