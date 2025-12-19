/**
 * Type definitions for @hyperfixi/semantic browser global (window.HyperFixiSemantic)
 */

export interface HyperFixiSemanticAPI {
  /**
   * Parse hyperscript in any supported language
   */
  parse(source: string, language: string): SemanticNode;

  /**
   * Translate hyperscript between languages
   */
  translate(source: string, fromLang: string, toLang: string): string;

  /**
   * Get all translations for a source in all supported languages
   */
  getAllTranslations(source: string, sourceLang: string): Record<string, string>;

  /**
   * Create a semantic analyzer instance
   */
  createSemanticAnalyzer(options?: SemanticAnalyzerOptions): SemanticAnalyzer;

  /**
   * Get list of supported languages
   */
  supportedLanguages: readonly string[];
}

export interface SemanticNode {
  kind: string;
  action: string;
  roles: ReadonlyMap<string, SemanticValue>;
  confidence: number;
  metadata?: {
    sourcePosition?: {
      start: number;
      end: number;
    };
  };
}

export interface SemanticValue {
  type: 'literal' | 'selector' | 'reference' | 'property-path' | 'expression';
  value: string | number | boolean;
  dataType?: string;
  selectorKind?: string;
  object?: SemanticValue;
  property?: string;
  raw?: string;
}

export interface SemanticAnalyzer {
  analyze(input: string, language: string): AnalysisResult;
  supportsLanguage(language: string): boolean;
  supportedLanguages(): string[];
}

export interface SemanticAnalyzerOptions {
  confidenceThreshold?: number;
  languages?: string[];
}

export interface AnalysisResult {
  confidence: number;
  command?: {
    name: string;
    roles: ReadonlyMap<string, SemanticValue>;
  };
  errors?: string[];
  tokensConsumed?: number;
}
