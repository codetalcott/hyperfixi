#!/usr/bin/env node
/**
 * Bump version across all packages with changelog generation
 * Usage: node scripts/bump-version.cjs <major|minor|patch|version>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const type = process.argv[2];
const validTypes = ['major', 'minor', 'patch'];

if (!type) {
  console.error('Usage: node scripts/bump-version.cjs <major|minor|patch|X.Y.Z>');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/bump-version.cjs patch   # 1.0.0 → 1.0.1');
  console.error('  node scripts/bump-version.cjs minor   # 1.0.0 → 1.1.0');
  console.error('  node scripts/bump-version.cjs major   # 1.0.0 → 2.0.0');
  console.error('  node scripts/bump-version.cjs 1.5.0  # Set to specific version');
  process.exit(1);
}

// Read current version from root package.json
const rootPkgPath = path.join(__dirname, '../package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const currentVersion = rootPkg.version;

// Calculate new version
let newVersion;
if (validTypes.includes(type)) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
} else {
  // Validate custom version
  if (!/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/.test(type)) {
    console.error(`Invalid version format: ${type}`);
    process.exit(1);
  }
  newVersion = type;
}

console.log(`\n📦 Version Bump: ${currentVersion} → ${newVersion}\n`);

// Confirm with user
console.log('This will:');
console.log('  1. Update all package.json files');
console.log('  2. Update CHANGELOG.md with new version');
console.log('  3. Create a git commit');
console.log('  4. Create a git tag');
console.log('');
console.log('Press Enter to continue or Ctrl+C to cancel...');

// Wait for user confirmation (skip in CI)
if (!process.env.CI) {
  require('child_process').execSync('read', { stdio: 'inherit' });
}

// Update versions
console.log('\n1️⃣  Updating package versions...');
try {
  execSync(`node ${path.join(__dirname, 'set-version.cjs')} ${newVersion}`, {
    stdio: 'inherit',
  });
} catch {
  console.error('Failed to update versions');
  process.exit(1);
}

// Update CHANGELOG
console.log('\n2️⃣  Updating CHANGELOG.md...');
console.log('   ⚠️  IMPORTANT: Only include changes to PUBLIC packages');
console.log('   ⚠️  See docs-internal/build/CHANGELOG_GUIDELINES.md for details');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
const today = new Date().toISOString().split('T')[0];

let changelog = '';
if (fs.existsSync(changelogPath)) {
  changelog = fs.readFileSync(changelogPath, 'utf8');
}

// Insert new version entry
const versionHeader = `## [${newVersion}] - ${today}

### Added
-

### Changed
-

### Fixed
-

### Deprecated
-

### Removed
-

### Security
-

`;

if (changelog) {
  // Insert after # Changelog header
  changelog = changelog.replace(
    /(# Changelog\n\n)/,
    `$1${versionHeader}`
  );
} else {
  changelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

${versionHeader}`;
}

fs.writeFileSync(changelogPath, changelog);
console.log(`   ✅ Updated CHANGELOG.md`);

// Git commit and tag
console.log('\n3️⃣  Creating git commit...');
try {
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "chore(release): v${newVersion}"`, { stdio: 'inherit' });
  console.log(`   ✅ Created commit`);
} catch {
  console.error('   ⚠️  Git commit failed (may already be committed)');
}

console.log('\n4️⃣  Creating git tag...');
try {
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, {
    stdio: 'inherit',
  });
  console.log(`   ✅ Created tag v${newVersion}`);
} catch {
  console.error('   ⚠️  Git tag failed (may already exist)');
}

console.log('\n✅ Version bump complete!\n');
console.log('Next steps:');
console.log(`  1. Edit CHANGELOG.md to add release notes`);
console.log(`     ⚠️  Only include changes to PUBLIC packages (see docs-internal/build/CHANGELOG_GUIDELINES.md)`);
console.log(`  2. Validate changelog: node scripts/validate-changelog.cjs`);
console.log(`  3. Push changes: git push && git push --tags`);
console.log(`  4. Publish packages: npm run publish:all`);
console.log('');
