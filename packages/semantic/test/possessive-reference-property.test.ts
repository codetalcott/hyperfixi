/**
 * A possessive whose property is a word the language's tokenizer knows but
 * its property lexicon does not (`its.detail`, `its.target`: the `detail` and
 * `target` reference words) renders in the language (es `su detalle`) and
 * must read back as the English property. It read back as `its detalle`, a
 * wrong property name, silently; the command-shape gate saw it in eight
 * languages once `wait for foo then put its.detail into me` stopped being
 * refused for its wait (P52, M2 row 8).
 */
import { describe, it, expect } from 'vitest';
import { translate } from '../src/index';

describe('a possessive property the tokenizer knows reads back as its English name', () => {
  it.each(
    ['es', 'tr', 'ja', 'qu', 'de', 'ru', 'ko', 'hi'].flatMap(lang =>
      [
        'on click put its.detail into me',
        'on click put its.target into me',
        'on click put my.detail into #out',
        'on click wait for foo then put its.detail into me',
      ].map(source => [lang, source] as const)
    )
  )('%s: %s', (lang, source) => {
    const english = translate(source, 'en', 'en');
    expect(translate(translate(source, 'en', lang), lang, 'en')).toBe(english);
  });
});
