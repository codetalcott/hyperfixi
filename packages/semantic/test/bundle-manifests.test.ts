/**
 * Bundle Manifest Drift Tests
 *
 * Asserts that each regional browser bundle's `getSupportedLanguages()` only
 * returns codes that exist in the canonical `SUPPORTED_LANGUAGES` registry
 * (derived from `LANGUAGE_IMPORTERS` in `language-loader.ts`).
 *
 * This catches the failure mode where a language is removed from the loader
 * but a regional bundle still declares it — or where a typo in a bundle's
 * hand-curated list ships unnoticed.
 *
 * The tests do NOT assert bundles are exhaustive; regional bundles are
 * intentional subsets. Drift in that direction is by design.
 */

import { describe, it, expect } from 'vitest';
import { SUPPORTED_LANGUAGES as CANONICAL_LANGUAGES } from '../src/language-loader';

interface RegionalBundle {
  name: string;
  importer: () => Promise<{ getSupportedLanguages: () => string[] }>;
}

const REGIONAL_BUNDLES: RegionalBundle[] = [
  { name: 'priority', importer: () => import('../src/browser-priority') },
  { name: 'western', importer: () => import('../src/browser-western') },
  { name: 'east-asian', importer: () => import('../src/browser-east-asian') },
];

describe('Regional bundle manifest drift', () => {
  for (const { name, importer } of REGIONAL_BUNDLES) {
    describe(`${name} bundle`, () => {
      it('only declares canonically-supported languages', async () => {
        const bundle = await importer();
        const declared = bundle.getSupportedLanguages();

        expect(declared.length).toBeGreaterThan(0);
        for (const code of declared) {
          expect(
            CANONICAL_LANGUAGES,
            `${name} bundle declares language '${code}' which is not in LANGUAGE_IMPORTERS`
          ).toContain(code);
        }
      });

      it('has no duplicate codes', async () => {
        const bundle = await importer();
        const declared = bundle.getSupportedLanguages();
        const unique = new Set(declared);
        expect(declared.length).toBe(unique.size);
      });
    });
  }
});
