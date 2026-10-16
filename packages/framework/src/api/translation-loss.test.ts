/**
 * The translation-loss checks, with rules of a toy grammar: each check in its
 * place in the order, and the error a refusing translation throws.
 */
import { describe, expect, it } from 'vitest';
import {
  findTranslationLoss,
  LossyTranslationError,
  unconsumedSpans,
  type TranslationLossRules,
} from './translation-loss';

interface Node {
  readonly action: string;
  readonly diagnostics?: ReadonlyArray<{ readonly code?: string; readonly message: string }>;
}

const unread = (text: string): Node => ({
  action: 'go',
  diagnostics: [{ code: 'unconsumed-input', message: `input not read: "${text}"` }],
});

const rules: TranslationLossRules<Node> = {
  unwritable: node => (node.action === 'legacy' ? ['legacy'] : []),
  differences: [(written, back) => (written.action === back.action ? [] : [`-${written.action}`])],
  missingValues: (input, output) => (input.includes('#a') && !output.includes('#a') ? ['#a'] : []),
};

describe('findTranslationLoss', () => {
  const ok: Node = { action: 'go' };

  it('finds nothing in a translation that reads back with its values', () => {
    expect(findTranslationLoss('go #a', ok, 've #a', () => ok, rules)).toBeUndefined();
  });

  it('checks in order: truncation, core-only, read-back, invariant', () => {
    expect(findTranslationLoss('go #a x', unread('x'), '', () => ok, rules)).toEqual({
      kind: 'truncation',
      lost: ['x'],
    });
    expect(findTranslationLoss('x', { action: 'legacy' }, '', () => ok, rules)?.kind).toBe(
      'core-only'
    );
    expect(
      findTranslationLoss(
        'go #a',
        ok,
        '?',
        () => {
          throw new Error('no pattern');
        },
        rules
      )
    ).toEqual({ kind: 'read-back', lost: ['the output does not read: no pattern'] });
    expect(findTranslationLoss('go #a', ok, 've #a y', () => unread('y'), rules)).toEqual({
      kind: 'read-back',
      lost: ['y'],
    });
    expect(findTranslationLoss('go #a', ok, 'stop #a', () => ({ action: 'stop' }), rules)).toEqual({
      kind: 'read-back',
      lost: ['-go'],
    });
    expect(findTranslationLoss('go #a', ok, 've', () => ok, rules)).toEqual({
      kind: 'invariant',
      lost: ['#a'],
    });
  });

  it('compares the read-back with what was written', () => {
    const written: TranslationLossRules<Node> = { ...rules, written: () => ({ action: 'stop' }) };
    expect(
      findTranslationLoss('go #a', ok, 'stop #a', () => ({ action: 'stop' }), written)
    ).toBeUndefined();
  });
});

describe('unconsumedSpans and LossyTranslationError', () => {
  it('reads the unread text out of the diagnostics', () => {
    expect(unconsumedSpans(unread('banana'))).toEqual(['banana']);
    expect(unconsumedSpans({ action: 'go' })).toEqual([]);
  });

  it('says what the translation loses', () => {
    const error = new LossyTranslationError('ve', { kind: 'invariant', lost: ['#a'] }, 'en', 'es');
    expect(error.name).toBe('LossyTranslationError');
    expect(error.partial).toBe('ve');
    expect(error.message).toBe('translation en → es would lose part of the script (invariant): #a');
  });
});
