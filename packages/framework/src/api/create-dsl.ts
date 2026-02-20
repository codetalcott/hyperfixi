/**
 * Main API for creating multilingual DSLs
 */

import type { SemanticNode, LanguageTokenizer, LanguagePattern } from '../core/types';
import type { CommandSchema } from '../schema';
import { PatternMatcher, type PatternMatcherProfile } from '../core/pattern-matching';
import { generatePattern, type PatternGenLanguageProfile } from '../generation/pattern-generator';
import { GrammarTransformer, type LanguageProfile as GrammarProfile } from '../grammar';
import {
  type Dictionary,
  type ProfileProvider,
  type ValueExtractor,
  InMemoryDictionary,
  InMemoryProfileProvider,
} from '../interfaces';
import { isExplicitSyntax, parseExplicit } from '../ir';
import type { SchemaLookup } from '../ir';

/**
 * Language configuration for a DSL.
 */
export interface LanguageConfig {
  /** ISO 639-1 language code */
  readonly code: string;
  /** English name of the language */
  readonly name: string;
  /** Native name of the language */
  readonly nativeName: string;
  /** Language tokenizer */
  readonly tokenizer: LanguageTokenizer;
  /** Language profile for pattern generation */
  readonly patternProfile: PatternGenLanguageProfile;
  /** Language profile for grammar transformation (optional) */
  readonly grammarProfile?: GrammarProfile;
}

/**
 * Code generator function that transforms semantic AST to target code.
 */
export interface CodeGenerator {
  generate(node: SemanticNode): string;
}

/**
 * DSL configuration with dependency injection support.
 */
export interface DSLConfig {
  /** DSL name (for debugging/documentation) */
  readonly name?: string;

  /** Command schemas defining the DSL grammar */
  readonly schemas: readonly CommandSchema[];

  /** Language configurations */
  readonly languages: readonly LanguageConfig[];

  // === Dependency Injection (Optional) ===

  /** Dictionary for keyword translation (default: built from language configs) */
  readonly dictionary?: Dictionary;

  /** Profile provider for grammar transformation (default: built from language configs) */
  readonly profileProvider?: ProfileProvider;

  /** Value extractors for tokenization (default: generic extractors) */
  readonly valueExtractors?: ValueExtractor[];

  /** Code generator for compilation (default: none) */
  readonly codeGenerator?: CodeGenerator;

  // === Options ===

  /** Auto-generate patterns from schemas (default: true) */
  readonly generatePatterns?: boolean;

  /** Custom patterns to supplement generated ones */
  readonly customPatterns?: LanguagePattern[];
}

/**
 * Validation result.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly node?: SemanticNode;
  readonly errors?: string[];
}

/**
 * Compilation result.
 */
export interface CompileResult {
  readonly ok: boolean;
  readonly code?: string;
  readonly errors?: string[];
  readonly node?: SemanticNode;
  readonly metadata?: {
    readonly parser: string;
    readonly confidence: number;
  };
}

/**
 * Main multilingual DSL interface.
 */
export interface MultilingualDSL {
  // Parsing
  parse(input: string, language: string): SemanticNode;
  parseWithConfidence(input: string, language: string): { node: SemanticNode; confidence: number };

  // Validation
  validate(input: string, language: string): ValidationResult;

  // Compilation
  compile(input: string, language: string): CompileResult;

  // Translation
  translate(input: string, fromLanguage: string, toLanguage: string): string;

  // Language support
  getSupportedLanguages(): string[];
}

/**
 * Internal registry for DSL configuration.
 */
class DSLRegistry {
  private patterns = new Map<string, LanguagePattern[]>();
  private tokenizers = new Map<string, LanguageTokenizer>();
  private schemas: readonly CommandSchema[];

  constructor(config: DSLConfig) {
    this.schemas = config.schemas;

    // Register each language
    for (const lang of config.languages) {
      this.registerLanguage(lang);
    }
  }

  private registerLanguage(lang: LanguageConfig): void {
    // Register tokenizer
    this.tokenizers.set(lang.code, lang.tokenizer);

    // Generate patterns for this language
    const patterns: LanguagePattern[] = [];
    for (const schema of this.schemas) {
      const pattern = generatePattern(schema, lang.patternProfile);
      patterns.push(pattern);
    }

    this.patterns.set(lang.code, patterns);
  }

  getPatterns(language: string): LanguagePattern[] {
    return this.patterns.get(language) || [];
  }

  getTokenizer(language: string): LanguageTokenizer | undefined {
    return this.tokenizers.get(language);
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.patterns.keys());
  }
}

/**
 * Implementation of MultilingualDSL.
 */
class MultilingualDSLImpl implements MultilingualDSL {
  private registry: DSLRegistry;
  private matcher: PatternMatcher;
  private transformer: GrammarTransformer;
  private codeGenerator?: CodeGenerator;
  private schemaLookup: SchemaLookup;

  constructor(config: DSLConfig, registry: DSLRegistry, transformer: GrammarTransformer) {
    this.registry = registry;
    this.matcher = new PatternMatcher();
    this.transformer = transformer;
    if (config.codeGenerator) {
      this.codeGenerator = config.codeGenerator;
    }

    // Build SchemaLookup from config schemas for explicit syntax validation
    const schemaMap = new Map(config.schemas.map(s => [s.action, s]));
    this.schemaLookup = {
      getSchema: (action: string) => schemaMap.get(action),
    };
  }

