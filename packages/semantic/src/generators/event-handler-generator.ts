/**
 * Event Handler Pattern Generator
 *
 * Generates event handler patterns from LanguageProfile.eventHandler config.
 * Used for simple SVO languages that don't need complex hand-crafted patterns.
 *
 * Languages using this generator: German, French, Indonesian, Quechua, Swahili
 * Languages with hand-crafted patterns: English, Japanese, Korean, Arabic, Turkish, Spanish, Portuguese, Chinese
 */

import type { LanguagePattern } from '../types';
import type { LanguageProfile } from './profiles/types';

/**
 * Helper to create a literal token, only including alternatives if defined.
 */
function literalToken(
  value: string,
  alternatives?: string[]
): { type: 'literal'; value: string; alternatives?: string[] } {
  if (alternatives && alternatives.length > 0) {
    return { type: 'literal', value, alternatives };
  }
  return { type: 'literal', value };
}

/**
 * Generate event handler patterns from a language profile's eventHandler config.
 * Returns empty array if the profile doesn't have eventHandler config.
 */
export function generateEventHandlerPatterns(profile: LanguageProfile): LanguagePattern[] {
  const eh = profile.eventHandler;
  if (!eh) return [];

  const patterns: LanguagePattern[] = [];
  const lang = profile.code;

  // Pattern 1: Standard - "{keyword} {event}"
  // e.g., "bei click", "sur click"
  patterns.push({
    id: `event-${lang}-standard`,
    language: lang,
    command: 'on',
    priority: 100,
    template: {
      format: `${eh.keyword.primary} {event}`,
      tokens: [
        literalToken(eh.keyword.primary, eh.keyword.alternatives),
        { type: 'role', role: 'event' },
      ],
    },
    extraction: {
      event: { position: 1 },
    },
  });

  // Pattern 2: With source - "{keyword} {event} {sourceMarker} {source}"
  // e.g., "bei click von #button", "sur click de #button"
  const sourceMarkerValue = eh.sourceMarker.primary;
  const sourceExtraction: { marker: string; markerAlternatives?: string[] } = {
    marker: sourceMarkerValue,
  };
  if (eh.sourceMarker.alternatives && eh.sourceMarker.alternatives.length > 0) {
    sourceExtraction.markerAlternatives = eh.sourceMarker.alternatives;
  }

  patterns.push({
    id: `event-${lang}-source`,
    language: lang,
    command: 'on',
    priority: 110, // Higher priority for more specific pattern
    template: {
      format: `${eh.keyword.primary} {event} ${sourceMarkerValue} {source}`,
      tokens: [
        literalToken(eh.keyword.primary, eh.keyword.alternatives),
        { type: 'role', role: 'event' },
        literalToken(sourceMarkerValue, eh.sourceMarker.alternatives),
        { type: 'role', role: 'source' },
      ],
    },
    extraction: {
      event: { position: 1 },
      source: sourceExtraction,
    },
  });

  // Pattern 3: Conditional (if defined) - "{conditionalKeyword} {event}"
  // e.g., "wenn click", "quand click"
  if (eh.conditionalKeyword) {
    patterns.push({
      id: `event-${lang}-when`,
      language: lang,
      command: 'on',
      priority: 105, // Higher than standard, lower than with-source
      template: {
        format: `${eh.conditionalKeyword.primary} {event}`,
        tokens: [
          literalToken(eh.conditionalKeyword.primary, eh.conditionalKeyword.alternatives),
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    });
  }

  return patterns;
}
