/**
 * `process partials in <content> [using view transition]` — parse AND execute.
 *
 * Both forms are ProcessPartialsCommand's OWN documented examples and both
 * ship in `examples/swap-and-morph/multi-target-swaps.html`, yet neither
 * worked before this fix. `process` was in COMPOUND_COMMANDS with no case in
 * `parseCompoundCommand` — the exact state `take` was in before #859 — so it
 * fell to `parseRegularCommand`, whose arg loop stops at the first boundary
 * token. Measured on both paths before the fix:
 *
 *   process partials in it                        → parsed to the single arg
 *                                                   [partials]; the loop stops
 *                                                   at `in`, so the content was
 *                                                   dropped and the runtime
 *                                                   threw 'expects "partials"
 *                                                   keyword' — naming the one
 *                                                   keyword it HAD been given
 *   process partials in it using view transition  → 'Transition command
 *                                                   requires a CSS property'
 *                                                   (the loop stops at the
 *                                                   `transition` COMMAND token,
 *                                                   so the tail was re-parsed
 *                                                   as a fresh command)
 *
 * Three separable causes, matching #859's shape:
 *
 * 1. No dispatch case, so no parser could consume `in <content>` or the
 *    `using view transition` tail.
 * 2. `ProcessPartialsCommand.parseInput` EVALUATED every arg and string-matched
 *    the results, so the `partials`/`in` identifiers resolved as variable
 *    lookups (undefined) and the traditional flat-args shape was unreachable
 *    even once the parser produced it.
 * 3. On the auto path the semantic match consumed the content at full
 *    confidence and left the tail behind — `processSchema` is patient-only and
 *    models no tail role — so `process` joined take/toggle/add on
 *    parseCommandCore's skipSemanticParsing list (historical: the in-loop semantic path this describes was deleted by Arc 1 step 6, 2026-09-02 — English is parsed by the core parser alone).
 *
 * These go through the real parser and the real runtime on BOTH paths
 * deliberately: the existing unit suite hand-builds AST args, so it cannot see
 * a parse-level gap.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

// Single-quoted attribute so the whole thing can sit inside a double-quoted
// hyperscript string literal without terminating it early.
const PARTIAL = "<hx-partial target='#out'><p>NEW</p></hx-partial>";

function setup(): { host: HTMLElement; out: HTMLElement } {
  document.body.innerHTML = '<div id="host"></div><div id="out"><p>OLD</p></div>';
  return {
    host: document.getElementById('host') as HTMLElement,
    out: document.getElementById('out') as HTMLElement,
  };
}

const BOTH_PATHS = [
  ['auto', undefined],
  ['traditional', { traditional: true }],
] as const;

describe.each(BOTH_PATHS)('process partials … (%s path)', (_label, opts) => {
  beforeEach(() => {
    setup();
  });

  it('parses every documented form', () => {
    for (const src of [
      'process partials in it',
      'process partials in fetchedHtml',
      'process partials in it using view transition',
      'on click process partials in it using view transition',
    ]) {
      const result = hyperscript.compileSync(src, opts as never);
      expect(result.errors ?? [], `${src}: ${JSON.stringify(result.errors)}`).toHaveLength(0);
      expect(result.ok, src).toBe(true);
    }
  });

  it('keeps the content argument (it was dropped at the `in` boundary)', () => {
    const result = hyperscript.compileSync('process partials in myHtml', opts as never);
    const ast = (result as unknown as { ast?: Record<string, unknown> }).ast;
    const node = (Array.isArray(ast?.body) ? ast.body[0] : ast) as { args?: unknown[] };
    // The content is the one argument (`partials in` are consumed, Arc 3
    // step 3) — before the boundary fix it was dropped entirely.
    expect(node.args).toHaveLength(1);
    expect(node.args?.[0]).toMatchObject({ type: 'identifier', name: 'myHtml' });
  });

  it('swaps the partial into its target', async () => {
    const { host, out } = setup();
    await hyperscript.eval(`set h to "${PARTIAL}" then process partials in h`, host, opts as never);

    expect(out.innerHTML, 'the target received the partial content').toContain('NEW');
    expect(out.innerHTML).not.toContain('OLD');
  });

  it('swaps identically with the `using view transition` tail', async () => {
    const { host, out } = setup();
    // jsdom has no document.startViewTransition, so this exercises the
    // unsupported-fallback branch — the DOM effect must be the same either way.
    await hyperscript.eval(
      `set h to "${PARTIAL}" then process partials in h using view transition`,
      host,
      opts as never
    );

    expect(out.innerHTML).toContain('NEW');
  });

  it('assigns the result to `it`', async () => {
    const { host, out } = setup();
    await hyperscript.eval(
      `set h to "${PARTIAL}" then process partials in h then put it.count into #out`,
      host,
      opts as never
    );

    expect(out.textContent, '`it` carries the ProcessPartialsResult').toBe('1');
  });

  it('reports a bad content value as a runtime error, not a parse error', async () => {
    const { host } = setup();
    const compiled = hyperscript.compileSync('process partials in missingVar', opts as never);
    expect(compiled.errors ?? []).toHaveLength(0);

    await expect(
      hyperscript.eval('process partials in missingVar', host, opts as never)
    ).rejects.toThrow(/content must be an HTML string or element/i);
  });

  it('rejects a malformed `using` tail instead of silently ignoring it', () => {
    const result = hyperscript.compileSync('process partials in it using morph', opts as never);
    expect(result.ok, 'an unrecognised tail must not parse clean').toBe(false);
  });
});

describe('process partials — content forms', () => {
  beforeEach(() => {
    setup();
  });

  it('accepts an element whose outerHTML holds the partials', async () => {
    const { host, out } = setup();
    document.body.insertAdjacentHTML('beforeend', `<div id="src">${PARTIAL}</div>`);

    await hyperscript.eval('process partials in #src', host);

    expect(out.innerHTML).toContain('NEW');
  });

  it('leaves unrelated targets alone', async () => {
    const { host, out } = setup();
    document.body.insertAdjacentHTML('beforeend', '<div id="other">KEEP</div>');

    await hyperscript.eval(`set h to "${PARTIAL}" then process partials in h`, host);

    expect(out.innerHTML).toContain('NEW');
    expect(document.getElementById('other')?.textContent).toBe('KEEP');
  });
});

describe('swap — the same unconsumed `using view transition` tail', () => {
  beforeEach(() => {
    setup();
  });

  it.each(BOTH_PATHS)('parses and swaps on the %s path', async (_label, opts) => {
    const { host, out } = setup();
    // SwapCommand's own commandMeta declares this form and its parseInput
    // already reads the tail — only the parser never consumed it.
    const result = hyperscript.compileSync(
      'swap #out with "<p>NEW</p>" using view transition',
      opts as never
    );
    expect(result.errors ?? [], JSON.stringify(result.errors)).toHaveLength(0);

    await hyperscript.eval(
      'swap #out with "<p>NEW</p>" using view transition',
      host,
      opts as never
    );
    expect(out.innerHTML).toContain('NEW');
  });
});
