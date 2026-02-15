/**
 * Scenario Parser
 *
 * Wraps the framework's single-command DSL parser to handle multi-step
 * BDD scenarios. Splits input on language-specific delimiters, parses
 * each step individually, and assembles a CompoundSemanticNode.
 */

import type { MultilingualDSL, SemanticNode, SemanticValue } from '@lokascript/framework';
import { extractValue } from '@lokascript/framework';

// =============================================================================
// Types
// =============================================================================

export interface ScenarioParseResult {
  /** The compound scenario node */
  scenario: SemanticNode & { statements: SemanticNode[]; chainType: string; name?: string };
  /** Individual parsed steps */
  steps: SemanticNode[];
  /** Parse errors for any failed steps */
  errors: string[];
  /** Scenario name extracted from header (if present) */
  name?: string;
}

export interface FeatureParseResult {
  /** Feature name */
  name: string;
  /** Background steps (compiled to beforeEach) */
  background: ScenarioParseResult | null;
  /** Individual scenarios */
  scenarios: ScenarioParseResult[];
  /** Parse errors */
  errors: string[];
}

// =============================================================================
// Scenario Header Detection
// =============================================================================

/** Multilingual Scenario: keywords (case-insensitive for Latin scripts) */
const SCENARIO_KEYWORDS: Record<string, string[]> = {
  en: ['scenario:'],
  es: ['escenario:'],
  ja: ['シナリオ:'],
  ar: ['سيناريو:'],
  ko: ['시나리오:'],
  zh: ['场景:'],
  tr: ['senaryo:'],
  fr: ['scénario:'],
};

/** Multilingual Feature: keywords */
const FEATURE_KEYWORDS: Record<string, string[]> = {
  en: ['feature:'],
  es: ['funcionalidad:'],
  ja: ['機能:'],
  ar: ['ميزة:'],
  ko: ['기능:'],
  zh: ['功能:'],
  tr: ['özellik:'],
  fr: ['fonctionnalité:'],
};

/** Multilingual Background: keywords */
const BACKGROUND_KEYWORDS: Record<string, string[]> = {
  en: ['background:'],
  es: ['antecedentes:'],
  ja: ['背景:'],
  ar: ['خلفية:'],
  ko: ['배경:'],
  zh: ['背景:'],
  tr: ['arkaplan:'],
  fr: ['contexte:'],
};

/**
 * Extract a scenario name from a `Scenario: name` header line.
 * Returns the name and remaining body, or null name if no header found.
 */
function extractScenarioName(
  input: string,
  language: string
): { name: string | null; body: string } {
  const keywords = SCENARIO_KEYWORDS[language] ?? SCENARIO_KEYWORDS.en;
  const firstNewline = input.indexOf('\n');
  const firstLine = (firstNewline >= 0 ? input.slice(0, firstNewline) : input).trim();

  for (const kw of keywords) {
    if (firstLine.toLowerCase().startsWith(kw)) {
      const name = firstLine.slice(kw.length).trim() || 'Untitled';
      const body = firstNewline >= 0 ? input.slice(firstNewline + 1).trim() : '';
      return { name, body };
    }
  }

  return { name: null, body: input };
}

// =============================================================================
// Delimiter Configuration
// =============================================================================

const STEP_DELIMITERS: Record<string, RegExp> = {
  en: /,\s*|\n\s*/,
  es: /,\s*|\n\s*/,
  ja: /、|。|\n\s*/,
  ar: /،|\n\s*/,
  ko: /,\s*|\n\s*/,
  zh: /，|。|\n\s*/,
  tr: /,\s*|\n\s*/,
  fr: /,\s*|\n\s*/,
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get the keyword for a step type in a given language.
 * Used to reconstruct 'and' continuations.
 */
function getStepKeyword(stepType: string, language: string): string {
  const keywords: Record<string, Record<string, string>> = {
    given: {
      en: 'given',
      es: 'dado',
      ja: '前提',
      ar: 'بافتراض',
      ko: '전제',
      zh: '假设',
      tr: 'varsayalım',
      fr: 'soit',
    },
    when: {
      en: 'when',
      es: 'cuando',
      ja: 'したら',
      ar: 'عند',
      ko: '만약',
      zh: '当',
      tr: 'olduğunda',
      fr: 'quand',
    },
    then: {
      en: 'then',
      es: 'entonces',
      ja: 'ならば',
      ar: 'فإن',
      ko: '그러면',
      zh: '那么',
      tr: 'sonra',
      fr: 'alors',
    },
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
  // Extract optional Scenario: header
  const { name: scenarioName, body } = extractScenarioName(input, language);

  const delimiter = STEP_DELIMITERS[language] ?? STEP_DELIMITERS.en;
  const parts = body
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
          errors.push(`AND step "${part}" has no content`);
        }
      } else if (node.action === 'and' && !lastStepType) {
        errors.push(`AND step "${part}" has no preceding Given/When/Then step`);
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
    ...(scenarioName ? { name: scenarioName } : {}),
  };

  return { scenario, steps, errors, ...(scenarioName ? { name: scenarioName } : {}) };
}

