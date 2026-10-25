#!/usr/bin/env node

/**
 * Export Validation Script
 *
 * Validates that all exports declared in package.json files actually exist in the dist/ folder.
 * This prevents publishing packages with broken exports.
 *
 * Usage:
 *   node scripts/validate-exports.mjs                    # Validate all packages
 *   node scripts/validate-exports.mjs core semantic      # Validate specific packages
 *   node scripts/validate-exports.mjs --strict           # Fail on any missing export
 *   node scripts/validate-exports.mjs --fix-suggestions  # Show suggestions for fixing issues
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { basename, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const packagesDir = join(rootDir, 'packages');

// Parse command line arguments
const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const showSuggestions = args.includes('--fix-suggestions');
const packageFilter = args.filter(a => !a.startsWith('--'));

/**
 * Get all package directories
 */
function getPackages() {
  const packages = readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .filter(dirent => existsSync(join(packagesDir, dirent.name, 'package.json')))
    .map(dirent => dirent.name);

  if (packageFilter.length > 0) {
    return packages.filter(pkg => packageFilter.includes(pkg));
  }
  return packages;
}

/**
 * Extract all file paths from exports field
 */
function extractExportPaths(exports, basePath = '') {
  const paths = [];

  if (typeof exports === 'string') {
    paths.push({ path: exports, condition: basePath || 'default' });
  } else if (typeof exports === 'object' && exports !== null) {
    for (const [key, value] of Object.entries(exports)) {
      if (key === './package.json') continue; // Skip package.json self-reference

      if (typeof value === 'string') {
        paths.push({ path: value, condition: key, exportKey: basePath });
      } else if (typeof value === 'object' && value !== null) {
        // Nested conditions (types, import, require, default)
        const nested = extractExportPaths(value, basePath || key);
        paths.push(...nested.map(p => ({ ...p, exportKey: basePath || key })));
      }
    }
  }

  return paths;
}

/**
 * Whether an export target exists. A subpath pattern (`./dist/ext/*.esm.js`, for the export
 * `./ext/*`) must match at least one file; its `*` may only be in the file name.
 */
function targetExists(fullPath) {
  if (!fullPath.includes('*')) return existsSync(fullPath);
  const dir = dirname(fullPath);
  if (dir.includes('*') || !existsSync(dir)) return false;
  const [before, after] = basename(fullPath).split('*');
  return readdirSync(dir).some(
    f => f.length > before.length + after.length && f.startsWith(before) && f.endsWith(after)
  );
}

/**
 * Validate a single package
 */
function validatePackage(pkgName) {
  const pkgDir = join(packagesDir, pkgName);
  const pkgJsonPath = join(pkgDir, 'package.json');

  if (!existsSync(pkgJsonPath)) {
    return { name: pkgName, status: 'skip', reason: 'No package.json' };
  }

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

  // Skip private packages
  if (pkgJson.private) {
    return { name: pkgName, status: 'skip', reason: 'Private package' };
  }

  const results = {
    name: pkgName,
    version: pkgJson.version,
    status: 'pass',
    missing: [],
    found: [],
    warnings: [],
  };

  // Check main field
  if (pkgJson.main) {
    const mainPath = join(pkgDir, pkgJson.main);
    if (existsSync(mainPath)) {
      results.found.push({ field: 'main', path: pkgJson.main });
    } else {
      results.missing.push({ field: 'main', path: pkgJson.main });
    }
  }

  // Check module field
  if (pkgJson.module) {
    const modulePath = join(pkgDir, pkgJson.module);
    if (existsSync(modulePath)) {
      results.found.push({ field: 'module', path: pkgJson.module });
    } else {
      results.missing.push({ field: 'module', path: pkgJson.module });
    }
  }

  // Check types field
  if (pkgJson.types) {
    const typesPath = join(pkgDir, pkgJson.types);
    if (existsSync(typesPath)) {
      results.found.push({ field: 'types', path: pkgJson.types });
    } else {
      results.missing.push({ field: 'types', path: pkgJson.types });
    }
  }

  // Check browser field
  if (pkgJson.browser && typeof pkgJson.browser === 'string') {
    const browserPath = join(pkgDir, pkgJson.browser);
    if (existsSync(browserPath)) {
      results.found.push({ field: 'browser', path: pkgJson.browser });
    } else {
      results.missing.push({ field: 'browser', path: pkgJson.browser });
    }
  }

  // Check exports field
  if (pkgJson.exports) {
    const exportPaths = extractExportPaths(pkgJson.exports);

    for (const { path: exportPath, condition, exportKey } of exportPaths) {
      if (!exportPath || exportPath === './package.json') continue;

      // Normalize path
      const normalizedPath = exportPath.startsWith('./') ? exportPath.slice(2) : exportPath;
      const fullPath = join(pkgDir, normalizedPath);

      const exportInfo = {
        exportKey: exportKey || '.',
        condition,
        path: exportPath,
      };

      if (targetExists(fullPath)) {
        results.found.push(exportInfo);
      } else {
        results.missing.push(exportInfo);
      }
    }
  }

  // Check for TypeScript in JS files (only if dist exists)
  const distDir = join(pkgDir, 'dist');
  if (existsSync(distDir)) {
    const jsFiles = findJsFiles(distDir);
    for (const jsFile of jsFiles) {
      const content = readFileSync(jsFile, 'utf-8');
      const tsPatterns = checkForTypeScript(content);
      if (tsPatterns.length > 0) {
        results.warnings.push({
          file: jsFile.replace(pkgDir + '/', ''),
          issue: 'TypeScript syntax in JS file',
          patterns: tsPatterns.slice(0, 3), // Limit to 3 examples
        });
      }
    }
  }

  // Determine overall status
  if (results.missing.length > 0) {
    results.status = 'fail';
  } else if (results.warnings.length > 0) {
    results.status = 'warn';
  }

  return results;
}

