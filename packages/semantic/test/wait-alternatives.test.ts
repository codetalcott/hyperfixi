/**
 * A `wait for` keeps everything past its first event.
 *
 * No wait pattern captured past the first event, so a wait's params, its `or`
 * alternatives (events and timeouts) and its `from` source were dropped in
 * every language: `wait for pointermove(clientX, clientY) or pointerup(clientX,
 * clientY) from document` rendered `wait for pointermove`. A translated drag
 * behavior then waited on the element instead of the document, with its
 * coordinates unbound. The parser now excises a wait run's extras, re-parses,
 * and hangs them on the wait node (`waitAlternatives`, `waitSource`); the
 * renderer writes them back around the event; buildAST hands core the spec
 * array it reads.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const SHAPES = {
  // behavior-resizable / -draggable, and -sortable's one-parameter form.
  'params, an alternative and a source':
    'on click wait for pointermove(clientX, clientY) or pointerup(clientX, clientY) from document then log clientX',
  'one parameter': 'on click wait for pointermove(clientY) or pointerup(clientY) from document then log clientY',
  'an event or a timeout': 'on click wait for keyup or 1s then log 1',
  'an event or an event': 'on click wait for keyup or keydown then log 1',
  // ar renders keyup as two words (`رفع المفتاح`); the run spans both.
  'a source alone': 'on click wait for keyup from document then log 1',
};

type WaitNode = { action: string; waitAlternatives?: unknown; waitSource?: unknown };

function firstWait(node: unknown): WaitNode | undefined {
  const walk = (n: unknown): WaitNode | undefined => {
    if (!n || typeof n !== 'object') return undefined;
    const rec = n as Record<string, unknown>;
    if (rec.action === 'wait') return rec as unknown as WaitNode;
    for (const field of ['body', 'statements']) {
      const children = rec[field];
      if (Array.isArray(children)) {
        for (const child of children) {
          const found = walk(child);
          if (found) return found;
        }
      }
    }
    return undefined;
  };
  return walk(node);
}

describe('English keeps a wait’s extras', () => {
  it.each(Object.entries(SHAPES))('%s', (_, src) => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it('as alternatives and a source on the wait node', () => {
    const wait = firstWait(parse(SHAPES['params, an alternative and a source'], 'en'));
    expect(wait?.waitAlternatives).toEqual([
      { event: 'pointermove', params: ['clientX', 'clientY'] },
      { event: 'pointerup', params: ['clientX', 'clientY'] },
    ]);
    expect(wait?.waitSource).toMatchObject({ type: 'reference', value: 'document' });
  });
});

describe.each(Object.entries(SHAPES))('%s, through every language', (_, src) => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});

describe('only a wait’s run', () => {
  it('a plain wait carries nothing extra', () => {
    const wait = firstWait(parse('on click wait for keyup then log 1', 'en'));
    expect(wait?.waitAlternatives).toBeUndefined();
    expect(wait?.waitSource).toBeUndefined();
  });

  it('a handler head’s params are the head’s', () => {
    const src = 'on pointerdown(clientX) from #b wait for keyup or 1s then log clientX';
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

});

// A run is a wait's only when the wait verb sits next to it, on the side the
// language puts it. The head names the same event as the body's wait and the
// verb follows the head's run: when both sides counted, the head's
// `(clientX)` moved onto the wait (en), and so it did in qu, whose body event
// sits between the head's run and the verb.
describe.each([
  ['a head sharing the wait’s event keeps its own params',
    'on pointerdown(clientX) wait for pointerdown then log clientX'],
  // The same rule counts the wait's earlier same-event waits: counting the
  // head too sent the alternatives past the only wait, and they were dropped.
  ['a wait sharing the head’s event keeps its alternatives', 'on keyup wait for keyup or 1s then log 1'],
  // An SOV loop head renders its own source right before the body wait's
  // event (ja `… 繰り返し document から pointermove(clientY) …`): the wait reads
  // a source after its run only, so it keeps its legs and the loop its source.
  ['a wait after a loop head’s source keeps its legs',
    'on pointerdown repeat until event pointerup from document wait for pointermove(clientY) or pointerup(clientY) then log clientY end then log 1'],
  // The pre-pass counts the same event's earlier waits to find which node is its.
  ['two waits on the same event keep their own extras',
    'on click wait for keyup then log 1 then wait for keyup or 1s then log 2'],
])('%s', (_, src) => {
  it('en', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});

// Hand-written verb-final input may mark the run before the verb; renders
// never do.
describe('a particle between a verb-final wait and its run', () => {
  it.each([
    ['tr', 'tıklama üzerinde keyup veya 1s i bekle ardından 1 i kaydet'],
    ['hi', 'click पर keyup या 1s को प्रतीक्षा फिर 1 को लॉग'],
  ])('%s', (language, src) => {
    expect(render(parse(src, language)!, 'en')).toBe('on click wait for keyup or 1s then log 1');
  });
});

/** The core-shaped `wait` command in a built AST (`name`, nested in `commands`). */
function astWait(ast: unknown): { args: Array<{ elements?: unknown[] }> } | undefined {
  if (!ast || typeof ast !== 'object') return undefined;
  const rec = ast as Record<string, unknown>;
  if (rec.type === 'command' && rec.name === 'wait') {
    return rec as unknown as { args: Array<{ elements?: unknown[] }> };
  }
  for (const field of ['commands', 'body', 'statements']) {
    const children = rec[field];
    if (Array.isArray(children)) {
      for (const child of children) {
        const found = astWait(child);
        if (found) return found;
      }
    }
  }
  return undefined;
}

it('buildAST hands core a spec per alternative, and the source', () => {
  const { ast } = buildAST(parse(SHAPES['params, an alternative and a source'], 'en')!);
  const wait = astWait(ast);
  const spec = (name: string) => ({
    type: 'objectLiteral',
    properties: [
      { type: 'objectProperty', key: { type: 'identifier', name: 'name' }, value: { type: 'literal', value: name } },
      {
        type: 'objectProperty',
        key: { type: 'identifier', name: 'args' },
        value: {
          type: 'arrayLiteral',
          elements: [{ type: 'literal', value: 'clientX' }, { type: 'literal', value: 'clientY' }],
        },
      },
    ],
  });
  expect(wait?.args[0]).toEqual({ type: 'arrayLiteral', elements: [spec('pointermove'), spec('pointerup')] });
  expect(wait?.args[1]).toBeDefined();

  const timed = astWait(buildAST(parse(SHAPES['an event or a timeout'], 'en')!).ast);
  expect(timed?.args[0].elements?.[1]).toEqual({
    type: 'objectLiteral',
    properties: [
      { type: 'objectProperty', key: { type: 'identifier', name: 'duration' }, value: { type: 'literal', value: '1s' } },
    ],
  });
});
