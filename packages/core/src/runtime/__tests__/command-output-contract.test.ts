/**
 * The command output contract — Arc C's audit
 *
 * Arc C of `docs-internal/COMMAND_ARCHITECTURE_NEXT_STEPS.md`; the brief is
 * `docs-internal/HANDOFF-command-arch-output-contract.md`. This file is step 1:
 * the authoritative inventory, landed as a test so the migration ratchets it
 * down instead of being argued from prose.
 *
 * ## Why it asserts what it asserts
 *
 * `it` is set by TWO independent mechanisms:
 *
 * 1. **Command self-assignment** — `Object.assign(context, { it })` inside the
 *    command's own `execute()`, copied back onto the real context by the
 *    adapter (`runtime/command-adapter.ts`). Runs on **every** execution path.
 * 2. **Runtime propagation** — `propagateCommandResult` / `unwrapCommandResult`
 *    (`runtime/runtime-base.ts`), which sniffs the command's RETURN value.
 *    Runs in **event-handler bodies only**. The `then`-joined sequence executor
 *    (`executeCommandSequenceWithResult`, the path `hyperscript.eval` takes)
 *    never calls it.
 *
 * So the same command can leave `it` holding different things depending on how
 * it was invoked. That is the defect this arc closes, and it is why every row
 * below records BOTH paths. Recording only one would make a migration look
 * complete while half the divergence survived.
 *
 * **These expectations document current behavior, including the wrong parts.**
 * A row marked `defect:` is a known-bad value with the step that fixes it. When
 * a migration lands, the row FLIPS — that diff is the review artifact, and is
 * the whole reason this is an explicit table rather than a snapshot file
 * (a snapshot gets re-blessed on first failure; a hand-edited row does not).
 *
 * Do NOT "fix" a failing row by editing the expectation unless you are the
 * change that deliberately moved it.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';
import { Runtime } from '../runtime';
import { unwrapCommandResult } from '../runtime-base';

// Output types, imported so the literals below are COMPILER-CHECKED against the
// real interfaces. If a command changes its output shape, the literal stops
// typechecking — the classification cannot silently drift from the code.
import type { CallCommandOutput } from '../../commands/execution/call';
import type { JsCommandOutput } from '../../commands/advanced/js';
import type { RepeatCommandOutput } from '../../commands/control-flow/repeat';
import type { ConditionalCommandOutput } from '../../commands/control-flow/if';
import type { GetCommandOutput } from '../../commands/data/get';
import type { SetCommandOutput } from '../../commands/data/set';
import type { InsertionCommandOutput } from '../../commands/content/insertion-base';
import type { FetchCommandOutput } from '../../commands/async/fetch';
import type { MeasureCommandOutput } from '../../commands/animation/measure';
import type { DefaultCommandOutput } from '../../commands/data/default';
import type { WaitCommandOutput } from '../../commands/async/wait';
import type { HaltCommandOutput } from '../../commands/control-flow/halt';
import type { GoCommandOutput } from '../../commands/navigation/go';
import type { HistoryCommandOutput } from '../../commands/navigation/push-url';
import type { ScrollCommandOutput } from '../../commands/navigation/scroll-to';
import type { SettleCommandOutput } from '../../commands/animation/settle';
import type { TakeCommandOutput } from '../../commands/animation/take';
import type { TransitionCommandOutput } from '../../commands/animation/transition';
import type { StartViewTransitionOutput } from '../../commands/animation/start-view-transition';
import type { PickCommandOutput } from '../../commands/utility/pick';
import type { CopyCommandOutput } from '../../commands/utility/copy';
import type { BeepCommandOutput } from '../../commands/utility/beep';
import type { TellCommandOutput } from '../../commands/utility/tell';
import type { RenderCommandOutput } from '../../commands/templates/render';
import type { PseudoCommandOutput } from '../../commands/execution/pseudo-command';
import type { SignalCommandOutput } from '../../commands/control-flow/signal-base';
import type { ReturnCommandOutput } from '../../commands/control-flow/return';
import type { ThrowCommandOutput } from '../../commands/control-flow/throw';
import type { InstallCommandOutput } from '../../commands/behaviors/install';
import type { AsyncCommandOutput } from '../../commands/advanced/async';
import type { ProcessPartialsResult } from '../../commands/dom/process-partials';

// ===========================================================================
// Harness
// ===========================================================================

const FIXTURE = `
  <div id="host"></div>
  <div id="probe"></div>
  <p class="item"></p><p class="item"></p>
  <input id="inp" value="v">
  <form id="frm"><input name="a" value="1"></form>
  <dialog id="dlg"></dialog>
  <template id="tpl">hi</template>`;

interface Sink {
  [id: string]: { it: unknown };
}
const SINK: Sink = {};
(globalThis as Record<string, unknown>).__ARC_C_SINK = SINK;

let seq = 0;

/**
 * Render `it` as a short stable string.
 *
 * Compared as a STRING rather than by identity so a flipped row reads as a
 * legible diff (`'null'` → `'<P>'`) instead of an object dump, and so the table
 * doubles as documentation. Key names are kept for wrappers because the key set
 * is exactly what `unwrapCommandResult` sniffs on.
 */
