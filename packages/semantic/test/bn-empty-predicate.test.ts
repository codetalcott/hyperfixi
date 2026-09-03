/**
 * bn's `empty` PREDICATE is not bn's `empty` COMMAND.
 *
 * hyperscript spells both with the same English word — `empty #list` is the
 * command, `if my value is empty` is the state predicate — and Bengali does not:
 * `খালি-করুন` is the imperative "empty it!", `খালি` is the adjective. The bn
 * lexicon carried the imperative in its `expressions` table, so a condition
 * rendered `… হয় খালি-করুন`, and re-parsing split the verbal suffix off and
 * leaked it into the English:
 *
 *   en   on blur if my value is empty add .error to me end
 *   bn   ঝাপসা তে যদি আমার মান হয় খালি-করুন আমি তে .error কে যোগ শেষ
 *   bn → on blur if my value is empty - করুন add .error to me end
 *
 * Every fidelity score is 1.0 on that — the stray `- করুন` is not an action and
 * not a role — so only the English round-trip sees it (bn if-empty,
 * input-validation).
 *
 * The command keeps the imperative: it comes from the profile's `keywords`,
 * which this does not touch.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parseSemantic, render } from '../src/index';

function roundTrip(english: string, language: string): string {
  const reference = parseSemantic(english, 'en')?.node;
  expect(reference, `en did not parse: ${english}`).toBeTruthy();
  const rendered = render(reference!, language);
  const reparsed = parseSemantic(rendered, language)?.node;
  expect(reparsed, `${language} did not re-parse: ${rendered}`).toBeTruthy();
  return render(reparsed!, 'en');
}

describe('the predicate renders the adjective', () => {
  it.each([
    'on blur if my value is empty add .error to me end',
    'on blur if my value is empty add .error to me else remove .error from me end',
  ])('%s', english => {
    const reference = parseSemantic(english, 'en')!.node!;
    const rendered = render(reference, 'bn');
    expect(rendered, 'the imperative leaked into the condition').not.toContain('খালি-করুন');
    expect(rendered).toContain('খালি');
    expect(roundTrip(english, 'bn')).toBe(render(reference, 'en'));
  });
});

describe('the command still renders the imperative', () => {
  // The scope boundary: `empty` as a COMMAND comes from the profile keywords,
  // which this change does not touch.
  it.each(['empty me', 'on click empty #list'])('%s', english => {
    const reference = parseSemantic(english, 'en')!.node!;
    expect(render(reference, 'bn')).toContain('খালি-করুন');
    expect(roundTrip(english, 'bn')).toBe(render(reference, 'en'));
  });
});
