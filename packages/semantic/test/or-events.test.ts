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
import { parse, render, buildAST, localizeEventName } from '../src/index';
import { OR_WORDS_BY_LANG } from '../src/parser/utils/or-words';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const SHAPES = {
  plain: 'on click or keydown add .x to me',
  filtered: 'on click or keypress[key=="Enter"] toggle .active',
  // The parser reads a source as the first event's, so it renders before the
  // alternatives, which is where it came from.
  sourced: 'on click from #b or keydown add .x to me',
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
    // In the language's own word, not the English one.
    const or = [...OR_WORDS_BY_LANG[language]][0];
    expect(foreign.split(' '), foreign).toContain(or);
  });
});

// The leg belongs with its event, inside the head's frame: zh `一 点击 或 …
// 就`, not `一 点击 就 或 …`. Both parse back, so only the surface can tell.
describe('an or-leg directly follows its event word', () => {
  it.each(FOREIGN)('%s', language => {
    const words = render(parse(SHAPES.plain, 'en')!, language).split(' ');
    const at = words.indexOf(localizeEventName('click', language));
    expect(at, words.join(' ')).toBeGreaterThanOrEqual(0);
    expect(words[at + 1], words.join(' ')).toBe([...OR_WORDS_BY_LANG[language]][0]);
  });
});

// Only the HEAD's `or` is an alternative event. The excision took the first
// `or <event>` anywhere, so a body's `wait for keydown or click` lent the
// handler a second trigger: `on click or click wait for keydown …`, bound by
// buildAST on the direct path.
describe('an `or` in the body stays out of the head', () => {
  it.each([
    'on click wait for keydown or click then log 1',
    'on click log 1 then wait for keyup or keydown',
  ])('%s', src => {
    const node = parse(src, 'en')!;
    expect(events(node)).toEqual(['click']);
    expect(render(node, 'en')).not.toMatch(/^on click or /);
    expect(buildAST(node).ast).not.toHaveProperty('events');
  });

  it('a head event that is also a command word keeps its alternative', () => {
    const src = 'on focus or blur add .x to me';
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
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
