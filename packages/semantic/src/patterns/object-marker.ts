/**
 * An object marker a handcrafted pattern writes as a literal. ko's has two
 * forms, by the word before it (`를` after a vowel, `을` after a consonant):
 * a pattern lists one, and reads both.
 */
import type { PatternToken } from '../types';

export function objectMarkerToken(marker: string): PatternToken {
  return marker === '를'
    ? { type: 'literal', value: marker, alternatives: ['을'] }
    : { type: 'literal', value: marker };
}
