// @vitest-environment jsdom
/**
 * Does a SHIPPED handwritten bundle actually RUN what its `commands` manifest
 * advertises?
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS — the gap between the two gates that came before it
 * (Arc E step 1 — `docs-internal/HANDOFF-command-arch-bundles.md`)
 * ---------------------------------------------------------------------------
 *
 * Two gates already ask a version of this question, and neither can answer it
 * for the bundles users actually download:
 *
 *   1. `bundle-manifest-consistency.test.ts` asks it of hybrid-complete over
 *      SOURCE TEXT — every advertised command must have a `case` label. It
 *      caught the 2026-07-20 `trigger` silent no-op. But a label that EXISTS
 *      and is WRONG is invisible to it, and lite-plus is out of its scope
 *      entirely.
 *   2. `bundle-generator/__tests__/capability-emission.test.ts` asks it by
 *      EXECUTION, which is the right oracle — but only of GENERATED bundles.
 *      The handwritten entries here share none of that code.
 *
 * The gap between them shipped a crash. `take` had a case label in
 * hybrid-complete (so gate 1 passed) and is not a generated bundle (so gate 2
 * never saw it), and it passed `getClassName` the EVALUATED value where every
 * sibling row passes the NODE — the exact defect Finding 16 found and fixed in
 * the template, never here. `take .active` threw `SyntaxError: '.'` in
 * `hyperfixi-hybrid-complete.js` and `hyperfixi-hx.js` for as long as both
 * have shipped. The Playwright bundle-compatibility matrix has no `take` row,
 * so nothing else was watching either.
 *
 * Every `check` below MUST assert a real effect — a DOM mutation, a dispatched
 * event, a resolved value, elapsed time, a prevented default. Two rules carried
 * from Finding 16, which are why several rows look stricter than they need to:
 *
 *   - ASSERT WHAT THE COMMAND IS FOR, not what it leaves behind. `toggle` is
 *     asserted in the REMOVING direction, because the adding direction is
 *     equally satisfied by a broken `toggle` that calls `add`. `append` asserts
 *     that an existing node SURVIVES, because `innerHTML +=` produces the right
 *     markup while destroying the DOM under it (#792, where the canonical class
 *     was the broken copy).
 *   - A correct-looking end state is not evidence the command ran. Where a
 *     fallback exists, a check on the end state measures the fallback.
 *
 * The completeness test is the ratchet: a name added to a bundle's `commands`
 * or `blocks` array without a surface here FAILS, rather than being silently
 * unmeasured.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import hybridComplete from './browser-bundle-hybrid-complete';
import litePlus from './browser-bundle-lite-plus';
import { AVAILABLE_COMMANDS, resolveCommandKey } from '../bundle-generator/template-capabilities';
import { COMMAND_IMPLEMENTATIONS } from '../bundle-generator/templates';

// ===========================================================================
// Harness
// ===========================================================================

interface Outcome {
  doc: Document;
  /** The element the code ran against (`me`). */
  me: Element;
  result: unknown;
  error: Error | null;
  /** Wall-clock ms spent inside `execute` — the only witness `wait` has. */
  elapsedMs: number;
  /** Set by rows that run through the event-handler path. */
  event?: Event;
}

interface Surface {
  /** The source a user writes. */
  code: string;
  setup?: (doc: Document, me: Element) => void;
  check: (o: Outcome) => boolean;
  /**
   * Run through the DOM-processor + event-handler path instead of
   * `api.execute()`, dispatching this event. Required for commands whose whole
   * purpose is an effect on the event (`halt`), which `api.execute` cannot
   * supply — it builds a context with no event.
   */
  viaEvent?: string;
}

interface BundleApi {
  execute(code: string, element?: Element): Promise<unknown>;
  process(root?: Element | Document): void;
  commands: string[];
  blocks?: string[];
}

const consoleLines: unknown[][] = [];
const consoleWarnings: unknown[][] = [];
const clipboardWrites: string[] = [];
const win = (): Record<string, unknown> => globalThis as unknown as Record<string, unknown>;
const t = (d: Document) => d.querySelector('#t') as HTMLElement;

