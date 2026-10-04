/**
 * Direct-path shapes on the text path.
 *
 * Core's `src/multilingual/*-direct-path.test.ts` files each pin a shape core's
 * multilingual DIRECT path ran: an English source rendered into the 23
 * languages, compiled with `{ language }` on core (`parseSemantic → buildAST`),
 * installed in a fixture and triggered. That path retires with core's parser
 * (Phase C6 of the engine cutover); text is the interchange. This gate runs the
 * same cases — extracted once into `direct-path-shapes.cases.json` (287 of the
 * 316; the other 29 assert only on an AST) — the way the product now runs a
 * translation: the foreign text AS WRITTEN on `@hyperfixi/engine`, with
 * `@lokascript/hyperscript-adapter`'s plugin installed and `lang` on <html>.
 *
 * The oracle is upstream `_hyperscript` running the English source. Where
 * upstream rejects the English (a core-only form the reader still accepts),
 * the reference is upstream running the English the adapter wrote, which
 * holds the renderer to upstream's spelling (`tell #m to show` is written
 * `tell #m show end`).
 *
 * A run's signature is the effect-signature diff of the body, with text nodes
 * normalized first (each `append` adds one, and the signature reads leaf text
 * only for an element with a single text child), plus a log of the calls a
 * DOM diff cannot show: `fetch`, `history.back/forward`, `window.open`,
 * `scrollIntoView`, `scrollTo`, and `location.hash`.
 *
 * One jsdom window for the whole run, as in a browser: upstream resolves
 * `document` through the window it saw when it loaded, so a window per run
 * would point its `from document` at a stale one. Node owns a global
 * `EventTarget`, which the globals bootstrap leaves alone; upstream's
 * `wait for` checks `instanceof EventTarget`, so it is pointed at jsdom's for
 * the run.
 *
 * KNOWN lists the cases that fail, each with why. The gate fails on a case
 * that fails and is not listed, and on a listed case that passes: the list
 * only shrinks.
 *
 * Node-only (the node vitest environment; see the shipped-examples gate).
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { snapshot, diffSnapshots } from './effect-signature';
import { installGlobals } from './shipped-examples-execution';
import { FOREIGN_LANGUAGES } from './value-matrix';

export interface DirectPathCase {
  /** `<core test file stem>#<n>`. */
  id: string;
  /** The English source the core test rendered into each language. */
  source: string;
  fixture: string;
  /** The element the handler is installed on (default `button`). */
  installOn: string | null;
  event: string | null;
  /** The languages the core test ran; `[]` = English only. */
  languages: 'all23' | string[];
}

const CASES_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'direct-path-shapes.cases.json'
);

export function loadDirectPathCases(): DirectPathCase[] {
  return JSON.parse(readFileSync(CASES_PATH, 'utf8')) as DirectPathCase[];
}

/**
 * The cases that fail, and why. `core-only`: upstream rejects the English and
 * the renderer has no upstream spelling for it yet (the renderer half of the
 * "reader accepts, renderer writes upstream" decision, C2c). `renderer`: the
 * render back to English loses the shape. `vacuous`: neither engine does
 * anything, so there is nothing to compare.
 */
export const KNOWN: Readonly<
  Record<string, { family: 'core-only' | 'renderer' | 'vacuous'; reason: string }>
> = {
  'condition-copula-direct-path#7': { family: 'core-only', reason: '`#d1 has .x`' },
  'condition-copula-direct-path#8': { family: 'core-only', reason: '`#d1 has .y`' },
  'condition-phrases-direct-path#95': { family: 'core-only', reason: '`#d1 has .x`' },
  'condition-phrases-direct-path#96': { family: 'core-only', reason: '`#d1 has .y`' },
  'condition-phrases-direct-path#97': {
    family: 'core-only',
    reason: '`#d1 have .x`, English only',
  },
  'condition-phrases-direct-path#98': {
    family: 'core-only',
    reason: '`#d1 have .y`, English only',
  },
  'fetch-do-not-throw-direct-path#1': { family: 'core-only', reason: '`fetch … do not throw`' },
  'naked-url-interpolation-direct-path#1': {
    family: 'core-only',
    reason: 'a spaced `${…}` in a naked URL (OPEN_ITEMS 2j D4: write a template literal)',
  },
  'possessive-values-direct-path#6': {
    family: 'core-only',
    reason: '`prepend` (OPEN_ITEMS 2j D5: `put … at start of`)',
  },
  'go-direct-path#5': {
    family: 'renderer',
    reason:
      '`go to /x in new window` renders back as `go "/x" in new window`, which goes nowhere: a string destination needs `url`',
  },
  'go-direct-path#2': {
    family: 'vacuous',
    reason: '`go forward` calls nothing on either engine (core-only)',
  },
  'class-query-scope-direct-path#4': {
    family: 'vacuous',
    reason: '`if .item is in #list` changes nothing on upstream; English only',
  },
};

