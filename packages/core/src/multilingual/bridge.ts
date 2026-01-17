/**
 * Semantic-Grammar Bridge
 *
 * Connects semantic package's parsing and translation capabilities
 * with the core package. Provides a unified API for multilingual
 * hyperscript transformation.
 *
 * The semantic package already implements full translation through:
 * - Pattern-based parsing with role extraction
 * - Language-specific rendering with proper word order
 * - Morphological normalization for conjugations
 */

import type { SemanticNode, SemanticAnalyzer, ASTNode } from '@hyperfixi/semantic';
import { DEFAULT_CONFIDENCE_THRESHOLD } from '@hyperfixi/semantic';

// =============================================================================
// Bridge Implementation
// =============================================================================

/**
 * Configuration options for SemanticGrammarBridge.
 */
export interface BridgeConfig {
  /**
   * Minimum confidence for semantic parsing (0-1).
   * Defaults to DEFAULT_CONFIDENCE_THRESHOLD (0.5).
   * - Set higher (e.g., 0.8) for stricter matching
   * - Set lower (e.g., 0.3) for more flexible parsing
   */
  confidenceThreshold?: number;

  /**
   * Whether to fall back to traditional parser on low confidence.
   * Default: true
   */
  fallbackOnLowConfidence?: boolean;
}

export interface BridgeResult {
  output: string;
  usedSemantic: boolean;
  confidence: number;
  sourceLang: string;
  targetLang: string;
}

/**
 * Result from direct AST parsing.
 */
export interface ParseToASTResult {
  /** The AST node, or null if direct path failed */
  ast: ASTNode | null;
  /** Whether the direct Semantic→AST path was used */
  usedDirectPath: boolean;
  /** Confidence score from semantic parsing */
  confidence: number;
  /** Source language */
  lang: string;
  /** English text for fallback to core parser (if direct path failed) */
  fallbackText: string | null;
  /** Warnings generated during AST building (e.g., type inference issues) */
  warnings?: string[];
}

// Lazy-loaded semantic module
let _semanticModule: typeof import('@hyperfixi/semantic') | null = null;

async function getSemanticModule() {
  if (!_semanticModule) {
    _semanticModule = await import('@hyperfixi/semantic');
  }
  return _semanticModule;
}

/**
 * Bridge connecting semantic parsing to grammar transformation.
 */
export class SemanticGrammarBridge {
  private analyzer: SemanticAnalyzer | null = null;
  private config: Required<BridgeConfig>;

  constructor(config: BridgeConfig = {}) {
    this.config = {
      // Use standard confidence threshold (0.5) from semantic package
      // This accepts simple commands with optional roles
      // e.g., "toggle .active" scores 0.556 (1 required / 1.8 total with optional)
      confidenceThreshold: config.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      fallbackOnLowConfidence: config.fallbackOnLowConfidence ?? true,
    };
  }

  async initialize(): Promise<void> {
    const semantic = await getSemanticModule();
    this.analyzer = semantic.createSemanticAnalyzer();
  }

  isInitialized(): boolean {
    return this.analyzer !== null;
  }

  async transform(input: string, sourceLang: string, targetLang: string): Promise<BridgeResult> {
    if (!this.isInitialized()) {
      await this.initialize();
    }

    if (sourceLang === targetLang) {
      return {
        output: input,
        usedSemantic: false,
        confidence: 1.0,
        sourceLang,
        targetLang,
      };
    }

    // Use semantic package's translate function
    const semantic = await getSemanticModule();

    try {
      const output = semantic.translate(input, sourceLang, targetLang);

      // Check if translation actually happened
      if (output !== input) {
        return {
          output,
          usedSemantic: true,
          confidence: 0.9, // Semantic translate succeeded
          sourceLang,
          targetLang,
        };
      }
    } catch {
      // Translation failed, return original
    }

    return {
      output: input,
      usedSemantic: false,
      confidence: 0,
      sourceLang,
      targetLang,
    };
  }