/**
 * `history.length` immediately before the surface runs, so `push` and `replace`
 * can be told apart. jsdom implements both, and the entry count is the only
 * observable difference between them once the URL matches.
 */
let historyLenBefore = 0;

/** The pre-morph node, captured in `setup` so `check` can assert identity. */
let morphNodeBefore: Element | null = null;

/** Fixture: `#me` is the subject, `#t` the target, `#i` a focusable input. */
const FIXTURE = `
  <div id="me"></div>
  <div id="t">seed</div>
  <input id="i">
`;

let realFetch: typeof globalThis.fetch;

beforeEach(() => {
  realFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response('FETCHED', { status: 200 })) as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

/**
 * Reset per SURFACE, not per test. Each `it` runs the whole manifest in a
 * loop, and rows mutate the fixture destructively — `remove #t` deletes the
 * target every later row depends on. Sharing state across rows would make the
 * gate's result depend on manifest ORDER, which is exactly the kind of
 * accidental coupling a gate must not have.
 */
const resetFixture = () => {
  document.body.innerHTML = FIXTURE;
  consoleLines.length = 0;
  consoleWarnings.length = 0;
  clipboardWrites.length = 0;
  morphNodeBefore = null;
  win().__shipCall_ran = false;
  win().__shipCall = () => (win().__shipCall_ran = true);
  win().__shipJs = undefined;
  // jsdom ships no clipboard; `copy`'s fallback path uses `document.execCommand`,
  // which jsdom also lacks, so the row would assert the catch arm rather than
  // the command. Defined per-surface because `configurable: true` is what lets
  // it be redefined at all.
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async (s: string) => void clipboardWrites.push(s) },
    configurable: true,
  });
  history.replaceState({}, '', '/');
  historyLenBefore = history.length;
};

const runSurface = async (api: BundleApi, surface: Surface): Promise<Outcome> => {
  resetFixture();
  const me = document.getElementById('me')!;
  surface.setup?.(document, me);

  const realLog = console.log;
  const realWarn = console.warn;
  console.log = (...a: unknown[]) => void consoleLines.push(a);
  console.warn = (...a: unknown[]) => void consoleWarnings.push(a);

  const started = Date.now();
  let result: unknown;
  let error: Error | null = null;
  let event: Event | undefined;

  try {
    if (surface.viaEvent) {
      // Event-handler path: the bundle's own DOM processor installs the
      // listener, exactly as it does for a page's `_` attributes.
      me.setAttribute('_', surface.code);
      api.process(document.body);
      event = new MouseEvent(surface.viaEvent, { bubbles: true, cancelable: true });
      me.dispatchEvent(event);
      // The handler is async, so its effects land in microtasks after dispatch.
      await new Promise(resolve => setTimeout(resolve, 5));
    } else {
      try {
        result = await api.execute(surface.code, me);
      } catch (e) {
        error = e as Error;
      }
    }
  } finally {
    console.log = realLog;
    console.warn = realWarn;
  }

  return { doc: document, me, result, error, elapsedMs: Date.now() - started, event };
};

/**
 * Shared assertion helpers. `noWarning` matters because both executors'
 * `default:` arm is `console.warn('Unknown command: x')` and returns null —
 * an advertised command that reaches it produces no error and no effect, which
 * is the exact shape of the 2026-07-20 regression.
 */
const noWarning = () => !consoleWarnings.some(l => /Unknown command/.test(String(l[0])));
const ok = (o: Outcome, effect: boolean) => effect && !o.error && noWarning();

// ===========================================================================
// hybrid-complete — the AST bundle, re-exported by hyperfixi-hx.js
// ===========================================================================

