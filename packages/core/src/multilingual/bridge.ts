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

import type {
  SemanticNode,
  SemanticValue,
  SemanticAnalyzer,
  SemanticAnalysisResult,
} from '@hyperfixi/semantic';

import type {
  ParsedStatement,
  ParsedElement,
  SemanticRole,
} from '@hyperfixi/i18n/src/grammar/types';

// =============================================================================
// Semantic to Grammar Conversion
// =============================================================================

/**
 * Convert a SemanticValue to its string representation.
 */
function semanticValueToString(value: SemanticValue): string {
  switch (value.type) {
    case 'literal':
      if (typeof value.value === 'string') {
        if (value.value.startsWith('"') || value.value.startsWith("'")) {
          return value.value;
        }
        return value.value.includes(' ') ? `"${value.value}"` : String(value.value);
      }
      return String(value.value);

    case 'selector':
      return value.value;

    case 'reference':
      return value.value;

    case 'property-path':
      const obj = semanticValueToString(value.object);
      return `${obj}'s ${value.property}`;

    case 'expression':
      return value.raw;

    default:
      return '';
  }
}

/**
 * Convert a SemanticNode to a ParsedStatement for grammar transformation.
 */
export function semanticNodeToParsedStatement(node: SemanticNode): ParsedStatement {
  const roles = new Map<SemanticRole, ParsedElement>();

  roles.set('action', {
    role: 'action',
    value: node.action,
    translated: undefined,
    isSelector: false,
    isLiteral: false,
  });

  // Use forEach to avoid downlevelIteration requirement
  node.roles.forEach((value, role) => {
    const stringValue = semanticValueToString(value);
    roles.set(role, {
      role,
      value: stringValue,
      translated: undefined,
      isSelector: value.type === 'selector',
      isLiteral: value.type === 'literal' && typeof value.value === 'string',
    });
  });

  return {
    type: node.kind === 'event-handler' ? 'event-handler' :
          node.kind === 'conditional' ? 'conditional' : 'command',
    roles,
    original: node.metadata?.sourceText ?? '',
  };
}

// =============================================================================
// Bridge Implementation
// =============================================================================

export interface BridgeConfig {
  confidenceThreshold?: number;
  fallbackOnLowConfidence?: boolean;
}

export interface BridgeResult {
  output: string;
  usedSemantic: boolean;
  confidence: number;
  sourceLang: string;
  targetLang: string;
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
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
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

  async transform(
    input: string,
    sourceLang: string,
    targetLang: string
  ): Promise<BridgeResult> {
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
    if (result.confidence >= this.config.confidenceThreshold) {
      return result.node ?? null;
    }
    return null;
  }

  async render(node: SemanticNode, targetLang: string): Promise<string> {
    const semantic = await getSemanticModule();
    return semantic.render(node, targetLang);
  }

  async getAllTranslations(
    input: string,
    sourceLang: string
  ): Promise<Record<string, BridgeResult>> {
    const languages = ['en', 'ja', 'ar', 'es', 'ko', 'zh', 'tr', 'pt', 'fr', 'de', 'id', 'qu', 'sw'];
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
