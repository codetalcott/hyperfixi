#!/usr/bin/env node
/**
 * Sync package versions across the monorepo
 *
 * Usage:
 *   node scripts/sync-versions.mjs 1.2.0        # Set all packages to 1.2.0
 *   node scripts/sync-versions.mjs --check      # Check current versions
 *   node scripts/sync-versions.mjs --dry-run 1.2.0  # Preview changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Public packages to sync (excludes private/internal packages)
const PACKAGES = [
  'core',
  'semantic',
  'i18n',
  'vite-plugin',
  'mcp-server',
  'patterns-reference',
];

function getPackageJson(pkgName) {
  const pkgPath = path.join(rootDir, 'packages', pkgName, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function setPackageVersion(pkgName, version, dryRun = false) {
  const pkgPath = path.join(rootDir, 'packages', pkgName, 'package.json');
  const pkg = getPackageJson(pkgName);
  if (!pkg) {
    console.log(`  ⚠️  ${pkgName}: package.json not found`);
    return false;
  }

  const oldVersion = pkg.version;
  if (oldVersion === version) {
    console.log(`  ✓ ${pkgName}: already at ${version}`);
    return true;
  }

  if (dryRun) {
    console.log(`  → ${pkgName}: ${oldVersion} → ${version} (dry-run)`);
    return true;
  }

  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ✓ ${pkgName}: ${oldVersion} → ${version}`);
  return true;
}

function checkVersions() {
  console.log('\nCurrent package versions:\n');
  const versions = new Map();

  for (const pkgName of PACKAGES) {
    const pkg = getPackageJson(pkgName);
    if (pkg) {
      console.log(`  @lokascript/${pkgName}: ${pkg.version}`);
      const count = versions.get(pkg.version) || 0;
      versions.set(pkg.version, count + 1);
    }
  }

  console.log('');
  if (versions.size === 1) {
    console.log('✓ All packages are in sync');
  } else {
    console.log(`⚠️  Versions out of sync (${versions.size} different versions)`);
  }

  return versions.size === 1;
}

function syncVersions(targetVersion, dryRun = false) {
  // Validate semver format
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(targetVersion)) {
    console.error(`Error: Invalid version format "${targetVersion}"`);
    console.error('Expected format: X.Y.Z or X.Y.Z-tag');
    process.exit(1);
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Syncing all packages to version ${targetVersion}:\n`);

  let success = true;
  for (const pkgName of PACKAGES) {
    if (!setPackageVersion(pkgName, targetVersion, dryRun)) {
      success = false;
    }
  }

  console.log('');
  if (success && !dryRun) {
    console.log('✓ All packages synced');
    console.log('\nNext steps:');
    console.log('  1. Run: npm install');
    console.log('  2. Commit: git add . && git commit -m "chore: sync versions to ' + targetVersion + '"');
    console.log('  3. Publish: gh workflow run publish.yml -f packages=core,semantic,i18n,vite-plugin,mcp-server,patterns-reference -f version-type=custom -f custom-version=' + targetVersion);
  }

  return success;
}

// Parse CLI args
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage:
  node scripts/sync-versions.mjs <version>       Set all packages to <version>
  node scripts/sync-versions.mjs --check         Check current versions
  node scripts/sync-versions.mjs --dry-run <version>  Preview changes

Examples:
  node scripts/sync-versions.mjs 1.2.0
  node scripts/sync-versions.mjs --dry-run 1.2.0
  node scripts/sync-versions.mjs --check
`);
  process.exit(0);
}

if (args.includes('--check')) {
  const inSync = checkVersions();
  process.exit(inSync ? 0 : 1);
}

const dryRun = args.includes('--dry-run');
const version = args.find(arg => !arg.startsWith('--'));

if (!version) {
  console.error('Error: No version specified');
  process.exit(1);
}

const success = syncVersions(version, dryRun);
process.exit(success ? 0 : 1);