const HYBRID_COMMANDS: Record<string, Surface> = {
  // Asserted in the REMOVING direction: a `toggle` that merely calls `add`
  // satisfies the adding direction and fails this.
  toggle: {
    code: 'toggle .x on #t',
    setup: d => t(d).classList.add('x'),
    check: o => ok(o, !t(o.doc).classList.contains('x')),
  },
  add: { code: 'add .x to #t', check: o => ok(o, t(o.doc).classList.contains('x')) },
  remove: { code: 'remove #t', check: o => ok(o, !o.doc.querySelector('#t')) },
  put: { code: 'put "PUT" into #t', check: o => ok(o, t(o.doc).innerHTML === 'PUT') },
  // #792's lesson as an assertion: the markup is right either way, but
  // `innerHTML +=` rebuilds the subtree and destroys the node (and the value
  // the user typed into it). Node identity is what append is FOR.
  append: {
    code: 'append "AP" to #t',
    setup: d => {
      t(d).innerHTML = "<input id='keep'>";
      (d.getElementById('keep') as HTMLInputElement).value = 'typed';
    },
    check: o => {
      const kept = o.doc.getElementById('keep') as HTMLInputElement | null;
      return ok(o, kept?.value === 'typed' && t(o.doc).innerHTML.endsWith('AP'));
    },
  },
  prepend: {
    code: 'prepend "PR" to #t',
    setup: d => {
      t(d).innerHTML = "<input id='keep'>";
      (d.getElementById('keep') as HTMLInputElement).value = 'typed';
    },
    check: o => {
      const kept = o.doc.getElementById('keep') as HTMLInputElement | null;
      return ok(o, kept?.value === 'typed' && t(o.doc).innerHTML.startsWith('PR'));
    },
  },
  // A property that is NOT innerHTML, so a `set` that silently degrades into
  // `put` cannot pass.
  set: {
    code: 'set #t\'s title to "TITLED"',
    check: o => ok(o, (t(o.doc) as HTMLElement).title === 'TITLED'),
  },
  get: { code: 'get "G"', check: o => ok(o, o.result === 'G') },
  call: { code: 'call window.__shipCall()', check: o => ok(o, Boolean(win().__shipCall_ran)) },
  log: {
    code: 'log "LOGGED"',
    check: o =>
      ok(
        o,
        consoleLines.some(l => l.includes('LOGGED'))
      ),
  },
  // Both event rows assert the dispatch landed on the NAMED target and NOT on
  // `me` — Finding 16's sharp case, where a hardcoded marker reached a node
  // while abandoning the target, and the parse-level gate called it green.
  send: {
    code: 'send foo to #t',
    setup: (d, me) => {
      t(d).addEventListener('foo', () => t(d).setAttribute('data-got', '1'));
      me.addEventListener('foo', () => me.setAttribute('data-got', '1'));
    },
    check: o => ok(o, t(o.doc).hasAttribute('data-got') && !o.me.hasAttribute('data-got')),
  },
  trigger: {
    code: 'trigger foo on #t',
    setup: (d, me) => {
      t(d).addEventListener('foo', () => t(d).setAttribute('data-got', '1'));
      me.addEventListener('foo', () => me.setAttribute('data-got', '1'));
    },
    check: o => ok(o, t(o.doc).hasAttribute('data-got') && !o.me.hasAttribute('data-got')),
  },
  // Time actually passing is the only thing `wait` is for; a `wait` that
  // returns its argument without suspending satisfies a value-only check.
  wait: {
    code: 'wait 25ms',
    check: o => ok(o, o.result === 25 && o.elapsedMs >= 20),
  },
  show: {
    code: 'show #t',
    setup: d => (t(d).style.display = 'none'),
    check: o => ok(o, t(o.doc).style.display === ''),
  },
  hide: { code: 'hide #t', check: o => ok(o, t(o.doc).style.display === 'none') },
  transition: {
    code: "transition #t's opacity to 0.5",
    check: o => ok(o, t(o.doc).style.opacity === '0.5'),
  },
  // The row this file was written for. `take` is exclusive selection (the tab
  // pattern), so BOTH halves are asserted: me gains the class and the previous
  // holder loses it. Passing the evaluated value instead of the node yields
  // `querySelectorAll('.')` → DOMException.
  take: {
    code: 'take .x from #t',
    setup: d => (t(d).innerHTML = '<button id="prev" class="x"></button>'),
    check: o =>
      ok(o, o.me.classList.contains('x') && !o.doc.getElementById('prev')!.classList.contains('x')),
  },
  increment: {
    code: 'increment #t',
    setup: d => (t(d).textContent = '4'),
    check: o => ok(o, t(o.doc).textContent === '5'),
  },
  decrement: {
    code: 'decrement #t',
    setup: d => (t(d).textContent = '4'),
    check: o => ok(o, t(o.doc).textContent === '3'),
  },
  focus: { code: 'focus #i', check: o => ok(o, o.doc.activeElement?.id === 'i') },
  blur: {
    code: 'blur #i',
    setup: d => (d.getElementById('i') as HTMLElement).focus(),
    check: o => ok(o, o.doc.activeElement?.id !== 'i'),
  },
  go: { code: 'go to url "#gone"', check: o => ok(o, location.hash === '#gone') },
  return: { code: 'return 42', check: o => ok(o, o.result === 42) },
  // `halt` acts on the EVENT, so it can only be witnessed through the handler
  // path. `api.execute` builds a context with no event, where this bundle's
  // halt is observably a no-op.
  halt: {
    code: 'on click halt',
    viaEvent: 'click',
    check: o => ok(o, o.event?.defaultPrevented === true),
  },
};

