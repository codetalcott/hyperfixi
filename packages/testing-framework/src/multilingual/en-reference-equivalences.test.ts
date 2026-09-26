/**
 * Pins for the en-reference-preservation gate's NAMED EQUIVALENCES.
 *
 * The gate lets the renderer respell a construct only when the two spellings
 * are the same program. That claim is checked here, on the real
 * `hyperscript.org` engine, one pin per equivalence:
 *   - `tree`   — both spellings parse without error to the same tree (token
 *                positions and parent links excluded; the command chain via
 *                `next` INCLUDED — a control pair proves later commands count);
 *   - `effect` — the node types differ (naked vs quoted URL, `my.x` vs `my x`,
 *                …), so both spellings run in jsdom and must leave the same,
 *                non-empty observation.
 * Every entry of EQUIVALENCES must have a pin, so a new rule cannot land
 * without evidence. The negative pins record why the list is narrow: dropping
 * `the` is not an equivalence (`halt event` does not parse).
 *
 * @vitest-environment node
 * Required: under the suite default (happy-dom) the DOM constructors already
 * exist on globalThis and `installGlobals` will not replace them, so upstream
 * would bind happy-dom's constructors against jsdom pages (see
 * shipped-examples-execution.test.ts, which measured exactly that).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  EQUIVALENCES,
  describeDifference,
  normalizeForComparison,
  preservesContent,
  tokenize,
} from './en-reference-preservation';
import { installGlobals } from './shipped-examples-execution';

interface Upstream {
  parse(src: string): { errors?: unknown[] };
  processNode(el: Node): void;
}

type Pin =
  | { kind: 'tree'; pair: readonly [string, string] }
  | { kind: 'effect'; pair: readonly [string, string] };

/**
 * One pin per equivalence id. `effect` pairs are written so the observation is
 * non-empty: they put a value into #o, set a style on #t, or record a fetch.
 */
const PINS: Record<string, Pin> = {
  'then-separator': {
    kind: 'tree',
    pair: ['on click toggle .a add .b to me', 'on click toggle .a then add .b to me'],
  },
  'quote-style': {
    kind: 'tree',
    pair: ["on click put 'Saved!' into me", 'on click put "Saved!" into me'],
  },
  'quoted-url': { kind: 'effect', pair: ['on click fetch /api/x', 'on click fetch "/api/x"'] },
  'article-before-query': {
    kind: 'tree',
    pair: [
      'on click make a <div.card/> then put it into #c',
      'on click make <div.card/> then put it into #c',
    ],
  },
  'the-before-positional': {
    kind: 'tree',
    pair: [
      'on click increment the textContent of the previous <output/>',
      'on click increment the textContent of previous <output/>',
    ],
  },
  'dotted-possessive': {
    kind: 'effect',
    pair: [
      "on click get {name:'Q'} then put it.name into #o",
      "on click get {name:'Q'} then put its name into #o",
    ],
  },
  'of-possessive': {
    kind: 'effect',
    pair: ['on click set the *color of #t to "red"', 'on click set #t\'s *color to "red"'],
  },
  'go-to-url': { kind: 'tree', pair: ['on click go to url "/page"', 'on click go url "/page"'] },
  'with-object-braces': {
    kind: 'effect',
    pair: [
      'on click fetch /x with method:"POST", body:"a"',
      'on click fetch /x with {method:"POST", body:"a"}',
    ],
  },
  'trailing-end': {
    kind: 'tree',
    pair: ['on click repeat 3 times log 1', 'on click repeat 3 times log 1 end'],
  },
  'settle-me': {
    kind: 'effect',
    pair: [
      'on click put "x" into #o then settle then put "y" into #o',
      'on click put "x" into #o then settle me then put "y" into #o',
    ],
  },
  // `click` is not an upstream command keyword (`focus`/`reset` are, and upstream
  // rejects `focus() me`). Triggered by `poke` so the click it causes cannot
  // re-enter the handler; #b's native click listener counts it.
  'pseudo-command-me': {
    kind: 'effect',
    pair: ['on poke click() me', 'on poke call me.click()'],
  },
  // The button sends and triggers to itself and records what arrived: upstream
  // reads a STRING or a dotted/colon path as the same eventName (both commands).
  'quoted-event-name': {
    kind: 'effect',
    pair: [
      'on click send "hello" to me then trigger "bye" on me end ' +
        'on hello put "got" into #o end on bye set #t\'s *color to "red"',
      'on click send hello to me then trigger bye on me end ' +
        'on hello put "got" into #o end on bye set #t\'s *color to "red"',
    ],
  },
};

let hs: Upstream;

beforeAll(async () => {
  installGlobals(new JSDOM('<!doctype html><html><body></body></html>'));
  const require = createRequire(import.meta.url);
  const esm = path.join(path.dirname(require.resolve('hyperscript.org')), '_hyperscript.esm.js');
  hs = (await import(pathToFileURL(esm).href)).default as Upstream;
});

/** Parse tree without positions or parent links; `next` (the command chain) is kept. */
function tree(src: string): string {
  const skip = new Set([
    'parent',
    'token',
    'startToken',
    'endToken',
    'programSource',
    'sourceFor',
    'lineFor',
  ]);
  const seen = new WeakSet<object>();
  const walk = (n: unknown): unknown => {
    if (n === null || typeof n !== 'object') return n;
    if (seen.has(n)) return '<cycle>';
    seen.add(n);
    if (Array.isArray(n)) return n.map(walk);
    const out: Record<string, unknown> = { $: n.constructor?.name };
    for (const [key, value] of Object.entries(n).sort(([x], [y]) => x.localeCompare(y))) {
      if (!skip.has(key) && typeof value !== 'function') out[key] = walk(value);
    }
    return out;
  };
  return JSON.stringify(walk(hs.parse(src)));
}

