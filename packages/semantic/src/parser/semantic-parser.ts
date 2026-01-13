/**
 * Semantic Parser
 *
 * The main parser that converts natural language hyperscript to semantic nodes.
 * Combines tokenization and pattern matching.
 */

import type {
  SemanticNode,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  SemanticParser as ISemanticParser,
  SemanticValue,
  ActionType,
  LanguagePattern,
} from '../types';
import { createCommandNode, createEventHandler, createCompoundNode } from '../types';
import {
  tokenize as tokenizeInternal,
  getSupportedLanguages as getTokenizerLanguages,
} from '../tokenizers';
// Import from registry for tree-shaking (registry uses directly-registered patterns first)
import { getPatternsForLanguage } from '../registry';
import { patternMatcher } from './pattern-matcher';
import { render as renderExplicitFn } from '../explicit/renderer';
import { parseExplicit as parseExplicitFn } from '../explicit/parser';

// =============================================================================
// Semantic Parser Implementation
// =============================================================================

export class SemanticParserImpl implements ISemanticParser {
  /**
   * Parse input in the specified language to a semantic node.
   */
  parse(input: string, language: string): SemanticNode {
    // Tokenize the input
    const tokens = tokenizeInternal(input, language);

    // Get patterns for this language
    const patterns = getPatternsForLanguage(language);

    if (patterns.length === 0) {
      throw new Error(`No patterns available for language: ${language}`);
    }

    // Sort patterns by priority (descending)
    const sortedPatterns = [...patterns].sort((a, b) => b.priority - a.priority);

    // Try to match event handler patterns first (they wrap commands)
    const eventPatterns = sortedPatterns.filter(p => p.command === 'on');
    const eventMatch = patternMatcher.matchBest(tokens, eventPatterns);

    if (eventMatch) {
      return this.buildEventHandler(eventMatch, tokens, language);
    }

    // Try command patterns
    const commandPatterns = sortedPatterns.filter(p => p.command !== 'on');
    const commandMatch = patternMatcher.matchBest(tokens, commandPatterns);

    if (commandMatch) {
      return this.buildCommand(commandMatch, language);
    }

    throw new Error(`Could not parse input in ${language}: ${input}`);
  }