const HYBRID_BLOCKS: Record<string, Surface> = {
  // One row asserts both halves of the conditional: the false branch must NOT
  // run and the else branch must.
  if: {
    code: 'if false put "N" into #t else put "Y" into #t end',
    check: o => ok(o, t(o.doc).innerHTML === 'Y'),
  },
  else: {
    code: 'if false put "N" into #t else put "Y" into #t end',
    check: o => ok(o, t(o.doc).innerHTML === 'Y'),
  },
  unless: {
    code: 'unless false put "U" into #t end',
    check: o => ok(o, t(o.doc).innerHTML === 'U'),
  },
  // Exact iteration count — an off-by-one or a body that runs once both fail.
  repeat: {
    code: 'repeat 3 times append "R" to #t end',
    setup: d => (t(d).innerHTML = ''),
    check: o => ok(o, t(o.doc).innerHTML === 'RRR'),
  },
  /**
   * Iterates a multi-match selector, which this executor coerces via
   * `Array.isArray(items) ? items : items instanceof NodeList ? … : [items]`.
   *
   * DELIBERATELY NOT `for x in #t.children`: an HTMLCollection satisfies
   * neither arm, so it is wrapped as a SINGLE item and the body runs once for
   * an N-element collection. That is a real gap, measured while writing this
   * file — but it is the array-like coercion question Arc D left open on
   * purpose (`toElementListFiltered` vs `toElementListStrict`: put filters a
   * mixed array and gates on `instanceof NodeList`; append/prepend duck-type
   * and accept an HTMLCollection). Reconciling it is a behavior change, so it
   * is filed for Arc E step 2 rather than widened into the take fix.
   */
  for: {
    code: 'for x in .item append "F" to #t end',
    setup: d => {
      t(d).innerHTML = '';
      d.body.insertAdjacentHTML('beforeend', '<i class="item"></i><i class="item"></i>');
    },
    check: o => ok(o, t(o.doc).innerHTML === 'FF'),
  },
  while: {
    code: 'while #t.children.length < 3 append "<b></b>" to #t end',
    setup: d => (t(d).innerHTML = ''),
    check: o => ok(o, t(o.doc).children.length === 3),
  },
  fetch: {
    code: 'fetch "/api" as text then put it into #t end',
    check: o => ok(o, t(o.doc).innerHTML === 'FETCHED'),
  },
};

// ===========================================================================
// lite-plus — the regex bundle
// ===========================================================================

/**
 * lite-plus is a deliberately reduced dialect, not a smaller hybrid-complete,
 * and two rows below encode differences that are DESIGN, not drift:
 *
 *   - `show`/`hide` are desugared at parse time to `remove .hidden` /
 *     `add .hidden`. The bundle's contract is the CSS class convention, not
 *     `style.display`, so asserting display here would be asserting the other
 *     bundle's semantics.
 *   - `send`/`trigger` accept `to <target>` only. The canonical spelling for
 *     trigger is `on <target>`, which this parser does not reach (it falls to
 *     the generic split and warns `Unknown command`). Recorded as a divergence
 *     for Arc E step 2 rather than widened here — the regex dialect is the
 *     bundle's documented surface, and changing it is a behavior decision, not
 *     a crash fix.
 */
