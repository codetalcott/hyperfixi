/**
 * `scroll to …` — the adverb, and the positional form
 *
 * `scroll` was not a `COMPOUND_COMMANDS` member, so it fell to
 * `parseCommandCore`'s generic argument loop, which continues only across a
 * fixed set of continuation keywords. Measured against the real 0.9.93 engine,
 * that broke three of `scroll`'s own documented shapes:
 *
 *  - `scroll to me instantly` — the adverb was DISCARDED, and since
 *    ScrollCommand's default is `smooth = !args.includes('instantly')`, losing
 *    it inverted the request rather than merely dropping a hint. (The
 *    `smoothly` half was invisible in behaviour for exactly that reason, which
 *    is why the parse-level filing under-described the defect.)
 *  - `scroll to bottom of #chat` — `bottom of #chat` folded into a binary `of`
 *    expression, so the runtime found neither the position nor the target and
 *    THREW `scroll: target element not found`. Every positional form was dead.
 *
 * A fourth shape was NOT broken, and the first probe said it was: the
 * multilingual corpus row `scroll to last <.message/> in #chat` resolves fine
 * on both paths. It threw in the probe only because that scratch page had no
 * `.message` elements — a defect measured on a page that cannot exhibit it.
 *
 * ## Why the rows below are behavioural
 *
 * `compound-command-coverage.test.ts` gained `scroll` probes in the same
 * change, and deleting the dispatch case does **not** redden them: the switch's
 * `default:` falls to `parseRegularCommand`, whose `checkIdentifierLike()` loop
 * happily consumes `instantly` and `bottom`/`of` as arguments, so the parse
 * looks complete and reports no discarded input.
 *
 * It is wrong anyway, and only execution says so. `parseRegularCommand` emits
 * those words as `identifier` nodes; an unbound identifier does not evaluate to
 * its own text, so ScrollCommand's `args.includes('instantly')` and its
 * position scan both miss. Mutation-measured with the dispatch case removed:
 * `instantly` still scrolls smoothly, `bottom of` scrolls to `start`, and
 * `the right of` / `last <…> in` throw exactly as before. The dedicated parser
 * emits `string` nodes, which is the whole difference.
 *
 * ## The runtime divergences this docblock used to list are FIXED
 *
 * The behavior default (`smooth` when no adverb; upstream leaves it unset),
 * the unmapped `inline` (upstream maps `left`/`center`/`right` to it, not to
 * `block`), and the missing `scroll <dir> by <n>` runtime are all aligned with
 * upstream now — pinned by `scroll-to.test.ts` and the execution rows below.
 * What remains filed in `docs-internal/PARSER_NEXT_STEPS.md` is the
 * `in <container>` clause: the parser consumes it (so it cannot corrupt the
 * target) but the runtime does not model container-relative `scrollTo`,
 * because upstream's own container branch produces no observable call in
 * jsdom — there is no oracle for it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

interface CommandNode {
  name?: string;
  args?: Array<Record<string, unknown>>;
}

function commandOf(source: string, traditional: boolean): CommandNode {
  const result = hyperscript.compileSync(source, { traditional } as never) as {
    ok: boolean;
    errors?: Array<{ message: string }>;
    ast?: CommandNode;
  };
  expect(result.errors ?? [], `${source}: ${JSON.stringify(result.errors)}`).toHaveLength(0);
  expect(result.ok, source).toBe(true);
  return result.ast as CommandNode;
}

const BOTH_PATHS: Array<[string, boolean]> = [
  ['auto', false],
  ['traditional', true],
];

/** Structural words must arrive as `string` nodes — see the docblock. */
function stringArgs(node: CommandNode): string[] {
  return (node.args ?? []).filter(a => a.type === 'string').map(a => String(a.value));
}

describe('scroll — parse', () => {
  describe.each(BOTH_PATHS)('%s path', (_label, traditional) => {
    it('keeps the trailing adverb, as a string the runtime can match', () => {
      expect(stringArgs(commandOf('scroll to me instantly', traditional))).toEqual([
        'to',
        'instantly',
      ]);
      expect(stringArgs(commandOf('scroll to me smoothly', traditional))).toEqual([
        'to',
        'smoothly',
      ]);
    });

    it('keeps the position word flat instead of folding it into a binary `of`', () => {
      const node = commandOf('scroll to the top of #chat smoothly', traditional);
      expect(stringArgs(node)).toEqual(['to', 'the', 'top', 'of', 'smoothly']);
      // The target survives as its own argument — the fold is what lost it.
      expect((node.args ?? []).some(a => a.type === 'selector' && a.value === '#chat')).toBe(true);
    });

    it('keeps a positional target expression whole', () => {
      const node = commandOf('scroll to last <.message/> in #chat', traditional);
      // Until Arc 1 step 6 the default path ADOPTED this source from the
      // semantic front-end, which models `in` as part of the target expression
      // (`binaryExpression 'in'`), and this test recorded that as a convergence
      // difference. The in-loop path is gone; both paths are now the core
      // parser, and the shape is upstream's: `last <.message/>` is one
      // expression and `in #chat` is scroll's container clause — exactly how
      // `_parseScrollModifiers` reads it (target via `unaryExpression`, then
      // `matchToken("in")`).
      expect(stringArgs(node)).toEqual(['to', 'in']);
      expect(node.args?.length).toBe(4);
    });

    it('parses the `scroll <dir> by <n>` branch flat, like the `to` branch', () => {
      // Structural words as `string` nodes the runtime matches by text — the
      // generic path used to emit `identifier`s here, which evaluate to
      // `undefined` (and the form had no runtime at all).
      const node = commandOf('scroll down by 100 px', traditional);
      expect(node.name).toBe('scroll');
      expect(stringArgs(node)).toEqual(['down', 'by', 'px']);
      expect((node.args ?? []).some(a => a.type === 'literal' && a.value === 100)).toBe(true);
    });

    it('parses the target-first `scroll <target> <dir> by <n>` form', () => {
      const node = commandOf('scroll #panel right by 50', traditional);
      expect(node.name).toBe('scroll');
      expect(stringArgs(node)).toEqual(['right', 'by']);
      expect((node.args ?? []).some(a => a.type === 'selector' && a.value === '#panel')).toBe(true);
    });
  });
});

