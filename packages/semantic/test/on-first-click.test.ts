/**
 * `on first <event>` is `once`, written the way both engines run it.
 *
 * Semantic had no reading for `on first click`: en dropped the whole head
 * (`on first click add …` rendered `add …`), so the handler vanished in every
 * translation. It now parses as `once` with `onceAsFirst`, and renders back
 * as `on first click` (en) or a leading `first` (as the leading `once`). The
 * core-only `click.once` is kept as written: upstream reads it as an event
 * named `click.once`, which a click never fires, so the two spellings are not
 * interchangeable.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const FIRST = 'on first click add .initialized to me then call setup()';
const DOT_ONCE = 'on click.once add .initialized to me then call setup()';
// A positional `first` is a query, never the modifier.
const POSITIONAL = 'on click hide first <li/>';

describe('English', () => {
  it('keeps `on first click`, as once written first', () => {
    const node = parse(FIRST, 'en') as { eventModifiers?: unknown };
    expect(render(node as never, 'en')).toBe(FIRST);
    expect(node.eventModifiers).toEqual({ once: true, onceAsFirst: true });
  });

  it('keeps core’s `click.once` as written', () => {
    const node = parse(DOT_ONCE, 'en') as { eventModifiers?: unknown };
    expect(render(node as never, 'en')).toBe(DOT_ONCE);
    expect(node.eventModifiers).toEqual({ once: true });
  });

  it('leaves a positional `first` alone', () => {
    expect(render(parse(POSITIONAL, 'en')!, 'en')).toBe(POSITIONAL);
  });
});

describe.each([
  ['on first click', FIRST],
  ['click.once', DOT_ONCE],
  ['a positional first', POSITIONAL],
])('%s, through every language', (_, src) => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});
