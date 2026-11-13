#!/usr/bin/env node
/**
 * Validate CHANGELOG.md to ensure no private packages are mentioned
 * Usage: node scripts/validate-changelog.cjs
 */

const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '../packages');
const packages = fs.readdirSync(packagesDir);

// Packages that were published and are private now. Their releases are part of
// the public history, so the changelog keeps naming them.
const FORMERLY_PUBLISHED = new Set([
  '@hyperfixi/testing-framework', // on npm through 7.6.0
]);

// Get private packages
const privatePackages = [];
packages.forEach(dir => {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.private === true && !FORMERLY_PUBLISHED.has(pkg.name)) {
    privatePackages.push(pkg.name);
  }
});

// Read CHANGELOG.md
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
if (!fs.existsSync(changelogPath)) {
  console.error('❌ CHANGELOG.md not found');
  process.exit(1);
}

const changelog = fs.readFileSync(changelogPath, 'utf8');

// Check for private packages
let errors = 0;
console.log('\n🔍 Validating CHANGELOG.md...\n');

privatePackages.forEach(name => {
  if (changelog.includes(name)) {
    console.error(`❌ PRIVATE PACKAGE FOUND: ${name}`);
    console.error(`   This package should NOT be mentioned in CHANGELOG.md`);
    console.error('');
    errors++;
  }
});

if (errors > 0) {
  console.error(`\n⚠️  ${errors} private package(s) found in CHANGELOG.md\n`);
  console.error('Private packages should not be in the public changelog.');
  console.error('See docs-internal/build/CHANGELOG_GUIDELINES.md for more information.\n');
  console.error('Private packages:');
  privatePackages.forEach(name => console.error(`  - ${name}`));
  console.error('');
  process.exit(1);
}

console.log('✅ No private packages found in CHANGELOG.md');
console.log(`   Validated against ${privatePackages.length} private packages`);
console.log('');
process.exit(0);
