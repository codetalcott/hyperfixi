/**
 * `validate()` used to call genuinely malformed code valid.
 *
 * The parser is deliberately resilient: it recovers from some malformed input
 * and returns `success: true` with a usable-but-degraded AST *and* a non-empty
 * `errors` array. compileSync's success branch never read that array, so the
 * diagnostics died there — and validate(), which derives `valid` from
 * compile's `ok`, reported clean.
 *
 * Meanwhile the language server reads the parser's accumulated errors directly
 * (server.ts) and flagged the very same source. Two public surfaces, opposite
 * answers, for input the real hyperscript.org engine also rejects.
 *
 * The fix keeps the two questions separate:
 *   - `ok`    — "did we produce something runnable?" Unchanged, so resilient
 *               execution behaves exactly as before.
 *   - `valid` — "is this code correct?" Now false when anything was recovered.
 */

import { describe, it, expect } from 'vitest';
import { hyperscript } from './hyperscript-api';
import { parse } from '../parser/parser';

/** Malformed, recovered by the parser, and rejected by upstream _hyperscript. */
const RECOVERED = 'put 1 2 3 into';
/** Malformed beyond recovery — no AST at all. */
const FATAL = 'set';

describe('validate() surfaces recovered parse errors', () => {
  it('reports recovered-but-malformed code as invalid', async () => {
    const result = await hyperscript.validate(RECOVERED);
    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('still reports well-formed code as valid, with no errors key', async () => {
    const result = await hyperscript.validate('toggle .active');
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('still reports unrecoverable code as invalid', async () => {
    const result = await hyperscript.validate(FATAL);
    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});

describe('compile() keeps executing what it always executed', () => {
  it('stays ok with an AST when the parser recovered', () => {
    // The load-bearing half: making validate stricter must NOT stop the runtime
    // installing a handler it has always installed. `ok` is a different
    // question from `valid`.
    const result = hyperscript.compileSync(RECOVERED);
    expect(result.ok).toBe(true);
    expect(result.ast).toBeDefined();
  });

  it('exposes the diagnostics alongside the AST', () => {
    const result = hyperscript.compileSync(RECOVERED);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('omits errors entirely for a clean parse', () => {
    const result = hyperscript.compileSync('toggle .active');
    expect(result.ok).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('is still not-ok with no AST when the parse truly fails', () => {
    const result = hyperscript.compileSync(FATAL);
    expect(result.ok).toBe(false);
    expect(result.ast).toBeUndefined();
  });
});

/**
 * `success` answers "is there an AST?", never "was the input valid?". That is
 * intentional — every execute path wants the former — but the name reads like
 * the latter, and nothing on the result said otherwise. `recovered` is the
 * missing signal, set in the one place `errors` is attached so it cannot drift.
 */
describe('ParseResult.recovered marks a degraded AST', () => {
  it('is true, alongside success, when the parser recovered', () => {
    const result = parse(RECOVERED);
    expect(result.success).toBe(true); // an AST exists...
    expect(result.recovered).toBe(true); // ...but it is degraded
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('is absent for a clean parse', () => {
    const result = parse('toggle .active');
    expect(result.success).toBe(true);
    expect(result.recovered).toBeUndefined();
    expect(result.errors).toBeUndefined();
  });

  it('tracks errors exactly — never set without them, never omitted with them', () => {
    // The invariant that makes `recovered` safe to trust: it is derived from
    // the same array in the same statement, so no parse can disagree.
    for (const source of [RECOVERED, FATAL, 'toggle .active', 'on click add .x to me']) {
      const result = parse(source);
      expect(Boolean(result.recovered)).toBe((result.errors?.length ?? 0) > 0);
    }
  });

  it('reports the singular `error` as undefined on a recovered parse', () => {
    // This asymmetry is the root cause, not an incidental detail: recovery
    // paths restore `this.error` but never unwind `this.errors`. Anything
    // reading only `error` therefore sees a clean parse — which is exactly the
    // bug fixed in the classic compile shim below.
    const result = parse(RECOVERED);
    expect(result.error).toBeUndefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});

/**
 * The classic-i18n bundle ships its own `compile()` shim for _hyperscript API
 * compatibility. It read the singular `error` and dropped `errors`, so it
 * reported `{ success: true, errors: [] }` for genuinely malformed input —
 * #780's defect, surviving in a second surface. Demo pages consume it
 * (examples/animation/color-cycling-debug.html, test-classic-i18n.html).
 */
describe('classic-i18n compile() shim reports recovered errors', () => {
  it('does not claim a clean compile for a recovered parse', async () => {
    const api = (await import('../compatibility/browser-bundle-classic-i18n')).default;
    const result = api.compile(RECOVERED);
    // `success` stays true — the shim mirrors ParseResult, and the AST is
    // still what the runtime has always run. The diagnostics must be there.
    expect(result.success).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('still reports no errors for a clean parse', async () => {
    const api = (await import('../compatibility/browser-bundle-classic-i18n')).default;
    const result = api.compile('toggle .active');
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
