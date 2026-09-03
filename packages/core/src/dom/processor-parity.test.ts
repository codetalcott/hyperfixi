/**
 * The DOM processor's entry points agree, case by case.
 *
 * One module compiles `_` attributes — `dom/attribute-processor.ts` — behind
 * three entries: `hyperscript.process()`, the bundles' eager scan, and the
 * lazy stub that compiles on the first event so user activation survives.
 * This table runs every row on all three and asserts the same observable
 * outcome from each.
 *
 * It was the gate the collapse of the two former processors landed under
 * (`api/dom-processor.ts`, deleted 2026-09-03), and it earned its keep on
 * the way:
 *
 * - The API path carried its OWN listener installer and silently dropped
 *   what the runtime's grammar adds: `on click[event.shiftKey]` fired on a
 *   plain click, `on mouseenter or click` never fired on mouseenter, `on
 *   click from document` never fired at all.
 * - The bundle path never dispatched `hyperscript:before:init` / `after:init`
 *   and never set `data-hyperscript-powered`; both lived only in the API path.
 * - The lazy stub read only the event NAME from the header, so for the first
 *   event it ignored a filter, listened for the first name of an `or` list
 *   only, and never saw `from <target>`. Those shapes now go eager.
 * - `cleanup(container)` stripped the root's marker only; a second lazy scan
 *   registered a second stub; "processed" was per-instance state.
 *
 * Strict: every row asserts the OBSERVABLE outcome, never that a function was
 * called. The `logAll` row is the one feature the old API installer had that
 * the runtime did not; it moved into the runtime, so every path gets it.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { hyperscript, config } from '../api/hyperscript-api';
import { AttributeProcessor, defaultAttributeProcessor } from './attribute-processor';

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
  config.onCompileError = null;
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

describe('the load event and compile-error reporting are the same on every path', () => {
  for (const [label, install] of PATHS) {
    it(`${label}: dispatches a non-bubbling load event on the element once it is processed`, async () => {
      const onElement = vi.fn();
      const onBody = vi.fn();
      const el = await run('on click add .c', install, click, el => {
        el.addEventListener('load', onElement);
        document.body.addEventListener('load', onBody);
      });
      expect(el.classList.contains('c')).toBe(true);
      expect(onElement).toHaveBeenCalledOnce();
      expect(onBody).not.toHaveBeenCalled();
    });

    it(`${label}: an unparseable attribute is reported three ways and installs nothing`, async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const hook = vi.fn();
      const event = vi.fn();
      config.onCompileError = hook;
      try {
        const el = await run('on click klaatu barada nikto (((', install, click, el => {
          el.addEventListener('hyperfixi:compile-error', event);
        });
        expect(errorSpy).toHaveBeenCalledWith(
          '[LokaScript] Compilation failed for _= attribute:',
          expect.arrayContaining([expect.objectContaining({ message: expect.any(String) })]),
          el
        );
        expect(hook).toHaveBeenCalledOnce();
        expect(hook.mock.calls[0][0]).toMatchObject({ source: 'attribute', element: el });
        expect(event).toHaveBeenCalledOnce();
        expect((event.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
          source: 'attribute',
          code: 'on click klaatu barada nikto (((',
        });
      } finally {
        errorSpy.mockRestore();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Tree-level: `hyperscript.process(container)` against the bundle's scan.
// ---------------------------------------------------------------------------

type InstallTree = (container: HTMLElement) => Promise<void>;
// One lazy processor for the whole tree table, as the bundle has one: the
// "twice" and cleanup rows are about a processor's memory of an element.
const lazyTreeProcessor = new AttributeProcessor({ autoScan: false, lazyParsing: true });
const TREE_PATHS: Array<[string, InstallTree]> = [
  ['hyperscript.process', async c => void hyperscript.process(c)],
  ['attribute processor', async () => defaultAttributeProcessor.scanAndProcessAll()],
  ['attribute processor (lazy)', async () => lazyTreeProcessor.scanAndProcessAll()],
];

const tick = () => new Promise(r => setTimeout(r, 10));

function tree(html: string): HTMLElement {
  document.body.innerHTML = '';
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

describe('a tree is processed the same way by hyperscript.process() and the bundle scan', () => {
  for (const [label, install] of TREE_PATHS) {
    it(`${label}: a global <script type="text/hyperscript"> defines a behavior an element below installs`, async () => {
      const c = tree(`
        <script type="text/hyperscript">
          behavior Parity()
            on click
              add .installed to me
            end
          end
        </script>
        <button _="install Parity">b</button>`);
      await install(c);
      await tick();
      const b = c.querySelector('button')!;
      b.click();
      await tick();
      expect(b.classList.contains('installed')).toBe(true);
    });

    it(`${label}: <script for="#id"> binds its handler to the target with me = the target`, async () => {
      const c = tree(`
        <script type="text/hyperscript" for="#tgt">on click add .s to me</script>
        <button id="tgt">t</button>`);
      await install(c);
      await tick();
      const b = c.querySelector('#tgt') as HTMLElement;
      b.click();
      await tick();
      expect(b.classList.contains('s')).toBe(true);
    });

    it(`${label}: processing the same tree twice installs each handler once`, async () => {
      const c = tree(`<button _="on click toggle .t">b</button>`);
      await install(c);
      await install(c);
      await tick();
      const b = c.querySelector('button')!;
      b.click();
      await tick();
      // A doubled install would toggle twice and leave the class absent.
      expect(b.classList.contains('t')).toBe(true);
    });

    it(`${label}: after hyperscript.cleanup() the tree is inert, and process() re-initializes it once`, async () => {
      const c = tree(`<button _="on click toggle .t">b</button>`);
      await install(c);
      await tick();
      const b = c.querySelector('button')!;

      hyperscript.cleanup(c);
      b.click();
      await tick();
      expect(b.classList.contains('t')).toBe(false);
      expect(b.hasAttribute('data-hyperscript-powered')).toBe(false);

      await install(c);
      await tick();
      b.click();
      await tick();
      expect(b.classList.contains('t')).toBe(true);
    });

    it(`${label}: two handler attributes are installed before the call returns`, async () => {
      const c = tree(
        `<button _="on click add .one">1</button><button _="on click add .two">2</button>`
      );
      const started = install(c); // deliberately NOT awaited before the clicks
      const [b1, b2] = Array.from(c.querySelectorAll('button'));
      b1.click();
      b2.click();
      await started;
      await tick();
      expect(b1.classList.contains('one')).toBe(true);
      expect(b2.classList.contains('two')).toBe(true);
    });
  }
});

describe('the MutationObserver takes the same entry as hyperscript.process()', () => {
  it('a subtree appended at runtime has its script tag run before the element that installs what it defines', async () => {
    const processor = new AttributeProcessor({ autoScan: false });
    await processor.init(); // no scan; installs the observer
    try {
      const c = document.createElement('div');
      c.innerHTML = `
        <script type="text/hyperscript">
          behavior Observed()
            on click
              add .observed to me
            end
          end
        </script>
        <button _="install Observed">b</button>`;
      document.body.appendChild(c);
      await tick();
      await tick();
      const b = c.querySelector('button')!;
      b.click();
      await tick();
      expect(b.classList.contains('observed')).toBe(true);
    } finally {
      processor.destroy();
    }
  });

  it('hyperscript.process() on a script tag itself runs it', async () => {
    document.body.innerHTML = '';
    const target = document.createElement('button');
    target.id = 'script-root-target';
    document.body.appendChild(target);
    const script = document.createElement('script');
    script.type = 'text/hyperscript';
    script.setAttribute('for', '#script-root-target');
    script.textContent = 'on click add .from-script-root to me';
    document.body.appendChild(script);

    hyperscript.process(script);
    await tick();
    target.click();
    await tick();
    expect(target.classList.contains('from-script-root')).toBe(true);
  });
});