function describeIt(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'object') {
    if ((v as { tagName?: string }).tagName) return `<${(v as Element).tagName}>`;
    if (Array.isArray(v)) return `Array(${v.length})`;
    if (v instanceof Event) return 'Event';
    const keys = Object.keys(v as object);
    return keys.length ? `{${keys.join(',')}}` : `{}:${(v as object).constructor?.name}`;
  }
  return `${typeof v}:${String(v).slice(0, 24)}`;
}

/**
 * Run one snippet and report what `it` holds afterwards.
 *
 * The trailing `js(it)` block is the readout: `it` is not otherwise observable
 * from outside a handler. Completion is detected by the marker landing in SINK
 * rather than by a fixed sleep — several commands here finish asynchronously
 * (`settle`, `transition`, `start view transition`), and a sleep-based harness
 * lets a late completion bleed into the next command's row.
 */
async function itAfter(snippet: string, path: 'sequence' | 'handler'): Promise<string> {
  const id = `arc-c-${seq++}`;
  const probe = `js(it) window.__ARC_C_SINK["${id}"] = { it: it } end`;
  const source =
    path === 'handler' ? `on probe ${snippet} then ${probe}` : `${snippet} then ${probe}`;

  document.body.innerHTML = FIXTURE;
  const host = document.getElementById('host') as HTMLElement;

  await hyperscript.eval(source, host);
  if (path === 'handler') host.dispatchEvent(new CustomEvent('probe'));

  const deadline = Date.now() + 3000;
  while (!(id in SINK) && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5));
  }
  if (!(id in SINK)) return 'NEVER-COMPLETED';
  return describeIt(SINK[id].it);
}

// ===========================================================================
// The audit table
// ===========================================================================

interface AuditRow {
  /** Source exercising the command. Adapted from the command's own `metadata.examples` to the fixture above. */
  snippet: string;
  /** `it` after the command in a `then`-joined sequence (no runtime propagation). */
  sequence: string;
  /** `it` after the command inside an event-handler body (runtime propagation runs). */
  handler: string;
  /** Present when the recorded value is known-wrong; names the defect and the step that fixes it. */
  defect?: string;
}

/** Commands deliberately not exercised, each with the reason. Counted by the ratchet. */
const NOT_EXERCISED: Record<string, string> = {
  // --- control-flow signals: they terminate the body, so there is no "after".
  break: 'control-flow signal; only meaningful inside a loop, and terminates the body',
  continue: 'control-flow signal; only meaningful inside a loop, and terminates the body',
  exit: 'control-flow signal; terminates the body, so nothing runs after it',
  return: 'control-flow signal; terminates the body, so nothing runs after it',
  halt: 'terminates the body (and the event), so the readout probe never runs',
  throw: 'throws by design, so the readout probe never runs',
  // --- environment.
  fetch: 'requires network; a mocked fetch would audit the mock, not the command',
  breakpoint: 'invokes the debugger, which halts the test run',
  install: 'requires a registered behavior; covered by the behaviors suite',
  // --- no runnable single-command snippet found (see step-1 note in the brief).
  async:
    'no single-command snippet parses: `async do … end` fails with "Async command execution failed"',
  default:
    '`default @data-theme to "light"` throws "Invalid target type: object" — suspected parse defect, needs triage',
  process:
    '`process partials in <var>` throws "expects partials keyword" — suspected parse defect, needs triage',
  'pseudo-command': 'no top-level form parses: `getAttribute("id") the #probe` fails to compile',
  take: '`take .item from <.item/> for #probe` fails to compile ("Expected variable name")',
};