  /**
   * Check if input can be parsed in the specified language.
   */
  canParse(input: string, language: string): boolean {
    try {
      this.parse(input, language);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all supported languages.
   */
  supportedLanguages(): string[] {
    return getTokenizerLanguages();
  }

  /**
   * Build a command semantic node from a pattern match.
   */
  private buildCommand(
    match: ReturnType<typeof patternMatcher.matchPattern>,
    language: string
  ): CommandSemanticNode {
    if (!match) {
      throw new Error('No match to build command from');
    }

    const roles: Record<string, SemanticValue> = {};
    for (const [role, value] of match.captured) {
      roles[role] = value;
    }

    return createCommandNode(match.pattern.command, roles, {
      sourceLanguage: language,
      patternId: match.pattern.id,
    });
  }

  /**
   * Build an event handler semantic node from a pattern match.
   */
  private buildEventHandler(
    match: ReturnType<typeof patternMatcher.matchPattern>,
    tokens: ReturnType<typeof tokenizeInternal>,
    language: string
  ): EventHandlerSemanticNode {
    if (!match) {
      throw new Error('No match to build event handler from');
    }

    // Extract the event name
    const eventValue = match.captured.get('event');
    if (!eventValue) {
      throw new Error('Event handler pattern matched but no event captured');
    }

    let body: SemanticNode[];

    // Check if pattern captured an action (grammar-transformed patterns)
    // These patterns combine event + action in a single match
    const actionValue = match.captured.get('action');
    if (actionValue && actionValue.type === 'literal') {
      // Create a command node directly from captured roles
      const actionName = actionValue.value as string;
      const roles: Record<string, SemanticValue> = {};

      // Copy relevant roles (excluding event, action, and continues which are structural)
      for (const [role, value] of match.captured) {
        if (role !== 'event' && role !== 'action' && role !== 'continues') {
          roles[role] = value;
        }
      }

      const commandNode = createCommandNode(actionName as ActionType, roles, {
        sourceLanguage: language,
        patternId: match.pattern.id,
      });

      // Check if pattern has continuation marker (then-chains)
      const continuesValue = match.captured.get('continues');
      if (continuesValue && continuesValue.type === 'literal' && continuesValue.value === 'then') {
        // Parse remaining tokens as additional commands
        const commandPatterns = getPatternsForLanguage(language)
          .filter(p => p.command !== 'on')
          .sort((a, b) => b.priority - a.priority);

        // Include grammar-transformed continuation patterns (these have specific command types)
        // Continuation patterns have command !== 'on' and id includes 'continuation'
        const grammarContinuationPatterns = getPatternsForLanguage(language)
          .filter(p => p.id.startsWith('grammar-') && p.id.includes('-continuation'))
          .sort((a, b) => b.priority - a.priority);

        const remainingCommands = this.parseBodyWithGrammarPatterns(
          tokens,
          commandPatterns,
          grammarContinuationPatterns,
          language
        );

        if (remainingCommands.length > 0) {
          // Combine first command with remaining commands
          body = [commandNode, ...remainingCommands];
        } else {
          body = [commandNode];
        }
      } else {
        body = [commandNode];
      }
    } else {
      // Traditional parsing: parse remaining tokens as body commands
      const commandPatterns = getPatternsForLanguage(language)
        .filter(p => p.command !== 'on')
        .sort((a, b) => b.priority - a.priority);

      body = this.parseBody(tokens, commandPatterns, language);
    }

    return createEventHandler(eventValue, body, undefined, {
      sourceLanguage: language,
      patternId: match.pattern.id,
    });
  }

  /**
   * Parse body commands with support for 'then' chains.
   * Returns a list of semantic nodes (possibly wrapped in CompoundSemanticNode).
   */
  private parseBody(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    language: string
  ): SemanticNode[] {
    const commands: SemanticNode[] = [];
    let hasThenChain = false;

    while (!tokens.isAtEnd()) {
      const current = tokens.peek();

      // Check for 'then' keyword - indicates command chaining
      if (current && this.isThenKeyword(current.value, language)) {
        tokens.advance();
        hasThenChain = true;
        continue;
      }

      // Check for 'end' keyword - terminates block
      if (current && this.isEndKeyword(current.value, language)) {
        tokens.advance();
        break;
      }

      // Try to match as a command
      const commandMatch = patternMatcher.matchBest(tokens, commandPatterns);
      if (commandMatch) {
        commands.push(this.buildCommand(commandMatch, language));
      } else {
        // Skip unrecognized token
        tokens.advance();
      }
    }

    // If we saw 'then' chains and have multiple commands, wrap in CompoundSemanticNode
    if (hasThenChain && commands.length > 1) {
      return [createCompoundNode(commands, 'then', { sourceLanguage: language })];
    }

    return commands;
  }

  /**
   * Parse body commands with support for grammar-transformed patterns.
   * Used after a grammar-transformed pattern with continuation marker.
   */
  private parseBodyWithGrammarPatterns(
    tokens: ReturnType<typeof tokenizeInternal>,
    commandPatterns: LanguagePattern[],
    grammarPatterns: LanguagePattern[],
    language: string
  ): SemanticNode[] {
    const commands: SemanticNode[] = [];

    while (!tokens.isAtEnd()) {
      const current = tokens.peek();

      // Check for 'then' keyword - skip it and continue parsing
      if (current && this.isThenKeyword(current.value, language)) {
        tokens.advance();
        continue;
      }

      // Check for 'end' keyword - terminates block
      if (current && this.isEndKeyword(current.value, language)) {
        tokens.advance();
        break;
      }

      let matched = false;

      // Try grammar-transformed continuation patterns first
      // These patterns have command set to the actual command type (e.g., 'remove', 'toggle')
      if (grammarPatterns.length > 0) {
        const grammarMatch = patternMatcher.matchBest(tokens, grammarPatterns);
        if (grammarMatch) {
          // Use the pattern's command field as the action
          const actionName = grammarMatch.pattern.command;
          const roles: Record<string, SemanticValue> = {};

          // Copy relevant roles (excluding structural roles)
          for (const [role, value] of grammarMatch.captured) {
            if (role !== 'event' && role !== 'action' && role !== 'continues') {
              roles[role] = value;
            }
          }

          const commandNode = createCommandNode(actionName as ActionType, roles, {
            sourceLanguage: language,
            patternId: grammarMatch.pattern.id,
          });
          commands.push(commandNode);
          matched = true;

          // Check if this pattern also has continuation
          const continuesValue = grammarMatch.captured.get('continues');
          if (
            continuesValue &&
            continuesValue.type === 'literal' &&
            continuesValue.value === 'then'
          ) {
            // Continue parsing for more commands
            continue;
          }
        }
      }

      // Try regular command patterns
      if (!matched) {
        const commandMatch = patternMatcher.matchBest(tokens, commandPatterns);
        if (commandMatch) {
          commands.push(this.buildCommand(commandMatch, language));
          matched = true;
        }
      }

      // Skip unrecognized token
      if (!matched) {
        tokens.advance();
      }
    }

    return commands;
  }

  /**
   * Check if a token is a 'then' keyword in the given language.
   */
  private isThenKeyword(value: string, language: string): boolean {
    const thenKeywords: Record<string, Set<string>> = {
      en: new Set(['then']),
      ja: new Set(['それから', '次に', 'そして']),
      ar: new Set(['ثم', 'بعدها', 'ثمّ']),
      es: new Set(['entonces', 'luego', 'después']),
      ko: new Set(['그다음', '그리고', '그런후']),
      zh: new Set(['然后', '接着', '之后']),
      tr: new Set(['sonra', 'ardından', 'daha sonra']),
      pt: new Set(['então', 'depois', 'logo']),
      fr: new Set(['puis', 'ensuite', 'alors']),
      de: new Set(['dann', 'danach', 'anschließend']),
      id: new Set(['lalu', 'kemudian', 'setelah itu']),
      qu: new Set(['chaymantataq', 'hinaspa', 'chaymanta']),
      sw: new Set(['kisha', 'halafu', 'baadaye']),
    };
    const keywords = thenKeywords[language] || thenKeywords.en;
    return keywords.has(value.toLowerCase());
  }

  /**
   * Check if a token is an 'end' keyword in the given language.
   */
  private isEndKeyword(value: string, language: string): boolean {
    const endKeywords: Record<string, Set<string>> = {
      en: new Set(['end']),
      ja: new Set(['終わり', '終了', 'おわり']),
      ar: new Set(['نهاية', 'انتهى', 'آخر']),
      es: new Set(['fin', 'final', 'terminar']),
      ko: new Set(['끝', '종료', '마침']),
      zh: new Set(['结束', '终止', '完']),
      tr: new Set(['son', 'bitiş', 'bitti']),
      pt: new Set(['fim', 'final', 'término']),
      fr: new Set(['fin', 'terminer', 'finir']),
      de: new Set(['ende', 'beenden', 'fertig']),
      id: new Set(['selesai', 'akhir', 'tamat']),
      qu: new Set(['tukukuy', 'tukuy', 'puchukay']),
      sw: new Set(['mwisho', 'maliza', 'tamati']),
    };
    const keywords = endKeywords[language] || endKeywords.en;
    return keywords.has(value.toLowerCase());
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Singleton parser instance.
 */
export const semanticParser = new SemanticParserImpl();

/**
 * Parse input in the specified language.
 */
export function parse(input: string, language: string): SemanticNode {
  return semanticParser.parse(input, language);
}

/**
 * Check if input can be parsed.
 */
export function canParse(input: string, language: string): boolean {
  return semanticParser.canParse(input, language);
}

/**
 * Parse and return command type if parseable.
 */
export function getCommandType(input: string, language: string): ActionType | null {
  try {
    const node = semanticParser.parse(input, language);
    return node.action;
  } catch {
    return null;
  }
}

// =============================================================================
// Additional Public API Functions
// =============================================================================

/**
 * Tokenize input for a specific language.
 */
export function tokenize(input: string, language: string) {
  return tokenizeInternal(input, language);
}

/**
 * Get list of supported languages.
 */
export function getSupportedLanguages(): string[] {
  return getTokenizerLanguages();
}

/**
 * Translate hyperscript between languages.
 */
export function translate(input: string, sourceLang: string, targetLang: string): string {
  const node = parse(input, sourceLang);
  return render(node, targetLang);
}

/**
 * Get translations for all supported languages.
 */
export function getAllTranslations(input: string, sourceLang: string): Record<string, string> {
  const node = parse(input, sourceLang);
  const result: Record<string, string> = {};
  for (const lang of getSupportedLanguages()) {
    try {
      result[lang] = render(node, lang);
    } catch {
      // Skip languages that can't render this command
    }
  }
  return result;
}

/**
 * Create a semantic analyzer for parsing with confidence scores.
 */
export function createSemanticAnalyzer() {
  return {
    analyze(input: string, language: string) {
      try {
        const node = parse(input, language);
        return { node, confidence: 1.0, success: true };
      } catch (error) {
        return { node: null, confidence: 0, success: false, error };
      }
    },
  };
}

/**
 * Render a SemanticNode to hyperscript in a specific language.
 */
export function render(node: SemanticNode, language: string): string {
  return renderExplicitFn(node, language);
}

/**
 * Render a SemanticNode in explicit syntax format.
 */
export function renderExplicit(node: SemanticNode): string {
  return renderExplicitFn(node, 'explicit');
}

/**
 * Parse explicit syntax format.
 */
export function parseExplicit(input: string): SemanticNode {
  return parseExplicitFn(input);
}

/**
 * Convert natural language to explicit syntax.
 */
export function toExplicit(input: string, language: string): string {
  const node = parse(input, language);
  return renderExplicit(node);
}

/**
 * Convert explicit syntax to natural language.
 */
export function fromExplicit(input: string, targetLang: string): string {
  const node = parseExplicit(input);
  return render(node, targetLang);
}

/**
 * Round-trip conversion for testing.
 */
export function roundTrip(input: string, language: string): string {
  const explicit = toExplicit(input, language);
  return fromExplicit(explicit, language);
}
