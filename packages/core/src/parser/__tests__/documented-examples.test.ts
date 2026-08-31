/**
 * Documented-example validity — every `metadata.examples` string must parse
 *
 * 205 example strings ship in this repo's docs, the MCP server's
 * `get_command_docs`, and LSP hover. Nothing asserted that any of them parse.
 * 19 did not, and had not for at least a year.
 *
 * ## What this gate can and cannot see
 *
 * It asserts an example PARSES — bare, or wrapped in a handler for constructs
 * that are only legal inside a feature. It deliberately also asserts the
 * wrapped parse yields a NON-EMPTY body, because `ok: true` is not evidence of
 * comprehension here: `on click qqqq` returns `success: true`, `recovered:
 * undefined`, zero errors and an EMPTY command list. A gate keyed on `ok`
 * alone would pass every one of those.
 *
 * It still cannot see two things, both filed in `PARSER_NEXT_STEPS.md` under
 * "a dropped handler body is silently discarded":
 *
 * - **A dropped TAIL.** `on click render x with (a: 1)` parses to a `render`
 *   with the `with (…)` silently gone. Body non-empty, gate green.
 * - **A silent MISPARSE.** `on click repeat 3 times { log "x" }` parses and
 *   runs the body ONCE instead of three times. Body non-empty, gate green.
 *
 * Both need the parser to record that it discarded input, which it currently
 * does not. When it does, this gate should assert `recovered === false` and the
 * allowlist below collapses to the genuine feature gaps.
 *
 * ## The allowlist ratchets both ways
 *
 * A new failure fails the gate. An entry that starts parsing must be REMOVED —
 * otherwise the list becomes a graveyard that never shrinks.
 */

import { describe, it, expect } from 'vitest';
import { commandExamples } from './engine-corpus';
import { hyperscript } from '../../api/hyperscript-api';

type Status = 'ok-bare' | 'ok-wrapped' | 'empty-body' | 'no-parse';

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
    status: 'ok-wrapped',
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
    status: 'ok-wrapped',
    reason: 'brace block is not hyperscript; wrapped it MISPARSES (logs one empty value)',
  },
  {
    command: 'repeat',
    source: 'repeat 5 times { log "hello" }',
    status: 'ok-wrapped',
    reason: 'brace block is not hyperscript; wrapped it MISPARSES (runs once, not 5×)',
  },
  {
    command: 'break',
    source: 'repeat for item in items { if item == target then break }',
    status: 'ok-wrapped',
    reason: 'embeds a brace-block repeat; same misparse as the repeat rows',
  },
  {
    command: 'continue',
    source: 'repeat for item in items { if item.skip then continue; process item }',
    status: 'ok-wrapped',
    reason: 'embeds a brace-block repeat; same misparse as the repeat rows',
  },

  // --- docs defect: the example names something that is not a command -------
  {
    command: 'if',
    source: 'unless user.isLoggedIn showLoginForm',
    status: 'empty-body',
    reason: '`showLoginForm` is not a command — `unless x log "y"` parses fine',
  },
  {
    command: 'unless',
    source: 'unless user.isLoggedIn showLoginForm',
    status: 'empty-body',
    reason: '`showLoginForm` is not a command — `unless x log "y"` parses fine',
  },
  {
    command: 'tell',
    source: 'tell closest <form/> submit',
    status: 'empty-body',
    reason: '`submit` is not a command; canonical engine wants `submit()`',
  },

  // --- declared in `syntax` but unimplemented -------------------------------
  {
    command: 'render',
    source: 'render myTemplate with (name: "Alice")',
    status: 'ok-wrapped',
    reason: 'paren named-args unimplemented; `with {name: "Alice"}` works. Tail silently dropped',
  },
  {
    command: 'render',
    source: 'render "<template>Hello ${name}!</template>" with (name: "World")',
    status: 'ok-wrapped',
    reason: 'paren named-args unimplemented; tail silently dropped',
  },
  {
    command: 'render',
    source: 'render template with (items: data)',
    status: 'ok-wrapped',
    reason: 'paren named-args unimplemented; tail silently dropped',
  },
  {
    command: 'settle',
    source: 'settle for 3000',
    status: 'ok-wrapped',
    reason: '`settle [for <timeout>]` is declared in syntax but unimplemented; tail dropped',
  },
  {
    command: 'take',
    source: 'take @data-value from <.source/> and put it on <#target/>',
    status: 'no-parse',
    reason: '`and put it on <target>` is declared in syntax but unimplemented',
  },

  // --- real parser bug ------------------------------------------------------
  // `install X on me` and `install X on the first <div/>` BOTH parse; only a
  // plain selector target fails — which is the form a user is most likely to
  // write, and the one the command's own syntax line shows.
  {
    command: 'install',
    source: 'install Draggable on #box',
    status: 'no-parse',
    reason:
      'parser bug: `install X on <selector>` fails while `on me` / `on the first <div/>` parse',
  },
  {
    command: 'install',
    source: 'install Sortable(axis: "y") on .list',
    status: 'no-parse',
    reason:
      'parser bug: `install X on <selector>` fails while `on me` / `on the first <div/>` parse',
  },

  // --- start ----------------------------------------------------------------
  {
    command: 'start',
    source: 'start view transition using "slide" then put result into #panel end',
    status: 'ok-wrapped',
    reason: 'bare form rejects the `then` after the `using` clause; wrapped it parses',
  },
] as const;

// ===========================================================================
// Helpers
// ===========================================================================

function tryParse(source: string): Record<string, unknown> | undefined {
  // Both configurations, because an example is "documented as working" if
  // EITHER path accepts it — the gate is about the docs, not about convergence.
  for (const traditional of [true, false]) {
    try {
      const r = hyperscript.compileSync(source, { traditional } as never) as {
        ok: boolean;
        ast?: Record<string, unknown>;
      };
      if (r.ok && r.ast) return r.ast;
    } catch {
      /* try the other path */
    }
  }
  return undefined;
}

function classify(source: string): Status {
  if (tryParse(source)) return 'ok-bare';
  const wrapped = tryParse(`on click ${source}`);
  if (!wrapped) return 'no-parse';
  const commands = (wrapped.commands as unknown[] | undefined)?.length ?? -1;
  return commands === 0 ? 'empty-body' : 'ok-wrapped';
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

  it('the classifier actually detects breakage — and pins what it CANNOT see', () => {
    // Guard on the guard. Without this the gate could be green because
    // `classify` never returns anything but `ok-bare`.
    expect(classify('qqqq wwww'), 'unknown command should not parse').toBe('no-parse');
    expect(classify('unless x showLoginForm'), 'non-command body').toBe('empty-body');
    expect(classify('log "ok"'), 'a good example').toBe('ok-bare');

    // THE BLIND SPOT, pinned deliberately so nobody reads this gate as
    // stronger than it is. The parser silently discards tokens it cannot
    // place, so a mangled TAIL still classifies clean: `log }}} broken {{{`
    // parses to `log` with args `[identifier "}"]` and the rest gone. Adding a
    // garbage example to a real command does NOT redden this gate — verified
    // by mutation, not assumed.
    //
    // When the parser learns to record that it dropped input (filed in
    // PARSER_NEXT_STEPS.md), THIS assertion is what should fail, and it is the
    // signal to strengthen the gate and shrink ALLOWED.
    expect(
      classify('log "a" ####'),
      'if this is no longer ok-bare, the parser now reports dropped input — strengthen this gate'
    ).toBe('ok-bare');
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