const AUDIT: Record<string, AuditRow> = {
  // ---- agreement: the command self-assigns, and the wrapper (if any) unwraps
  // to the same value. These are the rows step 3's deletion must not move.
  get: { snippet: 'get 42', sequence: 'number:42', handler: 'number:42' },
  set: { snippet: 'set myVar to "value"', sequence: 'string:value', handler: 'string:value' },
  call: { snippet: 'call Math.max(1,2)', sequence: 'number:2', handler: 'number:2' },
  js: { snippet: 'js return 5 end', sequence: 'number:5', handler: 'number:5' },
  increment: {
    snippet: 'set counter to 1 then increment counter',
    sequence: 'number:2',
    handler: 'number:2',
  },
  decrement: {
    snippet: 'set counter to 5 then decrement counter',
    sequence: 'number:4',
    handler: 'number:4',
  },
  append: { snippet: 'set it to "A" then append "B"', sequence: 'string:A', handler: 'string:A' },
  prepend: { snippet: 'set it to "A" then prepend "B"', sequence: 'string:A', handler: 'string:A' },
  make: { snippet: 'make a <div/>', sequence: '<DIV>', handler: '<DIV>' },
  measure: { snippet: 'measure #probe', sequence: 'number:0', handler: 'number:0' },
  clear: { snippet: 'clear :count', sequence: 'null', handler: 'null' },
  repeat: { snippet: 'repeat 2 times log "i" end', sequence: 'undefined', handler: 'undefined' },
  tell: { snippet: 'tell #probe add .t', sequence: 'undefined', handler: 'undefined' },
  send: { snippet: 'send dataEvent to #probe', sequence: 'Event', handler: 'Event' },
  trigger: { snippet: 'trigger customEvent on #probe', sequence: 'Event', handler: 'Event' },

  // ---- void commands. Neither mechanism fires, so `it` keeps its INITIAL
  // value — `null` for a sequence, the DOM event inside a handler. That gap is
  // about context construction, not command output; it is a NON-GOAL of this
  // arc (see the brief) and these rows exist to keep it visible, not to fix it.
  add: { snippet: 'add .active to #probe', sequence: 'null', handler: 'Event' },
  remove: { snippet: 'remove .active from #probe', sequence: 'null', handler: 'Event' },
  toggle: {
    snippet: 'toggle .active on .item',
    sequence: 'null',
    handler: '<P>',
    defect:
      'ARRAY COLLAPSE (step 3). toggle returns HTMLElement[]; unwrapCommandResult collapses any ' +
      'array to val[0], so `it` is the FIRST of two matched elements. This violates the selector-shape ' +
      'rule Arc D pinned (`.cls` keeps the collection — see helpers/__tests__/target-elements.test.ts). ' +
      "Same shape as append's pre-#792 `.cls` no-op, seen from the propagation end.",
  },
  put: {
    snippet: 'put "Hello" into #probe',
    sequence: 'null',
    handler: '<DIV>',
    defect:
      'ARRAY COLLAPSE (step 3). put returns HTMLElement[]; same val[0] collapse as toggle. Note put ' +
      'ALSO self-assigns `it` to the inserted value, which the propagation then overwrites with the element.',
  },
  show: { snippet: 'show #probe', sequence: 'null', handler: 'Event' },
  hide: { snippet: 'hide #probe', sequence: 'null', handler: 'Event' },
  empty: { snippet: 'empty #probe', sequence: 'null', handler: 'Event' },
  focus: { snippet: 'focus #inp', sequence: 'null', handler: 'Event' },
  blur: { snippet: 'blur #inp', sequence: 'null', handler: 'Event' },
  select: { snippet: 'select #inp', sequence: 'null', handler: 'Event' },
  reset: { snippet: 'reset #frm', sequence: 'null', handler: 'Event' },
  open: { snippet: 'open #dlg', sequence: 'null', handler: 'Event' },
  close: { snippet: 'close #dlg', sequence: 'null', handler: 'Event' },
  morph: { snippet: 'morph #probe with "x"', sequence: 'null', handler: 'Event' },
  swap: { snippet: 'swap #probe with "x"', sequence: 'null', handler: 'Event' },
  if: { snippet: 'if true then log "y" end', sequence: 'null', handler: 'Event' },
  log: { snippet: 'log "Hello World"', sequence: 'null', handler: 'Event' },

  // ---- wrapper leaks: the propagation loop puts an internal wrapper object in
  // `it`. Nothing can usefully consume `{halted,timestamp}` or
  // `{url,title,mode}`. Fixed by step 3 (delete the loop).
  wait: {
    snippet: 'wait 1ms',
    sequence: 'null',
    handler: '{type,result,duration}',
    defect:
      'WRAPPER LEAK (step 3). WaitCommandOutput reaches `it`. wait ALSO self-assigns `it` to the ' +
      'received Event on its event branch — the propagation overwrites that.',
  },
  go: {
    snippet: 'go to #probe',
    sequence: 'null',
    handler: '{result,type}',
    defect: 'WRAPPER LEAK (step 3). GoCommandOutput reaches `it`.',
  },
  push: {
    snippet: 'push url "/page/2"',
    sequence: 'null',
    handler: '{url,title,mode}',
    defect: 'WRAPPER LEAK (step 3). HistoryCommandOutput reaches `it`.',
  },
  replace: {
    snippet: 'replace url "/search"',
    sequence: 'null',
    handler: '{url,title,mode}',
    defect: 'WRAPPER LEAK (step 3). Same implementation as `push` (aliased).',
  },
  scroll: {
    snippet: 'scroll to #probe',
    sequence: 'null',
    handler: '{element,position,smooth}',
    defect: 'WRAPPER LEAK (step 3). ScrollCommandOutput reaches `it`.',
  },
  copy: {
    snippet: 'copy "Hello World"',
    sequence: 'null',
    handler: '{success,text,format,method}',
    defect: 'WRAPPER LEAK (step 3). CopyCommandOutput reaches `it`.',
  },
  beep: {
    snippet: 'beep 42',
    sequence: 'null',
    handler: '{expressionCount,debugged,outputs}',
    defect: 'WRAPPER LEAK (step 3). BeepCommandOutput reaches `it`.',
  },
  start: {
    snippet: 'start view transition add .highlight to #probe end',
    sequence: 'null',
    handler: '{usedViewTransition,commandsExecuted}',
    defect: 'WRAPPER LEAK (step 3). StartViewTransitionOutput reaches `it`.',
  },
  transition: {
    snippet: 'transition opacity to 0.5',
    sequence: '<DIV>',
    handler: '{element,property,fromValue,toValue,duration,completed}',
    defect: 'WRAPPER LEAK (step 3). The sequence path already holds the element.',
  },

  // ---- the sharpest rows: the command ALREADY set `it` correctly, and the
  // propagation loop overwrote it with the wrapper. Mechanism 2 is not filling
  // a gap here; it is destroying a correct value.
  settle: {
    snippet: 'settle #probe',
    sequence: '<DIV>',
    handler: '{element,settled,timeout,duration}',
    defect:
      'OVERWRITES A CORRECT VALUE (step 3). settle self-assigns `it` to the element; the propagation ' +
      'loop replaces it with SettleCommandOutput. The sequence column is what both paths should read.',
  },
  pick: {
    snippet: 'pick first 1 of ["a","b"]',
    sequence: 'Array(1)',
    handler: '{selectedItem,sourceLength,sourceType,variant}',
    defect:
      'OVERWRITES A CORRECT VALUE (step 3). pick self-assigns the selection; the propagation loop ' +
      'replaces it with PickCommandOutput.',
  },
  render: {
    snippet: 'render #tpl',
    sequence: '<DIV>',
    handler: '{element,rendered,directivesProcessed}',
    defect:
      'OVERWRITES A CORRECT VALUE (step 3). render self-assigns the rendered element; the propagation ' +
      'loop replaces it with RenderCommandOutput.',
  },

  // ---- unless: fixed. This audit originally recorded an AST node in `it` on
  // BOTH paths; tracing it found the body never executed at all (parseInput
  // handed executeCommands an array holding the block NODE, whose fallthrough
  // returned it verbatim, and an unless-only self-assign put that node in
  // `it`). Fixed by routing unless through the same block path as `if` and
  // dropping the self-assign — so it now sits in the void/initial-value family
  // above, matching `if` exactly. Regression gate:
  // commands/control-flow/__tests__/unless.test.ts, the end-to-end describe.
  unless: {
    snippet: 'unless false then log "y" end',
    sequence: 'null',
    handler: 'Event',
  },
};

