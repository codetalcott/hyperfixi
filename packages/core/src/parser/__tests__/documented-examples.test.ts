/**
 * Documented-example validity — every `metadata.examples` string must parse
 *
 * 205 example strings ship in this repo's docs, the MCP server's
 * `get_command_docs`, and LSP hover. Nothing asserted that any of them parse.
 * 19 did not, and had not for at least a year.
 *
 * ## What this gate sees
 *
 * It asserts an example parses CLEANLY — no diagnostics — bare AND wrapped in a
 * handler, which is the shape a user actually writes. `ok: true` is not
 * evidence of comprehension: `on click qqqq` returns `success: true` with an
 * EMPTY command list, and `log "a" ####` returns an AST with the tail thrown
 * away. A gate keyed on `ok` alone passes every one of those.
 *
 * **Both halves of that had to land before this gate could read `errors`.**
 * #1026 gave the parser a channel to report what it discards — and only from
 * inside a handler body, which is why the wrapped parse is a REQUIREMENT here
 * and not merely a fallback. Reading the channel then had to wait for the
 * `if`-without-`end` false positive: `if x > 5 then add .active` parses exactly
 * right and reported "Expected 'end' after if block" anyway, on NINE of these
 * examples, which would have swamped the signal. Upstream requires `end` only
 * when `parser.hasMore()`; hyperfixi now does the same.
 *
 * So the two blind spots this docblock used to confess are closed, and both
 * closures are mutation-tested rather than assumed:
 *
 * - **A dropped TAIL.** `on click render x with (a: 1)` → `lossy`.
 * - **A silent MISPARSE.** `on click repeat 3 times { log "x" }` → `lossy`.
 *
 * The allowlist did NOT collapse when the gate was strengthened, as this
 * docblock once predicted — it GREW, from 19 rows to 30, and is now at 27.
 * That is what strengthening a gate blind to an entire band does first: eleven
 * examples that had read as fine for years were losing content in silence.
 * Eight are docs defects (upstream rejects them too) and three were parser gaps
 * (upstream accepts); every entry records which, with the verdict measured on
 * the real hyperscript.org engine rather than guessed. **All three of the
 * parser gaps have since dropped off the list** — `transition left to 100px
 * over 500ms`, which was animating to a UNITLESS length; `scroll to me
 * smoothly`, whose dropped adverb turned out to be the MILD half of a defect
 * that also killed every `scroll to <pos> of <target>` form outright; and
 * `make a URL from "/path/", "…"`, which was dropping constructor arguments in
 * the parser AND unable to use a resolved constructor in the runtime. What
 * remains on the list is docs defects and legal-only-inside-a-feature rows.
 * That is the ratchet doing what it is for.
 *
 * ## The allowlist ratchets both ways
 *
 * A new failure fails the gate. An entry that starts parsing must be REMOVED —
 * otherwise the list becomes a graveyard that never shrinks.
 */

import { describe, it, expect } from 'vitest';
import { commandExamples } from './engine-corpus';
import { hyperscript } from '../../api/hyperscript-api';

type Status = 'ok-bare' | 'ok-wrapped' | 'empty-body' | 'lossy' | 'no-parse';

interface Allowed {
  readonly command: string;
  readonly source: string;
  readonly status: Exclude<Status, 'ok-bare'>;
  readonly reason: string;
}

/**
 * Every example that does not parse bare today, with WHY.
 *
 * `ok-wrapped` — parses inside `on click …`. For `pseudo-command` that is
 * correct and permanent (the construct is only legal inside a feature, and the
 * canonical engine agrees). For the rest it means the bare form is broken and
 * the wrapped form may still be wrong; see the per-entry reason.
 */