// =============================================================================
// Feature Parser
// =============================================================================

/**
 * Check if a line matches any keyword from a keyword set (case-insensitive).
 * Returns the extracted name (after the keyword) or null.
 */
function matchKeyword(
  line: string,
  keywords: Record<string, string[]>,
  language: string
): string | null {
  const kwSet = keywords[language] ?? keywords.en;
  const trimmed = line.trim();
  for (const kw of kwSet) {
    if (trimmed.toLowerCase().startsWith(kw)) {
      return trimmed.slice(kw.length).trim() || null;
    }
  }
  return null;
}

/**
 * Parse a full BDD Feature block with optional Background and multiple Scenarios.
 *
 * ```
 * Feature: Authentication
 *   Background:
 *     Given /login is loaded
 *   Scenario: Login
 *     Given #login is visible
 *     When click on #submit
 *   Scenario: Logout
 *     Given #dashboard is visible
 *     When click on #logout
 * ```
 */
export function parseBDDFeature(
  dsl: MultilingualDSL,
  input: string,
  language: string
): FeatureParseResult {
  const lines = input.split('\n');
  const errors: string[] = [];

  // Extract Feature: header
  const featureNameMatch = matchKeyword(lines[0] ?? '', FEATURE_KEYWORDS, language);
  if (featureNameMatch === null && !lines[0]?.trim()) {
    errors.push('No Feature: header found');
    return { name: 'Untitled', background: null, scenarios: [], errors };
  }
  const featureName = featureNameMatch ?? 'Untitled';

  // Split remaining lines into blocks (Background and Scenarios)
  let background: ScenarioParseResult | null = null;
  const scenarios: ScenarioParseResult[] = [];
  let currentBlock: { type: 'background' | 'scenario'; name: string; lines: string[] } | null =
    null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const bgMatch = matchKeyword(line, BACKGROUND_KEYWORDS, language);
    const scenarioMatch = matchKeyword(line, SCENARIO_KEYWORDS, language);

    if (
      bgMatch !== null ||
      line.trim().toLowerCase() === 'background:' ||
      (BACKGROUND_KEYWORDS[language] ?? BACKGROUND_KEYWORDS.en).some(kw =>
        line.trim().toLowerCase().startsWith(kw)
      )
    ) {
      // Flush current block
      if (currentBlock)
        flushBlock(dsl, language, currentBlock, scenarios, errors, bg => {
          background = bg;
        });
      currentBlock = { type: 'background', name: bgMatch ?? '', lines: [] };
    } else if (
      scenarioMatch !== null ||
      (SCENARIO_KEYWORDS[language] ?? SCENARIO_KEYWORDS.en).some(kw =>
        line.trim().toLowerCase().startsWith(kw)
      )
    ) {
      // Flush current block
      if (currentBlock)
        flushBlock(dsl, language, currentBlock, scenarios, errors, bg => {
          background = bg;
        });
      const name = matchKeyword(line, SCENARIO_KEYWORDS, language) ?? 'Untitled';
      currentBlock = { type: 'scenario', name, lines: [] };
    } else if (currentBlock && line.trim()) {
      currentBlock.lines.push(line.trim());
    }
  }

  // Flush last block
  if (currentBlock)
    flushBlock(dsl, language, currentBlock, scenarios, errors, bg => {
      background = bg;
    });

  return { name: featureName, background, scenarios, errors };
}

function flushBlock(
  dsl: MultilingualDSL,
  language: string,
  block: { type: 'background' | 'scenario'; name: string; lines: string[] },
  scenarios: ScenarioParseResult[],
  errors: string[],
  setBackground: (bg: ScenarioParseResult) => void
): void {
  if (block.lines.length === 0) return;
  const body = block.lines.join('\n');
  const result = parseBDDScenario(dsl, body, language);

  if (block.type === 'background') {
    setBackground(result);
  } else {
    // Set the scenario name
    result.scenario.name = block.name;
    result.name = block.name;
    scenarios.push(result);
  }
  errors.push(...result.errors);
}
