/**
 * Hindi Particle Extractor (Context-Aware)
 *
 * Handles Hindi postpositions with role metadata:
 * - Single-word postpositions: को (patient), में (destination), से (source)
 * - Compound postpositions: के लिए (for), के साथ (with), के बाद (after)
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
 * Single-word Hindi postpositions with role metadata.
 */
const SINGLE_POSTPOSITIONS = new Map<string, ParticleMetadata>([
  ['को', { role: 'patient', confidence: 0.95 }], // Direct object marker
  ['में', { role: 'destination', confidence: 0.9 }], // Location/destination
  ['पर', { role: 'event', confidence: 0.85 }], // On/at (events, locations)
  ['से', { role: 'source', confidence: 0.9 }], // From/by (source, instrument)
  ['का', { role: 'possessive', confidence: 0.95 }], // Possessive marker (m)
  ['की', { role: 'possessive', confidence: 0.95 }], // Possessive marker (f)
  ['के', { role: 'possessive', confidence: 0.95 }], // Possessive marker (pl/obl)
  ['तक', { role: 'until', confidence: 0.9 }], // Until/up to
  ['ने', { role: 'agent', confidence: 0.85 }], // Agent marker (past tense)
]);

/**
 * Compound Hindi postpositions with role metadata.
 * These are multi-word expressions that must be matched as a unit.
 *
 * Only the phrases with NO profile keyword remain here (Task #10 Phase C). The
 * rest — के लिए=for, के बाद=after, से पहले=before, नहीं तो=else, जब तक=while —
 * are profile keywords whose natural spaced form the base tokenizer's
 * `tryMultiWordKeyword` (#416) now emits as one keyword token BEFORE any
 * extractor runs, so listing them here is dead. `के साथ` (with) and
 * `के बारे में` (about) have no profile-keyword multi-word form, so they still
 * need explicit handling.
 */
const COMPOUND_POSTPOSITIONS = new Map<string, ParticleMetadata>([
  ['के साथ', { role: 'instrument', confidence: 0.95 }], // With (accompaniment)
  ['के बारे में', { role: 'about', confidence: 0.9 }], // About
]);

/**
 * HindiParticleExtractor - Extracts Hindi postpositions with role metadata.
 */
export class HindiParticleExtractor implements ContextAwareExtractor {
  readonly name = 'hindi-particle';

  // Context available for future use (e.g., particle boundary detection)
  private _context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this._context = context;
    void this._context; // Satisfy noUnusedLocals
  }

  canExtract(input: string, position: number): boolean {
    // Check compound postpositions first (longest match)
    for (const [particle] of COMPOUND_POSTPOSITIONS) {
      if (input.startsWith(particle, position)) {
        return true;
      }
    }

    // Check single-word postpositions
    // We need to extract the word at position to check against the map
    let word = '';
    let pos = position;
    while (pos < input.length && this.isDevanagari(input[pos])) {
      word += input[pos];
      pos++;
    }

    return SINGLE_POSTPOSITIONS.has(word);
  }

  extract(input: string, position: number): ExtractionResult | null {
    // Try compound postpositions first (longest match)
    for (const [particle, metadata] of COMPOUND_POSTPOSITIONS) {
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

    // Try single-word postpositions
    let word = '';
    let pos = position;
    while (pos < input.length && this.isDevanagari(input[pos])) {
      word += input[pos];
      pos++;
    }

    const metadata = SINGLE_POSTPOSITIONS.get(word);
    if (metadata) {
      return {
        value: word,
        length: word.length,
        metadata: {
          role: metadata.role,
          confidence: metadata.confidence,
          variant: word,
        },
      };
    }

    return null;
  }

  private isDevanagari(char: string): boolean {
    const code = char.charCodeAt(0);
    return (code >= 0x0900 && code <= 0x097f) || (code >= 0xa8e0 && code <= 0xa8ff);
  }
}

/**
 * Create Hindi-specific extractors.
 */
export function createHindiExtractors(): ContextAwareExtractor[] {
  return [new HindiParticleExtractor()];
}
