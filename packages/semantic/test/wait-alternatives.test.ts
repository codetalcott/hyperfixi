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

  // Each wait takes its own extras: the pre-pass counts the same event's
  // earlier waits to find which node is its.
  it('two waits on the same event keep their own extras', () => {
    const src = 'on click wait for keyup then log 1 then wait for keyup or 1s then log 2';
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
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
