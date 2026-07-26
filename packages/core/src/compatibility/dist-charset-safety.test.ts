/**
 * Shipped artifacts must be pure ASCII.
 *
 * Sibling of bundle-manifest-consistency.test.ts: both pin invariants about what
 * we actually ship rather than what the source says.
 *
 * The bundles carry 24 languages of keyword tables plus script-specific regexes,
 * so they held ~21,000 raw non-ASCII characters. When a static host serves
 * `text/javascript` WITHOUT `charset=utf-8` to a page with no `<meta charset>`,
 * the browser decodes those bytes with the document fallback encoding
 * (windows-1252) and the file changes meaning. A downstream consumer hit the
 * fatal form of this against the published 2.9.0:
 *
 *   Invalid regular expression: /[Ù‹-Ù’Ù°]/g: Range out of order in character class
 *
 * — a mojibaked `/[ً-ْٰ]/g` (the Arabic harakat strip in
 * packages/semantic). Regex literals are validated at PARSE time, so the whole
 * bundle failed to load: `window.hyperfixi` undefined, every `_=` attribute a
 * silent no-op, and nothing in the console mentioning encoding.
 *
 * Two assertions, because they catch different things:
 *   - ASCII-only is the invariant we actually want, and it covers the silent
 *     failure mode too (keyword tables corrupting where the file still parses).
 *   - the windows-1252 round-trip is what would have caught this class first:
 *     `hyperfixi-hx-v4.js` failed to parse via a DIFFERENT mechanism than the
 *     regex ("Invalid or unexpected token"), which an escape-counting check
 *     alone would have missed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { Script } from 'vm';

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');

/** Every .js under dist/, minus sourcemaps. */
function shippedFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) out.push(full);
    }
  };
  walk(distDir);
  return out;
}

const nonAsciiCount = (source: string): number => (source.match(/[^\x00-\x7F]/g) ?? []).length;

describe('shipped dist artifacts are charset-independent', () => {
  if (!existsSync(distDir)) {
    it.skip('dist/ not built — run `npm run build` (and `build:browser` for the bundles)', () => {});
    return;
  }

  const files = shippedFiles();

  it('finds artifacts to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('contains no raw non-ASCII characters', () => {
    const offenders = files
      .map(f => ({ file: relative(distDir, f), count: nonAsciiCount(readFileSync(f, 'utf8')) }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);

    expect(
      offenders,
      `raw non-ASCII in shipped output — these files change meaning when served without ` +
        `charset=utf-8. The rollup configs escape via withAsciiOnly() (rollup.ascii-only.mjs); ` +
        `a new config likely forgot to wrap its export, or placed the plugin before terser ` +
        `(terser DECODES \\uXXXX back to raw characters). If these are content-hashed ` +
        `chunks/*.js from older local builds, they are stale orphans — the chunk builds do ` +
        `not clean their output dir. Re-check with a fresh dist/:\n` +
        offenders.map(o => `  ${o.file}: ${o.count}`).join('\n')
    ).toEqual([]);
  });

  it('still parses when the bytes are decoded as windows-1252', () => {
    const decoder = new TextDecoder('windows-1252');
    const broken: string[] = [];

    for (const file of files) {
      const source = decoder.decode(readFileSync(file));
      try {
        new Script(source);
      } catch (error) {
        const message = (error as Error).message;
        // ESM can't be fed to vm.Script at all — that failure is about module
        // syntax, not charset, and says nothing either way. Those files are
        // still covered by the ASCII assertion above. Detected from the error
        // rather than by sniffing the source: minified ESM puts its `export`
        // mid-line, so a line-anchored pattern misses it. Top-level `await`
        // is the third spelling of "this is a module" (language-server builds).
        if (
          /Unexpected token 'export'|Cannot use import statement|await is only valid/.test(message)
        ) {
          continue;
        }
        broken.push(`${relative(distDir, file)}: ${message.slice(0, 90)}`);
      }
    }

    expect(broken, `mis-decoded artifacts fail to parse:\n${broken.join('\n')}`).toEqual([]);
  });
});
