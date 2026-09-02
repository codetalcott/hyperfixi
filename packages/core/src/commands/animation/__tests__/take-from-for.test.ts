/**
 * `take <class> [from <source>] [for <recipient>]` — parse AND execute.
 *
 * Every form here is `VALID` on the real `hyperscript.org` engine
 * (`hs.parse(src).errors` → `[]`), and `take .active from .tab for me` is the
 * classic upstream tab idiom — yet all of it was rejected before this fix
 * (docs-internal/PARSER_NEXT_STEPS.md, found by #847's reachability probe):
 *
 *   take .active from .tab          → 'take requires property, "from", and source'
 *                                     (parsed, then the runtime rejected BOTH
 *                                     AST shapes it could be handed)
 *   take .active for me             → 'Expected variable name after "for"'
 *   take .active from .tab for me   → 'Expected "in" after variable name in
 *                                     for loop'
 *
 * Three separable defects, all shared-parser/runtime (not a semantic-vs-
 * traditional divergence):
 *
 * 1. `take` was in COMPOUND_COMMANDS but had no case in parseCompoundCommand,
 *    so it fell to parseRegularCommand — which cannot consume a `for` tail.
 *    The unconsumed `for` was read as a for-LOOP head by the next parse round
 *    (the same defect class #846 fixed for `toggle`).
 * 2. TakeCommand.parseInput EVALUATED the `from` keyword identifier (variable
 *    lookup → undefined ≠ 'from'), so the traditional flat-args shape always
 *    threw; the semantic modifiers shape (`modifiers.from`) wasn't read at all.
 * 3. On the auto path the semantic match consumed `take .active` and left
 *    `for me` unconsumed (`take` was put on parseCommandCore's
 *    skipSemanticParsing list with its siblings toggle/add/remove (historical: the in-loop semantic path this describes was deleted by Arc 1 step 6, 2026-09-02 — English is parsed by the core parser alone)).
 *
 * Execution semantics follow upstream's TakeCommand for the class-reference
 * variant: remove the class from EVERY source element (or every current
 * holder when no `from` is given), then add it to the recipient (default
 * `me`). These tests go through the real parser and the real runtime on BOTH
 * paths deliberately — a mock-evaluator unit test cannot see a parse-level
 * gap.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

function setupTabs(): {
  t1: HTMLElement;
  t2: HTMLElement;
  t3: HTMLElement;
  panel: HTMLElement;
} {
  document.body.innerHTML = [
    '<button id="t1" class="tab active">A</button>',
    '<button id="t2" class="tab">B</button>',
    '<button id="t3" class="tab">C</button>',
    '<div id="panel"></div>',
  ].join('');
  return {
    t1: document.getElementById('t1') as HTMLElement,
    t2: document.getElementById('t2') as HTMLElement,
    t3: document.getElementById('t3') as HTMLElement,
    panel: document.getElementById('panel') as HTMLElement,
  };
}

const BOTH_PATHS = [
  ['auto', undefined],
  ['traditional', { traditional: true }],
] as const;

describe.each(BOTH_PATHS)('take … from … for … (%s path)', (_label, opts) => {
  beforeEach(() => {
    setupTabs();
  });

  it('parses all previously-rejected upstream-valid forms', () => {
    for (const src of [
      'take .active from .tab',
      'take .active for me',
      'take .active from .tab for me',
      'take .active from .tab for #panel',
      'take .active',
    ]) {
      const result = hyperscript.compileSync(src, opts as never);
      expect(result.errors ?? [], `${src}: ${JSON.stringify(result.errors)}`).toHaveLength(0);
      expect(result.ok, src).toBe(true);
    }
  });

  it('runs the tab idiom: removes the class from EVERY source, adds to me', async () => {
    const { t1, t2, t3 } = setupTabs();
    await hyperscript.eval('take .active from .tab', t2, opts as never);

    expect(t1.classList.contains('active'), 'previous holder loses it').toBe(false);
    expect(t2.classList.contains('active'), 'me gains it').toBe(true);
    expect(t3.classList.contains('active')).toBe(false);
  });

  it('honours the `for <recipient>` clause', async () => {
    const { t1, t2, panel } = setupTabs();
    await hyperscript.eval('take .active from .tab for #panel', t2, opts as never);

    expect(t1.classList.contains('active')).toBe(false);
    expect(t2.classList.contains('active'), 'me is NOT the recipient here').toBe(false);
    expect(panel.classList.contains('active'), 'the for-target gains it').toBe(true);
  });

  it('`take .active for <recipient>` without `from` takes from every current holder', async () => {
    const { t1, t2, panel } = setupTabs();
    await hyperscript.eval('take .active for #panel', t2, opts as never);

    expect(t1.classList.contains('active'), 'the holder loses it with no from clause').toBe(false);
    expect(panel.classList.contains('active')).toBe(true);
    expect(t2.classList.contains('active')).toBe(false);
  });

  it('bare `take .active` takes from every current holder and gives to me', async () => {
    const { t1, t2 } = setupTabs();
    await hyperscript.eval('take .active', t2, opts as never);

    expect(t1.classList.contains('active')).toBe(false);
    expect(t2.classList.contains('active')).toBe(true);
  });

  it('is idempotent on the already-active tab (remove-then-add on me)', async () => {
    const { t1, t2 } = setupTabs();
    await hyperscript.eval('take .active from .tab', t1, opts as never);

    expect(t1.classList.contains('active'), 'me keeps the class').toBe(true);
    expect(t2.classList.contains('active')).toBe(false);
  });

  it('adds the class to the recipient even when NO source held it', async () => {
    const { t1, t2, t3 } = setupTabs();
    t1.classList.remove('active'); // nobody holds .active now
    await hyperscript.eval('take .active from .tab', t3, opts as never);

    expect(t3.classList.contains('active'), 'recipient gains it regardless').toBe(true);
    expect(t1.classList.contains('active')).toBe(false);
    expect(t2.classList.contains('active')).toBe(false);
  });

  it('still parses inside an event handler (the corpus pattern)', () => {
    const result = hyperscript.compileSync('on click take .active from .tab for me', opts as never);
    expect(result.errors ?? [], JSON.stringify(result.errors)).toHaveLength(0);
    expect(result.ok).toBe(true);
  });
});

describe('take — value-transfer variant is unaffected', () => {
  it('still moves an attribute from one source to me', async () => {
    document.body.innerHTML = '<div id="src" data-value="hello"></div><div id="host"></div>';
    const host = document.getElementById('host') as HTMLElement;
    await hyperscript.eval('take @data-value from #src', host);

    expect(document.getElementById('src')?.hasAttribute('data-value')).toBe(false);
    expect(host.getAttribute('data-value')).toBe('hello');
  });
});
