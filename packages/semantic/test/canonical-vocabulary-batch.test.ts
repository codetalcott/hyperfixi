/**
 * Three vocabulary/homonym repairs the kept-row ratchet surfaced, each of which
 * left an English word (or the wrong word) in a surface that is otherwise fully
 * localized. All three are invisible to the recall metrics — the loss is a
 * dropped ACTION or a phantom clause, and the English round-trip is what sees it.
 *
 * 1. THE `pick` VERB. Both pick variant patterns hardcoded the English `pick`,
 *    so every one of the 23 languages rendered `pick znaki 0 to 5 z #note` with
 *    the verb untranslated. Twenty-two got away with it because the pattern's
 *    own literal matched on the way back; pl did not.
 * 2. THE PICK RANGE SEPARATOR. The range is captured as one canonical-English
 *    expression (`0 to 5`) and was emitted verbatim, so the joiner stayed
 *    English while every other word localized. The parser wants the language's
 *    own joiner (`PICK_RANGE_SEPARATORS_BY_LANG`) — twenty-two languages also
 *    accept English `to`, but pl's `to` tokenizes as the PRONOUN `it`, so the
 *    range and the source were both lost and the `pick` action dropped.
 * 3. `o` IS NOT ALWAYS `or`. `OR_WORDS` matched by surface across all languages,
 *    and `o` is the or-word in es/it/tl and the BY-marker in pl. `zwiększ #score
 *    o 10` had its `o 10` swallowed into the event name: `on click or 10
 *    increment #score by 10`.
 *
 * Plus qu's `return`: see `feature-block-render.test.ts`, whose failing-when-fixed
 * pin this promotes — `kutichiy` is also an accepted surface for TOGGLE, and
 * toggle won the match.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parseSemantic, render } from '../src/index';

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

function roundTrip(english: string, language: string): string {
  const reference = parseSemantic(english, 'en')?.node;
  expect(reference, `en did not parse: ${english}`).toBeTruthy();
  const rendered = render(reference!, language);
  const reparsed = parseSemantic(rendered, language)?.node;
  expect(reparsed, `${language} did not re-parse: ${rendered}`).toBeTruthy();
  return render(reparsed!, 'en');
}

describe('a pick range is localized end to end', () => {
  const SOURCE = 'on click pick characters 0 to 5 of #note';

  it.each(LANGUAGES)('%s round-trips it', language => {
    const reference = parseSemantic(SOURCE, 'en')!.node!;
    expect(roundTrip(SOURCE, language)).toBe(render(reference, 'en'));
  });

  it.each(LANGUAGES)('%s leaves no English `pick` or ` to ` in the surface', language => {
    const rendered = render(parseSemantic(SOURCE, 'en')!.node!, language);
    // `pick` survives only where the language's own word IS `pick`; none of the
    // 23 spells it that way, and none spells its range joiner ` to `.
    expect(rendered, `verb untranslated: ${rendered}`).not.toMatch(/(^|\s)pick(\s|$)/);
    expect(rendered, `range separator untranslated: ${rendered}`).not.toMatch(/\sto\s/);
  });
});

describe('`o` is a role marker in pl, not a conjunction', () => {
  it('pl keeps `zwiększ #score o 10` as one increment', () => {
    const rendered = render(parseSemantic('on click increment #score by 10', 'en')!.node!, 'pl');
    expect(rendered).toBe('gdy click zwiększ #score o 10');
    const node = parseSemantic(rendered, 'pl')?.node as
      { roles?: Map<string, unknown> } | undefined;
    // The event swallowed `o 10` — `{ value: 'click or 10' }` — which is what
    // produced the phantom `or 10` clause in the English.
    expect(node?.roles?.get('event')).toMatchObject({ value: 'click' });
    expect(roundTrip('on click increment #score by 10', 'pl')).toBe(
      'on click increment #score by 10'
    );
  });

  it.each(['es', 'it', 'tl'])('%s still reads its own `o` as a conjunction', language => {
    const source = 'on click or keyup toggle .a';
    const reference = parseSemantic(source, 'en')!.node!;
    expect(roundTrip(source, language)).toBe(render(reference, 'en'));
  });
});