/** Run one handler on upstream in a fresh page; return what it observably did. */
async function effect(src: string): Promise<string> {
  const dom = new JSDOM(
    '<!doctype html><html><body><button id="b"></button><div id="o"></div><div id="t"></div></body></html>'
  );
  try {
    installGlobals(dom);
    const fetches: string[] = [];
    const stub = async (url: unknown, init?: { method?: string }) => {
      fetches.push(`${String(url)} ${init?.method ?? 'GET'}`);
      return {
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => '',
        json: async () => ({}),
      };
    };
    Object.assign(dom.window, { fetch: stub });
    Object.assign(globalThis, { fetch: stub });
    const doc = dom.window.document;
    const button = doc.getElementById('b')!;
    let clicks = 0;
    button.addEventListener('click', () => clicks++);
    button.setAttribute('_', src);
    hs.processNode(button);
    const event = /^on (\w+)/.exec(src)?.[1] ?? 'click';
    button.dispatchEvent(new dom.window.Event(event, { bubbles: true }));
    // `settle` with no transition resolves after upstream's 500ms fallback.
    await new Promise(resolve => setTimeout(resolve, src.includes('settle') ? 700 : 50));
    return JSON.stringify({
      o: doc.getElementById('o')!.textContent,
      color: (doc.getElementById('t') as HTMLElement).style.color,
      fetches,
      // The dispatch itself counts when the trigger IS a click; only extra clicks matter.
      clicks: event === 'click' ? clicks - 1 : clicks,
    });
  } finally {
    dom.window.close();
  }
}

const EMPTY_EFFECT = JSON.stringify({ o: '', color: '', fetches: [], clicks: 0 });

describe('en-reference equivalences', () => {
  it('pins every equivalence (a new rule cannot land without engine evidence)', () => {
    expect(EQUIVALENCES.map(e => e.id).filter(id => !PINS[id])).toEqual([]);
    expect(Object.keys(PINS).filter(id => !EQUIVALENCES.some(e => e.id === id))).toEqual([]);
  });

  describe.each(EQUIVALENCES.map(e => [e.id, e] as const))('%s', (id, equivalence) => {
    it('the normalizer treats its example as the same program', () => {
      expect(preservesContent(...equivalence.example)).toBe(true);
    });

    it('the normalizer treats its pin pair as the same program', () => {
      expect(preservesContent(...PINS[id]!.pair)).toBe(true);
    });

    it('upstream agrees: both spellings are the same program', async () => {
      const pin = PINS[id]!;
      const [a, b] = pin.pair;
      if (pin.kind === 'tree') {
        expect(hs.parse(a).errors ?? []).toEqual([]);
        expect(hs.parse(b).errors ?? []).toEqual([]);
        expect(tree(a)).toEqual(tree(b));
      } else {
        const [ea, eb] = [await effect(a), await effect(b)];
        expect(ea, 'the pin observes nothing, so it proves nothing').not.toEqual(EMPTY_EFFECT);
        expect(ea).toEqual(eb);
      }
    }, 10_000);
  });

  describe('what is NOT an equivalence', () => {
    it('`the` is not droppable in general: `halt event` does not parse, `halt the event` does', () => {
      expect(hs.parse('on click halt the event').errors ?? []).toEqual([]);
      expect((hs.parse('on click halt event').errors ?? []).length).toBeGreaterThan(0);
      expect(preservesContent('on click halt the event', 'on click halt event')).toBe(false);
    });

    it('the tree comparison sees commands after the first one (control pair)', () => {
      expect(tree('on click toggle .a add .b to me')).not.toEqual(
        tree('on click toggle .a then add .c to me')
      );
    });

    it('a dropped qualifier is a loss', () => {
      expect(preservesContent('on click hide me with *opacity', 'on click hide me')).toBe(false);
      expect(describeDifference('on click hide me with *opacity', 'on click hide me')).toEqual({
        lost: ['with *opacity'],
        added: [],
      });
    });

    it('a string literal is not the identifier with the same text', () => {
      // A value, not an event name: `put hello` reads a variable named hello.
      expect(preservesContent('on click put "hello" into #o', 'on click put hello into #o')).toBe(
        false
      );
      // An event name that is not a plain name cannot be written bare.
      expect(
        preservesContent('on click send "my event" to #t', 'on click send my event to #t')
      ).toBe(false);
    });

    it('a URL carrying `${…}` is not treated as quote-insensitive', () => {
      expect(
        preservesContent('on input fetch /s?q=${my value}', 'on input fetch "/s?q=${my value}"')
      ).toBe(false);
    });

    it('a changed operand is a loss even when the command survives', () => {
      expect(
        describeDifference(
          'on click repeat while #c.innerText < 10 increment #c end',
          'on click repeat while #c.innerText increment #c end'
        )
      ).toEqual({ lost: ['< 10'], added: [] });
    });

    it('`go back` and `go url back` are different programs', () => {
      expect(preservesContent('on click go back', 'on click go url back')).toBe(false);
    });
  });

  describe('tokenizer', () => {
    it('reads a possessive apostrophe as part of a word, not a string opener', () => {
      expect(tokenize("set #price's value to 'x'")).toEqual([
        { kind: 'word', text: 'set' },
        { kind: 'word', text: "#price's" },
        { kind: 'word', text: 'value' },
        { kind: 'word', text: 'to' },
        { kind: 'string', quote: "'", body: 'x' },
      ]);
    });

    it('ignores whitespace, including a re-spaced CSS block', () => {
      expect(normalizeForComparison('add { left: ${x}px; }')).toEqual(
        normalizeForComparison('add { left : $ { x } px ; }')
      );
    });
  });
});
