/**
 * The command-shape gate's ORACLE (see command-shapes.ts), tested.
 *
 *   - Each named equivalence is a claim that two spellings are the same
 *     program. Its pins run on `@hyperfixi/engine` and on upstream
 *     `hyperscript.org`: all four runs (two spellings, two engines) must leave
 *     the same, non-empty observation, and the rewrite must be what makes the
 *     two parses equal.
 *   - The oracle sees what a lossy renderer drops: every value token of every
 *     case, changed, changes the parse (an engine node that keeps a value only
 *     in a closure would hide it), and three renderer mutants — one that drops
 *     a class ref, one that drops `break`, one that swaps `at start of` and
 *     `at end of` — are each caught on every case they change.
 *
 * @vitest-environment node
 * Required: under happy-dom the engines bind happy-dom's DOM constructors, not
 * the jsdom window's (see shipped-examples-execution.test.ts).
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  EQUIVALENCES,
  judge,
  loadCommandShapeCases,
  loadEngineReaders,
  normalize,
  plainParse,
  readerOf,
  type EngineParser,
  type Reader,
} from './command-shapes';
import { installGlobals } from './shipped-examples-execution';

interface Host {
  processNode(element: Element): void;
}

interface Token {
  type: string;
  value: string;
  start: number;
  end: number;
  template?: boolean;
}

const { cases } = loadCommandShapeCases();

let dom: JSDOM;
let hosts: Record<'upstream' | 'engine', Host>;
let readers: Record<Reader, EngineParser>;
let tokenize: (source: string) => Token[];

beforeAll(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  installGlobals(dom);
  const require = createRequire(import.meta.url);
  const esm = require.resolve('hyperscript.org').replace(/[^/\\]+$/, '_hyperscript.esm.js');
  const upstream = (await import(pathToFileURL(esm).href)).default as Host;
  const engineModule = await import('@hyperfixi/engine');
  engineModule.register(...engineModule.everything);
  hosts = { upstream, engine: engineModule.api as unknown as Host };
  readers = await loadEngineReaders();
  tokenize = engineModule.tokenize as (source: string) => Token[];
});

/** Run one click handler on a host in a fresh body; return what it observably did. */
async function observe(host: Host, source: string): Promise<string> {
  const window = dom.window;
  const document = window.document;
  document.body.innerHTML = '<button id="b"></button><div id="o"></div><div id="t"></div>';
  window.location.hash = '';
  const fetches: string[] = [];
  const globals: Record<string, unknown> = {
    fetch: async (url: unknown, init?: { method?: string }) => {
      fetches.push(`${String(url)} ${init?.method ?? 'GET'}`);
      return {
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => '',
        json: async () => ({}),
      };
    },
    getText: () => 'T',
  };
  for (const [name, value] of Object.entries(globals)) {
    Reflect.set(window, name, value);
    Reflect.set(globalThis, name, value);
  }
  const button = document.getElementById('b') as HTMLElement;
  button.setAttribute('_', source);
  host.processNode(button);
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  return JSON.stringify({
    o: document.getElementById('o')?.textContent,
    color: (document.getElementById('t') as HTMLElement).style.color,
    hash: window.location.hash,
    fetches,
  });
}

const EMPTY = JSON.stringify({ o: '', color: '', hash: '', fetches: [] });

/** A pin is a handler: read as a page's script. */
const shape = (source: string, equivalences = EQUIVALENCES): string =>
  JSON.stringify(normalize(plainParse(readers.program.parse(source)), equivalences));

