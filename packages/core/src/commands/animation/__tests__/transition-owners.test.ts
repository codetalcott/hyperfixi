/**
 * `transition` as upstream parses it: each property an EXPRESSION with its own
 * owner, several properties per command, `from` and `using`.
 *
 * Before 2026-09-25 core rejected every owner a possessive could not reach
 * through `parsePrimary`: a positional (`next .panel's *max-height`), a
 * parenthesized one, `the`, and the `of` form. It also rejected `from`, `using`
 * and a second property. The second property's `*` read as MULTIPLICATION, so
 * `*width to 100px *height to 50px` became `to: 100px * height`, silently at
 * top level. Upstream lexes `*` + a letter as one style-reference token; core
 * now ends an expression at a spaced `*` glued to a name.
 *
 * Every form was checked on hyperscript.org 0.9.93, and the runs compare the
 * DOM each engine leaves (jsdom fires no `transitionend`, so a short `over`
 * keeps these fast).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parse } from '../../../parser/parser';
import { hyperscript } from '../../../api/hyperscript-api';

type Node = { type: string; value?: unknown; name?: unknown; [key: string]: unknown };
type Cmd = { name: string; args: Node[]; modifiers?: Record<string, Node> };
type Field = { key: { name: string }; value: Node };
type PairsNode = Node & { elements: Array<{ properties: Field[] }> };

function commandsOf(src: string): Cmd[] {
  const r = parse(src);
  expect(r.errors ?? [], src).toEqual([]);
  return (r.node as unknown as { commands: Cmd[] }).commands;
}

function transitionOf(src: string): Cmd {
  const cmd = commandsOf(src)[0]!;
  expect(cmd.name).toBe('transition');
  return cmd;
}

describe('parse', () => {
  it.each([
    ['on click transition the *opacity to 0', null, '*opacity'],
    ["on click transition next .panel's *max-height to 0px", 'callExpression', '*max-height'],
    ["on click transition (next .panel)'s *max-height to 0px", 'callExpression', '*max-height'],
    ["on click transition the next <div/>'s *opacity to 0", 'callExpression', '*opacity'],
    ["on click transition first .x's *opacity to 0", 'callExpression', '*opacity'],
    ['on click transition *max-height of #panel to 0px', 'selector', '*max-height'],
    ['on click transition opacity of #a to 0', 'selector', 'opacity'],
    ['on click transition the *opacity of #a to 0', 'selector', '*opacity'],
    ['on click transition *opacity of me to 0', 'identifier', '*opacity'],
    // the forms that already worked keep their shape
    ["on click transition #a's *opacity to 0", 'selector', '*opacity'],
    ['on click transition my *opacity to 0', 'identifier', '*opacity'],
    ['on click transition #a *opacity to 0', 'selector', '*opacity'],
    // a context name is an OWNER, never a CSS property called `me`
    ['on click transition me *opacity to 0', 'identifier', '*opacity'],
    ['on click transition opacity to 0', null, 'opacity'],
  ])('`%s` → owner %s, property %s', (src, ownerType, property) => {
    const { args } = transitionOf(src);
    expect(args[args.length - 1]!.value).toBe(property);
    if (ownerType === null) expect(args).toHaveLength(1);
    else expect(args[0]!.type).toBe(ownerType);
  });

  it('parses every property of a multi-property transition', () => {
    const { args, modifiers } = transitionOf(
      'on click transition *width to 100px *height to 50px over 1s'
    );
    expect(args[0]!.value).toBe('*width');
    expect(modifiers?.over).toBeDefined();
    const pairs = modifiers?.pairs as PairsNode;
    expect(pairs.elements).toHaveLength(1);
    const fields = pairs.elements[0]!.properties;
    expect(
      Object.fromEntries(fields.map(f => [f.key.name, f.value.value ?? f.value.type]))
    ).toEqual({ property: '*height', to: 'stringPostfix' });
  });

  it("keeps each later pair's own owner", () => {
    const { modifiers } = transitionOf(
      "on click transition #a's *width to 1px #b's *height to 2px"
    );
    const pairs = modifiers?.pairs as PairsNode;
    const owner = pairs.elements[0]!.properties.find(f => f.key.name === 'owner');
    expect(owner?.value.value).toBe('#b');
  });

  it('reads `from` and `using`', () => {
    expect(transitionOf('on click transition *opacity from 0 to 1').modifiers?.from).toBeDefined();
    expect(
      transitionOf('on click transition *opacity to 0 using "all 1s"').modifiers?.using
    ).toBeDefined();
  });

  it('ends at the next command and at a comment, with one pair', () => {
    expect(commandsOf('on click transition *opacity to 0 then log 1').map(c => c.name)).toEqual([
      'transition',
      'log',
    ]);
    expect(
      transitionOf('on click transition *opacity to 0 -- fade').modifiers?.pairs
    ).toBeUndefined();
  });

  it('rejects a transition with no property, rather than naming one `to`', () => {
    expect(parse('on click transition to 1').errors?.length ?? 0).toBeGreaterThan(0);
  });
});

describe('a spaced `*` glued to a name is a style reference, not multiplication', () => {
  const valueOf = (src: string) => commandsOf(src)[0]!.modifiers?.to as Node;

  it('`a *b` ends at `a` — upstream rejects it too', () => {
    expect(parse('on click set x to a *b').errors?.length ?? 0).toBeGreaterThan(0);
  });

  it.each(['on click set x to a * b', 'on click set x to a*b', 'on click set x to 2 *3'])(
    '`%s` still multiplies',
    src => {
      expect(valueOf(src).type).toBe('binaryExpression');
    }
  );

  it('`the *opacity` is the style reference, not `the * opacity`', () => {
    const [log] = commandsOf('on click log the *opacity');
    expect(log!.args[0]).toMatchObject({ type: 'selector', value: '*opacity' });
  });
});

describe('runs', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<button id="btn"></button><div id="a" style="opacity: 1"></div>' +
      '<div class="p"></div><div class="p"></div><div id="c"></div>';
  });
  const byId = (id: string) => document.getElementById(id)!;
  const run = async (src: string) => {
    const btn = byId('btn');
    await hyperscript.eval(src, btn);
    btn.click();
    await new Promise(resolve => setTimeout(resolve, 120));
  };

  it('moves every property of one owner', async () => {
    await run("on click transition #a's *width to 100px #a's *height to 50px over 1ms");
    expect(byId('a').style.width).toBe('100px');
    expect(byId('a').style.height).toBe('50px');
  });

  it("moves each pair's own owner, and `me` for a pair without one", async () => {
    await run('on click transition *width of #a to 10px *height of #c to 5px *top to 1px over 1ms');
    expect(byId('a').style.width).toBe('10px');
    expect(byId('c').style.height).toBe('5px');
    expect(byId('btn').style.top).toBe('1px');
  });

  it('moves every element of a collection owner', async () => {
    await run("on click transition <.p/>'s *opacity to 0 over 1ms");
    for (const p of document.querySelectorAll<HTMLElement>('.p')) expect(p.style.opacity).toBe('0');
  });

  it.each([
    ["on click transition (first <.p/>)'s *opacity to 0 over 1ms", () => '.p'],
    ["on click transition next <div/>'s *opacity to 0 over 1ms", () => '#a'],
    ['on click transition the *opacity of #a to 0 over 1ms', () => '#a'],
    ['on click transition the *opacity to 0 over 1ms', () => '#btn'],
  ])('`%s`', async (src, target) => {
    await run(src);
    expect(document.querySelector<HTMLElement>(target())!.style.opacity).toBe('0');
  });

  it('applies `from` before the value it moves to', async () => {
    const setProperty = vi.spyOn(byId('a').style, 'setProperty');
    await run("on click transition #a's *opacity from 0.5 to 0.2 over 1ms");
    const opacities = setProperty.mock.calls.filter(([p]) => p === 'opacity').map(([, v]) => v);
    expect(opacities).toEqual(['0.5', '0.2']);
    expect(byId('a').style.opacity).toBe('0.2');
  });

  it('`using` is the whole transition while it runs, and is restored after', async () => {
    const a = byId('a');
    let during = '';
    const setProperty = a.style.setProperty.bind(a.style);
    vi.spyOn(a.style, 'setProperty').mockImplementation((p, v, pr) => {
      if (p === 'opacity') during = a.style.transition;
      setProperty(p, v, pr);
    });
    await run('on click transition #a\'s *opacity to 0 using "opacity 1ms linear"');
    expect(during).toBe('opacity 1ms linear');
    expect(a.style.transition).toBe('');
    expect(a.style.opacity).toBe('0');
  });
});
