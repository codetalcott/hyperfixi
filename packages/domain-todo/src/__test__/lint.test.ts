import { describe, it, expect } from 'vitest';
import { lintDomain, formatResult } from '@lokascript/domain-toolkit';
import type { DomainLintInput } from '@lokascript/domain-toolkit';

import { allSchemas } from '../schemas';
import { allProfiles } from '../profiles';
import {
  EnglishTodoTokenizer,
  SpanishTodoTokenizer,
  JapaneseTodoTokenizer,
  ArabicTodoTokenizer,
  KoreanTodoTokenizer,
  ChineseTodoTokenizer,
  TurkishTodoTokenizer,
  FrenchTodoTokenizer,
} from '../tokenizers';

function buildInput(): DomainLintInput {
  return {
    name: 'todo',
    schemas: allSchemas,
    profiles: allProfiles,
    tokenizers: {
      en: EnglishTodoTokenizer,
      es: SpanishTodoTokenizer,
      ja: JapaneseTodoTokenizer,
      ar: ArabicTodoTokenizer,
      ko: KoreanTodoTokenizer,
      zh: ChineseTodoTokenizer,
      tr: TurkishTodoTokenizer,
      fr: FrenchTodoTokenizer,
    },
  };
}

describe('domain-todo: lint', () => {
  it('passes all enabled rules with zero errors', () => {
    const result = lintDomain(buildInput());
    if (result.errorCount > 0 || result.warningCount > 0) {
      // eslint-disable-next-line no-console
      console.log(formatResult(result));
    }
    expect(result.errorCount).toBe(0);
  });
});
