/**
 * Main API for creating multilingual DSLs
 */

import type {
  SemanticNode,
  LanguageToken,
  LanguageTokenizer,
  LanguagePattern,
  PatternMatchResult,
  RolePatternToken,
  TokenStream,
} from '../core/types';
import { extractRoleValue } from '../core/types';
import type { CommandSchema } from '../schema';
import { PatternMatcher } from '../core/pattern-matching';
import { MatchSkeleton, createStockReader, stockConfidenceModel } from '../core/matching';
import { generatePattern, type PatternGenLanguageProfile } from '../generation/pattern-generator';
import { createDomainRenderer, type DomainRenderFn } from '../generation/renderer';
import {
  createSchemaPatternGenerator,
  type SchemaPatternProfile,
} from '../generation/schema-patterns';
import { renderPattern, selectRenderPattern } from '../generation/pattern-render';
import { GrammarTransformer, type LanguageProfile as GrammarProfile } from '../grammar';
import {
  type Dictionary,
  type ProfileProvider,
  type ValueExtractor,
  InMemoryDictionary,
  InMemoryProfileProvider,
} from '../interfaces';
import { isExplicitSyntax, parseExplicit } from '../ir';
import { readingDifference } from './reading';
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
   * Optional everywhere: `translate()` primarily works parse→render through
   * the schema-driven renderer, which needs no grammar profile. Configure this
   * only to enable the whole-string GrammarTransformer FALLBACK for input the
   * pattern matcher cannot parse (or actions render() cannot cover).
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

  /**
   * What reads and writes the DSL (domains rethink Phase 4.7). `'classic'`, the
   * default: framework's first pattern generator, matcher and schema renderer.
   * `'core'`: the core semantic's hyperscript parser runs — patterns from
   * `createSchemaPatternGenerator` (positions descending, as a domain's schemas
   * read), matched by `MatchSkeleton` with the stock reader and confidence
   * model, and rendered through those patterns where the domain's own renderer
   * declines. Parsing's whole-input rule, the refusals, translation's
   * read-back, compile, explicit syntax and extensions are the same on both.
   * The domains move to `'core'` one at a time against their gate (Phase 5);
   * `'classic'` is removed in a later major, once no domain uses it.
   */
  readonly engine?: 'classic' | 'core';
}

/**
 * Validation result.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly node?: SemanticNode;
  readonly errors?: string[];
  /** Set when the input was refused for a known reason: `'unread-input'` (`UnreadInputError`). */
  readonly errorCode?: string;
}

/**
 * Compilation result.
 */
export interface CompileResult {
  readonly ok: boolean;
  readonly code?: string;
  readonly errors?: string[];
  /** Set when the input was refused for a known reason: `'unread-input'` (`UnreadInputError`). */
  readonly errorCode?: string;
  readonly node?: SemanticNode;
  readonly metadata?: {
    readonly parser: string;
    readonly confidence: number;
  };
}

/**
 * Thrown by `parse` (and so `compile`, `validate`, `translate`) when the input reads as a command
 * only by leaving some of it unread: `select name from users banana` is not `select name from users`.
 * `reading` is what the longest such match read, `unread` the text after it. `hint`, when there is
 * one, says how the input might read: where a bare word read as a value is followed by another, the
 * two may be one value written without quotes (todo `add buy milk to groceries`).
 */
export class UnreadInputError extends Error {
  readonly code = 'unread-input';

  constructor(
    readonly input: string,
    readonly language: string,
    readonly reading: SemanticNode,
    readonly unread: string,
    readonly hint?: string
  ) {
    super(
      `"${input}" (${language}) reads as ${reading.action} only by leaving "${unread}" unread` +
        (hint ? `; ${hint}` : '')
    );
    this.name = 'UnreadInputError';
  }
}

/** Options for `translate`. */
export interface TranslateOptions {
  /**
   * `'allow'` returns a translation that does not read back as the source instead of throwing
   * `TranslationReadBackError`, as semantic's `translate` does with the same option.
   */
  readonly lossy?: 'allow' | 'refuse';
}

