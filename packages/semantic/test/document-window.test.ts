/**
 * `document` and `window` in bn, th and vi's own words (M2, vocabulary sheet
 * B7): bn `ডকুমেন্ট`/`উইন্ডো`, th `เอกสาร`/`หน้าต่าง`, vi `tài liệu`/`cửa sổ`.
 * They were English in those three languages, which had no word for them, and
 * most of what kept each over the corpus words target. A dot access keeps the
 * English base in every language (`window.scrollY`), as the dot path reads it.
 */
import { describe, it, expect } from 'vitest';
import { translate, tryGetProfile } from '../src/index';
import { dictionaries } from '../../i18n/src/dictionaries';

const LANGUAGES = ['bn', 'th', 'vi'];

describe.each([
  ['on click from document remove .open from #menu', 'document'],
  ['on keydown from document if event.key is "Escape" hide #modal end', 'document'],
  ['on click send hello to document', 'document'],
  ['on resize from window put window.innerWidth into #w', 'window'],
  ['on scroll from window add .scrolled to body', 'window'],
])('%s', (source, reference) => {
  it.each(LANGUAGES)('%s', language => {
    const rendered = translate(source, 'en', language);
    const word = tryGetProfile(language)?.references?.[reference];
    expect(rendered).toContain(word);
    expect(rendered.split(/\s+/)).not.toContain(reference);
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

// Policy 5: a translation writes only the dictionary's words.
describe('the words are the dictionaries’', () => {
  it.each(LANGUAGES)('%s', language => {
    const values = (dictionaries as Record<string, { values?: Record<string, string> }>)[language]
      ?.values;
    const references = tryGetProfile(language)?.references;
    expect(references?.document).toBe(values?.document);
    expect(references?.window).toBe(values?.window);
  });
});
