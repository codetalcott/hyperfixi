import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Primary bundles are hyperfixi-*.js
// Backward-compat aliases are lokascript-*.js (for v1.x users)
const BUNDLE_ALIASES = {
  'hyperfixi.js': 'lokascript-browser.js',
  // classic, classic-i18n, modular, textshelf and multilingual retired in
  // Phase C3 (C-R3) with their bundles.
};

// In-era aliases for older hyperfixi-browser-* names that
// pre-date the current canonical naming. Several test HTMLs, bundle-loader, and
// the bundle-compatibility spec still reference these. Will be removed in v3.0.0.
const HYPERFIXI_LEGACY_ALIASES = {
  'hyperfixi.js': 'hyperfixi-browser.js',
};

const distDir = path.join(__dirname, '..', 'dist');

console.log('Creating backward compatibility aliases...');
console.log('');

let aliasCount = 0;
let missingCount = 0;

function createAliases(map) {
  for (const [primary, alias] of Object.entries(map)) {
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
      } else {
        // hyperfixi.js has no map since it became the engine's file (C-R4b);
        // a map left from an earlier build would describe a different file.
        fs.rmSync(mapDest, { force: true });
      }
    } else {
      missingCount++;
    }
  }
}

createAliases(BUNDLE_ALIASES);
createAliases(HYPERFIXI_LEGACY_ALIASES);

console.log('');
console.log(`Created ${aliasCount} backward-compat aliases.`);
if (missingCount > 0) {
  console.log(`Skipped ${missingCount} bundles (not built).`);
}
console.log('');
console.log('These lokascript-*.js and hyperfixi-browser-*.js aliases will be removed in v3.0.0');
console.log('See MIGRATION.md for upgrade instructions');
console.log('');
