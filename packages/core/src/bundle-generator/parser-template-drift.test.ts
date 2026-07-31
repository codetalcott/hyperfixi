/**
 * `HYBRID_PARSER_TEMPLATE` is GENERATED from the real parser modules
 * (`parser/hybrid/{aliases,tokenizer,parser-core}.ts`) by
 * `scripts/generate-bundles.ts` — Arc E step 5 retired the hand-maintained
 * ~1000-line twin this file was written to police. Before generation, the
 * copies were measured apart in BOTH directions: the template lacked `@attr`
 * tokenization, the `'s` possessive operator, fetch `via`/`with`/`{options}`,
 * `values of`, five KEYWORDS entries and the alias-registration API. Every
 * vite-plugin bundle that embedded it shipped those parse gaps, and nothing
 * executed the embedded copy — the vite-plugin's own tests stop at
 * `new Function` construction (syntax, not behavior).
 *
 * What this file gates now, in order of what it would catch:
 *
 *   1. A BROKEN TRANSFORM — esbuild output that no longer evaluates, or whose
 *      behavior diverges from the modules it was derived from. The
 *      AST-equivalence suite is the strong form: the committed template and
 *      the live parser must produce identical trees over a corpus that
 *      includes every capability generation added and the escaping canaries
 *      (backticks, `${`, backslash-heavy regexes — the characters the
 *      template-literal embedding must escape).
 *   2. A STALE COMMIT — someone edits parser-core and skips regeneration.
 *      `generate:bundles:check` fails that in the lint-typecheck job; this
 *      suite fails it in the unit-tests job the moment the drift is
 *      behavioral. Two different jobs, so one surviving a workflow edit still
 *      leaves the other.
 *
 * The cmdMap-equality assertion (`capability-emission.test.ts` §4, Oracle 2 of
 * the arc) stays where it is: post-generation it holds by construction, and it
 * remains the cheap source-text belt for the same stale-commit case.
 */

import { describe, it, expect } from 'vitest';
import { HYBRID_PARSER_TEMPLATE } from './parser-templates';
import { HybridParser } from '../parser/hybrid/parser-core';

interface TemplateParser {
  parse(): unknown;
}

/** Evaluate the template and hand back its HybridParser class. */
const loadTemplateParser = (): (new (code: string) => TemplateParser) | null => {
  try {
    return new Function(`${HYBRID_PARSER_TEMPLATE}\nreturn HybridParser;`)() as new (
      code: string
    ) => TemplateParser;
  } catch {
    return null;
  }
};

describe('HYBRID_PARSER_TEMPLATE stays in step with parser-core', () => {
  const TemplateParser = loadTemplateParser();

  it('is self-contained enough to evaluate', () => {
    // If this fails the behavioural assertions below degrade to the source-text
    // check at the bottom, which is weaker but still catches this drift.
    expect(TemplateParser).not.toBeNull();
  });

  it.runIf(TemplateParser)('rejects catch, like the source parser', () => {
    const src = "on click log 'a' catch e log e end";
    expect(() => new HybridParser(src).parse()).toThrow(/needs the full parser/);
    expect(() => new TemplateParser!(src).parse()).toThrow(/needs the full parser/);
  });

  it.runIf(TemplateParser)('rejects finally, like the source parser', () => {
    const src = "on click log 'a' finally log 'b' end";
    expect(() => new HybridParser(src).parse()).toThrow(/needs the full parser/);
    expect(() => new TemplateParser!(src).parse()).toThrow(/needs the full parser/);
  });

  it('carries the guard in its source text', () => {
    // Independent of evaluation, so this keeps working if the template ever
    // gains a dependency that `new Function` cannot resolve. Quote-agnostic:
    // the hand copy wrote 'catch'; esbuild emits "catch".
    expect(HYBRID_PARSER_TEMPLATE).toMatch(/match\(['"]catch['"],\s*['"]finally['"]\)/);
  });
});

// ===========================================================================
// AST equivalence — the committed template IS the live parser
// ===========================================================================

/**
 * One source per parse path worth guarding, deliberately including:
 *
 *   - the five capabilities generation ADDED to the template (`@attr`, `'s`,
 *     fetch `via`/`as`, `values of`, KEYWORDS entries) — each was a live gap in
 *     vite-embedded bundles before step 5, so each gets a row that fails if it
 *     regresses;
 *   - escaping canaries: a backtick and a `${` inside a string literal, and a
 *     backslash regex-heavy tokenizer path. A wrong escape in the generator
 *     corrupts exactly these, and nothing else would notice — the template
 *     would still evaluate.
 */
const EQUIVALENCE_CORPUS: string[] = [
  // basics, one per family
  'on click toggle .active',
  'add .x to #t then remove .x from #t',
  'put "PUT" into #t',
  'on mouseover.debounce(300) show #hint',
  'repeat 3 times increment #counter end',
  'if #t has .active then hide #t else show #t end',
  'wait for foo from #t then log it',
  'js window.__x = 1 end',
  'send custom:event to #t',
  // gained in step 5 — previously unparseable by the embedded copy
  'toggle @disabled on #t',
  "set #t's title to 'TITLED'",
  'fetch /api via POST as json then log it',
  'put values of #form into #out',
  'on click halt the event',
  // escaping canaries
  'log "tick ` and ${dollar} and \\\\ backslash"',
  'on keyup log "typed"',
];

describe.runIf(loadTemplateParser())('template and live parser produce identical ASTs', () => {
  const TemplateParser = loadTemplateParser()!;

  for (const src of EQUIVALENCE_CORPUS) {
    it(`agree on: ${src.slice(0, 60)}`, () => {
      const real = new HybridParser(src).parse();
      const embedded = new TemplateParser(src).parse();
      expect(embedded).toEqual(real);
      // A parser pair that agrees on `null` has agreed on nothing — every
      // corpus entry must actually parse, or the row is vacuous (S3-b).
      expect(real).not.toBeNull();
    });
  }
});
