/**
 * Domain lint: structural + cross-file invariants for domain-sql.
 *
 * Uses @lokascript/domain-toolkit to check the domain's schemas, profiles,
 * tokenizers, and renderer tables stay consistent. Fails CI on errors;
 * warnings are printed for visibility but don't fail.
 */

import { describe, it, expect } from 'vitest';
import { lintDomain, formatResult } from '@lokascript/domain-toolkit';
import type { DomainLintInput } from '@lokascript/domain-toolkit';

import { allSchemas } from '../schemas';
import { allProfiles } from '../profiles';
import {
  EnglishSQLTokenizer,
  SpanishSQLTokenizer,
  JapaneseSQLTokenizer,
  ArabicSQLTokenizer,
  KoreanSQLTokenizer,
  ChineseSQLTokenizer,
  TurkishSQLTokenizer,
  FrenchSQLTokenizer,
} from '../tokenizers';
import { COMMAND_KEYWORDS, MARKERS } from '../generators/sql-renderer';

function buildInput(): DomainLintInput {
  return {
    name: 'sql',
    schemas: allSchemas,
    profiles: allProfiles,
    tokenizers: {
      en: EnglishSQLTokenizer,
      es: SpanishSQLTokenizer,
      ja: JapaneseSQLTokenizer,
      ar: ArabicSQLTokenizer,
      ko: KoreanSQLTokenizer,
      zh: ChineseSQLTokenizer,
      tr: TurkishSQLTokenizer,
      fr: FrenchSQLTokenizer,
    },
    renderer: {
      commandKeywords: COMMAND_KEYWORDS,
      markers: MARKERS,
    },
  };
}

describe('domain-sql: lint', () => {
  it('passes all enabled rules with zero errors', () => {
    const result = lintDomain(buildInput());

    if (result.errorCount > 0 || result.warningCount > 0) {
      // Print the formatted report so CI logs are legible on failure.
      // eslint-disable-next-line no-console
      console.log(formatResult(result));
    }

    expect(result.errorCount).toBe(0);
  });
});