// ===========================================================================
// 1. The ratchet — every registered command is classified
// ===========================================================================

describe('audit coverage — derived from the registry, not from this file', () => {
  const registered = new Runtime().getRegistry().getCommandNames().sort();

  it('classifies every registered command, and classifies nothing else', () => {
    // Both directions on purpose. A NEW command must be given a row or a
    // documented skip — this is the gate that stops the command set from
    // growing past its own audit, the six-month rot the queue doc measured.
    // And a REMOVED command must lose its row, so this table cannot describe
    // commands that no longer exist.
    const classified = [...Object.keys(AUDIT), ...Object.keys(NOT_EXERCISED)].sort();
    expect(classified).toEqual(registered);
  });

  it('records a reason for every command it does not exercise', () => {
    for (const [name, reason] of Object.entries(NOT_EXERCISED)) {
      expect(reason.length, `${name} needs a real reason, not a placeholder`).toBeGreaterThan(20);
    }
  });

  it('exercises most of the command set (guards against skip-creep)', () => {
    // A migration that finds a row inconvenient must not be able to quietly
    // demote it to a skip; the skip budget makes that visible in the diff.
    expect(Object.keys(NOT_EXERCISED)).toHaveLength(14);
    expect(Object.keys(AUDIT).length).toBeGreaterThanOrEqual(45);
  });
});

