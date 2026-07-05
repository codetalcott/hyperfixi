/**
 * R1 cluster D — repeat loop-HEAD canonicalization guards
 * (docs-internal/HANDOFF-r1-residual.md, cluster D).
 *
 * Before the `for-in` / `while-head` / `until-head` patterns
 * (patterns/repeat.ts), every non-`times`/`forever`/`until event` repeat head
 * fell to the GENERATED positional repeat or the bare-`repeat` recovery:
 *
 * - en `repeat for item in .items` parsed as `loopType:literal="for",
 *   quantity:expression="item", event:literal="in"` with `.items` DROPPED —
 *   reference NOISE all 23 translations then "missed" (R1).
 * - es `repetir item en .items` bound `.items` to `destination` and the
 *   binding var to `loopType`; the SOV trio collapsed to a bare `repeat`.
 * - The behaviors' `repeat until event pointerup from document` line lost
 *   event + source + loopType in EVERY non-en language.
 *
 * Each test here fails without the head patterns (plus the parser's extended
 * head-only re-parse allowlist and the repeat default-patient-leak drop).
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../src';

type AnyNode = Record<string, any>;

/** Depth-first search for the first `repeat` command node in the tree. */
function findRepeat(node: unknown): AnyNode | null {
  if (!node || typeof node !== 'object') return null;
  const rec = node as AnyNode;
  if (rec.action === 'repeat') return rec;
  for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'eventHandlers', 'initBlock']) {
    const c = rec[f];
    if (Array.isArray(c)) {
      for (const child of c) {
        const hit = findRepeat(child);
        if (hit) return hit;
      }
    } else if (c && typeof c === 'object') {
      const hit = findRepeat(c);
      if (hit) return hit;
    }
  }
  return null;
}

function collectActions(node: unknown, acc = new Set<string>()): Set<string> {
  if (!node || typeof node !== 'object') return acc;
  const rec = node as AnyNode;
  if (typeof rec.action === 'string') acc.add(rec.action);
  for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'eventHandlers', 'initBlock']) {
    const c = rec[f];
    if (Array.isArray(c)) c.forEach(x => collectActions(x, acc));
    else if (c && typeof c === 'object') collectActions(c, acc);
  }
  return acc;
}

const role = (n: AnyNode, r: string) => (n.roles instanceof Map ? n.roles.get(r) : n.roles?.[r]);

describe('en repeat-for head canonicalization (repeat-for-each / stagger-animation)', () => {
  it('standalone `repeat for item in .items` yields loopType/patient/source, no event/quantity noise', () => {
    const node = parse('repeat for item in .items', 'en') as AnyNode;
    expect(node.action).toBe('repeat');
    expect(role(node, 'loopType')).toMatchObject({ type: 'literal', value: 'for' });
    expect(role(node, 'patient')).toMatchObject({ type: 'expression' });
    expect(role(node, 'source')).toMatchObject({ type: 'selector', value: '.items' });
    // The generated-pattern noise the reference used to carry:
    expect(role(node, 'event')).toBeUndefined();
    expect(role(node, 'quantity')).toBeUndefined();
  });

  it('in-handler head stops before the body (add survives as sibling)', () => {
    const node = parse('on click repeat for item in .items add .processed to item', 'en');
    const rep = findRepeat(node);
    expect(rep).not.toBeNull();
    expect(role(rep!, 'source')).toMatchObject({ type: 'selector', value: '.items' });
    expect(role(rep!, 'event')).toBeUndefined();
    expect(collectActions(node).has('add')).toBe(true);
  });

  it('`with index` variant (stagger-animation) matches the same head', () => {
    const node = parse(
      'on load repeat for item in .item with index add .visible to item wait 100ms end',
      'en'
    );
    const rep = findRepeat(node);
    expect(rep).not.toBeNull();
    expect(role(rep!, 'loopType')).toMatchObject({ type: 'literal', value: 'for' });
    expect(role(rep!, 'source')).toMatchObject({ type: 'selector', value: '.item' });
    const actions = collectActions(node);
    expect(actions.has('add')).toBe(true);
    expect(actions.has('wait')).toBe(true);
  });
});

describe('en repeat-while head canonicalization (repeat-while)', () => {
  it('captures loopType="while" + condition, no quantity noise', () => {
    const node = parse('repeat while #counter.innerText < 10', 'en') as AnyNode;
    expect(node.action).toBe('repeat');
    expect(role(node, 'loopType')).toMatchObject({ type: 'literal', value: 'while' });
    expect(role(node, 'condition')).toBeDefined();
    expect(role(node, 'quantity')).toBeUndefined();
  });
});

