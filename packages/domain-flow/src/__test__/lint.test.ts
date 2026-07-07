import { describe, it, expect } from 'vitest';
import { lintDomain, formatResult } from '@lokascript/domain-toolkit';
import type { DomainLintInput } from '@lokascript/domain-toolkit';

import { allSchemas } from '../schemas';
import { allProfiles } from '../profiles';
import {
  EnglishFlowTokenizer,
  SpanishFlowTokenizer,
  JapaneseFlowTokenizer,
  ArabicFlowTokenizer,
  KoreanFlowTokenizer,
  ChineseFlowTokenizer,
  TurkishFlowTokenizer,
  FrenchFlowTokenizer,
  GermanFlowTokenizer,
  PortugueseFlowTokenizer,
  RussianFlowTokenizer,
} from '../tokenizers';

function buildInput(): DomainLintInput {
  return {
    name: 'flow',
    schemas: allSchemas,
    profiles: allProfiles,
    tokenizers: {
      en: EnglishFlowTokenizer,
      es: SpanishFlowTokenizer,
      ja: JapaneseFlowTokenizer,
      ar: ArabicFlowTokenizer,
      ko: KoreanFlowTokenizer,
      zh: ChineseFlowTokenizer,
      tr: TurkishFlowTokenizer,
      fr: FrenchFlowTokenizer,
      de: GermanFlowTokenizer,
      pt: PortugueseFlowTokenizer,
      ru: RussianFlowTokenizer,
    },
  };
}

describe('domain-flow: lint', () => {
  it('passes all enabled rules with zero errors', () => {
    const result = lintDomain(buildInput());
    if (result.errorCount > 0 || result.warningCount > 0) {
      // eslint-disable-next-line no-console
      console.log(formatResult(result));
    }
    expect(result.errorCount).toBe(0);
  });
});
