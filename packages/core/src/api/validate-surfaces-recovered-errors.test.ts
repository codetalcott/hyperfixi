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
