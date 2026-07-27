/**
 * event-filter-execution.test.ts
 *
 * Event filters (`on keydown[key=='Escape'] …`) must gate the handler body.
 *
 * The parser has always delivered the bracketed expression as
 * `EventHandlerNode.condition`, but the runtime never consumed it — every
 * filtered handler ran UNFILTERED. Found by the shipped-examples execution
 * gate: `on keydown[key=='Escape'] from window hide .modal-overlay`
 * (examples/dialogs/modal.html) hid every modal on ANY key, while upstream
 * `hyperscript.org` correctly did nothing. No parse-level gate could see it:
 * the AST was perfect, the behavior was wrong.
 *
 * Upstream semantics pinned here: bare identifiers in the filter resolve to
 * properties of the event (`key`, `shiftKey`), destructured args are in scope
 * (`on boom(x)[x > 3]`), and an unmet — or throwing — filter means the body
 * does not run. These assert the DOM, because that is where the damage was.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { hyperscript } from './hyperscript-api.js';

function setupTarget(): HTMLElement {
  document.body.innerHTML = '<button id="host">go</button><div id="target"></div>';
  return document.getElementById('host') as HTMLElement;
}

const target = (): HTMLElement => document.getElementById('target') as HTMLElement;

const settle = () => new Promise(r => setTimeout(r, 20));

describe('event filters gate the handler body', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does NOT run when the key filter is unmet', async () => {
    // THE case: this shipped in modal.html and ran on every key.
    const host = setupTarget();
    await hyperscript.eval("on keydown[key=='Escape'] add .ef-esc to #target", host);

    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await settle();
    expect(target().classList.contains('ef-esc')).toBe(false);
  });

  it('runs when the key filter is met', async () => {
    const host = setupTarget();
    await hyperscript.eval("on keydown[key=='Escape'] add .ef-esc2 to #target", host);

    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(target().classList.contains('ef-esc2')).toBe(true);
  });

  it('resolves a bare boolean event property (shiftKey)', async () => {
    const host = setupTarget();
    await hyperscript.eval('on click[shiftKey] add .ef-shift to #target', host);

    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(target().classList.contains('ef-shift')).toBe(false);

    host.dispatchEvent(new MouseEvent('click', { shiftKey: true, bubbles: true }));
    await settle();
    expect(target().classList.contains('ef-shift')).toBe(true);
  });

  it('sees destructured event args in the filter', async () => {
    // Args are bound BEFORE the filter runs, so `on boom(x)[x > 3]` works —
    // x comes from event.detail per the arg-destructuring rules.
    const host = setupTarget();
    await hyperscript.eval('on boom(x)[x > 3] add .ef-big to #target', host);

    host.dispatchEvent(new CustomEvent('boom', { bubbles: true, detail: { x: 1 } }));
    await settle();
    expect(target().classList.contains('ef-big')).toBe(false);

    host.dispatchEvent(new CustomEvent('boom', { bubbles: true, detail: { x: 5 } }));
    await settle();
    expect(target().classList.contains('ef-big')).toBe(true);
  });

  it('treats a filter naming a nonexistent property as unmet, without crashing', async () => {
    const host = setupTarget();
    await hyperscript.eval('on click[definitelyNotAProperty] add .ef-never to #target', host);

    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(target().classList.contains('ef-never')).toBe(false);
  });

  it('leaves unfiltered handlers untouched', async () => {
    // The over-correction guard: a handler with no filter must run exactly as
    // before.
    const host = setupTarget();
    await hyperscript.eval('on click add .ef-always to #target', host);

    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(target().classList.contains('ef-always')).toBe(true);
  });

  it('KNOWN GAP: a filter on an or-joined handler applies to NO leg', async () => {
    // The parser attaches one `condition` to the whole node even when the
    // filter belongs to a single leg (`on click or keydown[key=='Enter']` —
    // upstream filters ONLY keydown). Gating every leg on it would break the
    // unfiltered click leg, so multi-event handlers deliberately keep their
    // historical unfiltered behavior until conditions are per-event. Pinned so
    // the eventual per-event fix is a deliberate, visible change — both halves
    // below flip when it lands.
    const host = setupTarget();
    await hyperscript.eval("on click or keydown[key=='Enter'] add .ef-multi to #target", host);

    // The click leg must keep running (upstream: unfiltered).
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(target().classList.contains('ef-multi')).toBe(true);

    // The keydown leg ALSO runs on a wrong key (upstream would filter it) —
    // the documented gap, not an endorsement.
    target().classList.remove('ef-multi');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await settle();
    expect(target().classList.contains('ef-multi')).toBe(true);
  });

  it('gates the shipped modal shape: keydown[key==Escape] from window', async () => {
    // examples/dialogs/modal.html:—the source the execution gate flagged.
    // Unique class name because the window-target listener outlives this test.
    document.body.innerHTML = '<button id="host">go</button><div class="ef-modal"></div>';
    const host = document.getElementById('host') as HTMLElement;
    const modal = document.querySelector('.ef-modal') as HTMLElement;
    await hyperscript.eval("on keydown[key=='Escape'] from window hide .ef-modal", host);

    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await settle();
    expect(modal.style.display).not.toBe('none');

    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(modal.style.display).toBe('none');
  });
});
