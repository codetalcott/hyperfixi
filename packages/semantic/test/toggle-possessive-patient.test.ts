/**
 * `toggle my *display` (a style property of an element, upstream's form) in every language.
 *
 * The possessive reads as a property-path, and toggle's patient is typed `selector`. en and
 * es read it through handcrafted patterns that leave the patient untyped; every generated
 * pattern refused it, so ar/de/fr/he/ja/tr could not read their own render. toggleSchema's
 * `widenTypeVariants` adds a lower-priority variant that takes the property-path.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const CASES = [
  'on click toggle my *display',
  'on click toggle my *opacity',
  'on click toggle my *visibility',
];

describe.each(CASES)('%s', source => {
  it.each(FOREIGN)('reads back from %s', language => {
    const foreign = translate(source, 'en', language);
    expect(translate(foreign, language, 'en'), foreign).toBe(source);
  });
});

it('a generated language reads the possessive as the patient', () => {
  const toggle = parse('umschalten mein *display', 'de');
  expect(toggle.action).toBe('toggle');
  expect(toggle.roles.get('patient')).toMatchObject({
    type: 'property-path',
    object: { value: 'me' },
    property: '*display',
  });
});

it('a class patient still takes the main pattern', () => {
  expect(parse('umschalten .active', 'de').metadata?.patternId).not.toContain('possessive');
});