const ALLOWED: readonly Allowed[] = [
  // --- genuinely fine: the construct is only legal inside a feature ---------
  // The canonical 0.9.93 engine agrees on all four: it rejects them bare and
  // accepts them wrapped. The EXAMPLES are what is misleading, not the parser.
  {
    command: 'pseudo-command',
    source: 'getElementById("d1") from the document',
    status: 'ok-wrapped',
    reason: 'pseudo-commands are only legal inside a feature; canonical engine agrees',
  },
  {
    command: 'pseudo-command',
    source: 'reload() the location of the window',
    status: 'lossy',
    reason: 'pseudo-commands are only legal inside a feature; canonical engine agrees',
  },
  {
    command: 'pseudo-command',
    source: 'setAttribute("foo", "bar") on me',
    status: 'ok-wrapped',
    reason: 'pseudo-commands are only legal inside a feature; canonical engine agrees',
  },
  {
    command: 'pseudo-command',
    source: 'foo() on me',
    status: 'ok-wrapped',
    reason: 'pseudo-commands are only legal inside a feature; canonical engine agrees',
  },

  // --- docs defect: brace blocks are not hyperscript ------------------------
  // MEASURED WRONG, not merely unparseable: wrapped, `repeat 3 times { log "x" }`
  // runs the body ONCE, and `repeat for item in [1,2] { log item }` logs one
  // empty string. `repeat … end` is the real form and works. All five of
  // repeatSchema's `syntax` lines use braces too, so the fix is docs-wide.
  {
    command: 'repeat',
    source: 'repeat for item in items { log item }',
    status: 'lossy',
    reason: 'brace block is not hyperscript; wrapped it MISPARSES (logs one empty value)',
  },
  {
    command: 'repeat',
    source: 'repeat 5 times { log "hello" }',
    status: 'lossy',
    reason: 'brace block is not hyperscript; wrapped it MISPARSES (runs once, not 5×)',
  },
  {
    command: 'break',
    source: 'repeat for item in items { if item == target then break }',
    status: 'lossy',
    reason: 'embeds a brace-block repeat; same misparse as the repeat rows',
  },
  {
    command: 'continue',
    source: 'repeat for item in items { if item.skip then continue; process item }',
    status: 'lossy',
    reason: 'embeds a brace-block repeat; same misparse as the repeat rows',
  },

  // --- docs defect: the example names something that is not a command -------
  {
    command: 'if',
    source: 'unless user.isLoggedIn showLoginForm',
    status: 'lossy',
    reason: '`showLoginForm` is not a command — `unless x log "y"` parses fine',
  },
  {
    command: 'unless',
    source: 'unless user.isLoggedIn showLoginForm',
    status: 'lossy',
    reason: '`showLoginForm` is not a command — `unless x log "y"` parses fine',
  },
  {
    command: 'tell',
    source: 'tell closest <form/> submit',
    status: 'lossy',
    reason: '`submit` is not a command; canonical engine wants `submit()`',
  },

  // --- declared in `syntax` but unimplemented -------------------------------
  {
    command: 'render',
    source: 'render myTemplate with (name: "Alice")',
    status: 'lossy',
    reason: 'paren named-args unimplemented; `with {name: "Alice"}` works. Tail silently dropped',
  },
  {
    command: 'render',
    source: 'render "<template>Hello ${name}!</template>" with (name: "World")',
    status: 'lossy',
    reason: 'paren named-args unimplemented; tail silently dropped',
  },
  {
    command: 'render',
    source: 'render template with (items: data)',
    status: 'lossy',
    reason: 'paren named-args unimplemented; tail silently dropped',
  },
  {
    command: 'take',
    source: 'take @data-value from <.source/> and put it on <#target/>',
    status: 'no-parse',
    reason: '`and put it on <target>` is declared in syntax but unimplemented',
  },

  // --- docs defect: `install` has no `on <target>` clause -------------------
  // Filed as a "real parser bug" until it was measured against the engine
  // (2026-08-31). Upstream's `install` is a FEATURE whose whole grammar is
  // `install <behavior-path> [(args…)]` — there is no on-target at all, and it
  // rejects `install X on #box` / `on .list` / `on <#box/>` with "Expected
  // event name", the same complaint hyperfixi makes.
  //
  // The inversion worth remembering: the two forms that "parse" are the BROKEN
  // ones. `install Draggable on me` returns ok:true with ZERO diagnostics and
  // yields two statements — the install (on the current element, not on `me`)
  // plus a phantom `eventHandler` for an event literally named `me`, with an
  // empty body. `on the first <div/>` yields a handler for an event named
  // `the`. Only `on #box` fails, because `#box` cannot be an event name — so
  // the one row that errors is the honest one. See PARSER_NEXT_STEPS.md, "A
  // trailing `on <target>` splits into a phantom event handler".
  {
    command: 'install',
    source: 'install Draggable on #box',
    status: 'no-parse',
    reason: 'docs defect: upstream `install` has no `on <target>` clause and rejects this too',
  },
  {
    command: 'install',
    source: 'install Sortable(axis: "y") on .list',
    status: 'no-parse',
    reason: 'docs defect: upstream `install` has no `on <target>` clause and rejects this too',
  },

  // --- start ----------------------------------------------------------------
  {
    command: 'start',
    source: 'start view transition using "slide" then put result into #panel end',
    status: 'lossy',
    reason: 'bare form rejects the `then` after the `using` clause; wrapped it parses',
  },

  // --- newly VISIBLE, not newly broken -------------------------------------
  // Everything below reads `ok: true` and was invisible until this gate started
  // reading `errors`. Each carries the verdict of the real hyperscript.org
  // engine, which is what decides whose defect it is: upstream REJECTING means
  // the example is wrong, upstream ACCEPTING means the parser is.

  // Upstream rejects these too — the EXAMPLES are wrong, not the parser. Note
  // hyperfixi and upstream even complain about the same token: "Expected event
  // name after 'on'" vs upstream's "Expected event name". So the convergence
  // brief's guess that rows 45/82 (`blur on <input/>`) are "a third defect
  // belonging to neither path's design" is only half right — as a DOCUMENTED
  // EXAMPLE this is a docs defect. What shape the two paths give it when it
  // does parse is a separate question, still open.
  {
    command: 'blur',
    source: 'blur on <input/>',
    status: 'no-parse',
    reason:
      'docs defect: upstream rejects it too (\"Expected event name\"). Since Arc 3 step 4 the declared grammar stops a command\'s arguments at `on`, so this fails to parse instead of swallowing `<input/>` (and, at the end of a handler body, the NEXT handler) as an argument',
  },
  {
    command: 'focus',
    source: 'focus on <input/>',
    status: 'no-parse',
    reason:
      'docs defect: upstream rejects it too (\"Expected event name\"). Since Arc 3 step 4 the declared grammar stops a command\'s arguments at `on`, so this fails to parse instead of swallowing `<input/>` (and, at the end of a handler body, the NEXT handler) as an argument',
  },

  // Space-separated argument lists. Upstream rejects them ("Unexpected
  // Token : <second arg>") — its `log` wants commas — so these are docs
  // defects, and the parser quietly keeping only the first argument is how
  // they read as fine for years. (The three `async` rows that sat here left
  // with the command in Arc 6b.)
  {
    command: 'log',
    source: 'log x y z',
    status: 'lossy',
    reason: 'docs defect: upstream rejects; `log a, b, c` is the real form, `y z` is discarded',
  },
  {
    command: 'log',
    source: 'log "Result:" result',
    status: 'lossy',
    reason: 'docs defect: upstream rejects; needs a comma, `result` is discarded',
  },
] as const;

