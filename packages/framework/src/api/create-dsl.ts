/**
 * Main API for creating multilingual DSLs
 */

import type { SemanticNode, LanguageTokenizer, LanguagePattern } from '../core/types';
import type { CommandSchema } from '../schema';
import { PatternMatcher, type PatternMatcherProfile } from '../core/pattern-matching';
import { generatePattern, type PatternGenLanguageProfile } from '../generation/pattern-generator';
import { createDomainRenderer, type DomainRenderFn } from '../generation/renderer';
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
  /**
   * Language profile for grammar transformation.
   *
   * Optional for `parse()`, `validate()` and `compile()`, but **required for
   * `translate()`** — omitting it makes `translate()` throw for this language.
   */
  readonly grammarProfile?: GrammarProfile;
}

/**
 * Code generator function that transforms semantic AST to target code.
 */
export interface CodeGenerator {
  generate(node: SemanticNode): string;
}

/**
 * Per-language vocabulary for a command added via {@link DomainExtension}.
 *
 * This is the same shape a language profile uses, narrowed to the parts a
 * single new command needs.
 */
export interface ExtensionVocabulary {
  /** The command's verb in this language. */
  readonly keyword: PatternGenLanguageProfile['keywords'][string];
  /**
   * Markers for roles this language does not already cover in its profile.
   * Usually unnecessary: role markers are shared across a domain's commands.
   */
  readonly roleMarkers?: PatternGenLanguageProfile['roleMarkers'];
}

/**
 * A command added to a DSL from outside the package that defines it.
 *
 * Supplying a schema plus one vocabulary entry per language is enough to parse,
 * render and translate the command in every one of them — word order, role
 * markers and keyword placement all follow from the schema and the language
 * profiles. `render` and `generate` are only needed when the command's surface
 * form or output cannot be derived.
 *
 * @example
 * ```typescript
 * const research: DomainExtension = {
 *   schema: defineCommand({
 *     action: 'research',
 *     roles: [
 *       defineRole({ role: 'patient', required: true, expectedTypes: ['expression'] }),
 *       defineRole({
 *         role: 'source', required: true, expectedTypes: ['expression'],
 *         markerOverride: { en: 'from', ja: 'から', ar: 'من' },
 *       }),
 *     ],
 *   }),
 *   vocabulary: {
 *     en: { keyword: { primary: 'research' } },
 *     ja: { keyword: { primary: '調査' } },
 *     ar: { keyword: { primary: 'ابحث' } },
 *   },
 * };
 *
 * const llm = createLLMDSL({ extensions: [research] });
 * llm.parse('research "climate" from #wiki', 'en');
 * llm.render(node, 'ja');  // → '"climate" #wiki から 調査'
 * ```
 */
export interface DomainExtension {
  /** Schema for the new command. Its action must not collide with an existing one. */
  readonly schema: CommandSchema;

  /**
   * Vocabulary per language code. Codes must be configured on the DSL; an
   * unknown code is a configuration error, not a silent no-op.
   *
   * A subset is allowed — a command can be added in six of a DSL's eleven
   * languages. The languages left out simply do not parse it, so vocabulary
   * can be filled in over time rather than all at once.
   */
  readonly vocabulary: Readonly<Record<string, ExtensionVocabulary>>;

  /** Custom rendering for this action; takes precedence over the schema-driven path. */
  readonly render?: DomainRenderFn;

  /** Custom code generation for this action; takes precedence over the DSL's generator. */
  readonly generate?: (node: SemanticNode) => string;
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

  /**
   * The domain's natural-language renderer, consulted by {@link MultilingualDSL.render}.
   * Actions it returns `null` for fall through to the schema-driven renderer.
   */
  readonly renderer?: DomainRenderFn;

  /**
   * Commands added from outside this package. Their schemas and vocabulary are
   * merged into the DSL before pattern generation, so they parse, render and
   * compile like built-in commands.
   */
  readonly extensions?: readonly DomainExtension[];

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

  /**
   * Render a parsed node back to natural language.
   *
   * Returns `null` when the action cannot be rendered — no custom renderer, no
   * domain renderer, and no schema. Optional so that third-party implementers
   * of this interface are not broken by its addition; `createMultilingualDSL`
   * always provides it.
   */
  render?(node: SemanticNode, language: string): string | null;

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
  private partiallyTranslatedActions: ReadonlySet<string>;