  async parse(input: string, lang: string): Promise<SemanticNode | null> {
    if (!this.isInitialized()) {
      await this.initialize();
    }

    if (!this.analyzer) return null;

    const result = this.analyzer.analyze(input, lang);
    // Return node if parsing succeeded, regardless of confidence
    // Confidence filtering should happen at the compile level, not parse level
    return result.node ?? null;
  }

  async render(node: SemanticNode, targetLang: string): Promise<string> {
    const semantic = await getSemanticModule();
    return semantic.render(node, targetLang);
  }

  /**
   * Parse input directly to an AST node, bypassing English text generation.
   *
   * This is the new direct path:
   *   Input (any language) → Semantic Parser → AST Builder → AST
   *
   * Instead of the old path:
   *   Input → Semantic Parser → English Text → Core Parser → AST
   *
   * @param input - The hyperscript text to parse
   * @param lang - The language of the input
   * @returns The AST node, or null if parsing failed
   */
  async parseToAST(input: string, lang: string): Promise<ASTNode | null> {
    if (!this.isInitialized()) {
      await this.initialize();
    }

    if (!this.analyzer) return null;

    const result = this.analyzer.analyze(input, lang);

    if (result.confidence >= this.config.confidenceThreshold && result.node) {
      // Use the direct AST builder path
      const semantic = await getSemanticModule();
      try {
        const buildResult = semantic.buildAST(result.node);
        // buildAST now returns { ast, warnings }, extract just the AST
        return buildResult.ast;
      } catch (error) {
        // Fall through to fallback
        console.warn('[SemanticGrammarBridge] AST build failed, using fallback:', error);
      }
    }

    // Fallback: render to English and return null (let caller use core parser)
    return null;
  }

  /**
   * Parse input to AST with detailed result information.
   *
   * @param input - The hyperscript text to parse
   * @param lang - The language of the input
   * @returns Detailed result including AST, confidence, and whether direct path was used
   */
  async parseToASTWithDetails(input: string, lang: string): Promise<ParseToASTResult> {
    if (!this.isInitialized()) {
      await this.initialize();
    }

    if (!this.analyzer) {
      return {
        ast: null,
        usedDirectPath: false,
        confidence: 0,
        lang,
        fallbackText: null,
      };
    }

    const result = this.analyzer.analyze(input, lang);
    const semantic = await getSemanticModule();

    // Try direct AST path if confidence is high enough
    if (result.confidence >= this.config.confidenceThreshold && result.node) {
      try {
        const buildResult = semantic.buildAST(result.node);
        // buildAST now returns { ast, warnings }
        return {
          ast: buildResult.ast,
          usedDirectPath: true,
          confidence: result.confidence,
          lang,
          fallbackText: null,
          warnings: buildResult.warnings,
        };
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback: render to English for core parser if we have a node
    if (result.node && this.config.fallbackOnLowConfidence) {
      const englishText = semantic.render(result.node, 'en');
      return {
        ast: null,
        usedDirectPath: false,
        confidence: result.confidence,
        lang,
        fallbackText: englishText,
      };
    }

    return {
      ast: null,
      usedDirectPath: false,
      confidence: result.confidence,
      lang,
      fallbackText: null,
    };
  }

  async getAllTranslations(
    input: string,
    sourceLang: string
  ): Promise<Record<string, BridgeResult>> {
    // Use dynamic language list from semantic package
    const semantic = await getSemanticModule();
    const languages = semantic.getSupportedLanguages();
    const results: Record<string, BridgeResult> = {};

    for (const lang of languages) {
      results[lang] = await this.transform(input, sourceLang, lang);
    }

    return results;
  }
}

// =============================================================================
// Convenience Factory
// =============================================================================

let _defaultBridge: SemanticGrammarBridge | null = null;

export async function getDefaultBridge(): Promise<SemanticGrammarBridge> {
  if (!_defaultBridge) {
    _defaultBridge = new SemanticGrammarBridge();
    await _defaultBridge.initialize();
  }
  return _defaultBridge;
}

export async function translate(
  input: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const bridge = await getDefaultBridge();
  const result = await bridge.transform(input, sourceLang, targetLang);
  return result.output;
}
