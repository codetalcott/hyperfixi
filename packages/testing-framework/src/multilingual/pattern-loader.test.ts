/**
 * What the multilingual sweep grades: translations only.
 *
 * A non-translatable row is stored as written in every language. For a markup
 * row the shape check dropped it; a PLAIN non-translatable row
 * (intercept-cache-strategies, from 2026-09-25) would otherwise be graded as
 * the English source under every other language's parser.
 */

import { describe, expect, it, vi } from 'vitest';
import type { TestConfig } from './types';

const row = (codeExampleId: string, language: string, hyperscript: string, method: string) => ({
  codeExampleId,
  language,
  hyperscript,
  translationMethod: method,
  wordOrder: 'SOV',
  confidence: 1,
  verifiedParses: true,
});

vi.mock('@hyperfixi/patterns-reference', () => ({
  getTranslationsByLanguage: async () => [
    row('toggle', 'ja', '.active を 切り替え', 'semantic-render'),
    row('intercept', 'ja', 'intercept /\nend', 'non-translatable-identity'),
    row('wiring', 'ja', '<div sse-connect="/e"></div>', 'non-translatable-identity'),
  ],
  getVerifiedTranslations: async () => [],
  getHighConfidenceTranslations: async () => [],
  getAllPatterns: async () => [],
  getPatternStats: async () => ({ byLanguage: { ja: {} } }),
}));

const { loadPatterns } = await import('./pattern-loader');

describe('loadPatterns', () => {
  it('grades translations, not rows copied as written', async () => {
    const config: TestConfig = { languages: ['ja'], mode: 'full' };
    const loaded = await loadPatterns(config);
    expect(loaded.map(p => p.codeExampleId)).toEqual(['toggle']);
  });
});
