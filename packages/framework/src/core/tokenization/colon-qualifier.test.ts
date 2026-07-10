/**
 * Contract tests for BaseTokenizer.mergeColonQualifiedNames().
 *
 * `:name` is hyperscript's local-variable sigil, but a colon immediately
 * preceded by an identifier is a qualifier (custom event namespace:
 * `draggable:start`). The English tokenizer merges these inside its keyword
 * extractor; the post-pass gives every other language the same stream. The
 * merge must fire only on strict adjacency and only on `:name`-shaped tokens —
 * domain DSL tokenizers (SQL, BDD, …) emit `:` as bare punctuation, which the
 * pass must never touch.
 */

import { describe, it, expect } from 'vitest';
import { BaseTokenizer, createSimpleTokenizer } from './base-tokenizer';
import type { TokenKind } from '../types';
import type { ValueExtractor, ExtractionResult } from '../../interfaces/value-extractor';

/** Minimal `:name`/`$name`/`^name` extractor (shape of semantic's VariableRefExtractor). */
class SigilRefExtractor implements ValueExtractor {
  readonly name = 'sigil-ref';

  canExtract(input: string, position: number): boolean {
    const ch = input[position];
    return (
      (ch === ':' || ch === '$' || ch === '^') &&
      position + 1 < input.length &&
      /[a-zA-Z_]/.test(input[position + 1])
    );
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.canExtract(input, position)) return null;
    let length = 1;
    while (position + length < input.length && /[a-zA-Z0-9_]/.test(input[position + length])) {
      length++;
    }
    return { value: input.substring(position, position + length), length };
  }
}

/** Minimal ASCII word extractor (shape of the per-language word walkers). */
class WordExtractor implements ValueExtractor {
  readonly name = 'word';

  canExtract(input: string, position: number): boolean {
    return /[a-zA-Z_]/.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let length = 0;
    while (position + length < input.length && /[a-zA-Z0-9_]/.test(input[position + length])) {
      length++;
    }
    return length > 0 ? { value: input.substring(position, position + length), length } : null;
  }
}

const KEYWORDS = new Set(['trigger', 'click']);

class ProbeTokenizer extends BaseTokenizer {
  readonly language = 'xx';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors([new SigilRefExtractor(), new WordExtractor()]);
  }

  classifyToken(token: string): TokenKind {
    return KEYWORDS.has(token) ? 'keyword' : 'identifier';
  }
}

function values(
  tokenizer: { tokenize(input: string): { tokens: readonly { value: string }[] } },
  input: string
): string[] {
  return tokenizer.tokenize(input).tokens.map(t => t.value);
}

describe('mergeColonQualifiedNames', () => {
  const t = new ProbeTokenizer();

  it('fuses identifier + :qualifier into one token', () => {
    expect(values(t, 'trigger draggable:start')).toEqual(['trigger', 'draggable:start']);
  });

  it('re-classifies the merged token and spans both positions', () => {
    const tokens = t.tokenize('trigger draggable:start').tokens;
    const merged = tokens[1];
    expect(merged.kind).toBe('identifier');
    expect(merged.position.start).toBe('trigger '.length);
    expect(merged.position.end).toBe('trigger draggable:start'.length);
  });

  it('fuses when the pre-colon word is a keyword (en parity: merge before lookup)', () => {
    const tokens = t.tokenize('click:foo').tokens;
    expect(tokens.map(x => x.value)).toEqual(['click:foo']);
    expect(tokens[0].kind).toBe('identifier');
  });

  it('does not fuse across whitespace — spaced :name stays a local-variable ref', () => {
    expect(values(t, 'trigger :start')).toEqual(['trigger', ':start']);
  });

  it('leaves a leading bare sigil untouched', () => {
    expect(values(t, ':start')).toEqual([':start']);
  });

  it('merges a single segment only — a:b:c matches the English extractor', () => {
    expect(values(t, 'a:b:c')).toEqual(['a:b', ':c']);
  });

  it('never touches $ and ^ sigils', () => {
    expect(values(t, 'put $foo into ^bar')).toEqual(['put', '$foo', 'into', '^bar']);
  });

  it('is a no-op for domain-DSL streams where : is bare punctuation', () => {
    const sql = createSimpleTokenizer({
      language: 'en',
      keywords: ['select', 'from', 'where'],
      includeOperators: true,
    });
    // Named params never fuse: the colon tokenizes as length-1 punctuation,
    // which can never match the :name qualifier shape.
    expect(values(sql, 'WHERE x = :param')).toEqual(['WHERE', 'x', '=', ':', 'param']);
    expect(values(sql, 'x=:param')).toEqual(['x', '=', ':', 'param']);
  });
});