const LITE_PLUS_COMMANDS: Record<string, Surface> = {
  toggle: {
    code: 'toggle .x on #t',
    setup: d => t(d).classList.add('x'),
    check: o => ok(o, !t(o.doc).classList.contains('x')),
  },
  add: { code: 'add .x to #t', check: o => ok(o, t(o.doc).classList.contains('x')) },
  remove: { code: 'remove .seed from #t', check: o => ok(o, !t(o.doc).classList.contains('seed')) },
  take: {
    code: 'take .x from #t',
    setup: d => {
      t(d).classList.add('x');
      t(d).innerHTML = '<button id="prev" class="x"></button>';
    },
    check: o => ok(o, o.me.classList.contains('x')),
  },
  put: { code: 'put "PUT" into #t', check: o => ok(o, t(o.doc).innerHTML === 'PUT') },
  append: {
    code: 'append "AP" to #t',
    setup: d => {
      t(d).innerHTML = "<input id='keep'>";
      (d.getElementById('keep') as HTMLInputElement).value = 'typed';
    },
    check: o => {
      const kept = o.doc.getElementById('keep') as HTMLInputElement | null;
      return ok(o, kept?.value === 'typed' && t(o.doc).innerHTML.endsWith('AP'));
    },
  },
  prepend: {
    code: 'prepend "PR" to #t',
    setup: d => {
      t(d).innerHTML = "<input id='keep'>";
      (d.getElementById('keep') as HTMLInputElement).value = 'typed';
    },
    check: o => {
      const kept = o.doc.getElementById('keep') as HTMLInputElement | null;
      return ok(o, kept?.value === 'typed' && t(o.doc).innerHTML.startsWith('PR'));
    },
  },
  set: {
    code: 'set #t.title to "TITLED"',
    check: o => ok(o, (t(o.doc) as HTMLElement).title === 'TITLED'),
  },
  increment: {
    code: 'increment #t',
    setup: d => (t(d).textContent = '4'),
    check: o => ok(o, t(o.doc).textContent === '5'),
  },
  decrement: {
    code: 'decrement #t',
    setup: d => (t(d).textContent = '4'),
    check: o => ok(o, t(o.doc).textContent === '3'),
  },
  // Desugars to `.hidden` class manipulation — see the block comment above.
  show: {
    code: 'show #t',
    setup: d => t(d).classList.add('hidden'),
    check: o => ok(o, !t(o.doc).classList.contains('hidden')),
  },
  hide: { code: 'hide #t', check: o => ok(o, t(o.doc).classList.contains('hidden')) },
  focus: { code: 'focus #i', check: o => ok(o, o.doc.activeElement?.id === 'i') },
  blur: {
    code: 'blur #i',
    setup: d => (d.getElementById('i') as HTMLElement).focus(),
    check: o => ok(o, o.doc.activeElement?.id !== 'i'),
  },
  log: {
    code: 'log "LOGGED"',
    check: o =>
      ok(
        o,
        consoleLines.some(l => l.includes('LOGGED'))
      ),
  },
  send: {
    code: 'send foo to #t',
    setup: (d, me) => {
      t(d).addEventListener('foo', () => t(d).setAttribute('data-got', '1'));
      me.addEventListener('foo', () => me.setAttribute('data-got', '1'));
    },
    check: o => ok(o, t(o.doc).hasAttribute('data-got') && !o.me.hasAttribute('data-got')),
  },
  trigger: {
    code: 'trigger foo to #t',
    setup: (d, me) => {
      t(d).addEventListener('foo', () => t(d).setAttribute('data-got', '1'));
      me.addEventListener('foo', () => me.setAttribute('data-got', '1'));
    },
    check: o => ok(o, t(o.doc).hasAttribute('data-got') && !o.me.hasAttribute('data-got')),
  },
  wait: { code: 'wait 25ms', check: o => ok(o, o.result === 25 && o.elapsedMs >= 20) },
  go: { code: 'go to url "#gone-lite"', check: o => ok(o, location.hash === '#gone-lite') },
};

