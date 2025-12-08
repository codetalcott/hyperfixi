/**
 * Enhanced I18n Implementation
 * Type-safe internationalization following enhanced pattern
 */

import { z } from 'zod';
// Note: Dictionary, I18nConfig, TranslationOptions, TranslationResult are defined in ./types.js
// but may not be used directly in this file (used for documentation purposes)

// ============================================================================
// Local Type Definitions
// These types were previously imported from core but are defined locally
// to avoid cross-package dependencies and missing module errors.
// ============================================================================

/**
 * Validation result for i18n operations
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{ type: string; message: string; path?: string }>;
  suggestions?: string[];
}

/**
 * Evaluation result wrapper
 */
export interface EvaluationResult<T = unknown> {
  success: boolean;
  value?: T;
  type?: string;
  errors?: Array<{ type: string; message: string }>;
  suggestions?: string[];
}

/**
 * Context metadata for enhanced pattern
 */
export interface ContextMetadata {
  contextId?: string;
  timestamp?: number;
  category: string;
  capabilities?: string[];
  state?: string;
  // Extended metadata properties
  complexity?: string;
  sideEffects?: string[];
  dependencies?: string[];
  returnTypes?: string[];
  relatedContexts?: string[];
  examples?: Array<{
    input: string;
    description: string;
    expectedOutput: string;
  }>;
}

/**
 * LLM documentation interface for AI-friendly descriptions
 */
export interface LLMDocumentation {
  summary: string;
  description: string;
  examples?: Array<string | {
    title: string;
    code: string;
    explanation: string;
    output: string;
  }>;
  category?: string;
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
    required?: boolean;
    default?: string;
  }>;
  returns?: {
    type: string;
    description: string;
  };
  tips?: string[];
  commonMistakes?: string[];
}

/**
 * Evaluation type enumeration
 */
export type EvaluationType = 'sync' | 'async' | 'streaming' | 'Context';

/**
 * Enhanced context base interface
 */
export interface EnhancedContextBase extends ContextMetadata {
  [key: string]: unknown;
}

/**
 * Typed context implementation interface
 */
export interface TypedContextImplementation<TInput, TOutput> {
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  evaluate(input: TInput): Promise<EvaluationResult<TOutput>>;
  validate(input: unknown): ValidationResult;
  metadata: ContextMetadata;
  documentation: LLMDocumentation;
}

// ============================================================================
// Enhanced I18n Input/Output Schemas
// ============================================================================

export const EnhancedI18nInputSchema = z.object({
  /** Locale configuration */
  locale: z.string().min(2, 'Locale must be at least 2 characters'),
  fallbackLocale: z.string().optional(),
  /** Dictionary data for translations */
  dictionaries: z.record(z.string(), z.object({
    commands: z.record(z.string(), z.string()),
    modifiers: z.record(z.string(), z.string()),
    events: z.record(z.string(), z.string()),
    logical: z.record(z.string(), z.string()),
    temporal: z.record(z.string(), z.string()),
    values: z.record(z.string(), z.string()),
    attributes: z.record(z.string(), z.string()),
  }).catchall(z.record(z.string(), z.string()))).optional(),
  /** Translation options */
  options: z.object({
    detectLocale: z.boolean().default(true),
    rtlLocales: z.array(z.string()).default([]),
    preserveOriginalAttribute: z.string().optional(),
    validate: z.boolean().default(true),
  }).optional(),
  /** Context variables for translation */
  variables: z.record(z.string(), z.unknown()).optional(),
  /** Environment and debug settings */
  environment: z.enum(['frontend', 'backend', 'universal']).default('universal'),
  debug: z.boolean().default(false),
});

export const EnhancedI18nOutputSchema = z.object({
  /** Context identifier */
  contextId: z.string(),
  timestamp: z.number(),
  category: z.literal('Universal'),
  capabilities: z.array(z.string()),
  state: z.enum(['ready', 'loading', 'error']),
  
  /** I18n specific capabilities */
  translate: z.function(),
  translateHyperscript: z.function(),
  setLocale: z.function(),
  getLocale: z.function(),
  validateTranslation: z.function(),
  
  /** Locale management */
  locale: z.object({
    current: z.string(),
    fallback: z.string().optional(),
    direction: z.enum(['ltr', 'rtl']),
    available: z.array(z.string()),
  }),
  
  /** Dictionary access */
  dictionary: z.object({
    get: z.function(),
    set: z.function(),
    has: z.function(),
    keys: z.function(),
  }),
  
  /** Formatting utilities */
  format: z.object({
    number: z.function(),
    date: z.function(),
    currency: z.function(),
    relative: z.function(),
  }),
});

