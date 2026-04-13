import { describe, it, expect } from 'vitest';
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
});