// ---------------------------------------------------------------------------
// The eleven orphans, plus `removeClass` and the two url aliases (Arc E step 4)
// ---------------------------------------------------------------------------
//
// These are Finding 17: names the shipped hybrid bundles PARSED and did not
// EXECUTE. Each fell to `default:` → `console.warn('Unknown command')` → null,
// which is why every row below runs through `ok()` — its `noWarning()` half is
// what distinguishes "the command ran and did nothing visible" from "the
// command was never dispatched", and it is the assertion that fails first if a
// name is ever advertised again without a case.
//
// Written against the TEMPLATES' semantics, since those are now the shipped
// implementation. Each was mutation-verified by deleting its generated case and
// confirming it fails this row and nothing else.

Object.assign(HYBRID_COMMANDS, {
  // `remove .x from #t` parses to a `removeClass` NODE — the class-removal
  // branch of parseRemove — so this row exercises a name no user types.
  // Asserted against a target that must SURVIVE: a `removeClass` that fell
  // through to element-removal would also clear the class.
  removeClass: {
    code: 'remove .x from #t',
    setup: d => t(d).classList.add('x'),
    check: o => ok(o, !!t(o.doc) && !t(o.doc).classList.contains('x')),
  },
  // Emptying is about the CHILDREN, not the element. A row that only checked
  // `innerHTML === ''` passes against a `remove`, which deletes #t entirely.
  empty: {
    code: 'empty #t',
    setup: d => (t(d).innerHTML = '<span>child</span>'),
    check: o => ok(o, !!t(o.doc) && t(o.doc).innerHTML === ''),
  },
  copy: {
    code: 'copy "COPIED"',
    check: o => ok(o, clipboardWrites.includes('COPIED')),
  },
  // `beep` logs a TYPE-ANNOTATED line, which is what distinguishes it from
  // `log`: asserting only that "BEEPED" appears would pass for either.
  beep: {
    code: 'beep "BEEPED"',
    check: o =>
      ok(
        o,
        consoleLines.some(l => l.includes('[beep]') && l.includes('BEEPED'))
      ),
  },
  // History rows assert the URL *and* the direction. `push` must leave the
  // previous entry behind and `replace` must not — a `replace` implemented as
  // `push` passes any location-only check.
  push: {
    code: 'push url "/pushed"',
    check: o => ok(o, location.pathname === '/pushed' && history.length > historyLenBefore),
  },
  'push-url': {
    code: 'push url "/pushed-alias"',
    check: o => ok(o, location.pathname === '/pushed-alias' && history.length > historyLenBefore),
  },
  replace: {
    code: 'replace url "/replaced"',
    check: o => ok(o, location.pathname === '/replaced' && history.length === historyLenBefore),
  },
  'replace-url': {
    code: 'replace url "/replaced-alias"',
    check: o =>
      ok(o, location.pathname === '/replaced-alias' && history.length === historyLenBefore),
  },
  // `break` leaves the loop after the FIRST pass; `continue` skips the rest of
  // the body on ALL passes. The two assertions are each other's control: a
  // `break` that behaved like `continue` yields '' and fails, and vice versa.
  break: {
    code: 'repeat 3 times append "B" to #t then break end',
    setup: d => (t(d).innerHTML = ''),
    check: o => ok(o, t(o.doc).innerHTML === 'B'),
  },
  continue: {
    code: 'repeat 3 times continue then append "C" to #t end',
    setup: d => (t(d).innerHTML = ''),
    check: o => ok(o, t(o.doc).innerHTML === ''),
  },
  // `exit`/`throw` are FOR aborting, so the effect is the signal reaching the
  // caller. `ok()` would reject them for having an error, so both bypass it and
  // assert `noWarning()` directly — the half that still matters here.
  exit: {
    code: 'exit',
    check: o => /EXIT_COMMAND/.test(o.error?.message ?? '') && noWarning(),
  },
  throw: {
    code: 'throw "BOOM"',
    check: o => o.error?.message === 'BOOM' && noWarning(),
  },
  js: {
    code: 'js window.__shipJs = 42 end',
    check: o => ok(o, win().__shipJs === 42),
  },
  /**
   * Morph is asserted by NODE IDENTITY, never by markup.
   *
   * The template wraps its morphlex calls in a try/catch that falls back to
   * `innerHTML = content`, so a markup check passes whether the morph ran or
   * crashed into the fallback. capability-emission recorded this exact trap:
   * deleting the morphlex import left a markup-only check perfectly green.
   *
   * A real morph reuses the existing node, so a value the user typed survives.
   * That also makes this row the only gate on the new `morphlex` import — the
   * single dependency Arc E step 4 added to the shipped bundle.
   */
  morph: {
    code: 'morph #t to "<input id=\'keep\'>"',
    setup: d => {
      t(d).innerHTML = "<input id='keep'>";
      const input = d.getElementById('keep') as HTMLInputElement;
      input.value = 'typed';
      morphNodeBefore = input;
    },
    check: o => {
      const after = o.doc.getElementById('keep') as HTMLInputElement | null;
      return ok(o, after !== null && after === morphNodeBefore && after.value === 'typed');
    },
  },
} satisfies Record<string, Surface>);

