/**
 * Chinese Particle Extractor (Context-Aware)
 *
 * Handles Chinese particles (助词/介词) with role metadata:
 * - Single-character particles: 把 (patient marker), 在 (location), 从 (source)
 * - Multi-character particles: 然后 (then), 接着 (next), 并且 (and)
 * - Particle metadata includes role and confidence scores
 *
 * Chinese particles mark grammatical relationships:
 * - 把 (bǎ): BA-construction direct object marker
 * - 在 (zài): Location/time marker
 * - 从 (cóng): Source marker
 * - 到 (dào): Destination marker
 * - 给 (gěi): Recipient marker
 * - 的/地/得 (de): Possessive/adverbial/complement markers
 * - 了/着/过 (le/zhe/guo): Aspect markers
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

/**
 * Particle metadata for semantic role assignment.
 */
interface ParticleMetadata {
  readonly role: string;
  readonly confidence: number;
  readonly description?: string;
}

/**
 * Single-character Chinese particles with role metadata.
 */
const SINGLE_CHAR_PARTICLES = new Map<string, ParticleMetadata>([
  // BA construction (object marking)
  ['把', { role: 'patient', confidence: 0.95, description: 'ba-construction object marker' }],

  // Location/time markers
  ['在', { role: 'location', confidence: 0.85, description: 'at/in/on location marker' }],

  // Directional markers
  ['从', { role: 'source', confidence: 0.9, description: 'from marker' }],
  ['到', { role: 'destination', confidence: 0.9, description: 'to/until marker' }],
  ['向', { role: 'destination', confidence: 0.85, description: 'towards marker' }],

  // Recipient/target markers
  ['给', { role: 'destination', confidence: 0.85, description: 'to/for recipient marker' }],
  ['对', { role: 'destination', confidence: 0.8, description: 'to/towards marker' }],

  // Instrument/means marker
  ['用', { role: 'instrument', confidence: 0.85, description: 'with/using marker' }],

  // Passive/causative markers
  ['被', { role: 'agent', confidence: 0.8, description: 'by (passive) marker' }],
  ['让', { role: 'agent', confidence: 0.75, description: 'let/make causative marker' }],

  // Attributive/adverbial markers (de particles)
  ['的', { role: 'possessive', confidence: 0.9, description: 'possessive/attributive marker' }],
  ['地', { role: 'manner', confidence: 0.85, description: 'adverbial marker' }],
  ['得', { role: 'manner', confidence: 0.8, description: 'complement marker' }],

  // Aspect markers
  ['了', { role: 'aspect', confidence: 0.7, description: 'completion aspect marker' }],
  ['着', { role: 'aspect', confidence: 0.7, description: 'progressive aspect marker' }],
  ['过', { role: 'aspect', confidence: 0.7, description: 'experiential aspect marker' }],

  // Question/emphasis particles
  ['吗', { role: 'mood', confidence: 0.75, description: 'question particle' }],
  ['呢', { role: 'mood', confidence: 0.7, description: 'question/emphasis particle' }],
  ['吧', { role: 'mood', confidence: 0.7, description: 'suggestion particle' }],
]);

/**
 * Multi-character Chinese particles with role metadata.
 * Ordered by length (longest first) for greedy matching.
 */
const MULTI_CHAR_PARTICLES = new Map<string, ParticleMetadata>([
  ['然后', { role: 'sequence', confidence: 0.9, description: 'then/afterwards' }],
  ['接着', { role: 'sequence', confidence: 0.85, description: 'next/following' }],
  ['并且', { role: 'conjunction', confidence: 0.85, description: 'and/moreover' }],
  ['或者', { role: 'conjunction', confidence: 0.85, description: 'or' }],
  ['如果', { role: 'condition', confidence: 0.9, description: 'if' }],
  ['那么', { role: 'consequence', confidence: 0.85, description: 'then' }],
  ['否则', { role: 'alternative', confidence: 0.85, description: 'otherwise' }],
]);

/**
 * ChineseParticleExtractor - Extracts Chinese particles with role metadata.
 */
export class ChineseParticleExtractor implements ContextAwareExtractor {
  readonly name = 'chinese-particle';

  private _context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this._context = context;
  }

  /**
   * True when a profile KEYWORD strictly longer than `particleLen` starts at
   * this position. This extractor runs BEFORE the keyword extractor, so
   * without the check a particle char that is also a keyword's first char
   * splits the keyword: `过渡` (transition, the profile primary) tokenized as
   * `过` (aspect particle) + `渡` (stray identifier) and the command verb
   * never anchored (zh NO-TRANSITION, spurious-transition precision family).
   * Longest-match must win across extractors, not just within one.
   */
  private longerKeywordAt(input: string, position: number, particleLen: number): boolean {
    const ctx = this._context;
    if (!ctx) return false;
    const maxLen = Math.min(10, input.length - position); // max zh keyword length
    for (let len = maxLen; len > particleLen; len--) {
      if (ctx.lookupKeyword(input.slice(position, position + len))) return true;
    }
    return false;
  }

  canExtract(input: string, position: number): boolean {
    const char = input[position];

    // Check single-character particles
    if (SINGLE_CHAR_PARTICLES.has(char) && !this.longerKeywordAt(input, position, 1)) {
      return true;
    }

    // Check multi-character particles (greedy longest-first)
    for (const [particle] of MULTI_CHAR_PARTICLES) {
      if (
        input.startsWith(particle, position) &&
        !this.longerKeywordAt(input, position, particle.length)
      ) {
        return true;
      }
    }

    return false;
  }

  extract(input: string, position: number): ExtractionResult | null {
    // Try multi-character particles first (longest match)
    for (const [particle, metadata] of MULTI_CHAR_PARTICLES) {
      if (
        input.startsWith(particle, position) &&
        !this.longerKeywordAt(input, position, particle.length)
      ) {
        return {
          value: particle,
          length: particle.length,
          metadata: {
            particleRole: metadata.role,
            particleConfidence: metadata.confidence,
            particleDescription: metadata.description,
          },
        };
      }
    }

    // Try single-character particles
    const char = input[position];
    const metadata = SINGLE_CHAR_PARTICLES.get(char);
    if (metadata && !this.longerKeywordAt(input, position, 1)) {
      return {
        value: char,
        length: 1,
        metadata: {
          particleRole: metadata.role,
          particleConfidence: metadata.confidence,
          particleDescription: metadata.description,
        },
      };
    }

    return null;
  }
}

/**
 * Create Chinese-specific particle extractor.
 */
export function createChineseParticleExtractor(): ContextAwareExtractor {
  return new ChineseParticleExtractor();
}
