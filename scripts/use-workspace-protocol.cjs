#!/usr/bin/env node
/**
 * Standardize all internal @lokascript/* dependencies
 *
 * For npm workspaces, using "*" as the version allows npm to automatically
 * resolve to local packages. This script converts:
 * - "file:../xxx" paths → "*"
 * - "workspace:*" (pnpm/yarn syntax) → "*"
 * - Version numbers → "*"
 *
 * Note: workspace:* is pnpm/yarn syntax and doesn't work with npm.
 * npm workspaces use "*" and resolve based on the workspaces field in root package.json.
 */

const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '../packages');
const packages = fs.readdirSync(packagesDir).filter(dir => {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  return fs.existsSync(pkgPath);
});

let updated = 0;
let total = 0;
let fileRefsConverted = 0;

console.log('Standardizing internal dependencies to "*" for npm workspaces...\n');

packages.forEach(dir => {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  let changed = false;

  // Update dependencies
  ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
    if (pkg[depType]) {
      Object.keys(pkg[depType]).forEach(depName => {
        if (depName.startsWith('@lokascript/')) {
          const currentValue = pkg[depType][depName];
          // Update if not already using "*"
          if (currentValue !== '*') {
            const wasFileRef = currentValue.startsWith('file:');
            pkg[depType][depName] = '*';
            console.log(`  ${pkg.name}`);
            console.log(`    ${depName}: ${currentValue} → *`);
            changed = true;
            total++;
            if (wasFileRef) fileRefsConverted++;
          }
        }
      });
    }
  });

  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    updated++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Packages updated: ${updated}`);
console.log(`   Dependencies converted: ${total}`);
if (fileRefsConverted > 0) {
  console.log(`   File references converted: ${fileRefsConverted}`);
}

if (total > 0) {
  console.log('\n💡 Next steps:');
  console.log('   1. Run: npm install');
  console.log('   2. Commit changes');
}
