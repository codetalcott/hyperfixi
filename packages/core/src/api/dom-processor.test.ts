/**
 * The DOM processors agree, case by case.
 *
 * Two modules compile `_` attributes: `api/dom-processor.ts` behind
 * `hyperscript.process()`, and `dom/attribute-processor.ts` behind every
 * browser bundle — eagerly by default, or through a lazy stub that compiles
 * on the first event so user activation survives. This table runs every row
 * on all three and asserts the same observable outcome from each.
 *
 * It is the gate the collapse of the processors lands under, and it has
 * already earned its keep twice (2026-09-03):
 *
 * - The API path carried its OWN listener installer and silently dropped
 *   what the runtime's grammar adds: `on click[event.shiftKey]` fired on a
 *   plain click, `on mouseenter or click` never fired on mouseenter, `on
 *   click from document` never fired at all. Both paths now hand the AST to
 *   the runtime.
 * - The lazy stub read only the event NAME from the header, so for the first
 *   event it ignored a filter (fired on a plain click), listened for the first
 *   name of an `or` list only, and never saw `from <target>` at all. Those
 *   shapes now fall back to eager processing.
 *
 * Strict: every row asserts the OBSERVABLE outcome, never that a function was
 * called. The `logAll` row is the one feature the old API installer had that
 * the runtime did not; it moved into the runtime, so the bundle path gets it.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { hyperscript } from './hyperscript-api';
import { AttributeProcessor, defaultAttributeProcessor } from '../dom/attribute-processor';

type Install = (el: HTMLElement) => Promise<void>;
const PATHS: Array<[string, Install]> = [
  ['hyperscript.process', async el => void hyperscript.process(el)],
  ['attribute processor', async el => defaultAttributeProcessor.processElement(el)],
  [
    'attribute processor (lazy)',
    async () => {
      // scanAndProcessAll walks the document; `run` has emptied the body
      // first, so the one element under test is the only thing it finds.
      await new AttributeProcessor({ autoScan: false, lazyParsing: true }).scanAndProcessAll();
    },
  ],
];

/** Build the element, let `prepare` attach observers, install, settle, fire, settle. */
async function run(
  code: string,
  install: Install,
  fire: (el: HTMLElement) => void,
  prepare: (el: HTMLElement) => void = () => {}
) {
  document.body.innerHTML = '';
  const el = document.createElement('button');
  el.setAttribute('_', code);
  document.body.appendChild(el);
  prepare(el);
  await install(el);
  await new Promise(r => setTimeout(r, 10));
  fire(el);
  await new Promise(r => setTimeout(r, 10));
  return el;
}

const click = (el: HTMLElement) => el.click();

afterEach(() => {
  document.body.innerHTML = '';
  delete (window as Window & { __seen?: unknown }).__seen;
  delete (window as Window & { __fired?: unknown }).__fired;
});

describe('every processor honours the event grammar the runtime installs', () => {
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
      // The SECOND name of the list, as the FIRST event: a stub listening for
      // `mouseenter` only would lose it.
      'on mouseenter or click add .either',
      click,
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
      // `(args)` destructures event properties into locals — a header feature
      // a stub that skips the header cannot reproduce.
      'on click(type) put type into me',
      click,
      el => el.textContent === 'click',
      true,
    ],
    [
      'on click add .a then add .b',
      click,
      el => el.classList.contains('a') && el.classList.contains('b'),
      true,
    ],
    [
      // The handler body sees the SAME Event object that was dispatched — the
      // one whose `isTrusted` and user activation the lazy stub exists to keep.
      // A stub that re-dispatched a synthetic event would fail this row.
      'on click set window.__seen to event',
      el => {
        const fired = new MouseEvent('click', { bubbles: true });
        (window as Window & { __fired?: Event }).__fired = fired;
        el.dispatchEvent(fired);
      },
      () => {
        const w = window as Window & { __seen?: unknown; __fired?: Event };
        return w.__seen !== undefined && w.__seen === w.__fired;
      },
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

describe('the element lifecycle (upstream 0.9.90) is the same on every path', () => {
  const CODE = 'on click add .c';

  for (const [label, install] of PATHS) {
    it(`${label}: hyperscript:before:init then hyperscript:after:init, once each, carrying the code`, async () => {
      const seen: Array<[string, unknown]> = [];
      const el = await run(CODE, install, click, el => {
        for (const name of ['hyperscript:before:init', 'hyperscript:after:init']) {
          el.addEventListener(name, e => seen.push([name, (e as CustomEvent).detail?.code]));
        }
      });
      expect(seen).toEqual([
        ['hyperscript:before:init', CODE],
        ['hyperscript:after:init', CODE],
      ]);
      expect(el.classList.contains('c')).toBe(true);
    });

    it(`${label}: a canceled hyperscript:before:init installs nothing and marks nothing`, async () => {
      const after = vi.fn();
      const el = await run(CODE, install, click, el => {
        el.addEventListener('hyperscript:before:init', e => e.preventDefault());
        el.addEventListener('hyperscript:after:init', after);
      });
      expect(el.classList.contains('c')).toBe(false);
      expect(el.hasAttribute('data-hyperscript-powered')).toBe(false);
      expect(after).not.toHaveBeenCalled();
    });

    it(`${label}: sets data-hyperscript-powered`, async () => {
      const el = await run(CODE, install, () => {});
      expect(el.hasAttribute('data-hyperscript-powered')).toBe(true);
    });
  }
});

describe('config.logAll logs a line per handler fired, on every path', () => {
  for (const [label, install] of PATHS) {
    it(label, async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        hyperscript.config.logAll = true;
        const el = await run('on click add .c', install, click);
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