/**
 * Thrown by `translate` when its output, read in the target language, is not the source command:
 * it does not read at all, or reads as another command, or with a role lost or changed. `partial` is
 * what `translate` would have returned; `reading` what it reads as (null when it does not read).
 */
export class TranslationReadBackError extends Error {
  readonly code = 'translation-does-not-read-back';

  constructor(
    readonly partial: string,
    readonly from: string,
    readonly to: string,
    readonly source: SemanticNode,
    readonly reading: SemanticNode | null,
    readonly why: string
  ) {
    super(`translation ${from} → ${to} does not read back as the source (${why}): "${partial}"`);
    this.name = 'TranslationReadBackError';
  }
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
  /**
   * Parse in one language, render in another. The output must read back as the source command
   * (the same action and role values, or the same compiled code); when it does not,
   * `TranslationReadBackError`, unless `{ lossy: 'allow' }`.
   */
  translate(
    input: string,
    fromLanguage: string,
    toLanguage: string,
    options?: TranslateOptions
  ): string;

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
  constructor(
    config: DSLConfig,
    partiallyTranslatedActions: ReadonlySet<string>,
    private readonly generate: DSLEngine['generate']
  ) {
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
      const pattern = this.generate(schema, lang.patternProfile);
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
  private match: DSLEngine['match'];
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
    profileProvider: ProfileProvider,
    engine: DSLEngine
  ) {
    this.registry = registry;
    this.match = engine.match;
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
    this.schemaFallbackRenderer = engine.fallbackRenderer(config, registry);

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

    // Every pattern is tried, and only a match that reads the WHOLE input counts; of those, the
    // highest priority wins, then the highest confidence, then the earliest pattern. The first match
    // used to win however much it read, so a trailing word was dropped without a word (the domain
    // gate measured 1,744 of 1,744 such inputs accepted) and an earlier, shorter pattern could
    // shadow the one that reads everything.
    const total = tokens.tokens.length;
    let best: PatternMatchResult | null = null;
    let longestPartial: PatternMatchResult | null = null;
    for (const pattern of patterns) {
      const mark = tokens.mark();
      const match = this.match(tokens, pattern, language);
      tokens.reset(mark);
      if (!match) continue;
      if (match.consumedTokens < total) {
        if (!longestPartial || match.consumedTokens > longestPartial.consumedTokens)
          longestPartial = match;
        continue;
      }
      if (
        !best ||
        match.pattern.priority > best.pattern.priority ||
        (match.pattern.priority === best.pattern.priority &&
          match.confidence > best.confidence + 0.001)
      )
        best = match;
    }

    if (best) {
      const node = this.nodeOf(best, input, language);
      return { node, confidence: best.confidence };
    }
    if (longestPartial) {
      const unread = tokens.tokens
        .slice(longestPartial.consumedTokens)
        .map(t => t.value)
        .join(' ');
      const hint = this.quoteHint(longestPartial, tokens.tokens);
      throw new UnreadInputError(
        input,
        language,
        this.nodeOf(longestPartial, input, language),
        unread,
        ...(hint ? [hint] : [])
      );
    }
    throw new Error(`No pattern matched for input: ${input}`);
  }

  /**
   * `if "buy milk" is one value, quote it`, where the last token a match read is a bare word it took
   * as a role's value (a role with no word list) and the first it left is a bare word too.
   */
  private quoteHint(
    match: PatternMatchResult,
    tokens: readonly LanguageToken[]
  ): string | undefined {
    const last = tokens[match.consumedTokens - 1];
    const next = tokens[match.consumedTokens];
    if (last?.kind !== 'identifier' || next?.kind !== 'identifier') return undefined;
    const schema = this.schemaLookup.getSchema(match.pattern.command);
    const role = [...match.captured].find(
      ([, v]) => (v as { raw?: unknown }).raw === last.value
    )?.[0];
    if (!role || schema?.roles.find(r => r.role === role)?.words) return undefined;
    return `if "${last.value} ${next.value}" is one value, quote it`;
  }

