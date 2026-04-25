/**
 * Playwright Global Setup
 *
 * Validates that the examples directory and prism plugin are available
 * before running browser tests. Fails fast with actionable instructions.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export default function globalSetup() {
  const examplesPath = path.join(repoRoot, 'examples');
  const prismPluginPath = path.join(
    repoRoot,
    'packages/developer-tools/dist/prism-hyperscript-i18n/browser.mjs',
  );

  // Check examples directory
  if (!fs.existsSync(examplesPath)) {
    const msg = [
      '',
      '╔══════════════════════════════════════════════════════════════╗',
      '║  Missing examples/ directory                                ║',
      '╠══════════════════════════════════════════════════════════════╣',
      '║                                                             ║',
      '║  Browser tests require the examples gallery, which should   ║',
      '║  be checked into the repo at examples/.                     ║',
      '║                                                             ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',
    ].join('\n');
    throw new Error(msg);
  }

  // Check for at least one expected example file
  const sampleFile = path.join(examplesPath, 'events-and-dom/hello-world.html');
  if (!fs.existsSync(sampleFile)) {
    throw new Error(
      `examples/ directory exists but events-and-dom/hello-world.html not found.\n` +
        `Verify the examples directory contains the gallery examples.`,
    );
  }

  // Warn (don't fail) if prism plugin isn't built
  if (!fs.existsSync(prismPluginPath)) {
    console.warn(
      '\n⚠ packages/developer-tools/dist/prism-hyperscript-i18n/browser.mjs not found.\n' +
        '  Syntax highlighting in examples will not work.\n' +
        '  Run: npm run build --prefix packages/developer-tools\n',
    );
  }
}
