/**
 * Spec Parser
 *
 * Parses multi-line BehaviorSpec input into structured TestBlocks.
 * Uses indentation-based nesting to determine hierarchy:
 *
 * Level 0: test "name"        → starts a TestBlock
 * Level 1: given ...          → adds setup step
 * Level 1: when ...           → starts an InteractionBlock
 * Level 2: <assertion>        → expectation under current when
 *
 * Lines starting with articles ("the", "a", "an") are parsed as expect commands.
 * "after" lines attach timing to the preceding expectation.
 * "not" prefix negates the following assertion.
 */

import type { MultilingualDSL, SemanticNode, SemanticValue } from '@lokascript/framework';

// =============================================================================
// Types
// =============================================================================

export interface SpecParseResult {
  /** Parsed test blocks */
  tests: TestBlock[];
  /** Parse errors */
  errors: string[];
}

export interface TestBlock {
  /** Test scenario name */
  name: string;
  /** Setup/precondition steps (given) */
  givens: SemanticNode[];
  /** Interaction blocks (when + expectations) */
  interactions: InteractionBlock[];
}

export interface InteractionBlock {
  /** The user interaction (when) */
  when: SemanticNode;
  /** Assertions expected after the interaction */
  expectations: ExpectationNode[];
}

export interface ExpectationNode {
  /** The assertion semantic node */
  node: SemanticNode;
  /** Optional timing modifier */
  timing?: SemanticNode;
  /** Whether this assertion is negated */
  negated?: boolean;
}

// =============================================================================
// Article Prefixes (stripped from assertion lines)
// =============================================================================

const ARTICLE_PREFIXES: Record<string, string[]> = {
  en: ['the ', 'a ', 'an '],
  es: ['el ', 'la ', 'un ', 'una ', 'los ', 'las '],
  ja: [],
  ar: ['ال'],
};

// =============================================================================
// Command Keywords (for detecting line types)
// =============================================================================

const TEST_KEYWORDS: Record<string, string[]> = {
  en: ['test'],
  es: ['prueba'],
  ja: ['テスト'],
  ar: ['اختبار'],
};

const GIVEN_KEYWORDS: Record<string, string[]> = {
  en: ['given'],
  es: ['dado'],
  ja: ['前提'],
  ar: ['بافتراض'],
};

const WHEN_KEYWORDS: Record<string, string[]> = {
  en: ['when'],
  es: ['cuando'],
  ja: ['操作'],
  ar: ['عندما'],
};

const AFTER_KEYWORDS: Record<string, string[]> = {
  en: ['after'],
  es: ['despues'],
  ja: ['後'],
  ar: ['بعد'],
};

const NOT_KEYWORDS: Record<string, string[]> = {
  en: ['not'],
  es: ['no'],
  ja: ['否定'],
  ar: ['ليس'],
};

// =============================================================================
// Helpers
// =============================================================================

/** Get indentation level (number of leading spaces/tabs) */
function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  const whitespace = match[1];
  // Count tabs as 2 spaces
  return whitespace.replace(/\t/g, '  ').length;
}

/** SOV languages where the command keyword appears at the END of the line */
const SOV_LANGUAGES = new Set(['ja']);

/** Check if a line contains the command keyword (at start for SVO/VSO, at end for SOV) */
function hasKeyword(line: string, keywords: Record<string, string[]>, language: string): boolean {
  const kwSet = keywords[language] ?? keywords.en;
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();

  if (SOV_LANGUAGES.has(language)) {
    // For SOV, keyword is at the end
    return kwSet.some(kw => lower.endsWith(kw) || lower.startsWith(kw));
  }
  // For SVO/VSO, keyword is at the start
  return kwSet.some(kw => lower.startsWith(kw));
}

/** Strip article prefix from a line */
function stripArticle(line: string, language: string): string {
  const articles = ARTICLE_PREFIXES[language] ?? ARTICLE_PREFIXES.en;
  const lower = line.toLowerCase();
  for (const article of articles) {
    if (lower.startsWith(article)) {
      return line.slice(article.length);
    }
  }
  return line;
}

