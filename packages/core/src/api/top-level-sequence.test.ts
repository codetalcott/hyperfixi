/**
 * top-level-sequence.test.ts
 *
 * A top-level command sequence used to be truncated to its first command on the
 * MULTILINGUAL entry point. `hyperscript.compile(src, { language })` — and with it
 * `hyperfixi.execute` / `translate` — takes the semantic direct path, where Stage 2
 * matched the first command and returned. Measured on the pre-fix parser:
 *
 *   es  alternar .a entonces alternar .b   ->  command          (1)  + warning
 *   en  show #a then show #b               ->  CommandSequence  (2)
 *
 * The English path was shielded by accident, not by design: core's parser calls
 * `skipToCommandBoundary()` after a semantic hit and resumes at the next command,
 * so its own loop recovers the commands the semantic parser dropped. Only code that
 * consumes the semantic node directly — every non-English entry point — lost them.
 *
 * These tests assert on the number of commands reaching the AST, not on "does it
 * compile". It always compiled, at confidence 1.0.
 */
import { describe, it, expect } from 'vitest';

import { hyperscript } from './hyperscript-api.js';

/** Commands reaching the AST: a CommandSequence's children, or 1 for a bare command. */
function commandCount(ast: unknown): number {
  const node = ast as { type?: string; commands?: unknown[] };
  if (node?.type === 'CommandSequence') return node.commands?.length ?? 0;
  return node?.type ? 1 : 0;
}

describe('multilingual path: a top-level sequence keeps every command', () => {
  it('captures both commands in a then-chained Spanish sequence', async () => {
    const result = await hyperscript.compile('alternar .a entonces alternar .b', {
      language: 'es',
    });

    expect(result.ok).toBe(true);
    expect(result.meta.parser).toBe('semantic');
    expect(commandCount(result.ast)).toBe(2);
  });

  it('captures both commands in a JUXTAPOSED Spanish sequence', async () => {
    // The English corpus form of `bind-two-way` has no conjunction at all, so a
    // `then`-keyword-only fix would pass 23 languages and fail English.
    const result = await hyperscript.compile('alternar .a alternar .b', { language: 'es' });

    expect(result.ok).toBe(true);
    expect(commandCount(result.ast)).toBe(2);
  });

  it('no longer warns about unconsumed input once the sequence is captured', async () => {
    const result = await hyperscript.compile('alternar .a entonces alternar .b', {
      language: 'es',
    });

    expect(result.meta.warnings).toBeUndefined();
  });

  it('leaves a single command as a single command', async () => {
    const result = await hyperscript.compile('alternar .a', { language: 'es' });

    expect(result.ok).toBe(true);
    expect(commandCount(result.ast)).toBe(1);
  });
});

describe('the English path was already whole, and stays whole', () => {
  it.each([
    ['then-chained', 'show #a then show #b'],
    ['juxtaposed', 'show #a show #b'],
  ])('%s', async (_label, code) => {
    const result = await hyperscript.compile(code, { language: 'en' });

    expect(result.ok).toBe(true);
    expect(commandCount(result.ast)).toBe(2);
  });
});
