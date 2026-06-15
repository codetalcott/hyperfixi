/**
 * Multi-handler PROGRAM layer — a top-level "feature" script with two or more
 * event handlers (`on click … end on keyup … end`).
 *
 * The single-statement parser matched only the FIRST handler and silently
 * absorbed the rest into its body (the trailing `on keyup …` was swallowed as a
 * compound command) — broken in every language. `tryParseProgram` splits the
 * input into its top-level handler segments using the SAME end-delimited,
 * trigger-agnostic technique as the behavior-block body split (depth counts only
 * nested if/repeat/…; the trigger is never counted), re-assembles them into a
 * `compound`, and buildAST maps an all-handler compound to a core `Program` node
 * so the runtime's executeProgram registers every handler. The renderer renders
 * such a compound as `end`-delimited handlers (not a then-chain) so it round-trips.
 *
 * See docs-internal/MULTILINGUAL_BEHAVIORS_PLAN.md (deferred tails: multi-handler).
 */

import { describe, it, expect } from 'vitest';
import { parse, buildAST, render } from '../src';

interface SNode {
  kind?: string;
  action?: string;
  body?: SNode[];
  statements?: SNode[];
  roles?: Map<string, { value?: string }>;
}
const eventOf = (h: SNode): string | undefined => h.roles?.get?.('event')?.value;
const actionsOf = (h: SNode): string[] => (h.body ?? []).map(b => b.action ?? b.kind ?? '?');

/** buildAST returns a `{ ast }` wrapper; normalize to the AST node. */
function astOf(node: SNode): { type?: string; statements?: { type: string; event?: string }[] } {
  const built = buildAST(node as never) as { ast?: unknown };
  return (built.ast ?? built) as never;
}

describe('multi-handler program — parse (end-delimited)', () => {
  it('splits two top-level handlers into a compound of event handlers (EN)', () => {
    const node = parse('on click toggle .active end on keyup add .x to me end', 'en') as SNode;
    expect(node.kind).toBe('compound');
    expect(node.statements).toHaveLength(2);
    expect(node.statements!.every(s => s.kind === 'event-handler')).toBe(true);
    expect(eventOf(node.statements![0])).toBe('click');
    expect(actionsOf(node.statements![0])).toEqual(['toggle']);
    expect(eventOf(node.statements![1])).toBe('keyup');
    expect(actionsOf(node.statements![1])).toEqual(['add']);
  });

  it('splits three handlers', () => {
    const node = parse(
      'on click add .a to me end on mouseenter add .b to me end on mouseleave remove .c from me end',
      'en'
    ) as SNode;
    expect(node.statements).toHaveLength(3);
    expect(node.statements!.map(eventOf)).toEqual(['click', 'mouseenter', 'mouseleave']);
  });

  it('contains a nested if inside a handler body without mis-splitting (depth-aware)', () => {
    const node = parse(
      'on click if me matches .x then toggle .a end end on mouseenter add .b to me end',
      'en'
    ) as SNode;
    expect(node.kind).toBe('compound');
    expect(node.statements).toHaveLength(2);
    expect(eventOf(node.statements![0])).toBe('click');
    expect(eventOf(node.statements![1])).toBe('mouseenter');
  });

  it('handles a final handler with no trailing end', () => {
    const node = parse('on click toggle .a end on keyup add .b to me', 'en') as SNode;
    expect(node.kind).toBe('compound');
    expect(node.statements).toHaveLength(2);
    expect(node.statements!.map(eventOf)).toEqual(['click', 'keyup']);
  });
});

describe('multi-handler program — parse (no-end feature chain, Phase B)', () => {
  it('splits a no-end chain at the trigger boundary (EN)', () => {
    const node = parse('on click toggle .active on keyup add .x to me', 'en') as SNode;
    expect(node.kind).toBe('compound');
    expect(node.statements).toHaveLength(2);
    expect(node.statements!.map(eventOf)).toEqual(['click', 'keyup']);
    expect(actionsOf(node.statements![0])).toEqual(['toggle']);
    expect(actionsOf(node.statements![1])).toEqual(['add']);
  });

  it('splits a three-handler no-end chain', () => {
    const node = parse(
      'on click add .a to me on mouseenter remove .b from me on mouseleave toggle .c',
      'en'
    ) as SNode;
    expect(node.statements).toHaveLength(3);
    expect(node.statements!.map(eventOf)).toEqual(['click', 'mouseenter', 'mouseleave']);
  });

  it('mixes a no-end handler followed by an end-delimited one', () => {
    const node = parse('on click toggle .a on keyup add .b end', 'en') as SNode;
    expect(node.statements).toHaveLength(2);
    expect(node.statements!.map(eventOf)).toEqual(['click', 'keyup']);
  });

  // The on-trigger / on-target ambiguity — these must NOT split.
  it('does not split a single handler whose body ends in an `on`-target', () => {
    expect((parse('on click toggle .active on me', 'en') as SNode).kind).toBe('event-handler');
  });

  it('does not split on `on me` inside a then-chained body', () => {
    // `to me` and `on me` are both destinations here, not new triggers.
    expect(
      (parse('on click add .a to me then toggle .b on me', 'en') as SNode).kind
    ).toBe('event-handler');
  });

  it('splits no-end chains in trigger-prepositional languages (es SVO, de V2, ar VSO)', () => {
    const cases: Record<string, string> = {
      es: 'al click alternar .active al keyup agregar .x',
      de: 'bei click umschalten .active bei keyup hinzufügen .x',
      ar: 'على click بدّل .active على keyup أضف .x',
    };
    for (const [lang, src] of Object.entries(cases)) {
      const node = parse(src, lang) as SNode;
      expect(node.kind, lang).toBe('compound');
      expect(node.statements, lang).toHaveLength(2);
      expect(node.statements!.map(eventOf), lang).toEqual(['click', 'keyup']);
    }
  });

  it('does NOT split SOV chains without a distinct trigger signature (hi)', () => {
    // hi's event-marker and on-marker are the SAME surface form (`पर`), so there is
    // no two-token signature to anchor a split — and a single handler whose body
    // ends in a locative `#panel पर` must stay one handler. These rely on the
    // end-delimited form.
    expect((parse('click पर .open को #panel पर टॉगल', 'hi') as SNode).kind).toBe('event-handler');
  });
});

