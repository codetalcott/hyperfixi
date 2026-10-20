/**
 * The language grammars: one data module per language, each reachable three
 * ways that must agree — its file, the `languages` barrel, and a package
 * export (`@lokascript/framework/languages/<code>`). tsup builds whatever the
 * directory holds, so a module missing from package.json builds and ships
 * unimportable; a barrel entry missing hides it from tooling.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import * as languages from './index';
import type { GrammarProfile } from './types';
import type { GrammarProfileSlice } from '../multilingual';
import { buildLanguageConfig } from '../multilingual';

const DIR = __dirname;
const codes = readdirSync(DIR)
  .filter(
    f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !['index.ts', 'types.ts'].includes(f)
  )
  .map(f => f.slice(0, -3))
  .sort();
const grammars = Object.values(languages) as GrammarProfile[];

describe('language grammars', () => {
  it('exports each module from the barrel, under its own code', () => {
    expect(grammars.map(g => g.code).sort()).toEqual(codes);
  });

  it('exports each module from the package, and nothing else under ./languages/', () => {
    const pkg = JSON.parse(readFileSync(join(DIR, '../../package.json'), 'utf8'));
    const exported = Object.keys(pkg.exports)
      .filter(k => k.startsWith('./languages/'))
      .map(k => k.slice('./languages/'.length))
      .sort();
    expect(exported).toEqual(codes);
    expect(pkg.exports['./languages']).toBeDefined();
  });

  it.each(codes)('%s: is data (no imports but types)', code => {
    const source = readFileSync(join(DIR, `${code}.ts`), 'utf8');
    const imports = source.match(/^import .*$/gm) ?? [];
    expect(imports).toEqual(["import type { GrammarProfile } from './types';"]);
  });

  it('injects into the bridge as a slice', () => {
    for (const grammar of grammars) {
      const slice: GrammarProfileSlice = grammar;
      const config = buildLanguageConfig(slice, { keywords: { go: { primary: 'go' } } });
      expect(config.code).toBe(grammar.code);
      expect(config.patternProfile.wordOrder).toBe(grammar.wordOrder);
    }
  });
});
