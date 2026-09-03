/**
 * An English possessive inside an EXPRESSION is syntax, not vocabulary — and it
 * was being emitted verbatim into every foreign surface.
 *
 * A watched expression is captured as one raw string
 * (`(#price's value * #qty's value)`), and the renderer localized its interior
 * word by word. `'s` is not a word: the owner and the property have to MOVE
 * relative to each other, which only `renderPropertyPath` knows how to do. So
 * 23 languages emitted the English clitic, and Quechua could not read it back at
 * all — `'` is a word character there (`t'ikray`, `llamk'aq`), so `#qty's`
 * tokenizes as `#qty'` + `s` and the property is lost. That is the whole of
 * `when-value-changes[qu]`.
 *
 * Fixing that also fixed a symptom one layer down. The protected-span mask read
 * the FIRST `'s` as the start of a single-quoted string and closed it on the
 * second, masking `'s value * #qty'` — so the first property never localized
 * while the second did (`(#price's value * #qty's chanin)`). Rewriting the
 * possessive structurally removes the clitic before the mask ever runs, so the
 * mask needs no guard of its own: adding one was measured to redden nothing and
 * move no corpus row, and is not part of this change.
 *
 * The reverse direction moved too. Rendering back to English used to produce
 * whichever shape the source language's genitive suggested — `value of #price`
 * for prepositional and owner-first genitives, `#price's value` only where the
 * clitic had survived — so the same construct came back three different ways.
 * The fold is now uniform, and it is the canonical form the reference is written
 * in; `foreign-canonical-validity` (the real engine) stayed green through it.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parseSemantic, render } from '../src/index';

const SOURCE = `when (#price's value * #qty's value) changes put "$" + it into me end`;

const LANGUAGES = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

const head = (text: string): string => text.split('\n')[0]!.trim();

describe('no foreign surface carries the English clitic', () => {
  it.each(LANGUAGES)('%s', language => {
    const rendered = render(parseSemantic(SOURCE, 'en')!.node!, language);
    expect(head(rendered), `English possessive left in ${language}`).not.toContain("'s ");
    // …and it is the language's own construction, not a dropped property.
    expect(head(rendered)).toMatch(/#price/);
    expect(head(rendered)).toMatch(/#qty/);
  });

  it('renders each language its own genitive', () => {
    const reference = parseSemantic(SOURCE, 'en')!.node!;
    expect(head(render(reference, 'qu'))).toContain('chanin pa #price');
    expect(head(render(reference, 'ja'))).toContain('#priceの値');
    expect(head(render(reference, 'es'))).toContain('valor de #price');
  });
});

describe('both properties localize, not just the second', () => {
  // The protected-span mask used to open a "string" on the first `'s` and close
  // it on the second, hiding the first property from the localizer.
  // he is excluded, and not by this change: it has no translation for `value`
  // in either its lexicon or its property table, so the word has always rendered
  // English there. Its GENITIVE is localized like everyone else's
  // (`value מ #price`), which is what this file is about.
  it.each(LANGUAGES.filter(language => language !== 'he'))('%s', language => {
    const rendered = head(render(parseSemantic(SOURCE, 'en')!.node!, language));
    expect(rendered, `an English \`value\` survived in ${language}`).not.toMatch(/\bvalue\b/);
  });

  it('still protects a real single-quoted string', () => {
    const node = parseSemantic(`on hello put 'Got it!' into me`, 'en')!.node!;
    expect(render(node, 'es')).toContain('Got it!');
    expect(render(node, 'qu')).toContain('Got it!');
  });
});

describe('every language re-joins to the same canonical English', () => {
  it.each(LANGUAGES)('%s', language => {
    const reference = parseSemantic(SOURCE, 'en')!.node!;
    const rendered = render(reference, language);
    const reparsed = parseSemantic(rendered, language)?.node;
    expect(reparsed, `${language} did not re-parse: ${rendered}`).toBeTruthy();
    expect(head(render(reparsed!, 'en'))).toBe("when ( #price's value * #qty's value ) changes");
  });
});
