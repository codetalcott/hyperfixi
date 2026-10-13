/**
 * A handler head's `or <custom event>` (`on click or foo`) is an additional event.
 *
 * The or-lift in parseInternal took only a KNOWN event after the or-word, so the
 * builder's own `or` reading ran: it joined the events into one string (`click or
 * foo`) when the first was a literal and dropped the rest when it was not (`on foo
 * or bar` read as `on foo`, in English). The joined string kept English `or` in every
 * render, which bn/it/ja/ko/th/tr/zh could not read back. Both now keep the legs as
 * `additionalEvents`, which the renderer writes in each language's or-word.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const squeeze = (s: string) => s.replace(/\s+/g, '');

function events(source: string, language = 'en'): unknown[] {
  const handler = parse(source, language) as {
    roles: Map<string, { value?: unknown; raw?: unknown }>;
    additionalEvents?: { value: unknown }[];
  };
  const head = handler.roles.get('event');
  return [head?.value ?? head?.raw, ...(handler.additionalEvents ?? []).map(e => e.value)];
}

it('English keeps each leg', () => {
  expect(events('on click or foo log 1')).toEqual(['click', 'foo']);
  expect(events('on foo or bar log 1')).toEqual(['foo', 'bar']);
  expect(events('on click or myEvent log 1')).toEqual(['click', 'myEvent']);
});

describe.each(['on click or foo call increment()', 'on click or myEvent log 1'])('%s', source => {
  it.each(FOREIGN)('reads back from %s, in its own or-word', language => {
    const foreign = translate(source, 'en', language);
    expect(foreign).not.toMatch(/\bor\b/);
    expect(squeeze(translate(foreign, language, 'en')), foreign).toBe(squeeze(source));
  });
});

it("a verb-final head's first name before its or-word is the head's event", () => {
  expect(events('foo または barで 1を 記録', 'ja')).toEqual(['foo', 'bar']);
});

it('an `or` inside a value is still the operator', () => {
  expect(squeeze(translate('on click set x to ($a or $b)', 'en', 'en'))).toBe(
    squeeze('on click set x to ($a or $b)')
  );
});
