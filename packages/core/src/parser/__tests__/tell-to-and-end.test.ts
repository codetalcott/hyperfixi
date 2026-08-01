/**
 * `tell` — the two ungated defects from PARSER_NEXT_STEPS.md, fixed together.
 *
 * 1. **`tell <target> to <command>` dropped the `tell` wrapper, silently.**
 *    Upstream REJECTS the `to` form loudly (`Expected 'end' but found 'to'`),
 *    but hyperfixi's handler bodies route command parses through
 *    parseCommandWithErrorRecovery, which swallows the throw and lets the
 *    stranded body re-parse as top-level commands — so `on click tell #modal
 *    to show` parsed with success:true, 0 errors, no tell node, and `show` ran
 *    against the handler's `me` instead of #modal. The bare form failed
 *    loudly, which made the defect read as harmless when probed casually.
 *    parseTellCommand now consumes an optional `to` after the target — a
 *    deliberate superset of upstream grammar (pick's legacy forms precedent),
 *    because it is the only fix the recovery machinery cannot silently un-fix.
 *
 * 2. **`tell` never consumed its `end` terminator.** Breaking on `end` left it
 *    in the stream for whatever enclosed the tell. At handler level that was
 *    absorbed harmlessly; inside a block it mis-attributed everything after
 *    it: `if true tell #modal show end log "x" end` gave the leftover `end`
 *    to the IF, so `log` escaped the conditional and ran unconditionally
 *    (upstream closes only the tell with it and keeps `log` inside; same
 *    shape with `repeat`, where the trailing command ran once instead of
 *    per-iteration). Both nested rows below were measured diverging on main
 *    and VALID upstream. tell now consumes a directly-following `end`,
 *    matching upstream's `requireToken("end")`.
 *
 * All trees below are asserted structurally (who owns which command), because
 * `success: true` is not evidence of a command — that is the trap that hid
 * defect 1 in three engines running.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '../parser';
import { hyperscript } from '../../api/hyperscript-api';

type Tree = { name: string; children: Tree[] };

/** Nested command shape: name plus the commands INSIDE it (args/branches). */
function commandTree(node: unknown): Tree[] {
  const out: Tree[] = [];
  const walk = (n: unknown, into: Tree[]): void => {
    if (!n || typeof n !== 'object') return;
    const rec = n as Record<string, any>;
    if (rec.type === 'command' && typeof rec.name === 'string') {
      const self: Tree = { name: rec.name, children: [] };
      into.push(self);
      for (const k of ['args', 'commands', 'body', 'thenBranch', 'elseBranch']) {
        const c = rec[k];
        if (Array.isArray(c)) c.forEach(x => walk(x, self.children));
        else if (c && typeof c === 'object') walk(c, self.children);
      }
      return;
    }
    for (const k of ['args', 'commands', 'body', 'thenBranch', 'elseBranch', 'handler']) {
      const c = rec[k];
      if (Array.isArray(c)) c.forEach(x => walk(x, into));
      else if (c && typeof c === 'object') walk(c, into);
    }
  };
  walk(node, out);
  return out;
}

/** Flatten to `parent>child` strings for compact assertions. */
function shape(trees: Tree[], prefix = ''): string[] {
  return trees.flatMap(t => [prefix + t.name, ...shape(t.children, prefix + t.name + '>')]);
}

function shapeOf(src: string): { shape: string[]; success: boolean; errors: number } {
  const r = parse(src) as any;
  return { shape: shape(commandTree(r.node)), success: r.success, errors: (r.errors ?? []).length };
}

describe('tell <target> to <command> — the wrapper survives (defect 1)', () => {
  // The exact measured table from PARSER_NEXT_STEPS.md. On main, the first
  // three rows parsed success:true / 0 errors with NO tell node.
  const TO_FORMS: Array<[string, string[]]> = [
    ['on click tell #modal to show', ['tell', 'tell>show']],
    ['on click tell .items to add .x', ['tell', 'tell>add']],
    // `then` joins the body — the joined command runs once per target, inside.
    ['on click tell #modal to show then log "after"', ['tell', 'tell>show', 'tell>log']],
  ];

  it.each(TO_FORMS)('%s keeps the body inside tell', (src, expected) => {
    const r = shapeOf(src);
    expect(r.success, src).toBe(true);
    expect(r.errors, src).toBe(0);
    expect(r.shape, src).toEqual(expected);
  });

  it('parses the bare form too (previously a loud failure)', () => {
    const r = shapeOf('tell #modal to show');
    expect(r.success).toBe(true);
    expect(r.errors).toBe(0);
    expect(r.shape).toEqual(['tell', 'tell>show']);
  });

  it('leaves the to-less forms exactly as they were', () => {
    for (const src of ['on click tell #modal show', 'tell #modal show']) {
      const r = shapeOf(src);
      expect(r.success, src).toBe(true);
      expect(r.shape, src).toEqual(['tell', 'tell>show']);
    }
  });
});