describe('translation repeat-for heads (corpus transformer emission)', () => {
  // [lang, corpus-shaped input (repeat-for-each translation), expected source value]
  const cases: Array<[string, string]> = [
    ['es', 'en clic repetir item en .items entonces agregar .processed a item'],
    ['de', 'bei klick wiederholen item in .items dann hinzufügen .processed zu item'],
    ['ko', '클릭 할 때 반복 item 안에 .items 그러면 .processed 를 추가 item 에'],
    ['ja', 'クリック で 繰り返し item の中 .items それから .processed を 追加 item に'],
    ['hi', 'क्लिक पर दोहराएं item में .items फिर .processed को जोड़ें item में'],
  ];

  for (const [lang, input] of cases) {
    it(`[${lang}] captures loopType/patient/source and keeps the add body`, () => {
      const node = parse(input, lang);
      const rep = findRepeat(node);
      expect(rep, `no repeat node in ${lang} parse`).not.toBeNull();
      expect(role(rep!, 'loopType')).toMatchObject({ type: 'literal', value: 'for' });
      expect(role(rep!, 'patient')).toMatchObject({ type: 'expression' });
      expect(role(rep!, 'source')).toMatchObject({ type: 'selector', value: '.items' });
      expect(collectActions(node).has('add')).toBe(true);
    });
  }
});

describe('translation repeat-until-event heads (behaviors repeat line, statement context)', () => {
  it('[es] verb-first `repetir hasta evento pointerup de documento`', () => {
    const node = parse('repetir hasta evento pointerup de documento', 'es') as AnyNode;
    expect(node.action).toBe('repeat');
    expect(role(node, 'loopType')).toMatchObject({ type: 'literal', value: 'until-event' });
    expect(role(node, 'event')).toMatchObject({ type: 'literal' });
    expect(role(node, 'source')).toBeDefined();
  });

  it('[ko] SOV `까지 이벤트 pointerup 를 반복 문서 에서`', () => {
    const node = parse('까지 이벤트 pointerup 를 반복 문서 에서', 'ko');
    const rep = findRepeat(node);
    expect(rep).not.toBeNull();
    expect(role(rep!, 'loopType')).toMatchObject({ type: 'literal', value: 'until-event' });
    expect(role(rep!, 'event')).toMatchObject({ type: 'literal' });
    expect(role(rep!, 'source')).toBeDefined();
  });

  it('[qu] verb-final `hayk_akama ruway pointerup ta qillqa manta kutipay`', () => {
    const node = parse('hayk_akama ruway pointerup ta qillqa manta kutipay', 'qu');
    const rep = findRepeat(node);
    expect(rep).not.toBeNull();
    expect(role(rep!, 'loopType')).toMatchObject({ type: 'literal', value: 'until-event' });
    expect(role(rep!, 'event')).toMatchObject({ type: 'literal' });
    expect(role(rep!, 'source')).toBeDefined();
  });
});

describe('translation repeat-while heads', () => {
  it('[es] `repetir mientras <cond>` captures loopType + condition', () => {
    const node = parse('repetir mientras #counter.innerText < 10', 'es') as AnyNode;
    expect(node.action).toBe('repeat');
    expect(role(node, 'loopType')).toMatchObject({ type: 'literal', value: 'while' });
    expect(role(node, 'condition')).toBeDefined();
  });
});

describe('existing repeat variants are not over-triggered', () => {
  it('en `repeat until event mouseup` keeps the hand-crafted until-event parse', () => {
    const node = parse('repeat until event mouseup', 'en') as AnyNode;
    expect(node.action).toBe('repeat');
    expect(role(node, 'loopType')).toMatchObject({ type: 'literal', value: 'until-event' });
    expect(role(node, 'event')).toMatchObject({ type: 'literal', value: 'mouseup' });
  });

  it('en `repeat 3 times` keeps the counted-loop head', () => {
    const node = parse('repeat 3 times toggle .x end', 'en') as AnyNode;
    expect(node.action).toBe('repeat');
    expect(role(node, 'loopType')).toMatchObject({ type: 'literal', value: 'times' });
    expect(role(node, 'quantity')).toBeDefined();
  });
});
