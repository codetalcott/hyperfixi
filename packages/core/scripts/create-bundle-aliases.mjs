import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUNDLE_ALIASES = {
  'lokascript-browser.js': 'hyperfixi-browser.js',
  'lokascript-lite.js': 'hyperfixi-lite.js',
  'lokascript-lite-plus.js': 'hyperfixi-lite-plus.js',
  'lokascript-hybrid-complete.js': 'hyperfixi-hybrid-complete.js',
  'lokascript-hybrid-hx.js': 'hyperfixi-hybrid-hx.js',
  'lokascript-browser-minimal.js': 'hyperfixi-browser-minimal.js',
  'lokascript-browser-standard.js': 'hyperfixi-browser-standard.js',
  'lokascript-browser-classic.js': 'hyperfixi-browser-classic.js',
  'lokascript-browser-classic-i18n.js': 'hyperfixi-browser-classic-i18n.js',
  'lokascript-modular.js': 'hyperfixi-modular.js',
  'lokascript-textshelf-profile.js': 'hyperfixi-textshelf-profile.js',
  'lokascript-textshelf-minimal.js': 'hyperfixi-textshelf-minimal.js',
};

const distDir = path.join(__dirname, '..', 'dist');

console.log('Creating backward compatibility aliases...');
console.log('');

let aliasCount = 0;
let missingCount = 0;

for (const [newName, oldName] of Object.entries(BUNDLE_ALIASES)) {
  const src = path.join(distDir, newName);
  const dest = path.join(distDir, oldName);

  if (fs.existsSync(src)) {
    // Copy main bundle
    fs.copyFileSync(src, dest);
    aliasCount++;
    console.log(`  ✓ ${oldName} → ${newName}`);

    // Copy source map if exists
    const mapSrc = src + '.map';
    const mapDest = dest + '.map';
    if (fs.existsSync(mapSrc)) {
      fs.copyFileSync(mapSrc, mapDest);
    }
  } else {
    missingCount++;
    // Don't warn for missing bundles - they might not all be built
    // console.log(`  ⚠ Source not found: ${newName}`);
  }
}

console.log('');
console.log(`Created ${aliasCount} bundle aliases.`);
if (missingCount > 0) {
  console.log(`Skipped ${missingCount} bundles (not built).`);
}
console.log('');
console.log('⚠️  These aliases will be removed in v2.0.0');
console.log('📖 See MIGRATION.md for upgrade instructions');
console.log('');
