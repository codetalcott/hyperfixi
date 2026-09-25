/**
 * `render <template> with name: value, …` — upstream's naked named arguments.
 *
 * The declared grammar gave `with` one expression, so `render #row with row:
 * $data` discarded `: $data`, and `with a: 1, b: 2` did not parse at all. The
 * docs showed a parenthesized `with (name: value)` instead, which upstream
 * 0.9.93 rejects too ("Expected command"): its RenderCommand reads a
 * `nakedNamedArgumentList`, each value a full expression. Every row was checked
 * on hyperscript.org 0.9.93, and the renders are run.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '../../../parser/parser';
import { hyperscript } from '../../../api/hyperscript-api';

type Node = { type: string; [key: string]: unknown };
type Cmd = { name: string; args: Node[]; modifiers?: Record<string, Node> };

function commandsOf(src: string): Cmd[] {
  const r = parse(src);
  expect(r.errors ?? [], src).toEqual([]);
  return (r.node as unknown as { commands: Cmd[] }).commands;
}

const strip = (node: unknown) =>
  JSON.stringify(node, (k, v) => (['start', 'end', 'line', 'column'].includes(k) ? undefined : v));

function withArgs(src: string): Record<string, Node> {
  const withNode = commandsOf(src)[0]!.modifiers?.with as {
    type: string;
    properties: Array<{ key: { name: string }; value: Node }>;
  };
  expect(withNode.type).toBe('objectLiteral');
  return Object.fromEntries(withNode.properties.map(p => [p.key.name, p.value]));
}

describe('parse', () => {
  it('collects every name: value pair into one object', () => {
    const args = withArgs('on click render #t with a: 1, b: "x"');
    expect(Object.keys(args)).toEqual(['a', 'b']);
  });

  it('parses each value as a full expression, as upstream does', () => {
    const args = withArgs('on click render #t with a: 1 + 2, b: my value, c: 1 as String');
    expect(args.a!.type).toBe('binaryExpression');
    expect(args.b!.type).toBe('memberExpression');
    expect(args.c!.type).toBe('asExpression');
  });

  it('builds the same node as an object literal, so the command reads both alike', () => {
    const naked = commandsOf('on click render #t with a: 1, b: "x"')[0]!.modifiers?.with;
    const braced = commandsOf('on click render #t with {a: 1, b: "x"}')[0]!.modifiers?.with;
    expect(strip(naked)).toBe(strip(braced));
  });

  it('stops at `then`', () => {
    const cmds = commandsOf('on click render #row with row: $data then morph #target to it');
    expect(cmds.map(c => c.name)).toEqual(['render', 'morph']);
  });

  it('still rejects the parenthesized form (upstream agrees)', () => {
    expect(parse('on click render #t with (a: 1)').errors?.length ?? 0).toBeGreaterThan(0);
  });

  it("leaves fetch's own named arguments as they were: primaries, so `as` stays fetch's", () => {
    const [fetchCmd] = commandsOf('on click fetch /x with method: "POST" as json');
    expect(fetchCmd!.modifiers?.as).toBeDefined();
    const withNode = fetchCmd!.modifiers?.with as {
      type: string;
      properties: Array<{ value: Node }>;
    };
    expect(withNode.properties[0]!.value.type).toBe('literal');
  });
});

describe('runs', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<button id="btn"></button>' +
      '<script type="text/hyperscript-template" id="user-list"><ul><li>${users}</li></ul></script>' +
      '<script type="text/hyperscript-template" id="pair"><p>${a}-${n}</p></script>' +
      '<script type="text/hyperscript-template" id="row"><div id="target" class="row">${row}</div></script>' +
      '<div id="container"></div><div id="target">old</div>';
  });
  const click = async (src: string) => {
    const btn = document.getElementById('btn')!;
    await hyperscript.eval(src, btn);
    btn.click();
    await new Promise(resolve => setTimeout(resolve, 20));
  };

  it('renders the corpus shape (render-template-with-data)', async () => {
    await click(
      'on click set $data to "Ann" then render #user-list with users: $data then put it into #container'
    );
    expect(document.getElementById('container')!.innerHTML).toBe('<ul><li>Ann</li></ul>');
  });

  it('passes every pair, each value evaluated', async () => {
    await click('on click render #pair with a: "x", n: 1 + 2 then put it into #container');
    expect(document.getElementById('container')!.innerHTML).toBe('<p>x-3</p>');
  });

  it('feeds a morph (morph-with-template): the same-tag root is merged', async () => {
    await click('on click render #row with row: "new" then morph #target to it');
    const target = document.getElementById('target')!;
    expect(target.className).toBe('row');
    expect(target.textContent).toBe('new');
    expect(document.querySelectorAll('#target')).toHaveLength(1);
  });
});
