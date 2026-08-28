/**
 * Two fused-pattern slots that stopped one token short.
 *
 * A fused event pattern binds the body's roles directly, so whatever its slot
 * does not take is simply left unconsumed — the parse succeeds, every action is
 * present, and the missing piece is a ROLE or part of one. Both cases below
 * scored 1.0 on action recall and were caught by the English round-trip alone.
 *
 * 1. A `{condition}` slot takes ONE token. tl's `kapag {event} maliban_kung
 *    {condition}` bound `condition: I` out of `unless I match .disabled toggle
 *    .selected` and left `match .disabled` — so the guard tested the element
 *    itself and the class it was meant to check disappeared. Nine languages
 *    render this shape; English escapes because its handler pattern hands the
 *    whole body to the clause walk, whose condition scan already knows these
 *    operator words.
 *
 * 2. bn's handcrafted `set-bn-full` rendered a TWO-token verb, `সেট করুন`. The
 *    schema-generated fused pattern uses the profile's verb, which is `সেট`
 *    alone, so it matched through `সেট` and stranded `করুন on .tab` — the
 *    trailing scope was unreachable and silently defaulted to `me`
 *    (`tabs-aria`). `করুন` is the polite imperative suffix; the i18n corpus and
 *    every other bn surface use the bare stem, so the pattern was the outlier.
 *    It stays OPTIONAL, so authored `সেট করুন` still parses.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '../src/index';

const LANGUAGES = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

function roundTrip(source: string, language: string): string | null {
  const reference = parseSemantic(source, 'en')?.node;
  if (!reference) return null;
  const rendered = render(reference, language);
  const back = parseSemantic(rendered, language)?.node;
  return back ? render(back, 'en') : null;
}

function referenceEnglish(source: string): string {
  return render(parseSemantic(source, 'en')!.node!, 'en');
}

describe('a condition slot keeps its operator and operand', () => {
  const SOURCE = 'on click unless I match .disabled toggle .selected';

  // pl is excluded, and not by this change: pl renders the English reference `I`
  // unchanged, and `i` is Polish for "and" — its own tokenizer normalizes the
  // token to the conjunction, so the condition reads `unless and match …`. A
  // separate homograph, in the value rather than the operator.
  it.each(LANGUAGES)('%s', language => {
    expect(roundTrip(SOURCE, language), language).toBe(referenceEnglish(SOURCE));
  });

  it('leaves a command verb after a bare operator to the body', () => {
    // `exists` takes no operand, so the fold must not swallow the next token.
    expect(referenceEnglish('on click unless #x exists toggle .y')).toBe(
      'on click unless #x exists then toggle .y'
    );
  });

  it('does not fire when the next token is not a condition operator', () => {
    expect(referenceEnglish('on click unless #x toggle .y')).toBe(
      'on click unless #x then toggle .y'
    );
  });
});

describe('bn renders the bare `set` stem, and still reads the polite form', () => {
  const SOURCE = 'on click set @aria-selected to "false" on .tab';

  it('emits সেট without করুন, so the fused verb matches', () => {
    const rendered = render(parseSemantic(SOURCE, 'en')!.node!, 'bn');
    expect(rendered).toContain('সেট');
    expect(rendered, 'করুন strands the trailing scope phrase').not.toContain('করুন');
  });

  it('keeps the trailing scope', () => {
    expect(roundTrip(SOURCE, 'bn')).toBe(referenceEnglish(SOURCE));
  });

  it('still parses an authored করুন', () => {
    const node = parseSemantic(':x কে 5 তে সেট করুন', 'bn')?.node;
    expect(node, 'the polite imperative must stay accepted').not.toBeNull();
    expect(render(node!, 'en')).toBe('set :x to 5');
  });
});