// ===========================================================================
// 2. What `it` actually holds, on both execution paths
// ===========================================================================

describe('the `it` contract, per command, per execution path', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  for (const [name, row] of Object.entries(AUDIT)) {
    it(`${name}: ${row.defect ? 'DEFECT — ' + row.defect.split('.')[0] : 'ok'}`, async () => {
      expect(await itAfter(row.snippet, 'sequence'), `${name} — \`then\` sequence path`).toBe(
        row.sequence
      );
      expect(await itAfter(row.snippet, 'handler'), `${name} — event-handler path`).toBe(
        row.handler
      );
    });
  }

  it('the two paths disagree for 30 of the 45 exercised commands', () => {
    // The headline number, asserted so a migration cannot shrink it silently
    // — or grow it. Step 3 should drive this down; nothing else should move it.
    // (Was 29 at the audit's landing; the unless fix moved it to 30, because a
    // fixed unless behaves like if — null on the sequence path, the DOM event
    // in a handler — which is the initial-value divergence, the non-goal. The
    // broken unless "agreed" only because both paths held the same leaked AST
    // node.)
    const disagreeing = Object.entries(AUDIT).filter(([, r]) => r.sequence !== r.handler);
    expect(disagreeing).toHaveLength(30);
  });

  it('names every row whose recorded value is known-wrong', () => {
    // 14 defect rows: 2 array collapses (toggle, put), 9 wrapper leaks, and
    // 3 overwrites-a-correct-value (settle, pick, render). The void rows are
    // NOT counted (they are the initial-value non-goal, deliberately left
    // undecorated), and unless left this list when its fix landed.
    const defective = Object.entries(AUDIT).filter(([, r]) => r.defect);
    expect(defective.map(([n]) => n).sort()).toEqual(
      [
        'beep',
        'copy',
        'go',
        'pick',
        'push',
        'put',
        'render',
        'replace',
        'scroll',
        'settle',
        'start',
        'toggle',
        'transition',
        'wait',
      ].sort()
    );
  });
});

