#!/usr/bin/env node
/**
 * What a published package's tarball may hold.
 *
 * A published package lists `files`, and the list has no `src`: the sourcemaps in
 * `dist` embed the sources (`sourcesContent`), so `src` in a tarball is the same text
 * twice (semantic's was 3.6 MB of 50).
 *
 * Zero dependencies. Run from the repository root: `node scripts/check-published-files.cjs`.
 */
const fs = require('node:fs');
const path = require('node:path');

function check(root) {
  const failures = [];
  const dir = path.join(root, 'packages');
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name, 'package.json');
    if (!fs.existsSync(file)) continue;
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (pkg.private) continue;
    if (!Array.isArray(pkg.files)) {
      failures.push(`packages/${name}: no "files" list, so npm would publish the whole directory`);
      continue;
    }
    for (const entry of pkg.files) {
      if (/^(\.\/)?src(\/|$)/.test(entry)) {
        failures.push(
          `packages/${name}: "files" lists "${entry}". Tarballs ship dist and its sourcemaps, not src`
        );
      }
    }
  }
  return failures;
}

if (require.main === module) {
  const failures = check(path.resolve(__dirname, '..'));
  if (failures.length) {
    console.error(`check-published-files: ${failures.length} problem(s)\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log('check-published-files: OK');
}

module.exports = { check };