// ===========================================================================
// Helpers
// ===========================================================================

interface Attempt {
  /** The AST, when the parse produced one at all. */
  readonly ast?: Record<string, unknown>;
  /** No diagnostics — the parser placed every token it was given. */
  readonly clean: boolean;
}

function tryParse(source: string): Attempt {
  // Both configurations, because an example is "documented as working" if
  // EITHER path accepts it — the gate is about the docs, not about convergence.
  // The best of the two wins: a clean parse beats a lossy one beats none.
  let best: Attempt = { clean: false };
  for (const traditional of [true, false]) {
    try {
      const r = hyperscript.compileSync(source, { traditional } as never) as {
        ok: boolean;
        ast?: Record<string, unknown>;
        errors?: Array<{ message: string }>;
      };
      if (!r.ok || !r.ast) continue;
      const clean = (r.errors ?? []).length === 0;
      if (clean) return { ast: r.ast, clean };
      if (!best.ast) best = { ast: r.ast, clean };
    } catch {
      /* try the other path */
    }
  }
  return best;
}

function classify(source: string): Status {
  const bare = tryParse(source);

  // The wrapped parse is not just a FALLBACK any more, it is a second
  // REQUIREMENT — because the parser reports the input it discards only from
  // inside a handler body (#1026 wired those five sites and no others). Bare,
  // `log "a" ####` comes back clean with the tail silently gone; wrapped, it
  // says so. A gate that stops at the bare parse therefore cannot see the very
  // class it was strengthened to see. (The same hole, measured the same way,
  // was closed in `compound-command-coverage.test.ts` the same week.)
  //
  // A source whose bare parse is ALREADY a feature cannot be wrapped in another
  // handler — `on click on click breakpoint` is not a stronger test, it is a
  // different source. Derived from the parse rather than from a keyword list;
  // exactly 3 of the 205 examples take this branch.
  const isFeature = bare.ast?.type === 'eventHandler';
  const wrapped = isFeature ? bare : tryParse(`on click ${source}`);

  if (bare.ast && bare.clean && wrapped.ast && wrapped.clean) return 'ok-bare';

  if (wrapped.ast && wrapped.clean) {
    // `empty-body` is measured UNREACHABLE today and kept deliberately. Since
    // #1026 a wrapped parse that yields no commands always reports the body it
    // discarded ("Not a command, and the rest of the handler body was
    // discarded: 'qqqq'"), so every such source is caught by `lossy` above.
    // The branch remains the right answer if a silently-empty handler body ever
    // reappears — which is precisely the regression #1026 exists to prevent.
    const commands = wrapped.ast.commands as unknown[] | undefined;
    return (commands?.length ?? -1) === 0 ? 'empty-body' : 'ok-wrapped';
  }

  // Parses in at least one shape, but not cleanly in every shape it should:
  // either the parser reported input it could not place, or the handler-wrapped
  // form — the shape a user actually writes — does not parse at all.
  //
  // Before #1026 the parser had no channel to report a discard, so this whole
  // band was indistinguishable from a clean parse and these rows read as
  // `ok-bare` / `ok-wrapped`. It is where the two blind spots this gate's
  // docblock named actually live: a dropped TAIL (`render x with (a: 1)` → the
  // `with (…)` is gone) and a silent MISPARSE (`repeat 3 times { … }` → the body
  // runs once). Kept as its own status rather than folded into `no-parse`,
  // because "rejects it" and "accepts it and throws half of it away" are
  // different defects and the STATUS row pins the mode; each entry's `reason`
  // says which, with the upstream verdict that decides whose defect it is.
  if (bare.ast || wrapped.ast) return 'lossy';
  return 'no-parse';
}

