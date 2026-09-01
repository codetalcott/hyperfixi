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
 * ## Two divergences from upstream that remain, deliberately
 *
 * Both are RUNTIME, both predate this change, both are pinned by
 * `scroll-to.test.ts`, and both are filed in `docs-internal/PARSER_NEXT_STEPS.md`
 * rather than silently altered here:
 *
 *  - hyperfixi always sets `behavior: 'smooth'` when no adverb is given;
 *    upstream leaves `behavior` unset (the browser default, `auto`).
 *  - hyperfixi never sets `inline`; upstream always does, and maps the
 *    HORIZONTAL position word (`left`/`center`/`right`) to it rather than to
 *    `block`.
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
      if (traditional) {
        // `last <.message/>` is one expression and `in #chat` is scroll's
        // container clause — exactly how upstream's `_parseScrollModifiers`
        // reads it (target via `unaryExpression`, then `matchToken("in")`).
        expect(stringArgs(node)).toEqual(['to', 'in']);
        expect(node.args?.length).toBe(4);
      } else {
        // The semantic parser ADOPTS this source and models `in` as part of
        // the target expression instead. Both resolve to the same element (the
        // execution row below runs on this path), so it is a convergence
        // difference, not a defect — recorded here rather than asserted away.
        expect(node.args?.[0]?.type).toBe('binaryExpression');
        expect(node.args?.[0]?.operator).toBe('in');
      }
    });

    it('leaves the `scroll <dir> by <n>` branch on the generic path', () => {
      // Upstream's byMode form has no runtime here; the point is only that
      // parseScrollCommand declines it rather than mangling it.
      const node = commandOf('scroll down by 100 px', traditional);
      expect(node.name).toBe('scroll');
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

  it('reaches the target of a horizontal position instead of throwing', async () => {
    // `inline` is not mapped yet (filed); resolving the TARGET at all is what
    // changed — this shape threw `scroll: target element not found`.
    await run('scroll to the right of #chat');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe('chat');
  });

  it('scrolls to a positional target with a container clause', async () => {
    await run('scroll to last <.message/> in #chat');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe('last-msg');
  });
});
