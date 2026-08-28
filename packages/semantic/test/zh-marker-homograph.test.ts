/**
 * Two zh render defects, both invisible to every score.
 *
 * 1. `为` IS zh's `for` keyword.
 *    The handcrafted `set-zh-full` rendered `设置 {destination} 为 {patient}`,
 *    but the zh tokenizer normalizes `为` to `for` — a block OPENER. So the
 *    block parser's depth counter counted every zh `set` as opening a nested
 *    block, and a behavior with TWO of them never balanced: `parseBehaviorBlock`
 *    produced no segment at all and the whole `behavior`/`on` structure
 *    collapsed to a bare command chain.
 *
 *    ONE `set` was fine. Two broke it. That threshold is why the corpus saw it
 *    only in the three multi-`set` showcase behaviors (draggable, resizable,
 *    sortable) and why every smaller test passed.
 *
 *    The schema already named the fix: `setSchema.patient.markerOverride.zh` is
 *    `到`, with `为`/`為`/`成` as `markerVariants` — "the transformer/corpus form
 *    marks the value with 到; natural zh uses 为". The handcrafted pattern was
 *    the outlier, rendering the ambiguous member of its own alternatives list.
 *    `为` still PARSES; it is no longer what we emit.
 *
 * 2. `trigger-zh-ba` had no destination slot.
 *    Written to READ the transformer's `触发 把 init`, it outranks both generated
 *    patterns (priority 105) — so the RENDERER picked it too and dropped an
 *    AUTHORED `on #panel` from every zh trigger. `send-zh-ba`, its exact twin,
 *    has carried the group all along.
 *
 *    This one moves ZERO corpus rows: every corpus `trigger` targets `me`, which
 *    round-trips to the same node through the default. The loss only shows on a
 *    non-`me` target, so this file is the only thing holding it.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '../src/index';

function parseEn(code: string) {
  return parseSemantic(code, 'en')?.node ?? null;
}

function roundTrip(code: string, language: string): string | null {
  const reference = parseEn(code);
  if (!reference) return null;
  const rendered = render(reference, language);
  const back = parseSemantic(rendered, language)?.node ?? null;
  return back ? render(back, 'en') : null;
}

describe('zh renders set with the unambiguous value marker', () => {
  it('emits 到, not the `for`-homograph 为', () => {
    const rendered = render(parseEn('set n to x')!, 'zh');
    expect(rendered).toBe('设置 n 到 x');
  });

  it('still PARSES the natural 为 form', () => {
    const node = parseSemantic('设置 n 为 x', 'zh')?.node ?? null;
    expect(node, '为 must stay accepted on input').not.toBeNull();
    expect(render(node!, 'en')).toBe('set n to x');
  });

  // The threshold that hid the bug: one `set` balanced, two did not.
  it.each([1, 2, 3, 4])('a zh behavior with %i set statements keeps its structure', count => {
    const body = Array.from({ length: count }, (_, i) => `set n${i} to x`).join('\n');
    const source = `behavior R(a)\non pointerdown\n${body}\nend\nend`;
    const reference = parseEn(source);
    expect(roundTrip(source, 'zh'), `${count} set statement(s)`).toBe(render(reference!, 'en'));
  });

  it('the collapsed shape is what regresses — behavior and on must survive', () => {
    const source = `behavior R(a)\non pointerdown\nset n0 to x\nset n1 to x\nend\nend`;
    const rendered = render(parseEn(source)!, 'zh');
    const back = parseSemantic(rendered, 'zh')?.node ?? null;
    // Without the fix this is `compound` — the body chain with the block gone.
    expect(back?.kind).toBe('behavior');
  });
});

describe('zh trigger keeps an authored destination', () => {
  it('renders the target rather than dropping it', () => {
    expect(render(parseEn('trigger m on #panel')!, 'zh')).toBe('触发 把 m 在 #panel');
  });

  it('round-trips a non-`me` target', () => {
    expect(roundTrip('trigger m on #panel', 'zh')).toBe('trigger m on #panel');
  });

  it('still reads the transformer form with no target', () => {
    const node = parseSemantic('触发 把 init', 'zh')?.node ?? null;
    expect(node).not.toBeNull();
    expect(render(node!, 'en')).toBe('trigger init');
  });
});