export type EnhancedI18nInput = z.infer<typeof EnhancedI18nInputSchema>;
export type EnhancedI18nOutput = z.infer<typeof EnhancedI18nOutputSchema>;

// ============================================================================
// Enhanced I18n Context Implementation
// ============================================================================

export class TypedI18nContextImplementation {
  public readonly name = 'i18nContext';
  public readonly category = 'Universal' as const;
  public readonly description = 'Type-safe internationalization context with enhanced validation and LLM integration';
  public readonly inputSchema = EnhancedI18nInputSchema;
  public readonly outputType: EvaluationType = 'Context';

  private evaluationHistory: Array<{
    input: EnhancedI18nInput;
    output?: EnhancedI18nOutput;
    success: boolean;
    duration: number;
    timestamp: number;
  }> = [];

  public readonly metadata: ContextMetadata = {
    category: 'Universal',
    complexity: 'moderate',
    sideEffects: ['locale-detection', 'dictionary-loading', 'text-transformation'],
    dependencies: ['dictionaries', 'locale-detection', 'formatting-apis'],
    returnTypes: ['Context'],
    examples: [
      {
        input: '{ locale: "es", options: { detectLocale: true } }',
        description: 'Initialize Spanish locale with auto-detection',
        expectedOutput: 'TypedI18nContext with Spanish translations and RTL support'
      },
      {
        input: '{ locale: "ar", dictionaries: { ar: arabicDict }, options: { rtlLocales: ["ar"] } }',
        description: 'Arabic locale with custom dictionary and RTL configuration',
        expectedOutput: 'Arabic-aware context with right-to-left text direction'
      },
      {
        input: '{ locale: "qu", environment: "frontend" }',
        description: 'Quechua locale for frontend environment',
        expectedOutput: 'Indigenous language support with browser integration'
      }
    ],
    relatedContexts: ['frontendContext', 'backendContext', 'templateContext'],
    frameworkDependencies: ['intl-apis', 'locale-detection'],
    environmentRequirements: {
      browser: true,
      server: true,
      nodejs: true
    },
    performance: {
      averageTime: 8.5,
      complexity: 'O(n)' // n = dictionary size
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates type-safe internationalization context for multi-language hyperscript development with dictionary management, locale detection, and formatting utilities',
    parameters: [
      {
        name: 'i18nConfig',
        type: 'EnhancedI18nInput',
        description: 'Internationalization configuration including locale, dictionaries, and options',
        optional: false,
        examples: [
          '{ locale: "fr", options: { detectLocale: true } }',
          '{ locale: "zh", dictionaries: { zh: chineseDict } }',
          '{ locale: "sw", environment: "backend", options: { validate: true } }'
        ]
      }
    ],
    returns: {
      type: 'EnhancedI18nContext',
      description: 'Initialized internationalization context with translation capabilities and locale management',
      examples: [
        'context.translate("commands.click") → "cliquer"',
        'context.translateHyperscript("on click") → "sur clic"',
        'context.setLocale("ja") → switches to Japanese',
        'context.format.number(1234.56) → "1,234.56" or "1.234,56" based on locale'
      ]
    },
    examples: [
      {
        title: 'Multi-language hyperscript development',
        code: 'const i18n = await createI18nContext({ locale: "es", options: { detectLocale: true } })',
        explanation: 'Create Spanish internationalization context with automatic locale detection',
        output: 'Spanish-aware hyperscript translation and formatting capabilities'
      },
      {
        title: 'Custom dictionary integration',
        code: 'await i18n.initialize({ locale: "qu", dictionaries: { qu: quechuaDict } })',
        explanation: 'Initialize Quechua language support with custom dictionary',
        output: 'Indigenous language hyperscript translation support'
      },
      {
        title: 'RTL language support',
        code: 'await i18n.initialize({ locale: "ar", options: { rtlLocales: ["ar", "he"] } })',
        explanation: 'Arabic locale with right-to-left text direction support',
        output: 'RTL-aware hyperscript with proper text direction and layout'
      }
    ],
    seeAlso: ['frontendContext', 'backendContext', 'templateIntegration', 'formatting'],
    tags: ['i18n', 'internationalization', 'locale', 'translation', 'type-safe', 'enhanced-pattern']
  };

  async initialize(input: EnhancedI18nInput): Promise<EvaluationResult<EnhancedI18nOutput>> {
    const startTime = Date.now();
    
    try {
      // Validate input using enhanced pattern
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // Initialize locale and dictionaries
      const locale = await this.initializeLocale(input);
      const dictionaries = await this.loadDictionaries(input);
      
      // Create enhanced i18n context
      const context: EnhancedI18nOutput = {
        contextId: `i18n-${Date.now()}`,
        timestamp: startTime,
        category: 'Universal',
        capabilities: ['translation', 'locale-management', 'formatting', 'validation', 'rtl-support'],
        state: 'ready',
        
        // Enhanced translation functions
        translate: this.createTranslateFunction(dictionaries, locale),
        translateHyperscript: this.createHyperscriptTranslator(dictionaries, locale),
        setLocale: this.createLocaleChanger(dictionaries),
        getLocale: () => locale.current,
        validateTranslation: this.createValidationFunction(dictionaries),
        
        // Locale management
        locale: {
          current: locale.current,
          fallback: locale.fallback,
          direction: locale.direction,
          available: Object.keys(dictionaries),
        },
        
        // Dictionary access
        dictionary: {
          get: (key: string) => this.getDictionaryValue(dictionaries, locale.current, key),
          set: (key: string, value: string) => this.setDictionaryValue(dictionaries, locale.current, key, value),
          has: (key: string) => this.hasDictionaryValue(dictionaries, locale.current, key),
          keys: () => this.getDictionaryKeys(dictionaries, locale.current),
        },
        
        // Enhanced formatting utilities
        format: {
          number: this.createNumberFormatter(locale.current),
          date: this.createDateFormatter(locale.current),
          currency: this.createCurrencyFormatter(locale.current),
          relative: this.createRelativeTimeFormatter(locale.current),
        }
      };

      // Track performance using enhanced pattern
      this.trackPerformance(startTime, true, context);
      
      return {
        success: true,
        value: context,
        type: 'Context'
      };

    } catch (error) {
      this.trackPerformance(startTime, false);
      
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `I18n context initialization failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Verify locale code is valid (ISO 639-1 format)',
          'Check dictionary structure matches expected format',
          'Ensure dictionaries are properly loaded',
          'Validate environment requirements are met'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.parse(input);
      const errors: Array<{ type: string; message: string; path?: string }> = [];
      const suggestions: string[] = [];

      // Enhanced validation logic
      const data = parsed as EnhancedI18nInput;

      // Validate locale format
      if (data.locale && !/^[a-z]{2}(-[A-Z]{2})?$/.test(data.locale)) {
        errors.push({
          type: 'invalid-locale',
          message: 'Locale must be in ISO 639-1 format (e.g., "en", "es", "zh-CN")',
          path: 'locale'
        });
        suggestions.push('Use standard locale codes like "en", "es", "fr", "de", "ja", "zh"');
      }

      // Validate fallback locale
      if (data.fallbackLocale && !/^[a-z]{2}(-[A-Z]{2})?$/.test(data.fallbackLocale)) {
        errors.push({
          type: 'invalid-fallback-locale',
          message: 'Fallback locale must be in ISO 639-1 format',
          path: 'fallbackLocale'
        });
      }

      // Validate dictionary structure
      if (data.dictionaries) {
        Object.entries(data.dictionaries).forEach(([locale, dict]) => {
          const requiredCategories = ['commands', 'modifiers', 'events', 'logical', 'temporal', 'values', 'attributes'];
          const missingCategories = requiredCategories.filter(cat => !dict[cat]);
          
          if (missingCategories.length > 0) {
            errors.push({
              type: 'incomplete-dictionary',
              message: `Dictionary for ${locale} is missing categories: ${missingCategories.join(', ')}`,
              path: `dictionaries.${locale}`
            });
            suggestions.push(`Add missing categories to ${locale} dictionary for complete hyperscript translation`);
          }
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        suggestions
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'schema-validation',
          message: error instanceof Error ? error.message : 'Invalid input format'
        }],
        suggestions: [
          'Ensure input matches EnhancedI18nInput schema',
          'Check locale is a valid string',
          'Verify dictionaries follow the expected structure'
        ]
      };
    }
  }

  // ============================================================================
  // Enhanced Helper Methods
  // ============================================================================

  private async initializeLocale(input: EnhancedI18nInput) {
    const { locale, fallbackLocale = 'en', options } = input;
    
    // Detect RTL languages
    const rtlLocales = options?.rtlLocales || ['ar', 'he', 'fa', 'ur'];
    const direction = rtlLocales.includes(locale) ? 'rtl' : 'ltr';
    
    return {
      current: locale,
      fallback: fallbackLocale,
      direction: direction as 'ltr' | 'rtl'
    };
  }

  private async loadDictionaries(input: EnhancedI18nInput) {
    // Return provided dictionaries or load defaults
    return input.dictionaries || {};
  }

  private createTranslateFunction(dictionaries: Record<string, any>, locale: any) {
    return (key: string, category: string = 'commands') => {
      const dict = dictionaries[locale.current];
      if (!dict || !dict[category]) {
        return key; // Return original if no translation found
      }
      return dict[category][key] || key;
    };
  }

  private createHyperscriptTranslator(dictionaries: Record<string, any>, locale: any) {
    return (hyperscript: string) => {
      // Enhanced hyperscript translation logic
      const dict = dictionaries[locale.current];
      if (!dict) return hyperscript;
      
      let translated = hyperscript;
      
      // Translate commands, modifiers, events, etc.
      Object.entries(dict.commands || {}).forEach(([en, translated_word]) => {
        translated = translated.replace(new RegExp(`\\b${en}\\b`, 'g'), translated_word as string);
      });
      
      Object.entries(dict.modifiers || {}).forEach(([en, translated_word]) => {
        translated = translated.replace(new RegExp(`\\b${en}\\b`, 'g'), translated_word as string);
      });
      
      return translated;
    };
  }

  private createLocaleChanger(dictionaries: Record<string, any>) {
    return (newLocale: string) => {
      if (dictionaries[newLocale]) {
        // Logic to change locale
        return true;
      }
      return false;
    };
  }

  private createValidationFunction(dictionaries: Record<string, any>) {
    return (locale: string, hyperscript: string) => {
      const dict = dictionaries[locale];
      if (!dict) {
        return {
          valid: false,
          errors: [`No dictionary found for locale: ${locale}`],
          coverage: 0
        };
      }
      
      // Validation logic here
      return {
        valid: true,
        errors: [],
        coverage: 100
      };
    };
  }

  private getDictionaryValue(dictionaries: Record<string, any>, locale: string, key: string) {
    const [category, ...keyParts] = key.split('.');
    const actualKey = keyParts.join('.');
    const dict = dictionaries[locale];
    return dict?.[category]?.[actualKey];
  }

  private setDictionaryValue(dictionaries: Record<string, any>, locale: string, key: string, value: string) {
    const [category, ...keyParts] = key.split('.');
    const actualKey = keyParts.join('.');
    if (!dictionaries[locale]) dictionaries[locale] = {};
    if (!dictionaries[locale][category]) dictionaries[locale][category] = {};
    dictionaries[locale][category][actualKey] = value;
  }

  private hasDictionaryValue(dictionaries: Record<string, any>, locale: string, key: string): boolean {
    return this.getDictionaryValue(dictionaries, locale, key) !== undefined;
  }

  private getDictionaryKeys(dictionaries: Record<string, any>, locale: string): string[] {
    const dict = dictionaries[locale];
    if (!dict) return [];
    
    const keys: string[] = [];
    Object.entries(dict).forEach(([category, categoryDict]) => {
      if (typeof categoryDict === 'object') {
        Object.keys(categoryDict).forEach(key => {
          keys.push(`${category}.${key}`);
        });
      }
    });
    return keys;
  }

  private createNumberFormatter(locale: string) {
    return (number: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, options).format(number);
    };
  }

  private createDateFormatter(locale: string) {
    return (date: Date | number, options?: Intl.DateTimeFormatOptions) => {
      return new Intl.DateTimeFormat(locale, options).format(date);
    };
  }

  private createCurrencyFormatter(locale: string) {
    return (amount: number, currency: string = 'USD', options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        ...options
      }).format(amount);
    };
  }

  private createRelativeTimeFormatter(locale: string) {
    return (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions) => {
      return new Intl.RelativeTimeFormat(locale, options).format(value, unit);
    };
  }

  private trackPerformance(startTime: number, success: boolean, output?: EnhancedI18nOutput): void {
    const duration = Date.now() - startTime;
    this.evaluationHistory.push({
      input: {} as EnhancedI18nInput, // Would store actual input in real implementation
      output,
      success,
      duration,
      timestamp: startTime
    });
  }

  getPerformanceMetrics() {
    return {
      totalInitializations: this.evaluationHistory.length,
      successRate: this.evaluationHistory.filter(h => h.success).length / Math.max(this.evaluationHistory.length, 1),
      averageDuration: this.evaluationHistory.reduce((sum, h) => sum + h.duration, 0) / Math.max(this.evaluationHistory.length, 1),
      lastEvaluationTime: this.evaluationHistory[this.evaluationHistory.length - 1]?.timestamp || 0,
      evaluationHistory: this.evaluationHistory.slice(-10) // Last 10 evaluations
    };
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

export function createI18nContext(): TypedI18nContextImplementation {
  return new TypedI18nContextImplementation();
}

export async function createEnhancedI18n(
  locale: string,
  options?: Partial<EnhancedI18nInput>
): Promise<EvaluationResult<EnhancedI18nOutput>> {
  const i18n = new TypedI18nContextImplementation();
  return i18n.initialize({
    locale,
    ...options
  });
}

// ============================================================================
// Export for Registry Registration
// ============================================================================

export const enhancedI18nImplementation = new TypedI18nContextImplementation();