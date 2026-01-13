/**
 * Type definitions for HyperFixi Semantic browser API
 */

export type SupportedLanguage =
  | 'en'
  | 'ja'
  | 'ar'
  | 'es'
  | 'ko'
  | 'tr'
  | 'zh'
  | 'pt'
  | 'fr'
  | 'de'
  | 'id'
  | 'qu'
  | 'sw';

/**
 * HyperFixi semantic parser API exposed on window.HyperFixiSemantic
 */
export interface HyperFixiSemanticAPI {
  /**
   * Parse hyperscript in any supported language to semantic representation
   *
   * @param code Hyperscript code to parse
   * @param language Two-letter language code (en, ja, ar, es, ko, tr, zh, pt, fr, de, id, qu, sw)
   * @returns Parsed semantic node or null
   */
  parse(code: string, language: SupportedLanguage): SemanticNode | null;

  /**
   * Check if hyperscript can be parsed in a language
   */
  canParse(code: string, language: SupportedLanguage): boolean;

  /**
   * Parse in any supported language (auto-detect)
   */
  parseAny(code: string): SemanticNode | null;

  /**
   * Parse explicit syntax
   */
  parseExplicit(code: string): any | null;

  /**
   * Check if code uses explicit syntax
   */
  isExplicitSyntax(code: string): boolean;

  /**
   * Translate hyperscript between languages
   */
  translate(
    code: string,
    fromLanguage: SupportedLanguage,
    toLanguage: SupportedLanguage
  ): string | null;

  /**
   * Get all translations of hyperscript in supported languages
   */
  getAllTranslations(
    code: string,
    fromLanguage: SupportedLanguage
  ): Record<SupportedLanguage, string>;

  /**
   * Round-trip translation validation
   */
  roundTrip(code: string, language: SupportedLanguage): boolean;

  /**
   * Validate translation accuracy
   */
  validateTranslation(
    original: string,
    translated: string,
    fromLang: SupportedLanguage,
    toLang: SupportedLanguage
  ): boolean;

  /**
   * Render semantic node to hyperscript
   */
  render(node: SemanticNode, language: SupportedLanguage): string;

  /**
   * Render to explicit syntax
   */
  renderExplicit(node: SemanticNode): string;

  /**
   * Convert to explicit syntax
   */
  toExplicit(code: string, language: SupportedLanguage): string | null;

  /**
   * Convert from explicit syntax
   */
  fromExplicit(code: string, language: SupportedLanguage): string | null;

  /**
   * Create semantic analyzer
   */
  createSemanticAnalyzer(options?: any): any;

  /**
   * Check if semantic result should be used
   */
  shouldUseSemanticResult(semanticNode: SemanticNode | null, fallbackNode: any): boolean;

  /**
   * Build AST from semantic node
   */
  buildAST(node: SemanticNode): any;

  /**
   * Tokenize code in a specific language
   */
  tokenize(code: string, language: SupportedLanguage): any[];

  /**
   * Get tokenizer for a language
   */
  getTokenizer(language: SupportedLanguage): any;

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean;

  /**
   * Get list of supported language codes
   */
  getSupportedLanguages(): SupportedLanguage[];

  /**
   * Create CSS selector helper
   */
  createSelector(value: string): any;

  /**
   * Create literal value helper
   */
  createLiteral(value: any): any;

  /**
   * Create reference helper
   */
  createReference(name: string): any;

  /**
   * Create property path helper
   */
  createPropertyPath(path: string[]): any;

  /**
   * Create command node helper
   */
  createCommandNode(command: string, options?: any): any;

  /**
   * Create event handler helper
   */
  createEventHandler(event: string, options?: any): any;

  /**
   * Get command mapper
   */
  getCommandMapper(command: string): any;

  /**
   * Register command mapper
   */
  registerCommandMapper(command: string, mapper: any): void;

  /**
   * Package version
   */
  VERSION: string;

  /**
   * Default confidence threshold
   */
  DEFAULT_CONFIDENCE_THRESHOLD: number;

  /**
   * High confidence threshold
   */
  HIGH_CONFIDENCE_THRESHOLD: number;

  /**
   * Language-specific tokenizers
   */
  englishTokenizer: any;
  japaneseTokenizer: any;
  koreanTokenizer: any;
  arabicTokenizer: any;
  spanishTokenizer: any;
  turkishTokenizer: any;
  chineseTokenizer: any;
  portugueseTokenizer: any;
  frenchTokenizer: any;
  germanTokenizer: any;
  indonesianTokenizer: any;
  quechuaTokenizer: any;
  swahiliTokenizer: any;

  /**
   * Semantic analyzer implementation
   */
  SemanticAnalyzerImpl: any;

  /**
   * AST Builder class
   */
  ASTBuilder: any;
}

export interface SemanticNode {
  action: string;
  roles: Map<string, SemanticValue>;
  confidence: number;
  errors?: ValidationError[];
  tokens?: any[];
  [key: string]: any;
}

export interface SemanticValue {
  value: any;
  type?: string;
  [key: string]: any;
}

export interface ValidationError {
  message: string;
  code?: string;
  [key: string]: any;
}
