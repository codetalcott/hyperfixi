/**
 * Colon-qualified custom event names tokenize whole in every language.
 *
 * `:name` is hyperscript's local-variable sigil. A custom event name such as
 * `draggable:start` therefore used to look like `draggable` + the local
 * variable `:start` to every tokenizer except English, whose keyword extractor
 * merges one `word:word` segment. The shared post-pass
 * (BaseTokenizer.mergeColonQualifiedNames) now gives all languages the English
 * stream; CssSelectorExtractor additionally consumes pseudo-class segments so
 * `#x:hover` is one selector token (it used to split even in English).
 *
 * These are the token-boundary locks; the parse-level value locks (trigger
 * event role === 'draggable:start' in all 24 languages) live in
 * draggable-patterns.test.ts, and corpus-shaped full-body regressions in
 * multilingual-roadmap-fixes.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { tokenize, getSupportedTokenizerLanguages } from '../src';

const values = (input: string, lang: string): string[] =>
  tokenize(input, lang).tokens.map(t => t.value);

describe('colon-qualified event names tokenize whole (all languages)', () => {
  for (const lang of getSupportedTokenizerLanguages()) {
    describe(`[${lang}]`, () => {
      it('keeps `draggable:start` one token — never a dangling `:start`', () => {
        const vals = values('trigger draggable:start', lang);
        expect(vals).toContain('draggable:start');
        expect(vals).not.toContain('draggable');
        expect(vals).not.toContain(':start');
      });

      it('keeps a spaced `:start` a local-variable reference', () => {
        expect(values('trigger :start', lang)).toContain(':start');
        expect(values(':start', lang)).toEqual([':start']);
      });

      it('leaves $ and ^ sigil references whole and unmerged', () => {
        expect(values('put $foo into #x', lang)).toContain('$foo');
        expect(values('^count', lang)).toEqual(['^count']);
      });

      it('leaves the spaced object-literal colon as bare punctuation', () => {
        const vals = values('{ left: 5 }', lang);
        expect(vals).toContain(':');
        expect(vals).toContain('left');
        expect(vals.some(v => v.startsWith('left:'))).toBe(false);
      });

      it('merges a single qualifier segment only (en parity): a:b:c → a:b + :c', () => {
        const vals = values('a:b:c', lang);
        expect(vals).toContain('a:b');
        expect(vals).toContain(':c');
        expect(vals).not.toContain('a:b:c');
      });

      it('fuses pseudo-class selectors into one selector token', () => {
        for (const sel of ['#x:hover', '.a:not(.b)', '.a:not(.b):hover', '<.foo:hover/>']) {
          const tokens = tokenize(sel, lang).tokens;
          expect(tokens.map(t => t.value), `${lang}: ${sel}`).toEqual([sel]);
          expect(tokens[0].kind, `${lang}: ${sel}`).toBe('selector');
        }
      });

      it('whitespace still separates a selector from a local-variable ref', () => {
        const vals = values('.foo :bar', lang);
        expect(vals).toContain('.foo');
        expect(vals).toContain(':bar');
      });
    });
  }
});