describe('tell consumes its own `end` (defect 2)', () => {
  it('keeps a post-end command inside an enclosing if — the measured divergence', () => {
    // On main the leftover `end` closed the IF, so `log` escaped the
    // conditional and ran unconditionally. Upstream keeps it inside.
    const r = shapeOf('on click if true tell #modal show end log "x" end');
    expect(r.success).toBe(true);
    expect(r.errors).toBe(0);
    expect(r.shape).toEqual(['if', 'if>tell', 'if>tell>show', 'if>log']);
  });

  it('keeps a post-end command inside an enclosing repeat', () => {
    // On main `log` ran once, outside the loop; upstream runs it per-iteration.
    const r = shapeOf('on click repeat 2 times tell #modal add .x end log "y" end');
    expect(r.success).toBe(true);
    expect(r.errors).toBe(0);
    expect(r.shape).toEqual(['repeat', 'repeat>tell', 'repeat>tell>add', 'repeat>log']);
  });

  it('closes only the tell with a doubled end', () => {
    const r = shapeOf('on click repeat 2 times tell #modal add .x end end');
    expect(r.success).toBe(true);
    expect(r.errors).toBe(0);
    expect(r.shape).toEqual(['repeat', 'repeat>tell', 'repeat>tell>add']);
  });

  it('keeps the handler-level rows byte-identical to their old shape', () => {
    // These absorbed the leftover `end` harmlessly before; consuming it in
    // tell must not move anything.
    const ROWS: Array<[string, string[]]> = [
      ['on click tell #modal show end log "after"', ['tell', 'tell>show', 'log']],
      ['on click tell #modal show end', ['tell', 'tell>show']],
      ['tell #modal show end', ['tell', 'tell>show']],
      ['on click tell #modal show then log "after"', ['tell', 'tell>show', 'tell>log']],
    ];
    for (const [src, expected] of ROWS) {
      const r = shapeOf(src);
      expect(r.success, src).toBe(true);
      expect(r.errors, src).toBe(0);
      expect(r.shape, src).toEqual(expected);
    }
  });

  it('still leaves `else` for the enclosing if', () => {
    const r = shapeOf('on click if true tell #modal show else log "no" end');
    expect(r.success).toBe(true);
    expect(r.shape).toEqual(['if', 'if>tell', 'if>tell>show', 'if>log']);
  });
});

describe('the retarget executes for real', () => {
  // The defect's damage was at runtime: the body ran against the WRONG element
  // and nothing reported it. These run the fixed forms end to end — a parse
  // that merely succeeds proves nothing (the broken form also "succeeded").
  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div><div id="inner"></div>';
  });

  const host = () => document.getElementById('host') as HTMLElement;
  const inner = () => document.getElementById('inner') as HTMLElement;

  it('tell #inner to add .x lands on #inner, not on me', async () => {
    await hyperscript.eval('tell #inner to add .x', host());
    expect(inner().classList.contains('x'), 'the told element').toBe(true);
    expect(host().classList.contains('x'), 'the handler element must NOT get it').toBe(false);
  });

  it('a then-joined body command also runs against the target', async () => {
    await hyperscript.eval('tell #inner to add .a then add .b', host());
    expect(inner().classList.contains('a')).toBe(true);
    expect(inner().classList.contains('b')).toBe(true);
    expect(host().classList.length).toBe(0);
  });

  it('a post-end command inside a conditional stays conditional', async () => {
    // The defect-2 damage: on main the `add .escaped` ran even when the
    // condition was false, because the leftover `end` closed the IF early.
    await hyperscript.eval('if false tell #inner add .no end add .escaped to me end', host());
    expect(inner().classList.contains('no')).toBe(false);
    expect(host().classList.contains('escaped'), 'must stay inside the false branch').toBe(false);
  });
});
