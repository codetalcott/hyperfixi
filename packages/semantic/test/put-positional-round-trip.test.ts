/**
 * `put X before/after Y` must survive the round trip in every language that has
 * a positional-put spec — and must not silently become a DIFFERENT position.
 *
 * WHY THIS FILE EXISTS. ar and tl had no pattern pinning `before`/`after`, so
 * the renderer's pinned-value guard had nothing to compare against and the
 * highest-priority candidate won: `put-{lang}-at-end` (110, manner pinned to
 * `at end of`). `put "<p>New</p>" before me` rendered as
 *
 *   ar  ضع "<p>New</p>" عند النهاية من أنا     ("put … AT END OF me")
 *   tl  ilagay "<p>New</p>" sa wakas ng ako    ("put … AT END OF me")
 *
 * Role-identical to the reference, execution-different, and invisible to every
 * recall metric — actions, roles, multiset and values all score 1.0, because
 * `manner` is a literal the scorers do not compare. Only the English round trip
 * sees it. That is why the assertion below is `render(parse_L(x),'en') === the
 * English reference` rather than a role check.
 *
 * The tl half needed a second fix: its profile lists `bago`/`matapos` among the
 * destination marker's ALTERNATIVES (a parse-side tolerance predating these
 * patterns), so the generated into-pattern at priority 100 matched the
 * positional surface and dropped the manner. The positional patterns now sit at
 * 105 — the same precedent already written out on `put-it-before`.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '../src/index';

/** Every language with a PUT_POSITIONAL spec, plus the handcrafted-variant ones. */
const LANGUAGES = [
  'ar',
  'de',
  'es',
  'fr',
  'he',
  'id',
  'it',
  'ms',
  'pl',
  'pt',
  'ru',
  'sw',
  'th',
  'tl',
  'uk',
  'vi',
  'zh',
] as const;

const CASES = [
  'on click put "<p>New</p>" before me',
  'on click put "<p>New</p>" after me',
] as const;

describe('positional put survives the round trip', () => {
  for (const source of CASES) {
    const reference = parseSemantic(source, 'en')?.node;
    const referenceEn = render(reference!, 'en');

    describe(source, () => {
      it('the English reference itself round-trips', () => {
        expect(reference).toBeTruthy();
        expect(referenceEn).toBe(source);
      });

      it.each(LANGUAGES)('%s keeps the position word', language => {
        const foreign = render(reference!, language);
        const back = parseSemantic(foreign, language)?.node;
        expect(back, `${language} could not re-parse "${foreign}"`).toBeTruthy();
        // The whole point: not just "a put with the same roles", but the SAME
        // position. `before` becoming `at end of` or `into` fails here.
        expect(render(back!, 'en'), `${language} rendered "${foreign}"`).toBe(referenceEn);
      });
    });
  }

  it('ar and tl render their own position words, not the at-end-of phrase', () => {
    const before = parseSemantic('put "x" before me', 'en')!.node;
    const after = parseSemantic('put "x" after me', 'en')!.node;
    expect(render(before, 'ar')).toContain('قبل');
    expect(render(after, 'ar')).toContain('بعد');
    expect(render(before, 'tl')).toContain('bago');
    expect(render(after, 'tl')).toContain('matapos');
    // The phrase that used to be emitted for both.
    expect(render(before, 'ar')).not.toContain('النهاية');
    expect(render(before, 'tl')).not.toContain('wakas');
  });

  it('still parses the at-end-of form, which shares the destination marker', () => {
    // The positional patterns must not shadow `put-{lang}-at-end` (110).
    for (const [language, surface] of [
      ['ar', 'ضع "x" عند النهاية من أنا'],
      ['tl', 'ilagay "x" sa wakas ng ako'],
    ] as const) {
      const node = parseSemantic(surface, language)?.node;
      expect(node, `${language} lost the at-end-of form`).toBeTruthy();
      expect(render(node!, 'en')).toContain('at end of');
    }
  });
});