  private nodeOf(match: PatternMatchResult, input: string, language: string): SemanticNode {
    return {
      kind: 'command',
      action: match.pattern.command,
      roles: match.captured,
      metadata: {
        sourceLanguage: language,
        sourceText: input,
        patternId: match.pattern.id,
        confidence: match.confidence,
      },
    };
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
        ...(error instanceof UnreadInputError ? { errorCode: error.code } : {}),
      };
    }
  }

  translate(
    input: string,
    fromLanguage: string,
    toLanguage: string,
    options?: TranslateOptions
  ): string {
    // Explicit syntax is language-agnostic — return unchanged
    if (isExplicitSyntax(input)) return input;

    // Primary route: parse in the source language, render in the target — the
    // same parse→render path DomainRegistry.translate uses. The schema-driven
    // renderer covers every configured language, so this needs NO grammar
    // profiles (before 2026-08 translate() required them and therefore threw
    // for every domain in the family — none configures one).
    let node: SemanticNode;
    try {
      node = this.parseWithConfidence(input, fromLanguage).node;
    } catch (parseError) {
      // Whole-string grammar transformation can sometimes translate input the
      // pattern matcher cannot parse — but only when profiles are configured.
      if (this.hasGrammarProfile(fromLanguage) && this.hasGrammarProfile(toLanguage)) {
        return this.transformer.transform(input, fromLanguage, toLanguage);
      }
      throw parseError;
    }

    // Only consult render() for a CONFIGURED target language — the schema
    // renderer's lookup tables fall back to raw action/marker names for
    // unknown languages, which would silently return wrong-language output.
    const rendered = this.registry.getSupportedLanguages().includes(toLanguage)
      ? this.render(node, toLanguage)
      : null;
    if (rendered != null) return this.readsBack(rendered, node, fromLanguage, toLanguage, options);

    // render() covered nothing for this action/language pair; fall back to the
    // grammar transformer when profiles exist, otherwise name both remedies.
    if (this.hasGrammarProfile(fromLanguage) && this.hasGrammarProfile(toLanguage)) {
      return this.readsBack(
        this.transformer.transform(input, fromLanguage, toLanguage),
        node,
        fromLanguage,
        toLanguage,
        options
      );
    }
    throw new Error(
      `translate() could not render action "${node.action}" in language "${toLanguage}": no ` +
        `custom renderer, domain renderer, or schema pattern covers it, and no grammar ` +
        `profile is configured for the transformer fallback. Either add "${toLanguage}" to ` +
        `the DSL's languages/renderer, or set 'grammarProfile' on its LanguageConfig in ` +
        `createMultilingualDSL() (parse/validate/compile do not need it).`
    );
  }

  /**
   * `rendered`, read in `to`, must be `source`: the same action and role values, or, when the DSL
   * compiles, the same code (a parser may keep a translated word its generator normalizes: bdd ja
   * `表示` is `visible`). The rule is the domain gate's (lokascript-domains). A translation used to be
   * returned whatever it read as: ja/ko bdd `select` dropped its value, and nothing said so.
   */
  private readsBack(
    rendered: string,
    source: SemanticNode,
    from: string,
    to: string,
    options?: TranslateOptions
  ): string {
    if (options?.lossy === 'allow') return rendered;
    let back: SemanticNode;
    try {
      back = this.parseWithConfidence(rendered, to).node;
    } catch (error) {
      const why = error instanceof Error ? error.message : String(error);
      throw new TranslationReadBackError(rendered, from, to, source, null, why);
    }
    const difference = readingDifference(source, back);
    if (!difference) return rendered;
    if (this.codeGenerator) {
      try {
        if (this.codeGenerator.generate(back) === this.codeGenerator.generate(source))
          return rendered;
      } catch {
        // a generator that cannot compile one of them does not vouch for either
      }
    }
    throw new TranslationReadBackError(rendered, from, to, source, back, difference);
  }

  private hasGrammarProfile(language: string): boolean {
    return this.profileProvider.getProfile(language) != null;
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
        ...(error instanceof UnreadInputError ? { errorCode: error.code } : {}),
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
  const engine = engineFor(config);
  const registry = new DSLRegistry(effectiveConfig, extensionActions, engine.generate);
  return new MultilingualDSLImpl(effectiveConfig, registry, transformer, profileProvider, engine);
}

