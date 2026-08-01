/**
 * The command output contract — Arc C's audit
 *
 * Arc C of `docs-internal/COMMAND_ARCHITECTURE_NEXT_STEPS.md`; the brief is
 * `docs-internal/archive/HANDOFF-command-arch-output-contract.md`. Landed as step 1 (the
 * inventory) and ratcheted down by step 3 (the deletion).
 *
 * ## What it pins
 *
 * `it` is set by command **self-assignment**: `Object.assign(context, { it })`
 * inside the command's own `execute()`, copied back onto the real context by the
 * adapter (`runtime/command-adapter.ts`). That is now the ONLY mechanism, and it
 * runs on every execution path.
 *
 * It used to have a rival. `unwrapCommandResult` sniffed each command's RETURN
 * value through seven branches and ran in **event-handler bodies only** — never
 * in the `then`-joined sequence executor. So the same command could leave `it`
 * holding different things depending on how it was invoked. All seven branches
 * turned out to be redundant with self-assignment; what the loop uniquely
 * contributed was ~21 internal wrappers leaking into `it` and an array collapse
 * that took the first element of `toggle`/`put`'s element list. Step 3 deleted
 * it, and the four commands it had been actively corrupting (settle, pick,
 * render, transition) converged with no per-command change.
 *
 * Every row still records BOTH paths, because that is the property worth
 * guarding: the 26 remaining disagreements are all the initial-value non-goal
 * (`null` vs the DOM event for void commands), and a NEW disagreement of any
 * other kind means a second propagation mechanism has grown back.
 *
 * When a change moves a row, the row FLIPS — that diff is the review artifact,
 * and is why this is an explicit table rather than a snapshot file (a snapshot
 * gets re-blessed on first failure; a hand-edited row does not).
 *
 * Do NOT "fix" a failing row by editing the expectation unless you are the
 * change that deliberately moved it.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';
import { Runtime } from '../runtime';

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
 * is exactly what a wrapper leak used to look like.
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
  'pseudo-command': 'no top-level form parses: `getAttribute("id") the #probe` fails to compile',
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
  // toggle and put return HTMLElement[]. The deleted propagation collapsed any
  // array to val[0], so `it` was the FIRST of two matched elements — violating
  // the selector-shape rule Arc D pinned (`.cls` keeps the collection). Upstream
  // sets no result for either, so they now behave exactly like the other void
  // rows. put self-assigns only on its VARIABLE path (`put x into y`), not here.
  toggle: { snippet: 'toggle .active on .item', sequence: 'null', handler: 'Event' },
  put: { snippet: 'put "Hello" into #probe', sequence: 'null', handler: 'Event' },
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

  // ---- formerly wrapper leaks. The propagation loop put an internal wrapper
  // object in `it` (`{halted,timestamp}`, `{url,title,mode}`, …) — values
  // nothing could usefully consume. Upstream sets no result for any of these,
  // so with the loop gone they leave `it` at its initial value, matching the
  // void family above and matching their own sequence-path behaviour.
  wait: { snippet: 'wait 1ms', sequence: 'null', handler: 'Event' },
  go: { snippet: 'go to #probe', sequence: 'null', handler: 'Event' },
  push: { snippet: 'push url "/page/2"', sequence: 'null', handler: 'Event' },
  replace: { snippet: 'replace url "/search"', sequence: 'null', handler: 'Event' },
  scroll: { snippet: 'scroll to #probe', sequence: 'null', handler: 'Event' },
  copy: { snippet: 'copy "Hello World"', sequence: 'null', handler: 'Event' },
  beep: { snippet: 'beep 42', sequence: 'null', handler: 'Event' },
  start: {
    snippet: 'start view transition add .highlight to #probe end',
    sequence: 'null',
    handler: 'Event',
  },

  // ---- the rows that prove the point: each command had ALREADY assigned `it`
  // correctly, and the propagation loop overwrote it with the wrapper. Deleting
  // the loop made both paths agree on the value the command itself chose.
  // These two stay self-assigning because UPSTREAM sets `result` for them —
  // the rule is "a command sets `it` iff upstream sets `result`".
  pick: { snippet: 'pick first 1 of ["a","b"]', sequence: 'Array(1)', handler: 'Array(1)' },
  render: { snippet: 'render #tpl', sequence: '<DIV>', handler: '<DIV>' },

  // ---- settle and transition joined the void family in the Arc C close-out:
  // they used to self-assign the target element, but upstream sets NO result
  // for either, making that a silent divergence (hyperfixi-only chains like
  // `settle #x then … it` would break on the canonical engine). The self-assigns
  // were removed while the both-paths-agree state was still unreleased — the
  // only moment the removal was free. The element still surfaces on each
  // command's output, and was explicitly named one clause earlier anyway.
  settle: { snippet: 'settle #probe', sequence: 'null', handler: 'Event' },
  transition: { snippet: 'transition opacity to 0.5', sequence: 'null', handler: 'Event' },

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

  // ---- two rows promoted out of NOT_EXERCISED once the parse defects that had
  // kept them unrunnable were fixed. Both skips described a PARSE failure, and
  // both parse now: `take` since #859, `process` since the COMPOUND_COMMANDS
  // dispatch fix. A skip whose stated reason has been repaired is a stale skip.
  //
  // process self-assigns its ProcessPartialsResult, so both paths agree.
  process: {
    snippet: `set h to "<hx-partial target='#probe'>x</hx-partial>" then process partials in h`,
    sequence: '{count,targets,errors,validationWarnings,validationDetails}',
    handler: '{count,targets,errors,validationWarnings,validationDetails}',
  },
  // take sets no result (upstream sets none either), so it lands in the
  // initial-value family with add/remove/toggle — null vs the DOM event.
  take: { snippet: 'take .item from <.item/> for #probe', sequence: 'null', handler: 'Event' },
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
    // 14 → 12: `take` and `process` were both skipped for a PARSE failure, and
    // both parse now (#859 and the COMPOUND_COMMANDS dispatch fix). The budget
    // only ever ratchets down.
    expect(Object.keys(NOT_EXERCISED)).toHaveLength(12);
    expect(Object.keys(AUDIT).length).toBeGreaterThanOrEqual(47);
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

  it('the two paths disagree for 29 of the 47 exercised commands', () => {
    // The headline number, asserted so a change cannot move it silently.
    //
    // 29 when the audit landed → 30 after the unless fix → 26 after step 3
    // deleted the propagation loop → 28 after the close-out removed
    // settle/transition's self-assigns (upstream parity), moving them into the
    // initial-value family below → **29** when `take` became runnable and
    // joined that same family (`process`, promoted alongside it, self-assigns
    // and so agrees on both paths).
    //
    // The 29 are ALL the initial-value divergence, which is this arc's
    // declared non-goal: nothing sets `it` for these commands, so it keeps
    // what the context was built with — `null` for a sequence, the DOM event
    // inside a handler (runtime-base.ts). Closing that gap is a
    // context-construction question, not a command-output one. Nothing here
    // is a wrapper leak; a NEW disagreement of any other kind means a second
    // propagation mechanism has grown back.
    const disagreeing = Object.entries(AUDIT).filter(([, r]) => r.sequence !== r.handler);
    expect(disagreeing).toHaveLength(29);
  });

  it('has no known-wrong rows left', () => {
    // Step 3 emptied this list. It stays as a ratchet: a future change that
    // knowingly records a bad value has to add a `defect:` string, and that
    // makes this test fail loudly rather than the value slipping in silently.
    const defective = Object.entries(AUDIT).filter(([, r]) => r.defect);
    expect(defective.map(([n]) => n)).toEqual([]);
  });
});
