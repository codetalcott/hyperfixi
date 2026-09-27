/**
 * `contains` in ja, ko, qu and zh.
 *
 * ja, ko and zh spell `contains` and pick's range mode `inclusive` with one
 * word (含む, 포함, 包含), which each tokenizer normalizes to `inclusive`. So a
 * value read `"xab" 含む s` as `"xab"`, `inclusive` and `s`: `put` kept `s`
 * alone, and a condition tested nothing. qu's `ukupi_kan` split at its
 * underscore into `ukupi` (`in`), `_` and `kan`. Inside a value the word now
 * reads as `contains` (CONNECTIVE_LEXICON), while pick's range mode still
 * reads it as `inclusive`; and qu's is one token.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const LANGUAGES = ['ja', 'ko', 'qu', 'zh'];

const SOURCES = [
  'on click put "xab" contains s into #out',
  'on click if s contains "a" then put "Y" into #out else put "N" into #out end',
  'on click set x to (s + "c") contains "a" then put x into #out',
  'on click put "xab6" contains #a\'s textContent into #out',
];

/**
 * A possessive and its `of` form are one program when no conversion follows
 * (`#a's textContent`, `textContent of #a`); the renderer writes either.
 */
const normalize = (code: string): string =>
  code.replace(/\b([A-Za-z][\w-]*) of ([#.][\w-]+)(?!\s+as\b)/g, "$2's $1");

describe.each(SOURCES)('%s', source => {
  const english = render(parse(source, 'en')!, 'en');

  it('keeps `contains` in English', () => {
    expect(english).toContain(' contains ');
  });

  it.each(LANGUAGES)('%s renders the same English as the source', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(normalize(render(parse(foreign, language)!, 'en')), foreign).toBe(normalize(english));
  });
});

describe("pick's range mode keeps the word", () => {
  it.each([
    ['ja', 'クリック を で #note の 文字 0 から 5 含む 選択 それから それ を #out に 置く'],
    ['ko', '클릭 할 때 #note 의 문자 0 부터 5 포함 선택 그다음 그것 을 #out 에 넣다'],
    ['zh', '一 点击 就 选取 字符 0 到 5 包含 的 #note 然后 放置 它 到 #out'],
  ])('%s', (language, source) => {
    expect(render(parse(source, language)!, 'en')).toContain(
      'pick characters 0 to 5 inclusive of #note'
    );
  });
});
