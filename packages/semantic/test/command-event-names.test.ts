/**
 * The event a command names, in every language (was OPEN_ITEMS P50).
 *
 * The handler head read a native event name through the event table, but
 * `send`, `trigger` and `repeat until event` read it only when the language's
 * tokenizer happened to know the word: es `enviar dobleclic a #x` read back
 * `send dobleclic to #x`, so the event fired under the native name (55 of 170
 * localized pairs per command). A `wait` dropped what followed any event name
 * outside a fixed list, in English first: `wait for myEvent from #b` lost its
 * source, and so did every translation.
 */

import { describe, it, expect } from 'vitest';
import {
  translate,
  tokenize,
  eventNameTranslations,
  localizeEventName,
  getSupportedLanguages,
} from '../src';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');
const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** `src` in each language and back, against its English render: the failures. */
function roundTripFailures(src: string, languages: readonly string[] = FOREIGN): string[] {
  const failures: string[] = [];
  const en = norm(translate(src, 'en', 'en'));
  if (en !== norm(src)) failures.push(`en: "${src}" → "${en}"`);
  for (const lang of languages) {
    const translated = translate(src, 'en', lang);
    const back = norm(translate(translated, lang, 'en'));
    if (back !== en) failures.push(`${lang}: "${translated}" → "${back}"`);
  }
  return failures;
}

const COMMANDS = (ev: string): string[] => [
  `on click send ${ev} to #x then log 1`,
  `on click trigger ${ev} on #x then log 1`,
  `on click repeat until event ${ev} from #b add .a end`,
  `on click wait for ${ev} from #b then log 1`,
];

describe('an event a command names', () => {
  // One test per command: all four took 6 s on CI, past vitest's 5 s.
  for (const [n, command] of ['send', 'trigger', 'repeat until event', 'wait for'].entries()) {
    // Each translate() reads its output back (fail-loud): ~4s on a loaded CI runner.
    it(`every native name the renderer writes reads back as its event: ${command}`, () => {
      const failures: string[] = [];
      for (const lang of Object.keys(eventNameTranslations)) {
        for (const ev of new Set(Object.values(eventNameTranslations[lang]))) {
          if (localizeEventName(ev, lang) === ev) continue;
          failures.push(...roundTripFailures(COMMANDS(ev)[n], [lang]));
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    }, 30_000);
  }

  // A one-word name the table reads but the renderer does not write (pt
  // `inserir` beside `entrada`), hand-written into the render's place. Not a
  // word the tokenizer reads as another keyword: es `enviar` is both `submit`
  // and the `send` verb, which no reader can tell apart.
  it('every one-word native the table reads, hand-written, reads back as its event', () => {
    const failures: string[] = [];
    for (const [lang, table] of Object.entries(eventNameTranslations)) {
      for (const [native, ev] of Object.entries(table)) {
        const rendered = localizeEventName(ev, lang);
        if (native === rendered || rendered === ev) continue;
        const [only, ...rest] = tokenize(native, lang).tokens;
        if (rest.length > 0 || (only?.kind === 'keyword' && only.normalized !== ev)) continue;
        for (const src of COMMANDS(ev)) {
          const handWritten = translate(src, 'en', lang).split(rendered).join(native);
          const back = norm(translate(handWritten, lang, 'en'));
          if (back !== src) failures.push(`${lang}: "${handWritten}" → "${back}"`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  }, 30_000);

  it('bn sends an event that is also a command verb (`scroll`)', () => {
    expect(roundTripFailures('on click send scroll to #x then log 1', ['bn'])).toEqual([]);
  });

  it('bn reads the send marker it wrote before', () => {
    expect(translate('ক্লিক তে #target তে update(value: 42) তে পাঠান', 'bn', 'en')).toBe(
      'on click send update(value: 42) to #target'
    );
  });

  // fr writes the change event `changement`, which normalizes to `change`: fr's
  // spelling of the reactive `changes`, so the handler read as `when … changes`.
  it('fr `repeat until event change` is not a reactive when', () => {
    expect(
      roundTripFailures('on click repeat until event change from #b add .a end', ['fr'])
    ).toEqual([]);
  });
});

describe('a wait keeps what follows its event', () => {
  // Upstream reads every leg of `wait for` that is not a number as an event's
  // name; a time wait has no source.
  for (const src of [
    'on click wait for myEvent from #b then log 1',
    'on click wait for unload from #b then log 1',
    // tr and tl stem `focusin` to `focus` (an identifier's normalized form).
    'on click wait for focusin from window then log 1',
    'on click wait for draggable:start from #b then log 1',
    'on click wait for myEvent or 2s from #b then log 1',
    'on click wait for click or myEvent from #b then log 1',
  ]) {
    it(src, () => {
      const failures = roundTripFailures(src);
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }

  it('English keeps the legs of a custom event with no source', () => {
    expect(translate('on click wait for myEvent or 2s then log 1', 'en', 'en')).toBe(
      'on click wait for myEvent or 2s then log 1'
    );
  });

  for (const src of ['on click wait 2s then log 1', 'on click wait delay then log 1']) {
    it(`a time wait stays one: ${src}`, () => {
      expect(roundTripFailures(src)).toEqual([]);
    });
  }
});