/** Extract quoted test name from a test line */
function extractTestName(line: string): string {
  const match = line.match(/["'](.+?)["']/);
  return match ? match[1] : line.replace(/^\S+\s*/, '').trim() || 'Untitled';
}

// =============================================================================
// Spec Parser
// =============================================================================

/**
 * Parse a multi-line BehaviorSpec into structured TestBlocks.
 */
export function parseBehaviorSpec(
  dsl: MultilingualDSL,
  input: string,
  language: string
): SpecParseResult {
  const lines = input.split('\n');
  const tests: TestBlock[] = [];
  const errors: string[] = [];

  let currentTest: TestBlock | null = null;
  let currentInteraction: InteractionBlock | null = null;
  let baseIndent = -1; // Auto-detect indentation

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('//')) continue;

    const indent = getIndent(rawLine);

    // Detect base indent from first non-test line
    if (baseIndent < 0 && !hasKeyword(trimmed, TEST_KEYWORDS, language)) {
      baseIndent = indent;
    }

    // Level 0: test "name"
    if (hasKeyword(trimmed, TEST_KEYWORDS, language)) {
      // Flush current interaction
      if (currentInteraction && currentTest) {
        currentTest.interactions.push(currentInteraction);
        currentInteraction = null;
      }
      // Flush current test
      if (currentTest) {
        tests.push(currentTest);
      }

      const name = extractTestName(trimmed);
      currentTest = { name, givens: [], interactions: [] };
      baseIndent = -1; // Reset for next test block
      continue;
    }

    // If no test block yet, create a default one
    if (!currentTest) {
      currentTest = { name: 'Untitled', givens: [], interactions: [] };
    }

    // Determine relative indent level
    const relativeIndent = baseIndent >= 0 ? Math.max(0, indent - baseIndent) : 0;
    const level = relativeIndent >= 2 ? 2 : indent > 0 && baseIndent >= 0 ? 1 : 1;

    // Level 1: given ...
    if (hasKeyword(trimmed, GIVEN_KEYWORDS, language)) {
      try {
        const node = dsl.parse(trimmed, language);
        currentTest.givens.push(node);
      } catch (err) {
        errors.push(
          `Line ${i + 1}: Failed to parse given: "${trimmed}" - ${err instanceof Error ? err.message : String(err)}`
        );
      }
      continue;
    }

    // Level 1: when ...
    if (hasKeyword(trimmed, WHEN_KEYWORDS, language)) {
      // Flush previous interaction
      if (currentInteraction) {
        currentTest.interactions.push(currentInteraction);
      }

      try {
        const node = dsl.parse(trimmed, language);
        currentInteraction = { when: node, expectations: [] };
      } catch (err) {
        errors.push(
          `Line ${i + 1}: Failed to parse when: "${trimmed}" - ${err instanceof Error ? err.message : String(err)}`
        );
        currentInteraction = null;
      }
      continue;
    }

    // Level 2 (under when): assertions
    if (currentInteraction) {
      // Handle "after" timing modifier
      if (hasKeyword(trimmed, AFTER_KEYWORDS, language)) {
        try {
          const node = dsl.parse(trimmed, language);
          // Attach to previous expectation if exists, otherwise create standalone
          const lastExp =
            currentInteraction.expectations[currentInteraction.expectations.length - 1];
          if (lastExp) {
            lastExp.timing = node;
          }
        } catch (err) {
          errors.push(
            `Line ${i + 1}: Failed to parse after: "${trimmed}" - ${err instanceof Error ? err.message : String(err)}`
          );
        }
        continue;
      }

      // Handle negation
      let negated = false;
      let lineToParse = trimmed;
      if (hasKeyword(trimmed, NOT_KEYWORDS, language)) {
        negated = true;
        const notKws = NOT_KEYWORDS[language] ?? NOT_KEYWORDS.en;
        for (const kw of notKws) {
          if (lineToParse.toLowerCase().startsWith(kw)) {
            lineToParse = lineToParse.slice(kw.length).trim();
            break;
          }
        }
      }

      // Strip articles and parse as expect
      lineToParse = stripArticle(lineToParse, language);

      // Prepend "expect" keyword if the line doesn't start with one
      const expectKws: Record<string, string[]> = {
        en: ['expect'],
        es: ['esperar'],
        ja: ['期待'],
        ar: ['توقع'],
      };
      if (!hasKeyword(lineToParse, expectKws, language)) {
        const expectKw = (expectKws[language] ?? expectKws.en)[0];
        lineToParse = `${expectKw} ${lineToParse}`;
      }

      try {
        const node = dsl.parse(lineToParse, language);
        currentInteraction.expectations.push({ node, negated: negated || undefined });
      } catch (err) {
        errors.push(
          `Line ${i + 1}: Failed to parse expectation: "${trimmed}" - ${err instanceof Error ? err.message : String(err)}`
        );
      }
      continue;
    }

    // Unrecognized line outside when block
    errors.push(`Line ${i + 1}: Unexpected line outside when block: "${trimmed}"`);
  }

  // Flush remaining
  if (currentInteraction && currentTest) {
    currentTest.interactions.push(currentInteraction);
  }
  if (currentTest) {
    tests.push(currentTest);
  }

  return { tests, errors };
}
