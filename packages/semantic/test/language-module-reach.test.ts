/**
 * What a language module reaches, besides `../core`.
 *
 * `dist/languages/<lang>.js` inlines every module its source imports except
 * `../core` (tsup's externalize-core plugin), so whatever a language's
 * hand-crafted patterns import is copied into that file, and a bundle of N
 * languages carries it N+1 times (core holds one). #1377 moved the patterns
 * there, and put/show/hide/set/get still read type lists from
 * `generators/command-schemas.ts`: every such language file inlined the schema
 * module and its validator (~130 KB unminified), and the adapter's regional
 * bundles grew by 16 to 52 KB gzipped (`western` 125 → 175 KB) until those lists
 * moved to `generators/role-types.ts`.
 *
 * This walks the static imports from `src/languages/<lang>.ts`, as the bundler
 * does, and fails on a module core owns that is heavy enough to matter. English
 * is exempt: it builds its patterns with the generator, so its module has always
 * held the schemas.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

const SRC = resolve(__dirname, '../src');

/**
 * Core's modules a language module must not copy. Not `registry.ts`: the walk
 * reaches it through `patterns/handcrafted.ts`, whose lookup only the command
 * files' dispatchers call, and the bundler drops those from a language file (a
 * language module registers through `../core`).
 */
const CORE_ONLY = [
  'generators/command-schemas.ts',
  'generators/schema-validator.ts',
  'generators/pattern-generator.ts',
  'parser/',
  'explicit/',
];

/** The runtime imports of a source file: `import type` / `export type` excluded. */
function runtimeImports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const specifiers: string[] = [];
  const fromClause = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^;'"]*?\sfrom\s+['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(fromClause)) if (!match[1]) specifiers.push(match[2]);
  for (const match of source.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveRelative(from: string, specifier: string): string | undefined {
  const base = resolve(dirname(from), specifier);
  return [`${base}.ts`, join(base, 'index.ts')].find(existsSync);
}

/** Every source module a language module inlines into its dist file. */
function reach(language: string): string[] {
  const seen = new Set<string>();
  const queue = [join(SRC, 'languages', `${language}.ts`)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const specifier of runtimeImports(file)) {
      // `../core` is external to a language file; packages are external too.
      if (!specifier.startsWith('.') || /(^|\/)core$/.test(specifier)) continue;
      const target = resolveRelative(file, specifier);
      if (target) queue.push(target);
    }
  }
  return [...seen].map(file => relative(SRC, file));
}

const LANGUAGES = readdirSync(join(SRC, 'languages'))
  .filter(name => /^[a-z]{2}\.ts$/.test(name))
  .map(name => name.slice(0, 2))
  .filter(language => language !== 'en');

describe('a language module copies none of core’s heavy modules', () => {
  it('finds the language modules', () => {
    expect(LANGUAGES.length).toBe(23);
  });

  it('follows the imports (its own hand-crafted patterns are reached)', () => {
    expect(reach('de')).toContain('patterns/handcrafted/de.ts');
    expect(reach('de')).toContain('patterns/set.ts');
  });

  it.each(LANGUAGES)('%s', language => {
    const copied = reach(language).filter(file =>
      CORE_ONLY.some(owned => (owned.endsWith('/') ? file.startsWith(owned) : file === owned))
    );
    expect(copied).toEqual([]);
  });
});