describe('command-shape equivalences', () => {
  it('have distinct names', () => {
    expect(new Set(EQUIVALENCES.map(e => e.name)).size).toBe(EQUIVALENCES.length);
  });

  describe.each(EQUIVALENCES.map(e => [e.name, e] as const))('%s', (name, equivalence) => {
    it('makes each pin pair parse the same, and is needed for it', () => {
      const others = EQUIVALENCES.filter(e => e.name !== name);
      for (const [a, b] of equivalence.pins) {
        expect(shape(a), `${a} | ${b}`).toEqual(shape(b));
        expect(shape(a, others), `${a} | ${b} without ${name}`).not.toEqual(shape(b, others));
      }
    });

    it('is the same program on the engine and on upstream', async () => {
      for (const [a, b] of equivalence.pins) {
        const runs = {
          'upstream, a': await observe(hosts.upstream, a),
          'upstream, b': await observe(hosts.upstream, b),
          'engine, a': await observe(hosts.engine, a),
          'engine, b': await observe(hosts.engine, b),
        };
        expect(runs['upstream, a'], `${a}: the pin observes nothing`).not.toEqual(EMPTY);
        expect(new Set(Object.values(runs)).size, `${a} | ${b}: ${JSON.stringify(runs)}`).toBe(1);
      }
    }, 10_000);
  });
});

describe('the oracle sees a loss', () => {
  /** Does `judge` flag the mutated source against the original? */
  const caught = (engine: EngineParser, source: string, mutated: string): boolean => {
    const plain = normalize(plainParse(engine.parse(source)));
    return judge(engine, JSON.stringify(plain), plain, mutated).outcome !== 'pass';
  };

  it('a changed value token changes the parse, in every case', () => {
    const blind: string[] = [];
    let checked = 0;
    for (const c of cases) {
      const engine = readers[readerOf(c)];
      const base = JSON.stringify(plainParse(engine.parse(c.source)));
      for (const t of tokenize(c.source)) {
        const text = c.source.slice(t.start, t.end);
        let changed: string | undefined;
        if (t.type === 'STRING') changed = text.replace(/^(.)/s, '$1zz');
        else if (t.type === 'NUMBER') changed = String(Number(t.value) + 7);
        else if ((t.type === 'CLASS_REF' || t.type === 'ID_REF') && !t.template)
          changed = `${text}zz`;
        else if (t.type === 'ATTRIBUTE_REF' || t.type === 'STYLE_REF') {
          changed = text.replace(/([@*])([\w-]+)/, '$1zz$2');
        } else if (t.type === 'IDENTIFIER') changed = `${text}zz`;
        if (changed === undefined) continue;
        const mutated = c.source.slice(0, t.start) + changed + c.source.slice(t.end);
        let after: string;
        try {
          after = JSON.stringify(plainParse(engine.parse(mutated)));
        } catch {
          continue; // the engine rejects it: nothing for the oracle to miss
        }
        checked++;
        if (after === base)
          blind.push(`${t.value} in ${c.source.replace(/\s+/g, ' ').slice(0, 80)}`);
      }
    }
    expect(checked).toBeGreaterThan(4000);
    expect(blind).toEqual([]);
  });

  const MUTANTS: ReadonlyArray<{ name: string; mutate(source: string): string }> = [
    { name: 'drops a class ref', mutate: s => s.replace(/(^|\s)\.[A-Za-z][\w-]*(?=\s|$)/, '') },
    { name: 'drops `break`', mutate: s => s.replace(/\bbreak\b/, '') },
    {
      name: 'swaps `at start of` and `at end of`',
      mutate: s =>
        s.replace(/\bat (start|end) of\b/, (_m, edge: string) =>
          edge === 'start' ? 'at end of' : 'at start of'
        ),
    },
  ];

  it.each(MUTANTS.map(m => [m.name, m] as const))('a renderer that %s', (_name, mutant) => {
    let changed = 0;
    const missed: string[] = [];
    for (const c of cases) {
      const mutated = mutant.mutate(c.source);
      if (mutated === c.source) continue;
      changed++;
      if (!caught(readers[readerOf(c)], c.source, mutated)) missed.push(`${c.source} ⇒ ${mutated}`);
    }
    expect(changed).toBeGreaterThan(0);
    expect(missed).toEqual([]);
  });
});