// =============================================================================
// The engines: how a DSL turns its schemas into patterns and reads with them
// =============================================================================

/**
 * What differs between the engines {@link DSLConfig.engine} names: how each
 * command's pattern is generated, how input is matched against it, and the
 * renderer `render()` falls back to. Parsing's whole-input rule, refusals,
 * translation's read-back, compile, explicit syntax and extensions are shared.
 */
interface DSLEngine {
  generate(schema: CommandSchema, profile: PatternGenLanguageProfile): LanguagePattern;
  match(tokens: TokenStream, pattern: LanguagePattern, language: string): PatternMatchResult | null;
  fallbackRenderer(config: DSLConfig, registry: DSLRegistry): DomainRenderFn;
}

/**
 * The engine `config.engine` names. An unknown name throws rather than reading
 * with the default: a domain that misspells `'core'` would otherwise measure
 * the classic engine against its gate and take the result for the core's.
 */
function engineFor(config: DSLConfig): DSLEngine {
  const name = config.engine ?? 'classic';
  if (name === 'classic') return classicEngine();
  if (name === 'core') return coreEngine();
  throw new Error(`Unknown DSL engine "${String(name)}" (expected "classic" or "core")`);
}

/** framework's first generator and matcher, and its schema renderer (`engine: 'classic'`). */
function classicEngine(): DSLEngine {
  const matcher = new PatternMatcher();
  return {
    generate: (schema, profile) => generatePattern(schema, profile),
    match: (tokens, pattern, language) => matcher.matchPattern(tokens, pattern, { code: language }),
    fallbackRenderer: config =>
      createDomainRenderer({
        schemas: config.schemas,
        profiles: config.languages.map(l => l.patternProfile),
      }),
  };
}

/**
 * A domain profile as the schema-pattern generator reads it: every role marker
 * with a side (the word order's default where the profile names none).
 */
function schemaProfileOf(profile: PatternGenLanguageProfile): SchemaPatternProfile {
  const side = profile.wordOrder === 'SOV' ? 'after' : 'before';
  const roleMarkers: Record<string, NonNullable<SchemaPatternProfile['roleMarkers'][string]>> = {};
  for (const [role, marker] of Object.entries(profile.roleMarkers ?? {})) {
    roleMarkers[role] = {
      primary: marker.primary,
      ...(marker.alternatives ? { alternatives: marker.alternatives } : {}),
      position: marker.position ?? side,
    };
  }
  return {
    code: profile.code,
    wordOrder: profile.wordOrder,
    keywords: profile.keywords,
    roleMarkers,
  };
}

/**
 * The core (domains rethink Phase 4, `engine: 'core'`): the schema-pattern
 * generator, the skeleton, the stock reader.
 */
function coreEngine(): DSLEngine {
  const generator = createSchemaPatternGenerator({ positionOrder: 'descending' });
  const matcher = new MatchSkeleton(createStockReader(), stockConfidenceModel);
  return {
    generate: (schema, profile) => generator.generatePattern(schema, schemaProfileOf(profile)),
    match: (tokens, pattern) => matcher.matchPattern(tokens, pattern),
    fallbackRenderer: (config, registry) => {
      const schemas = new Map(config.schemas.map(s => [s.action, s]));
      const hooks = {
        hasRealRole: (node: SemanticNode, role: string) => {
          const value = node.roles.get(role) as { implicit?: unknown } | undefined;
          return value !== undefined && value.implicit !== true;
        },
        writeRole: (token: RolePatternToken, node: SemanticNode) => {
          if (!node.roles.has(token.role)) return null;
          let value = extractRoleValue(node, token.role);
          const spec = schemas.get(node.action)?.roles.find(r => r.role === token.role);
          if (spec?.quoteMultiword && /\s/.test(value) && !/^(["']).*\1$/.test(value)) {
            value = `"${value}"`;
          }
          return value || null;
        },
      };
      return (node, language) => {
        const patterns = registry.getPatterns(language).filter(p => p.command === node.action);
        const pattern = selectRenderPattern(node, patterns, hooks);
        if (!pattern) return null;
        const text = renderPattern(node, pattern, hooks).join(' ');
        return text || null;
      };
    },
  };
}