const key = (command: string, source: string) => `${command}|${source}`;
const allowedBy = new Map(ALLOWED.map(a => [key(a.command, a.source), a]));

// ===========================================================================
// Tests
// ===========================================================================

describe('documented examples parse', () => {
  const examples = commandExamples();

  it('the example corpus has not silently shrunk', () => {
    // A gate whose denominator can fall is a gate that can be satisfied by
    // deleting the failing examples. 205 at the time of writing.
    expect(examples.length).toBeGreaterThanOrEqual(205);
  });

  it('every documented example parses, except the allowlist', () => {
    const unexpected = examples
      .map(e => ({ ...e, status: classify(e.source) }))
      .filter(e => e.status !== 'ok-bare' && !allowedBy.has(key(e.command, e.source)))
      .map(e => `${e.command}: ${e.status}: ${e.source}`);

    expect(
      unexpected,
      'a documented example stopped parsing (or a new one was added that does not parse). ' +
        'These strings ship in docs, MCP get_command_docs and LSP hover.'
    ).toEqual([]);
  });

  it('has no stale allowlist entries — a fixed example must be removed', () => {
    // The ratchet. Without this the list is a graveyard.
    const stale = ALLOWED.filter(a => classify(a.source) === 'ok-bare').map(
      a => `${a.command}: ${a.source}`
    );
    expect(stale, 'these now parse bare — delete them from ALLOWED').toEqual([]);
  });

  it('records the right STATUS for each allowlisted example', () => {
    // Pins the failure MODE, not just the failure. An entry sliding from
    // `ok-wrapped` to `empty-body` is a regression the row above would miss.
    const drifted = ALLOWED.filter(a => classify(a.source) !== a.status).map(
      a => `${a.command}: recorded ${a.status}, measured ${classify(a.source)}: ${a.source}`
    );
    expect(drifted, 'an allowlisted example changed failure mode').toEqual([]);
  });

  it('the classifier actually detects breakage, including a dropped tail', () => {
    // Guard on the guard. Without this the gate could be green because
    // `classify` never returns anything but `ok-bare`.
    expect(classify('qqqq wwww'), 'unknown command should not parse').toBe('no-parse');
    expect(classify('log "ok"'), 'a good example').toBe('ok-bare');
    // `unless x showLoginForm` now reaches `lossy` rather than `empty-body`:
    // the parse reports `Command 'unless' failed to parse and was discarded`,
    // which is strictly more information than an empty body.
    expect(classify('unless x showLoginForm'), 'non-command body').toBe('lossy');

    // THE BLIND SPOT THIS GATE USED TO HAVE, now closed and pinned from the
    // other side. `log }}} broken {{{` parses to a `log` with the rest
    // discarded; while `classify` read only `ok` it came back `ok-bare`, so
    // adding a garbage example to a real command did NOT redden this gate —
    // verified by mutation then, and asserted here now.
    //
    // The two halves landed separately. #1026 gave the parser a channel to
    // report what it discards; READING that channel had to wait for the
    // `if`-without-`end` false positive, which put `Expected 'end' after if
    // block` on NINE correct examples (`if x > 5 then add .active` among them)
    // and would have swamped the signal. Upstream requires `end` only when
    // `parser.hasMore()`; hyperfixi now does the same, and this row reads the
    // channel.
    expect(classify('log "a" ####'), 'the tail is discarded, and the gate can finally see it').toBe(
      'lossy'
    );
  });

  it('every allowlist entry names a real example and gives a reason', () => {
    // Guards the guard: a typo'd allowlist entry would silently excuse nothing
    // while hiding a real failure behind a passing count.
    const live = new Set(examples.map(e => key(e.command, e.source)));
    const orphans = ALLOWED.filter(a => !live.has(key(a.command, a.source))).map(
      a => `${a.command}: ${a.source}`
    );
    expect(orphans, 'allowlist entry matches no registered example — stale or typo'.trim()).toEqual(
      []
    );
    expect(ALLOWED.filter(a => !a.reason.trim()).map(a => a.command)).toEqual([]);
  });
});
