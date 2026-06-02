/**
 * Korean Particle Extractor (Context-Aware)
 *
 * Handles Korean particles (조사) with vowel harmony metadata:
 * - Subject markers: 이/가 (consonant/vowel ending)
 * - Object markers: 을/를 (consonant/vowel ending)
 * - Topic markers: 은/는 (consonant/vowel ending)
 * - Plus 15 more particles with role metadata
 *
 * Korean particles mark grammatical roles and vary based on whether
 * the preceding syllable ends in a consonant or vowel.
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

/**
 * Particle metadata for semantic role assignment.
 */
interface ParticleMetadata {
  readonly role: string;
  readonly confidence: number;
  readonly variant?: 'consonant' | 'vowel';
  readonly description?: string;
}

/**
 * Single-character Korean particles with role metadata.
 */
const SINGLE_CHAR_PARTICLES = new Map<string, ParticleMetadata>([
  // Subject markers (vowel harmony pair)
  [
    '이',
    {
      role: 'agent',
      confidence: 0.85,
      variant: 'consonant',
      description: 'subject marker (after consonant)',
    },
  ],
  [
    '가',
    {
      role: 'agent',
      confidence: 0.85,
      variant: 'vowel',
      description: 'subject marker (after vowel)',
    },
  ],

  // Object markers (vowel harmony pair)
  [
    '을',
    {
      role: 'patient',
      confidence: 0.95,
      variant: 'consonant',
      description: 'object marker (after consonant)',
    },
  ],
  [
    '를',
    {
      role: 'patient',
      confidence: 0.95,
      variant: 'vowel',
      description: 'object marker (after vowel)',
    },
  ],

  // Topic markers (vowel harmony pair)
  [
    '은',
    {
      role: 'agent',
      confidence: 0.75,
      variant: 'consonant',
      description: 'topic marker (after consonant)',
    },
  ],
  [
    '는',
    {
      role: 'agent',
      confidence: 0.75,
      variant: 'vowel',
      description: 'topic marker (after vowel)',
    },
  ],

  // Location/time markers
  ['에', { role: 'destination', confidence: 0.85, description: 'at/to marker' }],

  // Direction/means markers (vowel harmony pair)
  [
    '로',
    {
      role: 'destination',
      confidence: 0.85,
      variant: 'vowel',
      description: 'to/by means (after vowel or ㄹ)',
    },
  ],

  // And/with markers (vowel harmony pair)
  [
    '와',
    { role: 'style', confidence: 0.7, variant: 'vowel', description: 'and/with (after vowel)' },
  ],
  [
    '과',
    {
      role: 'style',
      confidence: 0.7,
      variant: 'consonant',
      description: 'and/with (after consonant)',
    },
  ],

  // Other markers
  ['의', { role: 'patient', confidence: 0.6, description: 'possessive marker' }],
  ['도', { role: 'patient', confidence: 0.65, description: 'also/too marker' }],
  ['만', { role: 'patient', confidence: 0.65, description: 'only marker' }],
]);

/**
 * Multi-character Korean particles with role metadata.
 * Ordered by length (longest first) for greedy matching.
 */
const MULTI_CHAR_PARTICLES = new Map<string, ParticleMetadata>([
  ['에서', { role: 'source', confidence: 0.8, description: 'at/from marker (action location)' }],
  [
    '으로',
    {
      role: 'destination',
      confidence: 0.85,
      variant: 'consonant',
      description: 'to/by means (after consonant)',
    },
  ],
  ['부터', { role: 'source', confidence: 0.9, description: 'from/since marker' }],
  ['까지', { role: 'destination', confidence: 0.75, description: 'until/to marker' }],
  ['처럼', { role: 'manner', confidence: 0.8, description: 'like/as marker' }],
  ['보다', { role: 'source', confidence: 0.75, description: 'than marker' }],
]);

/**
 * True for a composed Hangul syllable (U+AC00–U+D7A3). Used to detect when a
 * single-char particle is actually the first syllable of a longer Hangul word.
 */
function isHangulSyllable(char: string | undefined): boolean {
  if (!char) return false;
  const code = char.codePointAt(0)!;
  return code >= 0xac00 && code <= 0xd7a3;
}

/**
 * KoreanParticleExtractor - Extracts Korean particles with vowel harmony metadata.
 */
export class KoreanParticleExtractor implements ContextAwareExtractor {
  readonly name = 'korean-particle';

  // Context available for future use (e.g., particle boundary detection)
  private _context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this._context = context;
    void this._context; // Satisfy noUnusedLocals
  }

  canExtract(input: string, position: number): boolean {
    const char = input[position];

    // Check single-character particles. A single-char particle is only a
    // particle when it stands alone (followed by space / punctuation / EOL).
    // If the next char is another Hangul syllable, this char is really the
    // first syllable of a longer word — e.g. 로그 "log" (not particle 로 + 그),
    // 이동 "go" (not subject-particle 이 + 동). Multi-char particles are tried
    // first below, so 에서 / 으로 etc. are unaffected.
    if (SINGLE_CHAR_PARTICLES.has(char) && !isHangulSyllable(input[position + 1])) {
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
            particleRole: metadata.role,
            particleConfidence: metadata.confidence,
            particleVariant: metadata.variant,
          },
        };
      }
    }

    // Try single-character particles — but only when standalone (see canExtract):
    // a single-char particle followed by another Hangul syllable is the first
    // syllable of a longer word (로그, 이동), not a particle.
    const char = input[position];
    const metadata = SINGLE_CHAR_PARTICLES.get(char);
    if (metadata && !isHangulSyllable(input[position + 1])) {
      return {
        value: char,
        length: 1,
        metadata: {
          particleRole: metadata.role,
          particleConfidence: metadata.confidence,
          particleVariant: metadata.variant,
        },
      };
    }

    return null;
  }
}

/**
 * Create Korean-specific particle extractor.
 */
export function createKoreanParticleExtractor(): ContextAwareExtractor {
  return new KoreanParticleExtractor();
}
