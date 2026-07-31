// @vitest-environment jsdom
/**
 * `open <dialog> as non-modal` reaches `OpenCommand.parseDialogMode`.
 *
 * `open` is absent from BOTH skip lists (`parser.ts`'s `skipSemanticParsing`
 * and the adapter's `SKIP_SEMANTIC_COMMANDS`), so plain English `open` runs the
 * semantic path — schema → pattern → `buildAST` → the command. Two defects met
 * there, and neither was visible without the other:
 *
 * 1. `openSchema` gave `style` svoPosition 1, so the generated en pattern was
 *    `open [as {style}] [{patient}]`. Only the un-English `open as modal #dlg`
 *    bound the role; `open #dlg as non-modal` — OpenCommand's own documented
 *    example — parsed to `patient` alone and the variant was silently dropped.
 * 2. `non-modal` tokenizes as three tokens and folded into the EXPRESSION
 *    `non - modal` (a binaryExpression), which `parseDialogMode`'s
 *    `normalized === 'non-modal'` string compare can never match.
 *
 * Fixing (1) alone would have turned a silent default into a wrong value, so
 * these tests assert the DIALOG METHOD actually called — `show()` for
 * non-modal, `showModal()` for modal — rather than the parse shape.
 *
 * jsdom implements neither method on <dialog>, so both are stubbed; that is
 * also what makes "which one was called" observable.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

interface StubbedDialog extends HTMLElement {
  show: ReturnType<typeof vi.fn>;
  showModal: ReturnType<typeof vi.fn>;
  open: boolean;
}

function dialog(): { el: HTMLElement; dlg: StubbedDialog } {
  document.body.innerHTML = '<div id="host"></div><dialog id="dlg"></dialog>';
  const dlg = document.getElementById('dlg') as StubbedDialog;
  dlg.show = vi.fn(() => {
    dlg.open = true;
  });
  dlg.showModal = vi.fn(() => {
    dlg.open = true;
  });
  return { el: document.getElementById('host') as HTMLElement, dlg };
}

describe('open … as <mode>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('`open #dlg as non-modal` calls show(), not showModal()', async () => {
    const { el, dlg } = dialog();
    await hyperscript.eval('open #dlg as non-modal', el);

    expect(dlg.show, 'non-modal must open non-modally').toHaveBeenCalledTimes(1);
    expect(dlg.showModal).not.toHaveBeenCalled();
  });

  it('`open #dlg as modal` calls showModal()', async () => {
    const { el, dlg } = dialog();
    await hyperscript.eval('open #dlg as modal', el);

    expect(dlg.showModal).toHaveBeenCalledTimes(1);
    expect(dlg.show).not.toHaveBeenCalled();
  });

  it('`open #dlg` defaults to modal', async () => {
    const { el, dlg } = dialog();
    await hyperscript.eval('open #dlg', el);

    expect(dlg.showModal).toHaveBeenCalledTimes(1);
    expect(dlg.show).not.toHaveBeenCalled();
  });

  it('agrees with the traditional parser on the non-modal variant', async () => {
    const { el, dlg } = dialog();
    await hyperscript.eval('open #dlg as non-modal', el, { traditional: true } as never);

    expect(dlg.show).toHaveBeenCalledTimes(1);
    expect(dlg.showModal).not.toHaveBeenCalled();
  });

  it('carries the variant as a string the compare can match, not a subtraction', async () => {
    // The precise pre-fix corruption: `non-modal` reaching the runtime as
    // `{ type: 'binaryExpression', operator: '-' }`, which evaluates to NaN and
    // silently falls through to the modal default.
    const compiled = hyperscript.compileSync('open #dlg as non-modal');
    expect(compiled.errors ?? []).toHaveLength(0);

    const ast = (compiled as unknown as { ast?: Record<string, any> }).ast;
    const node = ast?.type === 'command' ? ast : ast?.commands?.[0];
    expect(node?.modifiers?.as?.type).not.toBe('binaryExpression');
  });
});
