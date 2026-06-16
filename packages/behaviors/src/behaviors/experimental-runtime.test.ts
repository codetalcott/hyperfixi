// @vitest-environment happy-dom
/**
 * Experimental behaviors — REAL runtime tests.
 *
 * Draggable / Sortable / Resizable used to run imperative JS installers. They now
 * compile from their hyperscript `source` like every other behavior (the
 * "no imperative JS" rule — no behavior may carry an imperative installer field).
 * These tests are the "parses ≠ works" guard: register → install → drive pointer
 * events → assert the DOM effect AND the documented lifecycle events.
 *
 * happy-dom has no PointerEvent and zero layout, so we drive `MouseEvent`s (which
 * carry clientX/clientY) and assert deltas, which are layout-independent.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { hyperscript } from '@hyperfixi/core';
import { registerDraggable } from './draggable';
import { registerSortable } from './sortable';
import { registerResizable } from './resizable';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hf = hyperscript as any;
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

function pointer(type: string, x: number, y: number): MouseEvent {
  return new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true });
}

async function install(code: string, el: HTMLElement): Promise<void> {
  const r = hyperscript.compileSync(code, { traditional: true });
  if (!r.ok) throw new Error(`install compile failed: ${JSON.stringify(r.errors)}`);
  await hyperscript.execute(r.ast, hyperscript.createContext(el));
}

beforeAll(async () => {
  await registerDraggable(hf);
  await registerSortable(hf);
  await registerResizable(hf);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Draggable — runtime (source-compiled)', () => {
  it('moves the element by the pointer delta and fires start/move/end', async () => {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = '0px';
    el.style.top = '0px';
    document.body.appendChild(el);

    const ev: string[] = [];
    el.addEventListener('draggable:start', () => ev.push('start'));
    el.addEventListener('draggable:move', () => ev.push('move'));
    el.addEventListener('draggable:end', () => ev.push('end'));

    await install('install Draggable', el);

    el.dispatchEvent(pointer('pointerdown', 10, 10));
    await tick();
    document.dispatchEvent(pointer('pointermove', 60, 80));
    await tick();
    document.dispatchEvent(pointer('pointerup', 60, 80));
    await tick(40);

    // measure x/y = 0 in happy-dom → xoff = 10, so left = 60 - 10 = 50, top = 80 - 10 = 70
    expect(el.style.left).toBe('50px');
    expect(el.style.top).toBe('70px');
    expect(ev).toContain('start');
    expect(ev).toContain('move');
    expect(ev).toContain('end');
  });
});

describe('Sortable — runtime (source-compiled)', () => {
  it('toggles the drag class on the <li> and fires start/move/end', async () => {
    const ul = document.createElement('ul');
    ul.innerHTML = '<li id="a">A</li><li id="b">B</li>';
    document.body.appendChild(ul);

    const ev: string[] = [];
    ul.addEventListener('sortable:start', () => ev.push('start'));
    ul.addEventListener('sortable:move', () => ev.push('move'));
    ul.addEventListener('sortable:end', () => ev.push('end'));

    await install('install Sortable', ul);

    const li = ul.querySelector('#a') as HTMLElement;
    li.dispatchEvent(pointer('pointerdown', 0, 5));
    await tick();
    const classDuringDrag = li.classList.contains('sorting');
    document.dispatchEvent(pointer('pointermove', 0, 40));
    await tick();
    document.dispatchEvent(pointer('pointerup', 0, 40));
    await tick(40);

    expect(classDuringDrag).toBe(true); // dragClass added on pointerdown
    expect(li.classList.contains('sorting')).toBe(false); // removed on pointerup
    expect(ev).toContain('start');
    expect(ev).toContain('move');
    expect(ev).toContain('end');
  });
});

describe('Resizable — runtime (source-compiled)', () => {
  it('resizes by the pointer delta and fires start/resize/end', async () => {
    const box = document.createElement('div');
    box.style.width = '100px';
    box.style.height = '100px';
    document.body.appendChild(box);

    const ev: string[] = [];
    box.addEventListener('resizable:start', () => ev.push('start'));
    box.addEventListener('resizable:resize', () => ev.push('resize'));
    box.addEventListener('resizable:end', () => ev.push('end'));

    await install(
      'install Resizable(minWidth: 10, minHeight: 10, maxWidth: 999, maxHeight: 999)',
      box
    );

    box.dispatchEvent(pointer('pointerdown', 10, 10));
    await tick();
    document.dispatchEvent(pointer('pointermove', 60, 40));
    await tick();
    document.dispatchEvent(pointer('pointerup', 60, 40));
    await tick(40);

    // measure width/height = 0 in happy-dom → newWidth = 0 + 60 - 10 = 50, newHeight = 0 + 40 - 10 = 30
    expect(box.style.width).toBe('50px');
    expect(box.style.height).toBe('30px');
    expect(ev).toContain('start');
    expect(ev).toContain('resize');
    expect(ev).toContain('end');
  });
});
