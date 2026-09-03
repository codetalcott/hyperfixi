/**
 * `make a <Constructor> from <a>, <b>` — the comma list, and the lookup
 *
 * `make a URL from "/path/", "https://origin.example.com"` is MakeCommand's own
 * documented example and a source `hyperscript.org` accepts. It was broken in
 * two independent places, and fixing either alone leaves the example dead.
 *
 * **1. The parse dropped everything after the first comma.** `make` is parsed
 * by `parseMultiWordCommand`, whose modifier loop reads one `parseExpression()`
 * per keyword; the comma is not an operator, so `from` took `"/path/"` and left
 * `, "https://…"`. Bare that was a silent drop (the parser reports discarded
 * input only from inside a handler body); inside a handler the remainder was
 * re-read as a statement and the whole handler failed to compile with
 * `Unexpected token`. Upstream spells the list explicitly —
 * `do { args.push(requireElement("expression")) } while (matchOpToken(","))` —
 * and it is now opt-in per pattern via `commaListKeywords`, NOT generic: an
 * `append "x" to #a, #b` comma is rejected by the canonical engine too, so
 * collecting it everywhere would have accepted syntax upstream refuses.
 *
 * **2. The runtime could not use a constructor it had already resolved.**
 * `parseInput` EVALUATES the type expression, and the real evaluator resolves
 * `URL` to the class object — while `createClassInstance` did
 * `String(className)` and looked the name up in `window`. So the "name" was the
 * class's entire source text and every constructor threw
 * `Constructor 'class URL { … }' not found`, at every arity, comma or no comma.
 *
 * `make.test.ts` cannot see the second: its rows pass a MOCK evaluator that
 * returns the STRING `'URL'` — the one input shape the name lookup handles.
 * That is why the rows below run the real parser and the real evaluator, and
 * why they assert VALUES rather than a parse shape. Measured against the
 * vendored 0.9.93 engine in jsdom, the two-argument form now yields the
 * byte-identical `pathname` and `origin`.
 *
 * Both halves are mutation-tested: reverting either reddens this file.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

const BOTH_PATHS: Array<[string, boolean]> = [
  ['auto', false],
  ['traditional', true],
];

describe('make — comma-separated constructor arguments', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
  });

  const host = () => document.getElementById('host') as HTMLElement;

  describe.each(BOTH_PATHS)('parse (%s path)', (_label, traditional) => {
    it('compiles the documented example inside a handler', () => {
      // The shape that mattered: bare, the dropped tail was invisible; wrapped,
      // it was a hard compile failure, so the handler did nothing at all.
      const result = hyperscript.compileSync(
        'on click make a URL from "/path/", "https://origin.example.com"',
        { traditional } as never
      ) as { ok: boolean; errors?: Array<{ message: string }> };
      expect(result.errors ?? []).toHaveLength(0);
      expect(result.ok).toBe(true);
    });

    it('keeps a `called` tail after the list', () => {
      const result = hyperscript.compileSync(
        'on click make a URL from "/a", "https://x.example" called u',
        { traditional } as never
      ) as { ok: boolean; errors?: Array<{ message: string }> };
      expect(result.errors ?? []).toHaveLength(0);
    });

    it('does NOT collect commas for a modifier upstream reads as one expression', () => {
      // `append "x" to #a, #b` is rejected by the canonical engine
      // (`Unexpected Token : ,`). Making the comma generic would have made
      // hyperfixi accept it — a divergence in the direction that is hardest to
      // walk back.
      const result = hyperscript.compileSync('on click append "x" to #a, #b', {
        traditional,
      } as never) as { ok: boolean };
      expect(result.ok).toBe(false);
    });
  });

  describe('execution — the constructor receives every argument', () => {
    it('passes both arguments to `new URL(path, base)`', async () => {
      // Verified against hyperscript.org 0.9.93 in jsdom: identical values.
      // A single arg would build `new URL("/path/")`, which THROWS on a
      // relative URL — so a dropped second argument cannot pass this row by
      // accident.
      const result = (await hyperscript.eval(
        'make a URL from "/path/", "https://origin.example.com"',
        host()
      )) as URL;
      expect(result).toBeInstanceOf(URL);
      expect(result.pathname).toBe('/path/');
      expect(result.origin).toBe('https://origin.example.com');
    });

    it('still works at arity one — the lookup bug was not arity-specific', async () => {
      const result = (await hyperscript.eval(
        'make a URL from "https://x.example/p"',
        host()
      )) as URL;
      expect(result).toBeInstanceOf(URL);
      expect(result.pathname).toBe('/p');
    });

    it('constructs a non-URL global the same way', async () => {
      const result = (await hyperscript.eval('make a Date from 0', host())) as Date;
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(0);
    });
  });
});
