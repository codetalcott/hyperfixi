import { describe, it, expect } from 'vitest';
import { lintDomain, formatResult } from '@lokascript/domain-toolkit';
import type { DomainLintInput } from '@lokascript/domain-toolkit';

import { allSchemas } from '../schemas';
import { allProfiles } from '../profiles';
import {
  EnglishVoiceTokenizer,
  SpanishVoiceTokenizer,
  JapaneseVoiceTokenizer,
  ArabicVoiceTokenizer,
  KoreanVoiceTokenizer,
  ChineseVoiceTokenizer,
  TurkishVoiceTokenizer,
  FrenchVoiceTokenizer,
} from '../tokenizers';

function buildInput(): DomainLintInput {
  return {
    name: 'voice',
    schemas: allSchemas,
    profiles: allProfiles,
    tokenizers: {
      en: EnglishVoiceTokenizer,
      es: SpanishVoiceTokenizer,
      ja: JapaneseVoiceTokenizer,
      ar: ArabicVoiceTokenizer,
      ko: KoreanVoiceTokenizer,
      zh: ChineseVoiceTokenizer,
      tr: TurkishVoiceTokenizer,
      fr: FrenchVoiceTokenizer,
    },
  };
}

describe('domain-voice: lint', () => {
  it('passes all enabled rules with zero errors', () => {
    const result = lintDomain(buildInput());
    if (result.errorCount > 0 || result.warningCount > 0) {
      // eslint-disable-next-line no-console
      console.log(formatResult(result));
    }
    expect(result.errorCount).toBe(0);
  });
});
