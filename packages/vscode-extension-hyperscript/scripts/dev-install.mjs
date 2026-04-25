/**
 * Copy built dist files to the locally installed VS Code extension.
 * Usage: node scripts/dev-install.mjs
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';

const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'));
const extId = `${pkg.publisher}.${pkg.name}-${pkg.version}`;
const extDir = join(homedir(), '.vscode', 'extensions', extId);

if (!existsSync(extDir)) {
  console.error(`Extension not installed at: ${extDir}`);
  console.error('Install the extension first, then run this script to update it.');
  process.exit(1);
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      // copyFileSync follows symlinks by default
      copyFileSync(srcPath, destPath);
    }
  }
}

const distDir = resolve(import.meta.dirname, '../dist');
copyDir(distDir, join(extDir, 'dist'));

// Also copy grammar files (follows symlinks)
const syntaxDir = resolve(import.meta.dirname, '../syntaxes');
copyDir(syntaxDir, join(extDir, 'syntaxes'));

console.log(`Installed to ${extDir}`);
console.log('Reload VS Code window to pick up changes.');
