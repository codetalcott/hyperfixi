import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createJSXDSL } from '../index';
import { lintDomain, formatResult } from '@lokascript/domain-toolkit';
import type { DomainLintInput } from '@lokascript/domain-toolkit';

import { allSchemas } from '../schemas';
import {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  frenchProfile,
} from '../profiles';
import {
  EnglishJSXTokenizer,
  SpanishJSXTokenizer,
  JapaneseJSXTokenizer,
  ArabicJSXTokenizer,
  KoreanJSXTokenizer,
  ChineseJSXTokenizer,
  TurkishJSXTokenizer,
  FrenchJSXTokenizer,
} from '../tokenizers';

function buildInput(): DomainLintInput {
  return {
    name: 'jsx',
    schemas: allSchemas,
    profiles: [
      englishProfile,
      spanishProfile,
      japaneseProfile,
      arabicProfile,
      koreanProfile,
      chineseProfile,
      turkishProfile,
      frenchProfile,
    ],
    tokenizers: {
      en: EnglishJSXTokenizer,
      es: SpanishJSXTokenizer,
      ja: JapaneseJSXTokenizer,
      ar: ArabicJSXTokenizer,
      ko: KoreanJSXTokenizer,
      zh: ChineseJSXTokenizer,
      tr: TurkishJSXTokenizer,
      fr: FrenchJSXTokenizer,
    },
  };
}

describe('domain-jsx: lint', () => {
  it('passes all enabled rules with zero errors', () => {
    const result = lintDomain(buildInput());
    if (result.errorCount > 0 || result.warningCount > 0) {
      // eslint-disable-next-line no-console
      console.log(formatResult(result));
    }
    expect(result.errorCount).toBe(0);
  });

  it('doc language-count claims match the DSL (R11 doc-claims)', () => {
    const root = new URL('../..', import.meta.url);
    const read = (p: string) => ({
      path: p,
      content: readFileSync(fileURLToPath(new URL(p, root)), 'utf8'),
    });
    const result = lintDomain({
      ...buildInput(),
      docs: {
        languageCount: createJSXDSL().getSupportedLanguages().length,
        texts: [read('package.json'), read('README.md'), read('src/index.ts')],
      },
    });
    expect(result.findings.filter(f => f.rule === 'doc-claims')).toEqual([]);
  });
});
