#!/usr/bin/env node
/**
 * Stage the root CHANGELOG.md into every publishable package before packing.
 *
 * No `@lokascript/*` or `@hyperfixi/*` tarball used to contain a CHANGELOG, so a
 * consumer working out what changed between two releases had to probe the
 * installed code empirically — which produced at least one wrong conclusion
 * downstream (an audit asserting a capability was blocked when the exports had
 * been there all along).
 *
 * Packages with their own CHANGELOG.md (core, semantic, i18n, language-server,
 * mcp-server, vite-plugin) keep it; the rest receive a copy of the root one.
 * Every publishable package lists "CHANGELOG.md" in its `files` array, so npm
 * picks it up from here.
 *
 * None of those six actually maintains its file any more — they stopped between
 * Jan 2025 and May 2026, on a per-package numbering no published version ever
 * matched, while every package publishes in lockstep at the root version. The
 * i18n one was the sharpest case: its newest entry headlined the grammar
 * transformer as a feature, in a tarball shipped after that transformer was
 * deleted. Rather than drop the files (they carry real migration recipes), each
 * now opens with a block pointing at the root changelog. So this exemption means
 * "has history worth keeping", not "is kept current" — if you add a package
 * here, give it the same pointer.
 *
 * The copies are build artifacts, not sources: they are gitignored, and the
 * release commit in .github/workflows/publish.yml adds explicit paths only.
 *
 * Usage: node scripts/sync-changelogs.cjs [--check]
 *   --check  report what would be copied, write nothing (exit 0 either way)
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const rootChangelog = path.join(repoRoot, 'CHANGELOG.md');
const packagesDir = path.join(repoRoot, 'packages');
const checkOnly = process.argv.includes('--check');

if (!fs.existsSync(rootChangelog)) {
  console.error(`sync-changelogs: no CHANGELOG.md at ${rootChangelog}`);
  process.exit(1);
}

const contents = fs.readFileSync(rootChangelog, 'utf8');
const copied = [];
const kept = [];
const skipped = [];

for (const name of fs.readdirSync(packagesDir).sort()) {
  const pkgDir = path.join(packagesDir, name);
  const manifestPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(manifestPath)) continue;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.private) {
    skipped.push(name);
    continue;
  }

  const target = path.join(pkgDir, 'CHANGELOG.md');
  // A package-owned changelog is more specific than the root one — leave it.
  if (fs.existsSync(target) && isTracked(path.join('packages', name, 'CHANGELOG.md'))) {
    kept.push(name);
    continue;
  }

  if (!checkOnly) fs.writeFileSync(target, contents);
  copied.push(name);
}

console.log(
  `sync-changelogs: ${checkOnly ? 'would copy' : 'copied'} root CHANGELOG.md into ${copied.length} package(s); ` +
    `${kept.length} kept their own; ${skipped.length} private package(s) skipped.`
);
if (kept.length > 0) console.log(`  own changelog: ${kept.join(', ')}`);

/** True if git tracks the path — i.e. it is a source file, not a prior copy. */
function isTracked(relativePath) {
  const { spawnSync } = require('child_process');
  const result = spawnSync('git', ['ls-files', '--error-unmatch', relativePath], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
  return result.status === 0;
}
