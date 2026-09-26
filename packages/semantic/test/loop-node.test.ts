/**
 * The parser builds a LOOP NODE with its body — the "never builds a loop node"
 * brief in docs-internal/PARSER_NEXT_STEPS.md.
 *
 * A loop used to reach the renderer FLAT: `[head, stmt, stmt, …]`, with the
 * extent gone. The renderer closed every loop at the END of its list, so
 * whatever followed a loop was pulled into it — template-literal-list-build's
 * `set #list.innerHTML` ran once per item, behavior-sortable's `remove` ran on
 * every pointer move — in the English reference and in every translation of it
 * (each is `render(parse_en(src), L)`). At the top level the body was dropped
 * outright.
 *
 * Both body walkers now close a loop at its `end` and nest the body under a
 * LoopSemanticNode. Whether a loop is open is asked of the PARSE, so it holds
 * where no token marks one: es/pt `para` and sw `kwa` are particles, the SOV
 * loop words are verb-final, bn's শেষ is also `last`, and a fused handler
 * pattern captures the loop head before the body walk starts.
 */

import { describe, expect, it } from 'vitest';
import { buildAST, parseSemantic, render } from '../src';
import { SUPPORTED_LANGUAGES } from '../src/language-loader';
import type { LoopSemanticNode, SemanticNode } from '../src/types';

const FOREIGN = SUPPORTED_LANGUAGES.filter(l => l !== 'en');

function parseEn(src: string): SemanticNode {
  const node = parseSemantic(src, 'en').node;
  if (!node) throw new Error(`no parse: ${src}`);
  return node;
}

/** English → L → English. */
function roundTrip(src: string, language: string): string | null {
  const back = parseSemantic(render(parseEn(src), language), language).node;
  return back ? render(back, 'en') : null;
}

/** Every loop node in a tree, outermost first. */
function loops(node: unknown): LoopSemanticNode[] {
  const out: LoopSemanticNode[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    const rec = n as Record<string, unknown>;
    if (rec.kind === 'loop') out.push(n as LoopSemanticNode);
    for (const field of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      for (const child of (rec[field] as unknown[]) ?? []) walk(child);
    }
  };
  walk(node);
  return out;
}

/** The actions directly in a loop's body. */
const bodyActions = (loop: LoopSemanticNode) => loop.body.map(n => n.action);

// Each renders exactly as written, and round-trips through every language.
const SHAPES = {
  // template-literal-list-build: the set after the loop ran once per item.
  forIn:
    'on click set $html to "" then for item in $items set $html to $html + `<li>${item.name}</li>` end then set #list.innerHTML to $html',
  counted: 'on click repeat 3 times add .x to me then wait 1s end then log "done"',
  // `repeat while` / `repeat for` are ONE loop owing one `end`, whether the
  // repeat word is translated or not, and wherever the while word sits (SOV
  // renders front it: ja `の間 x < 10 繰り返し`).
  whileHead: 'on click repeat while x < 10 increment x end then log "done"',
  repeatForIn: 'on click repeat for item in .i add .y to item end then log "done"',
  // A body that spans clauses: the loop stays open across each `then`.
  whileSpansClauses: 'on click repeat while x < 10 increment x then log x end then log "done"',
  forSpansClauses: 'on click for item in $items set $b to item then log $b end then log "done"',
  // behavior-sortable: the remove after the loop ran on every pointer move.
  untilEvent:
    'on pointerdown repeat until event pointerup from document wait for pointermove then trigger moved on me end then remove .x from me',
  nested: 'on click repeat 2 times for x in .i add .y to x end end then log "a"',
  // es/it/pt/… match a FUSED `repeat` handler pattern: the loop head is
  // captured before the body walk starts.
  fusedHead: 'on click repeat 3 times append "x" to #o end then append "!" to #o',
  topLevel: 'repeat until event pointerup from document trigger moved on me end then remove .x from me',
  topLevelCounted: 'repeat 3 times add .x to me end then log "done"',
};