  /**
   * @param partiallyTranslatedActions Actions permitted to lack a keyword in
   *   some configured languages — extension commands, which may be added for a
   *   subset of the DSL's languages. A built-in command missing a keyword stays
   *   an error, since that is a domain-authoring mistake.
   */
  constructor(config: DSLConfig, partiallyTranslatedActions: ReadonlySet<string> = new Set()) {
    this.schemas = config.schemas;
    this.partiallyTranslatedActions = partiallyTranslatedActions;

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
      if (
        this.partiallyTranslatedActions.has(schema.action) &&
        !lang.patternProfile.keywords[schema.action]
      ) {
        continue; // this extension command was not translated into this language
      }
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
  private profileProvider: ProfileProvider;
  private codeGenerator?: CodeGenerator;
  private schemaLookup: SchemaLookup;
  private domainRenderer?: DomainRenderFn;
  private extensionRenderers: Map<string, DomainRenderFn>;
  private schemaFallbackRenderer: DomainRenderFn;

  constructor(
    config: DSLConfig,
    registry: DSLRegistry,
    transformer: GrammarTransformer,
    profileProvider: ProfileProvider
  ) {
    this.registry = registry;
    this.matcher = new PatternMatcher();
    this.transformer = transformer;
    this.profileProvider = profileProvider;
    if (config.codeGenerator) {
      this.codeGenerator = config.codeGenerator;
    }
    if (config.renderer) {
      this.domainRenderer = config.renderer;
    }

    this.extensionRenderers = new Map();
    for (const extension of config.extensions ?? []) {
      if (extension.render) this.extensionRenderers.set(extension.schema.action, extension.render);
    }

    // Last resort for render(): covers extension commands with no custom
    // renderer, and any built-in action the domain renderer declines. Lazy, so
    // a DSL that never renders pays nothing.
    this.schemaFallbackRenderer = createDomainRenderer({
      schemas: config.schemas,
      profiles: config.languages.map(l => l.patternProfile),
    });

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

    // translate() is the only path that needs grammar profiles; parse/validate/
    // compile work without them. `grammarProfile` is optional on LanguageConfig,
    // so omitting it fails here rather than at construction — name the missing
    // field instead of leaving the transformer's bare "No profile found".
    for (const language of [fromLanguage, toLanguage]) {
      if (!this.profileProvider.getProfile(language)) {
        throw new Error(
          `translate() requires a grammar profile for language "${language}", but none is ` +
            `configured. Set 'grammarProfile' on the LanguageConfig for "${language}" in ` +
            `createMultilingualDSL() (parse/validate/compile do not need it), or inject a ` +
            `custom 'profileProvider'.`
        );
      }
    }

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

  render(node: SemanticNode, language: string): string | null {
    // 1. An extension's own renderer, if it supplied one
    const extensionRenderer = this.extensionRenderers.get(node.action);
    if (extensionRenderer) {
      const rendered = extensionRenderer(node, language);
      if (rendered != null) return rendered;
    }

    // 2. The domain's renderer — its hand-written cases are authoritative
    if (this.domainRenderer) {
      const rendered = this.domainRenderer(node, language);
      if (rendered != null) return rendered;
    }

    // 3. Schema-driven, which is how extension commands render by default
    return this.schemaFallbackRenderer(node, language);
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

/**
 * Fold extensions into the config so that everything downstream — pattern
 * generation, the dictionary, explicit-syntax lookup, rendering — sees
 * extension commands exactly as it sees built-in ones.
 *
 * Done up front rather than by mutating a live DSL: `DSLRegistry` generates
 * every language's patterns in its constructor, so a command registered later
 * would compile and render but silently fail to parse.
 */
function applyExtensions(config: DSLConfig): DSLConfig {
  const extensions = config.extensions;
  if (!extensions || extensions.length === 0) return config;

  const configuredLanguages = new Set(config.languages.map(l => l.code));
  const actions = new Set(config.schemas.map(s => s.action));

  for (const extension of extensions) {
    const { action } = extension.schema;
    if (actions.has(action)) {
      throw new Error(
        `Extension command "${action}" collides with a command this DSL already defines. ` +
          `Pick a different action name.`
      );
    }
    actions.add(action);

    for (const code of Object.keys(extension.vocabulary)) {
      if (!configuredLanguages.has(code)) {
        throw new Error(
          `Extension command "${action}" supplies vocabulary for language "${code}", which is ` +
            `not configured on this DSL. Configured languages: ` +
            `${[...configuredLanguages].join(', ')}.`
        );
      }
    }
  }

  const schemas = [...config.schemas, ...extensions.map(e => e.schema)];

  const languages = config.languages.map(lang => {
    const keywords = { ...lang.patternProfile.keywords };
    let roleMarkers = lang.patternProfile.roleMarkers;

    for (const extension of extensions) {
      const vocabulary = extension.vocabulary[lang.code];
      if (!vocabulary) continue;
      keywords[extension.schema.action] = { ...vocabulary.keyword };
      if (vocabulary.roleMarkers) {
        roleMarkers = { ...roleMarkers, ...vocabulary.roleMarkers };
      }
    }

    return {
      ...lang,
      patternProfile: {
        ...lang.patternProfile,
        keywords,
        ...(roleMarkers !== undefined && { roleMarkers }),
      },
    };
  });

  // Extension code generators dispatch ahead of the domain's own generator,
  // whose `default` branch would otherwise throw on an action it never knew.
  const extensionGenerators = new Map(
    extensions.filter(e => e.generate).map(e => [e.schema.action, e.generate!])
  );
  const baseGenerator = config.codeGenerator;
  const codeGenerator: CodeGenerator | undefined =
    extensionGenerators.size > 0
      ? {
          generate(node: SemanticNode): string {
            const generate = extensionGenerators.get(node.action);
            if (generate) return generate(node);
            if (!baseGenerator) {
              throw new Error(`No code generator for action "${node.action}"`);
            }
            return baseGenerator.generate(node);
          },
        }
      : baseGenerator;

  return {
    ...config,
    schemas,
    languages,
    ...(codeGenerator !== undefined && { codeGenerator }),
  };
}

export function createMultilingualDSL(config: DSLConfig): MultilingualDSL {
  // Extensions must be folded in before anything reads the config
  const effectiveConfig = applyExtensions(config);
  const extensionActions = new Set((config.extensions ?? []).map(e => e.schema.action));

  // Create or use provided dictionary
  const dictionary = effectiveConfig.dictionary ?? createDefaultDictionary(effectiveConfig);

  // Create or use provided profile provider
  const profileProvider =
    effectiveConfig.profileProvider ?? createDefaultProfileProvider(effectiveConfig);

  // Create grammar transformer with injected dependencies
  const transformer = new GrammarTransformer({
    dictionary,
    profileProvider,
  });

  // Create registry and implementation
  const registry = new DSLRegistry(effectiveConfig, extensionActions);
  return new MultilingualDSLImpl(effectiveConfig, registry, transformer, profileProvider);
}
