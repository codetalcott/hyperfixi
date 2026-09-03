/**
 * `hyperscript.process()` installs handlers the way the bundle does.
 *
 * Two DOM processors compile `_` attributes: `api/dom-processor.ts` behind
 * `hyperscript.process()`, and `dom/attribute-processor.ts` behind every
 * browser bundle. The bundle path hands an `eventHandler` AST to the runtime,
 * which installs the listener with the full event grammar. The API path used
 * to carry its OWN installer — `addEventListener(eventType, …)` plus the body
 * — and it silently dropped everything the grammar adds (measured
 * 2026-09-03): `on click[event.shiftKey]` fired on a plain click, `on
 * mouseenter or click` never fired on mouseenter, `on click from document`
 * never fired at all. Both paths now hand the AST to the runtime; this file
 * pins that they agree, case by case.
 *
 * Strict: every row asserts the OBSERVABLE outcome on both paths and that the
 * two outcomes match. The `logAll` row is the one feature the old installer
 * had that the runtime did not; it moved into the runtime, so the bundle
 * path gets it too.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { hyperscript } from './hyperscript-api';
import { defaultAttributeProcessor } from '../dom/attribute-processor';

type Install = (el: HTMLElement) => Promise<void>;
const PATHS: Array<[string, Install]> = [
  ['hyperscript.process', async el => void hyperscript.process(el)],
  ['attribute processor', async el => defaultAttributeProcessor.processElement(el)],
];

async function run(code: string, install: Install, fire: (el: HTMLElement) => void) {
  document.body.innerHTML = '';
  const el = document.createElement('button');
  el.setAttribute('_', code);
  document.body.appendChild(el);
  await install(el);
  await new Promise(r => setTimeout(r, 10));
  fire(el);
  await new Promise(r => setTimeout(r, 10));
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('hyperscript.process() honours the event grammar the runtime installs', () => {
  const cases: Array<[string, (el: HTMLElement) => void, (el: HTMLElement) => boolean, boolean]> = [
    [
      'on click[event.shiftKey] add .x',
      el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })),
      el => el.classList.contains('x'),
      false, // a plain click does not satisfy the filter
    ],
    [
      'on click[event.shiftKey] add .x',
      el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true })),
      el => el.classList.contains('x'),
      true,
    ],
    [
      'on mouseenter or click add .either',
      el => el.dispatchEvent(new Event('mouseenter')),
      el => el.classList.contains('either'),
      true,
    ],
    [
      'on click from document add .fromdoc',
      () => document.dispatchEvent(new Event('click', { bubbles: true })),
      el => el.classList.contains('fromdoc'),
      true,
    ],
    [
      'on click add .a then add .b',
      el => el.click(),
      el => el.classList.contains('a') && el.classList.contains('b'),
      true,
    ],
  ];

  for (const [code, fire, read, expected] of cases) {
    for (const [label, install] of PATHS) {
      it(`${label}: ${code} → ${expected}`, async () => {
        const el = await run(code, install, fire);
        expect(read(el)).toBe(expected);
      });
    }
  }
});

describe('config.logAll logs a line per handler fired, on both paths', () => {
  for (const [label, install] of PATHS) {
    it(label, async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        hyperscript.config.logAll = true;
        const el = await run('on click add .c', install, el => el.click());
        expect(el.classList.contains('c')).toBe(true);
        expect(logSpy).toHaveBeenCalledWith(
          '[hyperfixi]',
          'click',
          expect.anything(),
          expect.anything()
        );
      } finally {
        hyperscript.config.logAll = false;
        logSpy.mockRestore();
      }
    });
  }
});