  parse(input: string, language: string): SemanticNode {
    const result = this.parseWithConfidence(input, language);
    return result.node;
  }

  parseWithConfidence(input: string, language: string): { node: SemanticNode; confidence: number } {
    // Try explicit bracket syntax first (language-agnostic)
    if (isExplicitSyntax(input)) {
      const node = parseExplicit(input, { schemaLookup: this.schemaLookup });
      // Only match if this DSL has a schema for the action
      if (!this.schemaLookup.getSchema(node.action)) {
        throw new Error(`No schema for action "${node.action}" in this DSL`);
      }
      return { node, confidence: 1.0 };
    }

    // Get tokenizer for language
    const tokenizer = this.registry.getTokenizer(language);
    if (!tokenizer) {
      throw new Error(`No tokenizer registered for language: ${language}`);
    }

    // Tokenize input
    const tokens = tokenizer.tokenize(input);

    // Get patterns for language
    const patterns = this.registry.getPatterns(language);

    // Create profile for matcher
    const profile: PatternMatcherProfile = {
      code: language,
    };

    // Try to match each pattern
    for (const pattern of patterns) {
      const match = this.matcher.matchPattern(tokens, pattern, profile);
      if (match) {
        // Build semantic node
        const node: SemanticNode = {
          kind: 'command',
          action: pattern.command,
          roles: match.captured,
          metadata: {
            sourceLanguage: language,
            sourceText: input,
            patternId: pattern.id,
            confidence: match.confidence,
          },
        };

        return { node, confidence: match.confidence };
      }
    }

    throw new Error(`No pattern matched for input: ${input}`);
  }

  validate(input: string, language: string): ValidationResult {
    try {
      const result = this.parseWithConfidence(input, language);
      return {
        valid: true,
        node: result.node,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  translate(input: string, fromLanguage: string, toLanguage: string): string {
    // Explicit syntax is language-agnostic — return unchanged
    if (isExplicitSyntax(input)) return input;
    // Use injected grammar transformer
    return this.transformer.transform(input, fromLanguage, toLanguage);
  }

  compile(input: string, language: string): CompileResult {
    if (!this.codeGenerator) {
      return {
        ok: false,
        errors: ['No code generator configured for this DSL'],
      };
    }

    try {
      const result = this.parseWithConfidence(input, language);
      const code = this.codeGenerator.generate(result.node);

      return {
        ok: true,
        code,
        node: result.node,
        metadata: {
          parser: 'semantic',
          confidence: result.confidence,
        },
      };
    } catch (error) {
      return {
        ok: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  getSupportedLanguages(): string[] {
    return this.registry.getSupportedLanguages();
  }
}

/**
 * Create a new multilingual DSL instance.
 *
 * @param config - DSL configuration
 * @returns MultilingualDSL instance
 *
 * @example
 * ```typescript
 * const myDSL = createMultilingualDSL({
 *   schemas: [
 *     defineCommand('select', [
 *       defineRole('field', 'identifier', true),
 *       defineRole('source', 'identifier', true),
 *     ]),
 *   ],
 *   languages: [
 *     {
 *       code: 'en',
 *       name: 'English',
 *       nativeName: 'English',
 *       tokenizer: englishTokenizer,
 *       patternProfile: englishProfile,
 *     },
 *   ],
 *   codeGenerator: {
 *     generate: (node) => generateSQL(node),
 *   },
 * });
 *
 * const result = myDSL.compile('select name from users', 'en');
 * ```
 */
/**
 * Create default dictionary from language configurations.
 */
function createDefaultDictionary(config: DSLConfig): Dictionary {
  const translations: Record<string, Record<string, string>> = {};

  for (const lang of config.languages) {
    // Convert keyword objects to simple string mappings
    const keywords: Record<string, string> = {};
    for (const [canonical, keywordDef] of Object.entries(lang.patternProfile.keywords)) {
      keywords[canonical] = keywordDef.primary;
    }
    translations[lang.code] = keywords;
  }

  return new InMemoryDictionary(translations);
}

/**
 * Create default profile provider from language configurations.
 */
function createDefaultProfileProvider(config: DSLConfig): ProfileProvider {
  const profiles: Record<string, GrammarProfile> = {};

  for (const lang of config.languages) {
    if (lang.grammarProfile) {
      profiles[lang.code] = lang.grammarProfile;
    }
  }

  return new InMemoryProfileProvider(profiles);
}

export function createMultilingualDSL(config: DSLConfig): MultilingualDSL {
  // Create or use provided dictionary
  const dictionary = config.dictionary ?? createDefaultDictionary(config);

  // Create or use provided profile provider
  const profileProvider = config.profileProvider ?? createDefaultProfileProvider(config);

  // Create grammar transformer with injected dependencies
  const transformer = new GrammarTransformer({
    dictionary,
    profileProvider,
  });

  // Create registry and implementation
  const registry = new DSLRegistry(config);
  return new MultilingualDSLImpl(config, registry, transformer);
}
