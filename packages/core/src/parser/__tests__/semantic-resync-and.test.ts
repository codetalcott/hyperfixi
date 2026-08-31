/**
 * `and` in a semantically-parsed command's arguments
 *
 * Regression gate for a defect that shipped in the DEFAULT configuration:
 *
 *     hyperscript.compileSync('on click log 1 and 2')
 *       -> ok: false, "Unexpected token: 2"
 *     hyperscript.compileSync('on click log 1 and 2', { traditional: true })
 *       -> ok: true
 *
 * ## The mechanism
 *
 * `parseCommandCore` tries the semantic analyzer first for every command NOT in
 * its `skipSemanticParsing` list. For `log 1 and 2` the analyzer reports
 * `confidence: 1` and `tokensConsumed: 4` — the whole input. But
 * `skipToCommandBoundary()` (a keyword scan since deleted — see
 * `semantic-adoption-coverage.test.ts`) then resynced the token stream by scanning for
 * `then` / `and` / `else` / `end`, stopped at the `and`, and the handler's
 * statement loop tried to parse `2` as a fresh command.
 *
 * `and` had no business in that list: it is not a command separator anywhere in
 * this engine — the pratt parser absorbs it as a binary operator, which
 * `then-as-separator.test.ts` pins as a KNOWN GAP. Removing it is the whole fix.
 *
 * ## Why it went unseen
 *
 * The multilingual gates run through `patterns.db` rows whose English side is
 * authored to parse. The core suite tests handlers, and separately tests `and`.
 * Nothing compiled a handler-wrapped, semantically-parsed command with `and` in
 * its arguments through the default config. It took a differential measurement
 * of the two parse paths over one corpus (ENGINE_MIGRATION_PLAN Arc 1 step 5).
 *
 * ## What these tests must keep true
 *
 * Every row goes through `hyperscript.compileSync` with the DEFAULT config, not
 * through `parse()` with hand-built options — the defect only existed on the
 * shipped path, and a test that built its own analyzer options would have been
 * measuring something else. Each row is paired with its `{ traditional: true }`
 * twin, so the gate asserts the two paths AGREE rather than merely that one
 * works: agreement is the property, and it is what regressed.
 */

import { describe, it, expect } from 'vitest';
import { hyperscript, config } from '../../api/hyperscript-api';

/** Command names in a compiled handler's body, for structural assertions. */
function bodyCommands(ast: unknown): string[] {
  const node = ast as { commands?: Array<{ type?: string; name?: string }> };
  return (node?.commands ?? []).filter(c => c?.type === 'command').map(c => c.name ?? '?');
}

describe('`and` in a semantically-parsed command argument (default config)', () => {
  it('the default config really does run semantic-first — otherwise this file is vacuous', () => {
    // The guard on the guard. Every assertion below is about the semantic path;
    // if `config.semantic` ever defaults false, they would all pass by taking
    // the traditional path and prove nothing.
    expect(config.semantic).toBe(true);
  });

  const CASES = [
    'on click log 1 and 2',
    'on click log "a" and "b"',
    'on click log 5 is between 1 and 10',
    'on click log [1, 2] and {a: 1}',
    'on click log 1 and 2 then log 3',
  ];

  for (const source of CASES) {
    it(`compiles ${JSON.stringify(source)} on the default path`, () => {
      const result = hyperscript.compileSync(source);
      expect(result.errors ?? []).toEqual([]);
      expect(result.ok).toBe(true);
    });

    it(`agrees with the traditional parser on ${JSON.stringify(source)}`, () => {
      // Agreement, not mere success: the defect was the two paths diverging.
      const semantic = hyperscript.compileSync(source);
      const traditional = hyperscript.compileSync(source, { traditional: true });

      expect(semantic.ok).toBe(traditional.ok);
      expect(bodyCommands(semantic.ast)).toEqual(bodyCommands(traditional.ast));
    });
  }

  it('still treats `then` as a boundary', () => {
    // The fix removed exactly one word from the boundary list. This pins that
    // the other three still do their job — over-skipping would merge commands.
    const result = hyperscript.compileSync('on click log 1 then log 2');
    expect(result.ok).toBe(true);
    expect(bodyCommands(result.ast)).toEqual(['log', 'log']);
  });

  it('a command ON the skip list is unaffected, as it always was', () => {
    // `toggle` and `set` never entered the semantic path, which is why they
    // worked throughout. Kept so a future change to `skipSemanticParsing`
    // cannot quietly move them into the broken shape.
    for (const source of ['on click toggle .a and .b', 'on click set x to 1 and 2']) {
      expect(hyperscript.compileSync(source).ok, source).toBe(true);
    }
  });

  it('a bare command outside a handler still parses, as it always did', () => {
    // The defect needed the handler's statement loop to strand the remainder;
    // the bare form was always fine. Pinned so the fix is not credited with
    // more than it did.
    expect(hyperscript.compileSync('log 5 is between 1 and 10').ok).toBe(true);
  });
});
