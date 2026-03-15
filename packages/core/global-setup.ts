/**
 * Playwright Global Setup
 *
 * Validates that the examples symlink and prism plugin are available
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

  // Check examples symlink
  if (!fs.existsSync(examplesPath)) {
    const msg = [
      '',
      '╔══════════════════════════════════════════════════════════════╗',
      '║  Missing examples/ directory                                ║',
      '╠══════════════════════════════════════════════════════════════╣',
      '║                                                             ║',
      '║  Browser tests require the examples gallery, which lives    ║',
      '║  in the _hyper_min repo. Create a symlink at the repo root: ║',
      '║                                                             ║',
      '║  cd /path/to/hyperfixi                                      ║',
      '║  ln -s ../_hyper_min/packages/examples examples             ║',
      '║                                                             ║',
      '║  In CI, the workflow checks out the repo automatically.     ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',
    ].join('\n');
    throw new Error(msg);
  }

  // Check for at least one expected example file
  const sampleFile = path.join(examplesPath, 'basics/01-hello-world.html');
  if (!fs.existsSync(sampleFile)) {
    throw new Error(
      `examples/ symlink exists but basics/01-hello-world.html not found.\n` +
        `Verify the symlink target contains the gallery examples.`,
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