describe('scroll — execution (what the parse is FOR)', () => {
  let calls: Array<{ id: string; options: ScrollIntoViewOptions }>;

  beforeEach(() => {
    calls = [];
    document.body.innerHTML = `
      <div id="chat"><p class="message">a</p><p class="message" id="last-msg">b</p></div>
      <div id="top"></div>
      <button id="btn">go</button>`;
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (
      this: HTMLElement,
      options?: boolean | ScrollIntoViewOptions
    ) {
      calls.push({ id: this.id, options: (options ?? {}) as ScrollIntoViewOptions });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const run = async (source: string) => {
    const btn = document.getElementById('btn') as HTMLElement;
    await hyperscript.eval(source, hyperscript.createContext(btn));
  };

  it('honours `instantly` — the case a dropped adverb INVERTED', async () => {
    await run('scroll to me instantly');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe('btn');
    expect(calls[0]?.options.behavior).toBe('instant');
  });

  it('honours `smoothly`', async () => {
    await run('scroll to me smoothly');
    expect(calls[0]?.options.behavior).toBe('smooth');
  });

  it.each([
    ['scroll to bottom of #chat', 'end'],
    ['scroll to the top of #chat smoothly', 'start'],
    ['scroll to middle of #chat', 'center'],
  ] as const)('%s scrolls #chat to block=%s', async (source, block) => {
    await run(source);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe('chat');
    expect(calls[0]?.options.block).toBe(block);
  });

  it('maps a horizontal position word to `inline`, like upstream', async () => {
    // This shape used to throw `scroll: target element not found`; then it
    // resolved the target but dropped the word. Upstream maps
    // left/center/right to `inline` (block stays at its default).
    await run('scroll to the right of #chat');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe('chat');
    expect(calls[0]?.options).toEqual({ block: 'start', inline: 'end' });
  });

  it('leaves `behavior` unset when no adverb is given, like upstream', async () => {
    // hyperfixi used to force `behavior: 'smooth'` here — upstream leaves it
    // to the browser default (`auto`).
    await run('scroll to #top');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.options).toEqual({ block: 'start', inline: 'nearest' });
  });

  it('scrolls to a positional target with a container clause', async () => {
    await run('scroll to last <.message/> in #chat');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe('last-msg');
  });

  describe('`scroll <dir> by <n>` (scrollBy, upstream byMode)', () => {
    let byCalls: Array<{ id: string; options: ScrollToOptions }>;

    beforeEach(() => {
      byCalls = [];
      vi.spyOn(Element.prototype, 'scrollBy').mockImplementation(function (
        this: Element,
        ...byArgs: unknown[]
      ) {
        byCalls.push({
          id: (this as HTMLElement).id,
          options: (byArgs[0] ?? {}) as ScrollToOptions,
        });
      });
    });

    it.each([
      ['scroll down by 200', { top: 200, left: 0 }],
      ['scroll up by 50', { top: -50, left: 0 }],
      ['scroll left by 10', { top: 0, left: -10 }],
      ['scroll by 200', { top: 200, left: 0 }], // no direction → down, upstream default
    ] as const)('%s scrolls the document element %j', async (source, options) => {
      await run(source);
      expect(byCalls).toHaveLength(1);
      expect(byCalls[0]?.id).toBe(document.documentElement.id);
      expect(byCalls[0]?.options).toEqual(options);
    });

    it('scrolls a named target horizontally', async () => {
      await run('scroll #chat right by 50');
      expect(byCalls).toHaveLength(1);
      expect(byCalls[0]?.id).toBe('chat');
      expect(byCalls[0]?.options).toEqual({ top: 0, left: 50 });
    });

    it('carries the adverb into `behavior`', async () => {
      await run('scroll down by 200 smoothly');
      expect(byCalls[0]?.options).toEqual({ top: 200, left: 0, behavior: 'smooth' });
    });

    it('reads an adjacent px unit', async () => {
      await run('scroll up by 50px');
      expect(byCalls[0]?.options).toEqual({ top: -50, left: 0 });
    });
  });
});
