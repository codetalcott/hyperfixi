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
  EnglishBDDTokenizer,
  SpanishBDDTokenizer,
  JapaneseBDDTokenizer,
  ArabicBDDTokenizer,
  KoreanBDDTokenizer,
  ChineseBDDTokenizer,
  TurkishBDDTokenizer,
  FrenchBDDTokenizer,
} from '../tokenizers';

function buildInput(): DomainLintInput {
  return {
    name: 'bdd',
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
      en: new EnglishBDDTokenizer(),
      es: new SpanishBDDTokenizer(),
      ja: new JapaneseBDDTokenizer(),
      ar: new ArabicBDDTokenizer(),
      ko: new KoreanBDDTokenizer(),
      zh: new ChineseBDDTokenizer(),
      tr: new TurkishBDDTokenizer(),
      fr: new FrenchBDDTokenizer(),
    },
  };
}

describe('domain-bdd: lint', () => {
  it('passes all enabled rules with zero errors', () => {
    const result = lintDomain(buildInput());
    if (result.errorCount > 0 || result.warningCount > 0) {
      // eslint-disable-next-line no-console
      console.log(formatResult(result));
    }
    expect(result.errorCount).toBe(0);
  });
});