type Step =
  | {
      ev: string;
      init?: Record<string, unknown>;
      /** Dispatch on the document instead of the install target. */
      onDocument?: boolean;
      ctor?: 'CustomEvent' | 'KeyboardEvent' | 'MouseEvent';
    }
  | { settle: number };

const settle = (ms: number): Step => ({ settle: ms });
const click: Step = { ev: 'click', ctor: 'MouseEvent', init: { bubbles: true } };
const key = (ev: string, init: Record<string, unknown> = {}): Step => ({
  ev,
  ctor: 'KeyboardEvent',
  init: { bubbles: true, ...init },
});

/** How long a plain case settles after its event (ms). */
const SETTLE_MS = 15;

/**
 * Each case's events, as its core test sends them. A case with several
 * variants runs each on a fresh install. Default: the case's event, bubbling,
 * then SETTLE_MS.
 */
const SCRIPTS: Readonly<Record<string, Step[][]>> = {
  'custom-or-event-direct-path#1': [
    [{ ev: 'myEvent', ctor: 'CustomEvent', init: { bubbles: true } }, settle(SETTLE_MS)],
  ],
  'fetch-do-not-throw-direct-path#1': [[click, settle(30)]],
  'fetch-response-type-direct-path#1': [[click, settle(30)]],
  'naked-url-interpolation-direct-path#1': [[{ ev: 'input', init: { bubbles: true } }, settle(30)]],
  'handler-head-direct-path#1': [
    [click, settle(SETTLE_MS)],
    [key('keydown'), settle(SETTLE_MS)],
  ],
  'handler-head-direct-path#2': [
    [key('keydown', { key: 'Escape' }), settle(SETTLE_MS)],
    [key('keydown', { key: 'a' }), settle(SETTLE_MS)],
  ],
  'handler-head-direct-path#3': [
    [{ ev: 'click', ctor: 'MouseEvent', init: { clientX: 42, bubbles: true } }, settle(SETTLE_MS)],
  ],
  'handler-head-direct-path#4': [
    [
      { ev: 'myEvent', ctor: 'CustomEvent', init: { detail: 'D', bubbles: true } },
      settle(SETTLE_MS),
    ],
  ],
  'handler-head-direct-path#5': [
    [
      { ev: 'mousemove', ctor: 'MouseEvent', init: { clientX: 4, bubbles: true } },
      settle(SETTLE_MS),
    ],
  ],
  'handler-head-direct-path#6': [[key('keydown', { key: 'q' }), settle(SETTLE_MS)]],
  'on-first-click-direct-path#1': [[click, settle(SETTLE_MS), click, settle(SETTLE_MS)]],
  'until-loop-direct-path#1': [[click, settle(120)]],
  'until-loop-direct-path#2': [[click, settle(120)]],
  'wait-direct-path#1': [[click, settle(20), key('keyup'), settle(20)]],
  'wait-direct-path#2': [[click, settle(40)]],
  'wait-direct-path#3': [
    [
      click,
      settle(20),
      { ev: 'pointermove', ctor: 'MouseEvent', onDocument: true, init: { clientX: 7 } },
      settle(20),
    ],
  ],
  'wait-direct-path#4': [[click, settle(60)]],
  'wait-direct-path#5': [
    [
      { ev: 'pointerdown', ctor: 'MouseEvent', init: { clientX: 3 } },
      settle(20),
      { ev: 'pointerdown', ctor: 'MouseEvent', init: { clientX: 5 } },
      settle(20),
    ],
  ],
  'wait-direct-path#6': [
    [
      click,
      settle(20),
      { ev: 'mousemove', ctor: 'MouseEvent', init: { bubbles: true } },
      settle(20),
    ],
  ],
};

function scriptOf(c: DirectPathCase): Step[][] {
  return (
    SCRIPTS[c.id] ?? [[{ ev: c.event ?? 'click', init: { bubbles: true } }, settle(SETTLE_MS)]]
  );
}

/** What this needs of a host that reads scripts off attributes. */
interface ScriptHost {
  parse(source: string): { errors?: Array<{ message: string }> } | undefined;
  processNode(element: Element): void;
  evaluate(source: string): unknown;
}

export interface PairResult {
  lang: string;
  /** The translation, as the core test wrote it: `render(parse_en(source), lang)`. */
  written: string | null;
  /** The adapter's English for it. */
  english: string;
  /** The translation on the engine. */
  got: string;
  /** What it must equal: upstream's result for the English (or for `english`). */
  ref: string;
  ok: boolean;
}

