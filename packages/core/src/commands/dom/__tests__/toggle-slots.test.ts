/**
 * toggle's syntax is decided by the PARSER and carried as slots — Arc 3 step 3
 *
 * PR A moved the destination (`on`/`from <target>` → `modifiers.on`); PR B
 * moved the two other syntactic decisions the command used to rediscover by
 * evaluating an argument and string-comparing the result: the `between A and
 * B` pair (→ `modifiers.between`, an arrayLiteral) and the dialog mode of
 * `as modal` / bare `modal` (→ `modifiers.as`). These run the real parser and
 * the real evaluator, end to end, so a fixture cannot pin a shape the parser
 * does not produce — which is how the mock-fed `unless` bug survived.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';
import { assertNodeOfKind } from '../../../ast/guards';

function node(source: string) {
  const result = hyperscript.compileSync(source);
  expect(result.ok, source).toBe(true);
  return assertNodeOfKind(result.ast, 'command');
}

describe("the parser carries toggle's syntax as slots", () => {
  it('`toggle between .a and .b on #t` — pair in `between`, target in `on`, nothing positional', () => {
    const cmd = node('toggle between .a and .b on #t');
    expect(cmd.args).toEqual([]);
    const pair = assertNodeOfKind(cmd.modifiers?.between, 'arrayLiteral');
    expect(pair.elements.map(e => assertNodeOfKind(e, 'selector').value)).toEqual(['.a', '.b']);
    expect(assertNodeOfKind(cmd.modifiers?.on, 'selector').value).toBe('#t');
  });

  it('`toggle #dlg as modal` and `toggle #dlg modal` are the same node — `modifiers.as`', () => {
    const a = node('toggle #dlg as modal');
    const b = node('toggle #dlg modal');
    for (const cmd of [a, b]) {
      expect(cmd.args).toHaveLength(1);
      expect(assertNodeOfKind(cmd.args[0], 'selector').value).toBe('#dlg');
      expect(assertNodeOfKind(cmd.modifiers?.as, 'literal').value).toBe('modal');
    }
  });

  it('`toggle .x on #t for 2s` keeps the temporal tail beside the destination', () => {
    const cmd = node('toggle .x on #t for 2s');
    expect(cmd.args).toHaveLength(1);
    expect(cmd.modifiers?.on).toBeDefined();
    expect(cmd.modifiers?.for).toBeDefined();
  });
});

describe('ToggleCommand reads the slots, end to end', () => {
  let host: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="host" class="foo"></div><dialog id="dlg"></dialog>';
    host = document.getElementById('host')!;
  });

  it('classes-between: flips foo → bar on the `on` target', async () => {
    await hyperscript.eval('toggle between .foo and .bar on #host', document.body);
    expect(host.classList.contains('foo')).toBe(false);
    expect(host.classList.contains('bar')).toBe(true);
    await hyperscript.eval('toggle between .foo and .bar on #host', document.body);
    expect(host.classList.contains('foo')).toBe(true);
    expect(host.classList.contains('bar')).toBe(false);
  });

  it('dialog: `as modal` opens with showModal, the bare form with show', async () => {
    // jsdom has neither; the command calls one or the other by mode.
    const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
    const showModal = vi.fn();
    const show = vi.fn();
    proto.showModal = showModal;
    proto.show = show;
    try {
      await hyperscript.eval('toggle #dlg as modal', document.body);
      expect(showModal).toHaveBeenCalledTimes(1);
      expect(show).not.toHaveBeenCalled();
      await hyperscript.eval('toggle #dlg', document.body);
      expect(show).toHaveBeenCalledTimes(1);
    } finally {
      delete proto.showModal;
      delete proto.show;
    }
  });
});