// ===========================================================================
// 3. The mechanism — which branch each output shape hits
// ===========================================================================

/**
 * Every command output interface, as a compiler-checked literal.
 *
 * The type annotations are load-bearing: they are what ties this catalog to the
 * real command code. Change `WaitCommandOutput` and this file stops compiling,
 * rather than silently cataloging a shape that no longer exists.
 *
 * Step 3 deletes `unwrapCommandResult`, and this section with it. Until then it
 * is the inventory of what the seven sniffing branches actually do.
 */
describe('unwrapCommandResult — the seven branches and what falls through', () => {
  describe('branches that match by design', () => {
    it('call → { result, wasAsync }', () => {
      const o: CallCommandOutput = { result: 'v', wasAsync: false, expressionType: 'value' };
      expect(unwrapCommandResult(o)).toBe('v');
    });

    it('js → { result, executed } (and preserveArrayResult skips the collapse)', () => {
      const o: JsCommandOutput = {
        result: [1, 2],
        executed: true,
        codeLength: 3,
        preserveArrayResult: true,
      };
      expect(unwrapCommandResult(o)).toEqual([1, 2]);
    });

    it('repeat → { type, lastResult }', () => {
      const o: RepeatCommandOutput = {
        type: 'times',
        iterations: 2,
        completed: true,
        lastResult: 'last',
      };
      expect(unwrapCommandResult(o)).toBe('last');
    });

    it('if/unless → { conditionResult, executedBranch }, skipping when no branch result', () => {
      const o: ConditionalCommandOutput = {
        mode: 'if',
        conditionResult: true,
        executedBranch: 'then',
        result: undefined,
      };
      expect(unwrapCommandResult(o)).toBeUndefined();
    });

    it('get → lone { value }', () => {
      const o: GetCommandOutput = { value: 42 };
      expect(unwrapCommandResult(o)).toBe(42);
    });

    it('set → { target, value, targetType }', () => {
      const o: SetCommandOutput = { target: 'x', value: 7, targetType: 'variable' };
      expect(unwrapCommandResult(o)).toBe(7);
    });

    it('append/prepend → the same envelope as set', () => {
      const o: InsertionCommandOutput = { target: 'x', value: 'AB', targetType: 'variable' };
      expect(unwrapCommandResult(o)).toBe('AB');
    });

    it('fetch → { data, status, headers }', () => {
      const o = {
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        data: { items: [] },
        url: '/x',
        duration: 1,
      } as unknown as FetchCommandOutput;
      expect(unwrapCommandResult(o)).toEqual({ items: [] });
    });
  });

  describe('accidental matches — right answer, wrong reason', () => {
    it('measure hits the CALL branch because it happens to have result+wasAsync', () => {
      const o: MeasureCommandOutput = {
        result: 3,
        wasAsync: false,
        element: document.createElement('div'),
        property: 'width',
        value: 3,
        unit: 'px',
      };
      // Yields the right number, but via a branch written for `call`. measure
      // also self-assigns, so deleting the branch is a no-op for it.
      expect(unwrapCommandResult(o)).toBe(3);
    });

    it('default hits the SET branch because it happens to have value+target+targetType', () => {
      const o: DefaultCommandOutput = {
        target: 'x',
        value: 9,
        wasSet: true,
        targetType: 'variable',
      };
      expect(unwrapCommandResult(o)).toBe(9);
    });
  });

  describe('a fall-through hiding inside a matched branch', () => {
    it('repeat with NO lastResult falls through with its whole wrapper', () => {
      // `lastResult` is optional, so `'lastResult' in obj` is false and the
      // branch does not fire. Not recorded in the queue doc; found by this audit.
      const o: RepeatCommandOutput = { type: 'times', iterations: 2, completed: true };
      expect(unwrapCommandResult(o)).toEqual({ type: 'times', iterations: 2, completed: true });
    });
  });

  describe('fall-throughs — the whole wrapper becomes `it`', () => {
    const el = () => document.createElement('div');

    // Each case asserts identity with its input: nothing was unwrapped.
    const cases: Array<[string, unknown]> = [
      ['wait', { type: 'time', result: 5, duration: 5 } satisfies WaitCommandOutput],
      ['halt', { halted: true, timestamp: 1 } satisfies HaltCommandOutput],
      ['go', { result: '/x', type: 'url' } satisfies GoCommandOutput],
      ['push-url/replace-url', { url: '/x', mode: 'push' } satisfies HistoryCommandOutput],
      ['scroll', { element: el(), position: 'start', smooth: false } satisfies ScrollCommandOutput],
      [
        'settle',
        { element: el(), settled: true, timeout: 1, duration: 1 } satisfies SettleCommandOutput,
      ],
      ['take', { targetElement: el(), property: 'p', value: 'v' } satisfies TakeCommandOutput],
      [
        'transition',
        {
          element: el(),
          property: 'opacity',
          fromValue: '1',
          toValue: '0',
          duration: 1,
          completed: true,
        } satisfies TransitionCommandOutput,
      ],
      [
        'start view transition',
        { usedViewTransition: false, commandsExecuted: 1 } satisfies StartViewTransitionOutput,
      ],
      [
        'pick',
        {
          selectedItem: 'a',
          sourceLength: 2,
          sourceType: 'array',
          variant: 'first',
        } as PickCommandOutput,
      ],
      [
        'copy',
        {
          success: true,
          text: 't',
          format: 'text',
          method: 'clipboard-api',
        } satisfies CopyCommandOutput,
      ],
      ['beep', { expressionCount: 1, debugged: true, outputs: [] } satisfies BeepCommandOutput],
      [
        'tell',
        { targetElements: [], commandResults: [], executionCount: 0 } satisfies TellCommandOutput,
      ],
      [
        'render',
        {
          element: el(),
          rendered: '<i></i>',
          directivesProcessed: [],
        } satisfies RenderCommandOutput,
      ],
      [
        'pseudo-command',
        { result: 'r', methodName: 'm', target: null } satisfies PseudoCommandOutput,
      ],
      ['break/continue/exit', { signalType: 'break', timestamp: 1 } as SignalCommandOutput],
      ['return', { returnValue: 1, timestamp: 1 } satisfies ReturnCommandOutput],
      ['throw', { error: new Error('x') } satisfies ThrowCommandOutput],
      [
        'install',
        {
          success: true,
          behaviorName: 'B',
          installedCount: 1,
          instances: [],
        } satisfies InstallCommandOutput,
      ],
      [
        'async',
        { commandCount: 1, results: [], executed: true, duration: 1 } satisfies AsyncCommandOutput,
      ],
      [
        'process partials',
        {
          count: 0,
          targets: [],
          errors: [],
          validationWarnings: [],
        } as ProcessPartialsResult,
      ],
    ];

    it.each(cases)('%s falls through unchanged', (_name, output) => {
      expect(unwrapCommandResult(output)).toBe(output);
    });

    it('covers 21 distinct fall-through output types', () => {
      // Matches the figure the queue doc re-verified. Independently derived
      // here by classifying every command's declared execute return type.
      expect(cases).toHaveLength(21);
    });
  });

  describe('the :121 array collapse', () => {
    it('collapses ANY array to its first element', () => {
      // What makes `toggle .a on .items` leave `it` as one element. Contrast
      // with the selector-shape rule Arc D pinned, where `.cls` keeps the
      // collection (helpers/__tests__/target-elements.test.ts). Step 3 decides
      // this policy; the recommendation in the brief is "no collapse".
      const a = document.createElement('p');
      const b = document.createElement('p');
      expect(unwrapCommandResult([a, b])).toBe(a);
    });

    it('leaves an EMPTY array alone', () => {
      expect(unwrapCommandResult([])).toEqual([]);
    });
  });
});