// ===========================================================================
// The gate
// ===========================================================================

const BUNDLES: Array<{
  id: string;
  api: BundleApi;
  commands: Record<string, Surface>;
  blocks?: Record<string, Surface>;
}> = [
  {
    id: 'hybrid-complete',
    api: hybridComplete as unknown as BundleApi,
    commands: HYBRID_COMMANDS,
    blocks: HYBRID_BLOCKS,
  },
  { id: 'lite-plus', api: litePlus as unknown as BundleApi, commands: LITE_PLUS_COMMANDS },
];

for (const bundle of BUNDLES) {
  describe(`${bundle.id}: every advertised command produces its effect`, () => {
    it('has an executable surface for every advertised command and block', () => {
      // The ratchet. A name added to the manifest without a surface is a name
      // nothing measures — which is how `trigger` was advertised for months
      // while dispatching nothing.
      expect(bundle.api.commands.filter(name => !bundle.commands[name])).toEqual([]);
      expect((bundle.api.blocks ?? []).filter(name => !(bundle.blocks ?? {})[name])).toEqual([]);
    });

    it('every advertised command runs', async () => {
      const dead: string[] = [];
      for (const name of bundle.api.commands) {
        const outcome = await runSurface(bundle.api, bundle.commands[name]);
        if (!bundle.commands[name].check(outcome)) {
          dead.push(
            `${name}${outcome.error ? ` (threw: ${String(outcome.error.message).slice(0, 70)})` : ''}`
          );
        }
      }
      // Tolerance 0. `take` was on this list when the file was written.
      expect(dead).toEqual([]);
    }, 60000);

    if (bundle.blocks) {
      it('every advertised block runs', async () => {
        const dead: string[] = [];
        for (const name of bundle.api.blocks ?? []) {
          const outcome = await runSurface(bundle.api, bundle.blocks![name]);
          if (!bundle.blocks![name].check(outcome)) {
            dead.push(
              `${name}${outcome.error ? ` (threw: ${String(outcome.error.message).slice(0, 70)})` : ''}`
            );
          }
        }
        expect(dead).toEqual([]);
      }, 60000);
    }
  });
}

// ===========================================================================
// The specific regression this file was written for
// ===========================================================================

