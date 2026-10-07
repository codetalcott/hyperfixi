/**
 * Upstream's statement modifier, `<command> unless <condition>` (M1 phase 3).
 * The flat model reads a guard ahead of its command (core's prefix `unless C X`
 * and the SOV trailing guard do); a guard read after its command now moves
 * there, and English writes it back after, as upstream reads it. Before,
 * `toggle .foo unless I match .bar` was written `toggle .foo then unless I
 * match .bar`, and core's prefix form `unless C X`: upstream rejects both.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, render, translate } from '../src/index';
import { collectActionsMultiset } from '../src/fidelity';
import { toUpstreamSpelling } from '../src/explicit/upstream-spelling';

const en = (code: string) => render(parse(code, 'en'), 'en');
const body = (code: string) =>
  (
    parse(code, 'en') as unknown as { body: Array<{ statements?: Array<{ action: string }> }> }
  ).body[0]!.statements!.map(s => s.action);

describe('a postfix guard', () => {
  it('is read ahead of the command it guards', () => {
    expect(body('on click toggle .foo unless I match .bar')).toEqual(['unless', 'toggle']);
  });

  it('guards only its own command', () => {
    expect(body('on click log 1 unless x then log 2')).toEqual(['unless', 'log', 'log']);
    expect(en('on click log 1 unless x then log 2')).toBe('on click log 1 unless x then log 2');
  });

  it.each([
    ['on click toggle .foo unless I match .bar', 'on click toggle .foo unless I match .bar'],
    // core's prefix form, written in upstream's spelling
    [
      'on click unless I match .disabled toggle .selected',
      'on click toggle .selected unless I match .disabled',
    ],
    // after a `then`, an `unless` guards what follows it
    ['on click log 1 then unless x then log 2', 'on click log 1 then log 2 unless x'],
  ])('%s', (code, english) => {
    expect(en(code)).toBe(english);
  });

  it('counts as the unless it is (the read-back compares the rewritten node)', () => {
    const node = parse('on click toggle .foo unless I match .bar', 'en');
    expect(collectActionsMultiset(toUpstreamSpelling(node))).toEqual(collectActionsMultiset(node));
  });

  it.each(['es', 'ja', 'ar', 'ko', 'tr', 'de'])('round-trips in %s', language => {
    const code = 'on click toggle .foo unless I match .bar';
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(code);
  });
});
