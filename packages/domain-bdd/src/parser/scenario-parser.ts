/**
 * Scenario Parser
 *
 * Wraps the framework's single-command DSL parser to handle multi-step
 * BDD scenarios. Splits input on language-specific delimiters, parses
 * each step individually, and assembles a CompoundSemanticNode.
 */

import type { MultilingualDSL } from '@lokascript/framework';
import type { SemanticNode, SemanticValue } from '@lokascript/framework';

// =============================================================================
// Types
// =============================================================================

export interface ScenarioParseResult {
  /** The compound scenario node */
  scenario: SemanticNode & { statements: SemanticNode[]; chainType: string };
  /** Individual parsed steps */
  steps: SemanticNode[];
  /** Parse errors for any failed steps */
  errors: string[];
}

// =============================================================================
// Delimiter Configuration
// =============================================================================

const STEP_DELIMITERS: Record<string, RegExp> = {
  en: /,\s*|\n\s*/,
  es: /,\s*|\n\s*/,
  ja: /、|。|\n\s*/,
  ar: /،|\n\s*/,
};

// =============================================================================
// Helpers
// =============================================================================

function extractValue(value: SemanticValue): string {
  if ('raw' in value && value.raw !== undefined) return String(value.raw);
  if ('value' in value && value.value !== undefined) return String(value.value);
  return '';
}

/**
 * Get the keyword for a step type in a given language.
 * Used to reconstruct 'and' continuations.
 */
function getStepKeyword(stepType: string, language: string): string {
  const keywords: Record<string, Record<string, string>> = {
    given: { en: 'given', es: 'dado', ja: '前提', ar: 'بافتراض' },
    when: { en: 'when', es: 'cuando', ja: 'したら', ar: 'عند' },
    then: { en: 'then', es: 'entonces', ja: 'ならば', ar: 'فإن' },
  };
  return keywords[stepType]?.[language] ?? stepType;
}

// =============================================================================
// Scenario Parser
// =============================================================================

/**
 * Parse a multi-step BDD scenario into a CompoundSemanticNode.
 *
 * Splits input on language-specific delimiters (commas, newlines, etc.),
 * parses each step via the DSL, and resolves 'and' continuations by
 * re-parsing with the previous step type's keyword.
 */
export function parseBDDScenario(
  dsl: MultilingualDSL,
  input: string,
  language: string
): ScenarioParseResult {
  const delimiter = STEP_DELIMITERS[language] ?? STEP_DELIMITERS.en;
  const parts = input
    .split(delimiter)
    .map(s => s.trim())
    .filter(Boolean);

  const steps: SemanticNode[] = [];
  const errors: string[] = [];
  let lastStepType: string | null = null;

  for (const part of parts) {
    try {
      const node = dsl.parse(part, language);

      if (node.action === 'and' && lastStepType) {
        // Resolve 'and' by re-parsing content with the previous step type's keyword
        const content = node.roles.get('content');
        if (content) {
          const keyword = getStepKeyword(lastStepType, language);
          const reconstructed = `${keyword} ${extractValue(content)}`;
          try {
            const resolvedNode = dsl.parse(reconstructed, language);
            steps.push(resolvedNode);
          } catch {
            // If re-parse fails, keep the original 'and' node
            steps.push(node);
          }
        } else {
          steps.push(node);
        }
      } else {
        if (node.action !== 'and') {
          lastStepType = node.action;
        }
        steps.push(node);
      }
    } catch (err) {
      errors.push(
        `Failed to parse step: "${part}" - ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const scenario = {
    kind: 'compound' as const,
    action: 'scenario',
    roles: new Map<string, SemanticValue>(),
    statements: steps,
    chainType: 'sequential' as const,
  };

  return { scenario, steps, errors };
}
