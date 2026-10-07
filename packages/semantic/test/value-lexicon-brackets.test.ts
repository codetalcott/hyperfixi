/**
 * A bracket group is the script's own code, not vocabulary.
 *
 * Companion to `value-lexicon-braces.test.ts`. Every tokenizer reads a bracket
 * group as one selector token, and no reader de-localizes inside one, so a word
 * the renderer localized there stayed in the read-back. It is the same group
 * whether it is an array literal, an attribute selector or an index; a WHOLE
 * value that is a bracket group was already written as written. Measured
 * 2026-10-07, in all 23 languages:
 *
 *   - `2 is in [true, n]` came back from es as `2 is in [verdadero, n]`, so the
 *     array held a variable named `verdadero`;
 *   - `I match <[aria-pressed=true]/>` was written `<[aria-pressed=verdadero]/>`,
 *     another selector, so the read-back refused the translation.
 *
 * The value matrix runs both shapes on both engines (`[true, n]`, and `matches
 * <[aria-pressed=true]/>`); these assertions name the rule.
 */
import { describe, it, expect } from 'vitest';
import { localizeValueInterior } from '../src/explicit/value-lexicon';
import { translate } from '../src/index';

const LANGUAGES = ['de', 'es', 'fr', 'ja', 'ru', 'zh'] as const;

describe('a bracket group survives value localization verbatim', () => {
  it.each(LANGUAGES)('%s leaves an array literal inside an expression untouched', language => {
    expect(localizeValueInterior('2 is in [true, me]', language)).toMatch(/\[true, me\]$/);
  });

  it.each(LANGUAGES)('%s leaves an attribute selector untouched', language => {
    expect(localizeValueInterior('I match <[aria-pressed=true]/>', language)).toMatch(
      /<\[aria-pressed=true\]\/>$/
    );
  });

  it.each(LANGUAGES)('%s still localizes the words outside the group', language => {
    expect(localizeValueInterior('true and [true]', language)).not.toMatch(/^true /);
  });

  it('protects a NESTED bracket group, and a brace group inside one', () => {
    expect(localizeValueInterior('[[true], {a: null}]', 'es')).toBe('[[true], {a: null}]');
  });

  it('an UNBALANCED bracket masks nothing', () => {
    expect(localizeValueInterior('[unclosed, true', 'es')).toBe('[unclosed, verdadero');
  });
});

describe('a translated word inside a bracket group comes home', () => {
  const cases = [
    ['on click if 2 is in [true, n] then put "Y" into #out end', '[true, n]'],
    ['on click if I match <[aria-pressed=true]/> then add .on end', '<[aria-pressed=true]/>'],
  ] as const;
  it.each(LANGUAGES.flatMap(language => cases.map(([source, group]) => [language, source, group])))(
    '%s: %s',
    (language, source, group) => {
      const foreign = translate(source, 'en', language);
      expect(foreign).toContain(group);
      expect(translate(foreign, language, 'en')).toContain(group);
    }
  );
});