/**
 * Find all .js files in a directory recursively
 */
function findJsFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsFiles(fullPath, files);
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.min.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Check for common TypeScript patterns in JavaScript
 */
function checkForTypeScript(content) {
  const patterns = [];

  // Check for type annotations with generics (most common leak)
  const genericTypeMatch = content.match(/:\s*\w+<[^>]+>/g);
  if (genericTypeMatch) {
    patterns.push(...genericTypeMatch.slice(0, 2));
  }

  // Check for "as Type" casts with generics
  const castMatch = content.match(/\s+as\s+\w+<[^>]+>/g);
  if (castMatch) {
    patterns.push(...castMatch.slice(0, 2));
  }

  // Check for interface/type declarations
  const interfaceMatch = content.match(/\b(?:interface|type)\s+\w+\s*[{=<]/g);
  if (interfaceMatch) {
    patterns.push(...interfaceMatch.slice(0, 2));
  }

  return patterns;
}

/**
 * Print results in a formatted way
 */
function printResults(results) {
  console.log('\n' + '='.repeat(70));
  console.log('Export Validation Results');
  console.log('='.repeat(70));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;
  let totalSkipped = 0;

  for (const result of results) {
    if (result.status === 'skip') {
      totalSkipped++;
      console.log(`\n[SKIP] ${result.name}: ${result.reason}`);
      continue;
    }

    const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    console.log(`\n${statusIcon} ${result.name}@${result.version}`);

    if (result.status === 'pass') {
      totalPassed++;
      console.log(`   ${result.found.length} exports validated`);
    }

    if (result.status === 'fail') {
      totalFailed++;
    }

    if (result.status === 'warn') {
      totalWarnings++;
    }

    if (result.missing.length > 0) {
      console.log(`   Missing exports (${result.missing.length}):`);
      for (const m of result.missing) {
        if (m.field) {
          console.log(`     - ${m.field}: ${m.path}`);
        } else {
          console.log(`     - exports["${m.exportKey}"].${m.condition}: ${m.path}`);
        }
      }

      if (showSuggestions) {
        console.log('   Suggestions:');
        console.log('     1. Run `npm run build` in the package directory');
        console.log('     2. Check that build config generates all declared exports');
        console.log('     3. Or remove unused exports from package.json');
      }
    }

    if (result.warnings.length > 0) {
      console.log(`   Warnings (${result.warnings.length}):`);
      for (const w of result.warnings) {
        console.log(`     - ${w.file}: ${w.issue}`);
        if (w.patterns && w.patterns.length > 0) {
          console.log(`       Examples: ${w.patterns.join(', ')}`);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Summary');
  console.log('='.repeat(70));
  console.log(`  Passed:   ${totalPassed}`);
  console.log(`  Failed:   ${totalFailed}`);
  console.log(`  Warnings: ${totalWarnings}`);
  console.log(`  Skipped:  ${totalSkipped}`);
  console.log('');

  return totalFailed;
}

/**
 * Main function
 */
async function main() {
  console.log('Validating package exports...\n');

  if (isStrict) {
    console.log('Running in strict mode (will fail on any missing export)\n');
  }

  const packages = getPackages();
  console.log(`Checking ${packages.length} package(s): ${packages.join(', ')}\n`);

  const results = [];
  for (const pkg of packages) {
    const result = validatePackage(pkg);
    results.push(result);
  }

  const failCount = printResults(results);

  if (failCount > 0) {
    console.log(`\n❌ ${failCount} package(s) have missing exports`);
    if (isStrict) {
      process.exit(1);
    }
  } else {
    console.log('\n✅ All package exports validated successfully');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
