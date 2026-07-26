/**
 * `HYBRID_PARSER_TEMPLATE` is a hand-maintained COPY of
 * parser/hybrid/parser-core.ts, emitted as source text for generated bundles and
 * re-exported publicly from bundle-generator/index.ts. Nothing in the build
 * compares the two, so they drift silently — and a behavioural difference
 * between the parser we test and the parser a consumer embeds is exactly the
 * kind of gap that ships.
 *
 * This asserts the template BEHAVES like the source on the invariants that
 * matter, rather than diffing text (the copies are legitimately different:
 * TypeScript vs JavaScript, and different command sets).
 *
 * Note the template is not what `generateBundle()` emits — generator.ts writes
 * an `import { HybridParser } from '<path>/parser-core'` instead — so a
 * divergence here costs no bundle bytes. It still misleads whoever embeds the
 * exported template.
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

  it.runIf(TemplateParser)('still parses an ordinary handler', () => {
    expect(() => new TemplateParser!('on click toggle .active').parse()).not.toThrow();
  });

  it('carries the guard in its source text', () => {
    // Independent of evaluation, so this keeps working if the template ever
    // gains a dependency that `new Function` cannot resolve.
    expect(HYBRID_PARSER_TEMPLATE).toMatch(/match\('catch',\s*'finally'\)/);
  });
});