describe('take moves the class rather than throwing (Arc E step 1)', () => {
  // Kept as its own case, for the same reason capability-emission keeps its
  // trigger case: this is the defect that motivated the gate, and a future
  // reader should see the exact repro rather than infer it from a table row.
  //
  // `getClassName` reads a NODE, as every sibling row in the same switch does.
  // hybrid-complete passed it `await evaluate(...)` — a NodeList for a selector
  // argument — which yields '' and then `querySelectorAll('.' + '')` throws
  // `SyntaxError: '.' is not a valid selector`. Shipped in
  // hyperfixi-hybrid-complete.js and hyperfixi-hx.js.
  it('does not throw on the documented form', async () => {
    document.body.innerHTML = FIXTURE;
    t(document).innerHTML = '<button id="prev" class="x"></button>';
    const me = document.getElementById('me')!;
    await expect(hybridComplete.execute('take .x from #t', me)).resolves.not.toThrow();
  });

  it('gives the class to me and takes it from the previous holder', async () => {
    document.body.innerHTML = FIXTURE;
    t(document).innerHTML = '<button id="prev" class="x"></button>';
    const me = document.getElementById('me')!;
    await hybridComplete.execute('take .x from #t', me);
    expect(me.classList.contains('x')).toBe(true);
    expect(document.getElementById('prev')!.classList.contains('x')).toBe(false);
  });
});

describe('return resolves rather than leaking its internal signal (Arc E step 1)', () => {
  // The second defect the gate found. `return` throws an internal
  // `{type:'return', value}` token to unwind the sequence. Every other entry
  // into a sequence caught it — the event-handler path, the init path, and the
  // GENERATED bundles' executeAST — but the top-level sequence path did not,
  // so the token escaped through the public `execute()` as a rejection with a
  // bare object (no `message`, not an Error).
  it('resolves to the returned value', async () => {
    document.body.innerHTML = FIXTURE;
    const me = document.getElementById('me')!;
    await expect(hybridComplete.execute('return 42', me)).resolves.toBe(42);
  });

  it('stops the rest of the sequence', async () => {
    document.body.innerHTML = FIXTURE;
    const me = document.getElementById('me')!;
    await hybridComplete.execute('return 1 then put "AFTER" into #t', me);
    expect(t(document).innerHTML).toBe('seed');
  });

  it('still propagates a real error', async () => {
    // The catch must not swallow anything but the return token — an executor
    // that catches everything would turn every runtime failure into a silent
    // resolve, which is worse than the leak it replaced.
    //
    // The callee throws explicitly rather than relying on a bad property
    // access: this evaluator's member arm is null-safe (`if (obj == null)
    // return undefined`), so `window.__nope.boom()` resolves to undefined and
    // would have made this a vacuous check.
    document.body.innerHTML = FIXTURE;
    const me = document.getElementById('me')!;
    win().__shipThrow = () => {
      throw new Error('BOOM');
    };
    await expect(hybridComplete.execute('call window.__shipThrow()', me)).rejects.toThrow('BOOM');
  });
});

// ===========================================================================
// The advertised list is the generation input (Arc E step 4)
// ===========================================================================

describe('hybrid-complete advertises exactly what the templates can emit', () => {
  it('its `commands` array is AVAILABLE_COMMANDS, both directions', () => {
    // Finding 17 was "advertises 35, executes 24". Step 4 made the array the
    // INPUT to `scripts/generate-bundles.ts`, so the executor can no longer
    // fall behind it — but nothing stopped the array itself from drifting away
    // from the capability list, which is the other half of the same fact.
    //
    // Set equality both directions, which is what makes it a ratchet: a name
    // dropped here silently REMOVES a working command from the shipped bundle
    // (generation would delete its case on the next run), and a name added
    // without a template makes generation emit nothing while the bundle keeps
    // claiming it — the original defect, restored.
    expect([...hybridComplete.commands].sort()).toEqual([...AVAILABLE_COMMANDS].sort());
  });

  it('every advertised name reaches a template — aliases included', () => {
    // The array carries 38 names but yields 35 case groups, because `trigger`,
    // `push-url` and `replace-url` fold into the templates they alias. This
    // asserts the folding is total: a name resolving to no template would be
    // advertised, generate nothing, and warn `Unknown command` at runtime.
    const orphans = hybridComplete.commands.filter(
      name => !COMMAND_IMPLEMENTATIONS[resolveCommandKey(name)]
    );
    expect(orphans).toEqual([]);
  });
});
