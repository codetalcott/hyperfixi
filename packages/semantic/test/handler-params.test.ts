/**
 * A handler head keeps its event parameters, and the `from` after them.
 *
 * The SOV head extraction consumed a param phrase, but the SVO/VSO event
 * patterns expect a `from` or the body right after the event: in
 * `on pointerdown(clientX, clientY) from dragHandle` the `(` broke the source
 * pattern, and the params and the `from` phrase fell into the body, where they
 * were discarded. And the renderer never wrote `parameterNames`, so no head
 * kept them in any language. The parser now excises a head's param phrase,
 * re-parses the plain head, and puts the names back; the renderer glues them to
 * the event token.
 *
 * Also here: a behavior's `init` ends at the next handler. Its `end` is optional
 * upstream, so in `init if no h set h to me end on …` the `end` is the one-line
 * `if`'s, and the end split read it as init's, folding the whole handler into
 * init (behavior-draggable lost its `on pointerdown(…) from dragHandle` head).
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const SHAPES = {
  params: 'on click(clientX) put clientX into me',
  'params and a source': 'on pointerdown(clientX, clientY) from #b log clientX',
  'params and an or-leg': 'on pointerdown(clientY) or click log clientY',
  // Confirmed by the re-parse: the event must be the word before the phrase.
  'a custom event': 'on myEvent(detail) log detail',
  'a namespaced event': 'on my:event(detail) log detail',
};

function params(src: string, language = 'en'): readonly string[] | undefined {
  return (parse(src, language) as { parameterNames?: readonly string[] }).parameterNames;
}

describe('English keeps a head’s params', () => {
  it.each(Object.entries(SHAPES))('%s', (_, src) => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it('and the `from` after them', () => {
    const node = parse(SHAPES['params and a source'], 'en') as {
      eventModifiers?: { from?: { value?: unknown } };
    };
    expect(params(SHAPES['params and a source'])).toEqual(['clientX', 'clientY']);
    expect(node.eventModifiers?.from?.value).toBe('#b');
  });
});

describe.each(Object.entries(SHAPES))('%s, through every language', (_, src) => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(params(foreign, language), foreign).toEqual(params(src));
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});

describe('only the head’s params', () => {
  // A command word begins the body: the wait's phrase is the wait's.
  it('a body `wait for pointermove(clientY)` lends the head nothing', () => {
    expect(params('on click wait for pointermove(clientY) then log 1')).toBeUndefined();
  });
});

it('buildAST hands core the names as `args`', () => {
  const { ast } = buildAST(parse(SHAPES['params and a source'], 'en')!);
  expect(ast).toMatchObject({ type: 'eventHandler', event: 'pointerdown', args: ['clientX', 'clientY'] });
});

describe('a behavior’s `init` ends at the next handler', () => {
  const src = [
    'behavior Draggable(h)',
    '  init',
    '    if no h set h to me',
    '  end',
    '  on pointerdown(clientX) from h',
    '    halt the event',
    '    log clientX',
    '  end',
    'end',
  ].join('\n');

  it('the handler keeps its head and body', () => {
    const rendered = render(parse(src, 'en')!, 'en');
    expect(rendered).toContain('on pointerdown(clientX) from h halt the event then log clientX');
    expect(rendered).toContain('init\n    if no h set h to me end\n  end');
  });

  it('a destination `on` inside init does not end it', () => {
    const node = parse(
      'behavior B(h)\n  init\n    toggle .x on me\n  end\n  on click log 1\n  end\nend',
      'en'
    ) as { initBlock?: unknown[]; eventHandlers?: unknown[] };
    expect(render(node as never, 'en')).toContain('init\n    toggle .x on me\n  end');
  });
});
