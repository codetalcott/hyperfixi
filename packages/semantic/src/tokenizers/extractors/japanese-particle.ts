/**
 * Japanese Particle Extractor (Context-Aware)
 *
 * Handles Japanese particles with role metadata:
 * - Single-character particles: を (patient), に (destination), が (subject)
 * - Multi-character particles: から (source), まで (until), より (comparison)
 * - Particle metadata includes role and confidence scores
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

/**
 * Particle metadata for semantic role assignment.
 */
interface ParticleMetadata {
  readonly role: string;
  readonly confidence: number;
  readonly variant?: string;
}

/**
 * Single-character Japanese particles with role metadata.
 */
const SINGLE_CHAR_PARTICLES = new Map<string, ParticleMetadata>([
  ['を', { role: 'patient', confidence: 0.95 }],
  ['に', { role: 'destination', confidence: 0.85 }],
  ['が', { role: 'subject', confidence: 0.9 }],
  ['の', { role: 'possessive', confidence: 0.9 }],
  ['と', { role: 'conjunction', confidence: 0.8 }],
  ['で', { role: 'instrument', confidence: 0.85 }],
  ['へ', { role: 'direction', confidence: 0.85 }],
  ['や', { role: 'listing', confidence: 0.8 }],
  ['か', { role: 'question', confidence: 0.85 }],
  ['も', { role: 'also', confidence: 0.85 }],
  ['は', { role: 'topic', confidence: 0.9 }],
]);

/**
 * Multi-character Japanese particles with role metadata.
 */
const MULTI_CHAR_PARTICLES = new Map<string, ParticleMetadata>([
  ['から', { role: 'source', confidence: 0.95 }],
  ['まで', { role: 'until', confidence: 0.95 }],
  ['より', { role: 'comparison', confidence: 0.9 }],
  ['として', { role: 'as', confidence: 0.9 }],
  ['について', { role: 'about', confidence: 0.9 }],
  ['によって', { role: 'by-means', confidence: 0.9 }],
  ['にて', { role: 'at-location', confidence: 0.85 }],
]);

/**
 * JapaneseParticleExtractor - Extracts Japanese particles with role metadata.
 */
export class JapaneseParticleExtractor implements ContextAwareExtractor {
  readonly name = 'japanese-particle';

  // Context available for future use (e.g., particle boundary detection)
  private _context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this._context = context;
  }

  /**
   * A single-character particle reading must NOT split a longer keyword that
   * starts at the same position: もし (if) would otherwise tokenize as
   * も[particle] + し[identifier] and the conditional could never anchor.
   * Checks exact 2..4-char slices against the keyword map (longest first).
   */
  private longerKeywordStartsHere(input: string, position: number): boolean {
    if (!this._context) return false;
    for (let len = 4; len >= 2; len--) {
      const slice = input.slice(position, position + len);
      if (slice.length === len && this._context.isKeyword(slice)) {
        return true;
      }
    }
    return false;
  }

  canExtract(input: string, position: number): boolean {
    const char = input[position];

    // Check single-character particles (unless a longer keyword starts here)
    if (SINGLE_CHAR_PARTICLES.has(char) && !this.longerKeywordStartsHere(input, position)) {
      return true;
    }

    // Check multi-character particles (greedy longest-first)
    for (const [particle] of MULTI_CHAR_PARTICLES) {
      if (input.startsWith(particle, position)) {
        return true;
      }
    }

    return false;
  }

  extract(input: string, position: number): ExtractionResult | null {
    // Try multi-character particles first (longest match)
    for (const [particle, metadata] of MULTI_CHAR_PARTICLES) {
      if (input.startsWith(particle, position)) {
        return {
          value: particle,
          length: particle.length,
          metadata: {
            role: metadata.role,
            confidence: metadata.confidence,
            variant: particle,
          },
        };
      }
    }

    // Try single-character particles (the canExtract keyword gate re-applies
    // because extract() can be reached through a different dispatch path)
    const char = input[position];
    if (this.longerKeywordStartsHere(input, position)) return null;
    const metadata = SINGLE_CHAR_PARTICLES.get(char);
    if (metadata) {
      return {
        value: char,
        length: 1,
        metadata: {
          role: metadata.role,
          confidence: metadata.confidence,
          variant: char,
        },
      };
    }

    return null;
  }
}

/**
 * Create Japanese-specific extractors.
 */
export function createJapaneseExtractors(): ContextAwareExtractor[] {
  return [new JapaneseParticleExtractor()];
}
