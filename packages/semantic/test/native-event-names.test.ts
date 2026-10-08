/**
 * Every event word a language's lexicon holds renders, or is denylisted for a
 * reason (M2, N2).
 *
 * The renderer writes an event's native name from `eventNameTranslations`, a
 * table separate from the lexicons. he, hi, it, pl, ru, th and uk had no table,
 * and others lacked rows the lexicon had (es `redimensionar`, ko `더블클릭`), so
 * their translations kept English event names: `click` in 79–87% of the corpus
 * renders of eight languages. Nothing compared the two: a lexicon word with no
 * table row was simply never written. The leak gate sees only the events its
 * sources use; this sees every one.
 */
import { describe, it, expect } from 'vitest';
import {
  getEventLocalizationDenylist,
  getSupportedLanguages,
  localizeEventName,
} from '../src/index';
import { getLexicon } from '../src/lexicon-registry';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');
const DENIED = getEventLocalizationDenylist();

/** The lexicon's event words that are not the English name itself. */
function lexiconEvents(language: string): Array<[english: string, native: string]> {
  const events = (getLexicon(language)?.events ?? {}) as Record<
    string,
    { primary?: string; render?: boolean }
  >;
  return Object.entries(events)
    .filter(([english, t]) => t.render !== false && !!t.primary && t.primary !== english)
    .map(([english, t]) => [english, t.primary!]);
}

describe('a lexicon event word renders, or is denylisted', () => {
  it.each(FOREIGN)('%s', language => {
    const silent = lexiconEvents(language)
      .filter(([english]) => localizeEventName(english, language) === english)
      .filter(([english]) => !DENIED[language]?.has(english))
      .map(([english, native]) => `${english} (${native})`);
    expect(silent, 'written in English with no reason: add a table row, or denylist it').toEqual(
      []
    );
  });
});
