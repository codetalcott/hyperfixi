/**
 * A handler head's `or <event>` alternatives survive translation.
 *
 * The parser captured the alternatives (`additionalEvents`), but nothing
 * downstream read them: the renderer wrote only the first event, so every
 * translation of `on click or keydown …` listened for `click` alone, and
 * `buildAST` dropped them from the direct path. The or-leg's `[filter]` was
 * excised with the leg and never kept.
 *
 * A native or-word placed right after the event token parses back in all 23
 * languages (measured), so the renderer writes it there.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const SHAPES = {
  plain: 'on click or keydown add .x to me',
  filtered: 'on click or keypress[key=="Enter"] toggle .active',
};

function events(node: ReturnType<typeof parse>): string[] {
  const n = node as { roles: Map<string, { value?: unknown }>; additionalEvents?: { value?: unknown }[] };
  return [n.roles.get('event')?.value, ...(n.additionalEvents ?? []).map(e => e.value)].map(String);
}

describe('English keeps its or-legs', () => {
  it.each(Object.entries(SHAPES))('%s', (_, src) => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });
});

describe.each(Object.entries(SHAPES))('%s, through every language', (_, src) => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    const back = parse(foreign, language);
    expect(back, foreign).toBeTruthy();
    expect(events(back), foreign).toEqual(events(parse(src, 'en')));
    expect(render(back!, 'en'), foreign).toBe(src);
  });
});

// The direct path builds from buildAST: it must emit what core's parser emits
// for the same English, so a translation runs as the English does.
describe('buildAST binds what core binds', () => {
  it('every event, in `events`', () => {
    const { ast } = buildAST(parse(SHAPES.plain, 'en')!);
    expect(ast).toMatchObject({ type: 'eventHandler', event: 'click', events: ['click', 'keydown'] });
  });

  it('a leg’s filter as the condition, not as part of its name', () => {
    const { ast } = buildAST(parse(SHAPES.filtered, 'en')!);
    expect(ast).toMatchObject({
      events: ['click', 'keypress'],
      condition: { type: 'binaryExpression', operator: '==' },
    });
  });

  // `keydown[key=="Escape"]` was the event NAME, so the handler never fired.
  it('a single event’s filter too', () => {
    const { ast } = buildAST(parse('on keydown[key=="Escape"] add .x to me', 'en')!);
    expect(ast).toMatchObject({
      event: 'keydown',
      condition: { type: 'binaryExpression', operator: '==' },
    });
    expect(ast).not.toHaveProperty('events');
  });
});