describe('multi-handler program — ja/ko trigger-signature split (SOV no-end)', () => {
  // ja/ko have a DISTINCT event-marker + on-marker (`を で`, `을 에`); the adjacent
  // pair uniquely anchors a handler trigger, so the no-end chain splits even though
  // the marker is postpositional. The patient particle is the same (`を`/`을`) but is
  // followed by a verb, never the on-marker, so single handlers don't false-split.
  const chains: Record<string, string> = {
    ja: 'click を で .active を 切り替え keyup を で .x を 追加',
    ko: 'click 을 에 .active 을 토글 keyup 을 에 .x 을 추가',
  };
  for (const [lang, src] of Object.entries(chains)) {
    it(`${lang}: splits a space-separated no-end chain into two handlers`, () => {
      const node = parse(src, lang) as SNode;
      expect(node.kind, lang).toBe('compound');
      expect(node.statements, lang).toHaveLength(2);
      expect(node.statements!.map(eventOf), lang).toEqual(['click', 'keyup']);
      expect(actionsOf(node.statements![0]), lang).toEqual(['toggle']);
      expect(actionsOf(node.statements![1]), lang).toEqual(['add']);
    });
  }

  it('ja: splits a newline-separated no-end chain', () => {
    const node = parse('click を で .active を 切り替え\nkeyup を で .x を 追加', 'ja') as SNode;
    expect(node.kind).toBe('compound');
    expect(node.statements).toHaveLength(2);
  });

  it('ja: a single handler is NOT split (patient `を` is not a trigger signature)', () => {
    expect((parse('click を で .active を 切り替え', 'ja') as SNode).kind).toBe('event-handler');
  });

  it('ja: buildAST → core Program with two eventHandlers', () => {
    const ast = astOf(parse(chains.ja, 'ja') as SNode);
    expect(ast.type).toBe('Program');
    expect(ast.statements!.map(s => s.event)).toEqual(['click', 'keyup']);
  });
});

describe('multi-handler program — buildAST → core Program', () => {
  it('emits a Program node with one eventHandler statement per handler', () => {
    const ast = astOf(parse('on click toggle .active end on keyup add .x to me end', 'en') as SNode);
    expect(ast.type).toBe('Program');
    expect(ast.statements).toHaveLength(2);
    expect(ast.statements!.every(s => s.type === 'eventHandler')).toBe(true);
    expect(ast.statements!.map(s => s.event)).toEqual(['click', 'keyup']);
  });
});

describe('multi-handler program — does NOT mis-fire on single statements', () => {
  it('a single handler with an `on`-target stays one handler (not a program)', () => {
    // `on me` is a destination here, not a second trigger.
    const node = parse('on click toggle .active on me', 'en') as SNode;
    expect(node.kind).toBe('event-handler');
  });

  it('a single handler closed by end is not a program', () => {
    const node = parse('on click toggle .active end', 'en') as SNode;
    expect(node.kind).toBe('event-handler');
  });

  it('a single conditional (if … end) is not a program', () => {
    const node = parse('if me matches .x then toggle .a end', 'en') as SNode;
    expect(node.kind).not.toBe('compound');
  });

  it('a then-chain of commands is a CommandSequence, never a Program', () => {
    const ast = astOf(parse('toggle .a then add .b to me', 'en') as SNode);
    expect(ast.type).not.toBe('Program');
  });
});

describe('multi-handler program — round-trips across word orders', () => {
  const SRC = 'on click toggle .active end on keyup add .red to me end';
  // SVO (es), SOV (ja, ko), V2 (de), VSO (ar).
  for (const lang of ['es', 'ja', 'ko', 'de', 'ar'] as const) {
    it(`EN → ${lang} → parse preserves both handlers + their first command`, () => {
      const back = parse(render(parse(SRC, 'en'), lang), lang) as SNode;
      expect(back.kind).toBe('compound');
      expect(back.statements).toHaveLength(2);
      expect(eventOf(back.statements![0])).toBe('click');
      expect(actionsOf(back.statements![0])).toEqual(['toggle']);
      expect(eventOf(back.statements![1])).toBe('keyup');
      expect(actionsOf(back.statements![1])).toEqual(['add']);
    });
  }

  it('renders each handler closed by its own end (ES), not a then-chain', () => {
    const out = render(parse(SRC, 'en'), 'es');
    // Two `fin` (end) delimiters, and NOT joined by the chain word `entonces`.
    expect(out.match(/\bfin\b/g)).toHaveLength(2);
    expect(out).not.toContain('entonces');
  });
});