export interface DirectPathResult {
  id: string;
  /** Upstream on the English source (the oracle), or why there is none. */
  want: string;
  /** The engine on the English source. */
  eng: string;
  pairs: PairResult[];
}

const EMPTY = /^∅( ‖ ∅)*$/;

/** Whether a case fails: no usable oracle, the engine's English differs, or a pair differs. */
export function caseFails(r: DirectPathResult): boolean {
  if (r.want.startsWith('✗') || EMPTY.test(r.want)) {
    return r.pairs.length === 0 || r.pairs.some(p => !p.ok);
  }
  return r.eng !== r.want || r.pairs.some(p => !p.ok);
}

export interface DirectPathHosts {
  runCase(c: DirectPathCase): Promise<DirectPathResult>;
  /** Restore the console, the rejection listeners and EventTarget. */
  close(): Promise<void>;
}

/**
 * Load upstream and the engine (with the plugin) on one jsdom window. Until
 * `close()` the console is silenced and unhandled rejections are trapped:
 * failing lanes fail by design and both engines report on the console.
 */
export async function initDirectPathHosts(): Promise<DirectPathHosts> {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost/',
  });
  installGlobals(dom);
  const g = globalThis as Record<string, unknown>;
  const savedEventTarget = g.EventTarget;
  const window = dom.window;
  g.EventTarget = window.EventTarget;

  const saved = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };
  const quiet = (): void => {};
  console.log = console.warn = console.error = console.info = quiet;
  const rejectionListeners = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', quiet);

  // The calls a DOM diff cannot show, logged per run.
  const calls: string[] = [];
  let fetchStatus = 200;
  const fetchStub = async (url: unknown): Promise<Response> => {
    calls.push(`fetch ${String(url)}`);
    return fetchStatus === 200
      ? new Response('found')
      : new Response('gone', { status: fetchStatus, statusText: 'Not Found' });
  };
  Reflect.set(window, 'fetch', fetchStub);
  g.fetch = fetchStub;
  Object.defineProperty(window.history, 'back', { value: () => calls.push('history.back') });
  Object.defineProperty(window.history, 'forward', {
    value: () => calls.push('history.forward'),
  });
  Reflect.set(window, 'open', (...args: unknown[]) => {
    calls.push(`open ${args.map(String).join(',')}`);
    return null;
  });
  Reflect.set(window, 'scrollTo', (...args: unknown[]) => {
    calls.push(`scrollTo ${JSON.stringify(args)}`);
  });
  window.Element.prototype.scrollIntoView = function (this: Element, options?: unknown) {
    calls.push(
      `scrollIntoView ${this.id || this.tagName.toLowerCase()} ${JSON.stringify(options ?? null)}`
    );
  };

  const require = createRequire(import.meta.url);
  const esm = require.resolve('hyperscript.org').replace(/[^/\\]+$/, '_hyperscript.esm.js');
  const upstream = (await import(pathToFileURL(esm).href)).default as ScriptHost;
  const engineModule = await import('@hyperfixi/engine');
  engineModule.register(...engineModule.everything);
  const { hyperscriptI18n, preprocess } = await import('@lokascript/hyperscript-adapter');
  engineModule.api.use(hyperscriptI18n());
  const engine: ScriptHost = engineModule.api;
  const { parseSemantic, render } = await import('@lokascript/semantic');

  const document = window.document;
  let behaviorSerial = 0;
  const letter = (n: number): string => String.fromCharCode(65 + (n % 26));

  /** One run: a fresh body, the handler installed, the steps sent; the signature. */
  const run = async (
    host: ScriptHost,
    c: DirectPathCase,
    code: string,
    lang: string,
    steps: Step[]
  ): Promise<string> => {
    calls.length = 0;
    fetchStatus = c.id.startsWith('fetch-do-not-throw') ? 404 : 200;
    window.history.replaceState(null, '', '/');
    document.documentElement.removeAttribute('lang');
    try {
      let install = code;
      if (c.id.startsWith('behavior-handlers')) {
        // The source defines a behavior: define it (under a fresh name), then
        // install it in English, as the core test does.
        const name = `Demo${letter(behaviorSerial)}${letter(Math.floor(behaviorSerial / 26))}`;
        behaviorSerial++;
        const definition = code.replace(/Demo[A-Z]+/g, name);
        host.evaluate(lang === 'en' ? definition : preprocess(definition, lang));
        install = `install ${name}(h: 1)`;
        lang = 'en';
      }
      document.body.innerHTML = c.fixture;
      if (c.id === 'variable-targets-direct-path#5') {
        document
          .querySelectorAll('.x')
          .forEach((el: Element) => el.addEventListener('foo', () => el.classList.add('got')));
      }
      if (lang !== 'en') document.documentElement.setAttribute('lang', lang);
      const target = document.querySelector(c.installOn ?? 'button');
      if (!target) return '✗no install target';
      target.setAttribute('_', install);
      document.body
        .querySelectorAll('*')
        .forEach((el: Element, i: number) => el.setAttribute('data-exec-key', String(i)));
      host.processNode(target);
      await new Promise(resolve => setTimeout(resolve, 0));
      document.body.normalize();
      const before = snapshot(document);
      for (const step of steps) {
        if ('settle' in step) {
          await new Promise(resolve => setTimeout(resolve, step.settle));
          continue;
        }
        const Ctor: typeof Event = step.ctor ? window[step.ctor] : window.Event;
        (step.onDocument ? document : target).dispatchEvent(new Ctor(step.ev, step.init ?? {}));
      }
      document.body.normalize();
      const out = diffSnapshots(before, snapshot(document));
      if (window.location.hash) out.push(`hash ${window.location.hash}`);
      out.push(...calls);
      return out.join(' | ') || '∅';
    } catch (e) {
      return `✗threw ${(e as Error).message.split('\n')[0] ?? ''}`;
    }
  };

  const runAll = async (
    host: ScriptHost,
    c: DirectPathCase,
    code: string,
    lang: string
  ): Promise<string> => {
    const parts: string[] = [];
    for (const steps of scriptOf(c)) parts.push(await run(host, c, code, lang, steps));
    return parts.join(' ‖ ');
  };
  const rejects = (host: ScriptHost, code: string): string | undefined =>
    host.parse(code)?.errors?.[0]?.message.split('\n')[0];

  return {
    async runCase(c) {
      // A behavior definition is not a handler: it is checked by running it.
      const rejected = c.id.startsWith('behavior-handlers')
        ? undefined
        : rejects(upstream, c.source);
      const want = rejected
        ? `✗upstream rejects: ${rejected}`
        : await runAll(upstream, c, c.source, 'en');
      const eng = await runAll(engine, c, c.source, 'en');
      const languages = c.languages === 'all23' ? [...FOREIGN_LANGUAGES] : c.languages;
      const node = parseSemantic(c.source, 'en').node;
      const pairs: PairResult[] = [];
      for (const lang of languages) {
        let written: string | null = null;
        try {
          written = node ? render(node, lang) : null;
        } catch {
          written = null;
        }
        if (written === null) {
          pairs.push({ lang, written, english: '', got: '✗untranslatable', ref: want, ok: false });
          continue;
        }
        let english: string;
        try {
          english = preprocess(written, lang);
        } catch (e) {
          english = `✗${(e as Error).message}`;
        }
        const got = await runAll(engine, c, written, lang);
        let ref = want;
        if (rejected && !english.startsWith('✗') && !rejects(upstream, english)) {
          ref = await runAll(upstream, c, english, 'en');
        }
        const ok = got === ref && !EMPTY.test(ref) && !ref.startsWith('✗');
        pairs.push({ lang, written, english, got, ref, ok });
      }
      return { id: c.id, want, eng, pairs };
    },
    async close() {
      await new Promise(resolve => setTimeout(resolve, 0));
      process.off('unhandledRejection', quiet);
      for (const listener of rejectionListeners) process.on('unhandledRejection', listener);
      Object.assign(console, saved);
      g.EventTarget = savedEventTarget;
    },
  };
}

/** A failing case, for a report line. */
export function describeFailure(r: DirectPathResult): string {
  const head = `${r.id}: want ${r.want.slice(0, 120)}`;
  if (!r.want.startsWith('✗') && !EMPTY.test(r.want) && r.eng !== r.want) {
    return `${head}\n  engine English: ${r.eng.slice(0, 120)}`;
  }
  const bad = r.pairs.filter(p => !p.ok);
  const first = bad[0];
  return first
    ? `${head}\n  ${bad.length} language(s), e.g. ${first.lang}: ${first.written}\n    → ${first.english}\n    got ${first.got.slice(0, 120)}`
    : head;
}

/**
 * One shard of the gate: every case whose index ≡ `shard` (mod `of`), so the
 * shards run in parallel. Returns its results; the caller asserts.
 */
export async function runDirectPathShard(shard: number, of: number): Promise<DirectPathResult[]> {
  const cases = loadDirectPathCases().filter((_, i) => i % of === shard);
  const hosts = await initDirectPathHosts();
  try {
    const results: DirectPathResult[] = [];
    for (const c of cases) results.push(await hosts.runCase(c));
    return results;
  } finally {
    await hosts.close();
  }
}
