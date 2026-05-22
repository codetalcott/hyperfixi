#!/usr/bin/env node
/**
 * Set version across all packages in the monorepo.
 *
 * Sets each package's `version` AND rewrites every internal workspace
 * dependency range to `^<version>`. npm has no `workspace:` protocol support,
 * so caret ranges are how internal deps both (a) resolve to the local package
 * during development and (b) carry an accurate constraint in the published
 * tarball. Keeping the ranges in lockstep with the version here means a bump
 * never leaves a published package depending on `*` or a stale version.
 *
 * Also keeps lerna.json's version in sync (lerna runs in fixed mode).
 *
 * Usage: node scripts/set-version.cjs <version>
 */

const fs = require('fs');
const path = require('path');

const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/set-version.cjs <version>');
  console.error('Example: node scripts/set-version.cjs 1.0.0');
  process.exit(1);
}

// Validate semver format
if (!/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/.test(version)) {
  console.error(`Invalid version format: ${version}`);
  console.error('Expected format: X.Y.Z or X.Y.Z-alpha.1');
  process.exit(1);
}

const range = `^${version}`;
const DEP_FIELDS = ['dependencies', 'peerDependencies', 'devDependencies'];

const packagesDir = path.join(__dirname, '../packages');
const packages = fs.readdirSync(packagesDir).filter(dir => {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  return fs.existsSync(pkgPath);
});

// Pass 1: collect the names of all internal workspace packages.
const internalNames = new Set();
packages.forEach(dir => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(packagesDir, dir, 'package.json'), 'utf8'));
    if (pkg.name) internalNames.add(pkg.name);
  } catch {
    /* reported in pass 2 */
  }
});

let updated = 0;
let errors = 0;
let depsRewritten = 0;

console.log(`Setting version to ${version} for ${packages.length} packages...\n`);

// Pass 2: set each package's version and rewrite its internal dep ranges.
packages.forEach(dir => {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const oldVersion = pkg.version;
    pkg.version = version;

    for (const field of DEP_FIELDS) {
      const deps = pkg[field];
      if (!deps) continue;
      for (const name of Object.keys(deps)) {
        if (internalNames.has(name) && deps[name] !== range) {
          deps[name] = range;
          depsRewritten++;
        }
      }
    }

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✅ ${pkg.name}: ${oldVersion} → ${version}`);
    updated++;
  } catch (err) {
    console.error(`❌ ${dir}: ${err.message}`);
    errors++;
  }
});

// Update root package.json (version only — its dependencies are external).
const rootPkgPath = path.join(__dirname, '../package.json');
try {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const oldVersion = rootPkg.version;
  rootPkg.version = version;
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
  console.log(`✅ root package.json: ${oldVersion} → ${version}`);
  updated++;
} catch (err) {
  console.error(`❌ root package.json: ${err.message}`);
  errors++;
}

// Keep lerna.json in sync (fixed-mode lerna). Skip while it is still on
// "independent" — that flip is a deliberate one-time change, not ours to make.
const lernaPath = path.join(__dirname, '../lerna.json');
try {
  if (fs.existsSync(lernaPath)) {
    const lerna = JSON.parse(fs.readFileSync(lernaPath, 'utf8'));
    if (lerna.version && lerna.version !== 'independent' && lerna.version !== version) {
      const oldVersion = lerna.version;
      lerna.version = version;
      fs.writeFileSync(lernaPath, JSON.stringify(lerna, null, 2) + '\n');
      console.log(`✅ lerna.json: ${oldVersion} → ${version}`);
    }
  }
} catch (err) {
  console.error(`❌ lerna.json: ${err.message}`);
  errors++;
}

console.log(`\n📊 Summary:`);
console.log(`   Updated: ${updated} files`);
console.log(`   Internal dependency ranges rewritten: ${depsRewritten}`);
console.log(`   Errors: ${errors} files`);

if (errors > 0) {
  process.exit(1);
}
