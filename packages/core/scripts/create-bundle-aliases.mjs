import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Primary bundles are hyperfixi-*.js
// Backward-compat aliases are lokascript-*.js (for v1.x users)
const BUNDLE_ALIASES = {
  'hyperfixi.js': 'lokascript-browser.js',
  'hyperfixi-lite.js': 'lokascript-lite.js',
  'hyperfixi-lite-plus.js': 'lokascript-lite-plus.js',
  'hyperfixi-hybrid-complete.js': 'lokascript-hybrid-complete.js',
  'hyperfixi-hx.js': 'lokascript-hybrid-hx.js',
  'hyperfixi-minimal.js': 'lokascript-browser-minimal.js',
  'hyperfixi-standard.js': 'lokascript-browser-standard.js',
  'hyperfixi-classic.js': 'lokascript-browser-classic.js',
  'hyperfixi-classic-i18n.js': 'lokascript-browser-classic-i18n.js',
  'hyperfixi-modular.js': 'lokascript-modular.js',
  'hyperfixi-textshelf.js': 'lokascript-textshelf-profile.js',
  'hyperfixi-textshelf-minimal.js': 'lokascript-textshelf-minimal.js',
  'hyperfixi-multilingual.js': 'lokascript-multilingual.js',
};

const distDir = path.join(__dirname, '..', 'dist');

console.log('Creating backward compatibility aliases...');
console.log('');

let aliasCount = 0;
let missingCount = 0;

for (const [primary, alias] of Object.entries(BUNDLE_ALIASES)) {
  const src = path.join(distDir, primary);
  const dest = path.join(distDir, alias);

  if (fs.existsSync(src)) {
    // Copy main bundle
    fs.copyFileSync(src, dest);
    aliasCount++;
    console.log(`  ${alias} -> ${primary}`);

    // Copy source map if exists
    const mapSrc = src + '.map';
    const mapDest = dest + '.map';
    if (fs.existsSync(mapSrc)) {
      fs.copyFileSync(mapSrc, mapDest);
    }
  } else {
    missingCount++;
  }
}

console.log('');
console.log(`Created ${aliasCount} backward-compat aliases.`);
if (missingCount > 0) {
  console.log(`Skipped ${missingCount} bundles (not built).`);
}
console.log('');
console.log('These lokascript-*.js aliases will be removed in v3.0.0');
console.log('See MIGRATION.md for upgrade instructions');
console.log('');