describe('English keeps each loop where the source closes it', () => {
  it.each(Object.entries(SHAPES))('%s renders as written', (_, src) => {
    expect(render(parseEn(src), 'en')).toBe(src);
  });

  it('nests the body and leaves what follows the `end` outside', () => {
    const [loop] = loops(parseEn(SHAPES.forIn));
    expect(loop).toMatchObject({ action: 'for', loopVariant: 'for', loopVariable: 'item' });
    expect(bodyActions(loop)).toEqual(['set']);
    expect(loop.roles.get('source')).toMatchObject({ value: '$items' });
  });

  it('keeps the head roles on the loop, and the exact form in loopType', () => {
    const [loop] = loops(parseEn(SHAPES.untilEvent));
    expect(loop).toMatchObject({ action: 'repeat', loopVariant: 'until' });
    expect(loop.roles.get('loopType')).toMatchObject({ value: 'until-event' });
    expect(loop.roles.get('event')).toMatchObject({ value: 'pointerup' });
    expect(bodyActions(loop)).toEqual(['wait', 'trigger']);
  });

  it('nests a loop inside a loop', () => {
    const [outer, inner] = loops(parseEn(SHAPES.nested));
    expect(bodyActions(outer)).toEqual(['for']);
    expect(outer.body[0]).toBe(inner);
    expect(bodyActions(inner)).toEqual(['add']);
  });

  it('keeps a top-level loop body, and the command after the loop', () => {
    const node = parseEn(SHAPES.topLevel);
    expect(node.kind).toBe('compound');
    const [loop] = loops(node);
    expect(bodyActions(loop)).toEqual(['trigger']);
    expect(
      (node.diagnostics ?? []).filter(d => d.code === 'unconsumed-input')
    ).toHaveLength(0);
  });

  it('closes an unterminated loop at the end of the list, as before', () => {
    const node = parseEn('on click repeat 3 times add .x to me');
    expect(bodyActions(loops(node)[0])).toEqual(['add']);
    expect(render(node, 'en')).toBe('on click repeat 3 times add .x to me end');
  });

  it('leaves a loop head with no body flat', () => {
    expect(loops(parseEn('on click repeat 3 times end'))).toHaveLength(0);
  });
});

describe('every translation keeps the extent', () => {
  for (const [name, src] of Object.entries(SHAPES)) {
    it.each(FOREIGN)(`${name} round-trips through %s`, language => {
      expect(roundTrip(src, language)).toBe(src);
    });
  }

  // Known exception, filed in MULTILINGUAL_NEXT_STEPS.md: a BARE `for x in …`
  // (no handler) in bn/hi/sw reads the loop's `in` phrase as an event (`on x`),
  // the event-marker ambiguity behind the bare (go-back, bn/hi) pairs too.
  it.each(FOREIGN.filter(l => !['bn', 'hi', 'sw'].includes(l)))(
    'a bare for-in loop round-trips through %s',
    language => {
      expect(roundTrip('for x in .i add .y to x end', language)).toBe(
        'for x in .i add .y to x end'
      );
    }
  );
});

describe('buildAST emits the repeat core parses', () => {
  // RepeatCommand.parseInput reads the loop form and its operands from SLOTS
  // (modifiers) and the body from the one block arg. The positional shape
  // buildLoop used to emit made every loop throw "requires a loop type".
  const astOf = (src: string) =>
    (buildAST(parseEn(src)) as unknown as { ast: Record<string, unknown> }).ast;
  const firstRepeat = (ast: unknown): Record<string, any> | undefined => {
    let found: Record<string, any> | undefined;
    const walk = (n: unknown): void => {
      if (found || !n || typeof n !== 'object') return;
      const rec = n as Record<string, any>;
      if (rec.type === 'command' && rec.name === 'repeat') found = rec;
      for (const v of Object.values(rec)) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') walk(v);
      }
    };
    walk(ast);
    return found;
  };

  it('a counted loop: loopType + times, the body a block', () => {
    const repeat = firstRepeat(astOf('repeat 3 times add .x to me end'));
    expect(repeat?.modifiers).toMatchObject({
      loopType: { type: 'literal', value: 'times' },
      times: { type: 'literal', value: 3 },
    });
    expect(repeat?.args).toHaveLength(1);
    expect(repeat?.args[0]).toMatchObject({ type: 'block' });
    expect(repeat?.args[0].commands).toHaveLength(1);
  });

  it('a for-in loop: loopType for, the variable, the collection', () => {
    const repeat = firstRepeat(astOf(SHAPES.forIn));
    expect(repeat?.modifiers).toMatchObject({
      loopType: { value: 'for' },
      for: { type: 'literal', value: 'item' },
    });
    expect(repeat?.modifiers.in).toBeDefined();
  });

  it('an until-event loop: the exact form, the event, its source', () => {
    const repeat = firstRepeat(astOf(SHAPES.untilEvent));
    expect(repeat?.modifiers).toMatchObject({
      loopType: { value: 'until-event' },
      event: { value: 'pointerup' },
    });
    expect(repeat?.modifiers.from).toBeDefined();
  });

  it('a while loop: the condition in the while slot', () => {
    const repeat = firstRepeat(astOf('on click repeat while x < 10 increment x end'));
    expect(repeat?.modifiers.loopType).toMatchObject({ value: 'while' });
    expect(repeat?.modifiers.while).toBeDefined();
  });
});
