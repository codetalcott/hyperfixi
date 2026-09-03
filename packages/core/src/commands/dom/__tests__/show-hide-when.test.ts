/**
 * `show`/`hide` with a scope and a `when` filter — the shipped-page defect.
 *
 * `examples/behaviors/recipes.html` ships
 *
 *   on keyup show <blockquote/> in the next <div/> when its textContent contains my value
 *
 * which `hyperscript.org` accepts. hyperfixi kept the `show` and silently
 * discarded BOTH the `in <scope>` qualifier and the `when` filter, so the page
 * showed every blockquote where upstream filtered them. `show`/`hide` were
 * `COMPOUND_COMMANDS` members with no case in `parseCompoundCommand`, so they
 * fell to `parseRegularCommand`'s `parsePrimary()` loop, which parses one
 * operand and cannot see the `in` operator or the `when` tail.
 *
 * Two halves, and BOTH have to hold or the page still misbehaves:
 *
 *  - the PARSE must carry the scope expression and the condition, and
 *  - the RUNTIME must treat `when` as a per-element FILTER — showing the
 *    matches and HIDING the rest, as upstream's `implicitLoopWhen` does — not
 *    as `CommandAdapterV2`'s generic command guard, which would evaluate the
 *    condition once against an unbound `it` and skip the command whole.
 *
 * The behavioural rows below assert the second half against real elements, so
 * reverting either half reddens this file. A parse-shape-only test would not:
 * the command node looks correct while every element stays visible.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

/** The source `recipes.html` actually ships, minus its `on keyup` wrapper. */
const SHIPPED = 'show <blockquote/> in the next <div/> when its textContent contains my value';

interface CommandNode {
  name?: string;
  args?: Array<Record<string, unknown>>;
  modifiers?: Record<string, { type?: string } | undefined>;
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

/** The recipes.html shape: an input, then a sibling div of quotes. */
function buildPage(inputValue: string, quotes: string[]): HTMLInputElement {
  document.body.innerHTML = `
    <input id="q" value="${inputValue}">
    <div class="quotes">
      ${quotes.map((q, i) => `<blockquote id="b${i}">${q}</blockquote>`).join('\n')}
    </div>`;
  return document.getElementById('q') as HTMLInputElement;
}

const displays = (count: number): string[] =>
  Array.from(
    { length: count },
    (_, i) => (document.getElementById(`b${i}`) as HTMLElement).style.display
  );

const BOTH_PATHS: Array<[string, boolean]> = [
  ['auto', false],
  ['traditional', true],
];

describe('show/hide — scope qualifier and `when` filter', () => {
  describe.each(BOTH_PATHS)('parse (%s path)', (_label, traditional) => {
    it('keeps the `in <scope>` qualifier as the target expression', () => {
      const node = commandOf('show <blockquote/> in the next <div/>', traditional);
      expect(node.name).toBe('show');
      expect(node.args).toHaveLength(1);
      // The scope is an `in` binary expression, not a bare `<blockquote/>`:
      // dropping the right operand is precisely the shipped defect.
      expect(node.args?.[0]?.type).toBe('binaryExpression');
      expect(node.args?.[0]?.operator).toBe('in');
    });

    it('keeps the `when` condition, and does not swallow the keyword as an argument', () => {
      const node = commandOf(SHIPPED, traditional);
      expect(node.args).toHaveLength(1);
      expect(node.modifiers?.when?.type).toBe('binaryExpression');
      // The bug shape: `when` parsed as a bare identifier argument, which hid
      // the guard from the parser's central when/where capture.
      const argNames = (node.args ?? []).map(a => a.name);
      expect(argNames).not.toContain('when');
    });

    it('consumes `with <strategy>` instead of leaving it to be discarded', () => {
      const node = commandOf('show #modal with *opacity', traditional);
      expect(node.args).toHaveLength(1);
      // Strategies are not honoured yet (a filed gap); the point here is that
      // the tail is CONSUMED, so the parser reports no discarded input.
      expect(node.modifiers?.with).toEqual(
        expect.objectContaining({ type: 'literal', value: 'opacity' })
      );
    });

    it('still parses the plain forms it always did', () => {
      for (const source of ['show me', 'show #modal', 'show <button/>', 'hide me', 'hide']) {
        const node = commandOf(source, traditional);
        expect(node.name, source).toBe(source.split(' ')[0]);
      }
    });
  });

  describe('execution — `when` is a per-element filter, not a command guard', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('shows the elements that match and HIDES the ones that do not', async () => {
      const input = buildPage('code', [
        'Talk is cheap. Show me the code.',
        'Programs must be written for people to read.',
        'Truth can only be found in one place: the code.',
      ]);

      await hyperscript.eval(SHIPPED, hyperscript.createContext(input));

      // Elements 0 and 2 contain "code"; element 1 does not and must be hidden.
      expect(displays(3)).toEqual(['', 'none', '']);
    });

    it('un-hides an element that starts matching again on a later run', async () => {
      const input = buildPage('code', ['about the code', 'about programs']);
      const context = hyperscript.createContext(input);

      await hyperscript.eval(SHIPPED, context);
      expect(displays(2)).toEqual(['', 'none']);

      // The search is re-run with a term that matches the other quote — the
      // whole reason `when` must apply the inverse action rather than skip.
      //
      // The re-shown element reads `block`, not `''`: `showElement` restores an
      // EMPTY `data-original-display` memo as `defaultDisplay`, where upstream
      // does `style.removeProperty('display')`. That divergence is pre-existing
      // and explicitly pinned by show.test.ts ('should use defaultDisplay when
      // originalDisplay is empty string'), so it is asserted here as-is rather
      // than quietly changed — filed in docs-internal/PARSER_NEXT_STEPS.md.
      input.value = 'programs';
      await hyperscript.eval(SHIPPED, hyperscript.createContext(input));
      expect(displays(2)).toEqual(['none', 'block']);
    });

    it('does not skip the command when the condition is falsy for every element', async () => {
      const input = buildPage('zzz', ['about the code', 'about programs']);

      await hyperscript.eval(SHIPPED, hyperscript.createContext(input));

      // The generic guard would return before touching the DOM, leaving both
      // visible. The filter hides both.
      expect(displays(2)).toEqual(['none', 'none']);
    });

    it('`hide … when` is the mirror: hides the matches, shows the rest', async () => {
      const input = buildPage('code', ['about the code', 'about programs']);

      await hyperscript.eval(
        'hide <blockquote/> in the next <div/> when its textContent contains my value',
        hyperscript.createContext(input)
      );

      expect(displays(2)).toEqual(['none', '']);
      // The un-matched element was SHOWN, not merely left alone — `hide`'s
      // inverse branch ran.
      expect((document.getElementById('b1') as HTMLElement).classList.contains('show')).toBe(true);
    });

    it('leaves `it` as it found it', async () => {
      const input = buildPage('code', ['about the code']);
      const context = hyperscript.createContext(input) as { it?: unknown };
      context.it = 'sentinel';

      await hyperscript.eval(SHIPPED, context as never);

      // The filter binds each element to `it` while testing it; a leak would
      // hand the rest of the handler the last blockquote.
      expect(context.it).toBe('sentinel');
    });
  });
});
