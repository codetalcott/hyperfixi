/**
 * Core types for multilingual testing framework
 */

/**
 * Supported languages
 */
export type LanguageCode =
  | 'ar' // Arabic (VSO)
  | 'de' // German (V2)
  | 'en' // English (SVO)
  | 'es' // Spanish (SVO)
  | 'fr' // French (SVO)
  | 'id' // Indonesian (SVO)
  | 'ja' // Japanese (SOV)
  | 'ko' // Korean (SOV)
  | 'pt' // Portuguese (SVO)
  | 'qu' // Quechua (SOV)
  | 'sw' // Swahili (SVO)
  | 'tr' // Turkish (SOV)
  | 'zh'; // Chinese (SVO)

/**
 * Word order types
 */
export type WordOrder = 'SVO' | 'SOV' | 'VSO' | 'V2';

/**
 * Pattern from the patterns-reference database
 */
export interface Pattern {
  id: string;
  title: string;
  raw_code: string;
  description: string;
  feature: string;
  source_url?: string;
  created_at: Date;
}

/**
 * Pattern translation
 */
export interface PatternTranslation {
  codeExampleId: string;
  language: LanguageCode;
  hyperscript: string;
  wordOrder: WordOrder;
  confidence: number;
  verifiedParses: boolean;
  roleAlignmentScore: number;
}

/**
 * Test configuration
 */
export interface TestConfig {
  /** Languages to test (undefined = all) */
  languages?: LanguageCode[];

  /** Bundle to use (if undefined, will build/select automatically) */
  bundle?: string;

  /** Whether to build bundle before testing */
  build?: boolean;

  /** Test mode */
  mode: 'quick' | 'full';

  /** Enable verbose logging */
  verbose?: boolean;

  /** Enable regression comparison */
  regression?: boolean;

  /** Minimum confidence threshold for semantic parsing */
  confidenceThreshold?: number;

  /** Only test patterns that have verifiedParses = true */
  verifiedOnly?: boolean;

  /** Pattern categories to test */
  categories?: string[];

  /** Number of patterns per language in quick mode */
  quickModeLimit?: number;
}

/**
 * Parse validation result
 */
export interface ParseResult {
  pattern: PatternTranslation;
  success: boolean;
  command?: string;
  roles?: Record<string, unknown>;
  confidence?: number;
  parser?: 'semantic' | 'traditional';
  error?: string;
  duration: number; // ms
}

/**
 * Size validation result
 */
export interface SizeResult {
  bundlePath: string;
  size: number; // bytes
  gzipSize: number | undefined; // bytes
  exceedsThreshold: boolean;
  threshold: number | undefined;
}

/**
 * Language test results
 */
export interface LanguageResults {
  language: LanguageCode;
  bundle: string;
  bundleSize?: number;

  /** Parse validation results */
  parseResults: ParseResult[];
  parseSuccess: number;
  parseFailure: number;
  parseRate: number;
  avgConfidence: number;

  /** Duration in ms */
  duration: number;

  /** Overall status */
  status: 'pass' | 'fail' | 'warning';
}

/**
 * Complete test run results
 */
export interface TestResults {
  timestamp: string;
  commit: string | undefined;
  config: TestConfig;

  /** Results by language */
  languageResults: LanguageResults[];

  /** Bundle size information */
  bundles: Record<
    string,
    {
      size: number;
      languages: LanguageCode[];
      gzipSize?: number;
    }
  >;

  /** Summary statistics */
  summary: {
    totalPatterns: number;
    totalSuccess: number;
    totalFailure: number;
    totalDuration: number;
    overallStatus: 'pass' | 'fail' | 'warning';
  };
}

/**
 * Baseline data for regression testing
 */
export interface Baseline {
  timestamp: string;
  commit: string;
  languages: Partial<
    Record<
      LanguageCode,
      {
        parseSuccess: number;
        parseFailure: number;
        parseRate: number;
        avgConfidence: number;
        bundleSize: number | undefined;
        /** Pattern-level results for detailed tracking */
        patterns: Record<string, { success: boolean; confidence: number | undefined }> | undefined;
      }
    >
  >;
  bundles: Record<
    string,
    {
      size: number;
      languages: LanguageCode[];
      gzipSize: number | undefined;
    }
  >;
}

/**
 * Regression comparison result
 */
export interface RegressionResult {
  language: LanguageCode;
  parseRateDelta: number; // % change
  avgConfidenceDelta: number; // absolute change
  bundleSizeDelta: number | undefined; // % change
  newFailures: string[]; // pattern IDs
  newSuccesses: string[]; // pattern IDs
  status: 'improved' | 'regressed' | 'unchanged';
}

/**
 * Bundle build options
 */
export interface BundleBuildOptions {
  languages: LanguageCode[];
  outputPath: string | undefined;
  groupName: string | undefined; // e.g., 'western', 'east-asian'
  updateConfig: boolean | undefined; // Update tsup.config.ts
}

/**
 * Bundle information
 */
export interface BundleInfo {
  name: string;
  path: string;
  languages: LanguageCode[];
  size: number;
  exists: boolean;
}

/**
 * Reporter interface
 */
export interface Reporter {
  reportStart(config: TestConfig): void;
  reportLanguageStart(language: LanguageCode, bundle: string): void;
  reportLanguageComplete(results: LanguageResults): void;
  reportComplete(results: TestResults): void;
  reportRegression?(results: RegressionResult[]): void;
  reportError(error: Error): void;
}

/**
 * Validator interface
 */
export interface Validator<T> {
  validate(input: unknown): Promise<T>;
  getName(): string;
}

/**
 * Sampling strategy for pattern selection
 */
export type SamplingStrategy =
  | { type: 'all' }
  | { type: 'first'; count: number }
  | { type: 'random'; count: number }
  | { type: 'stratified'; perCategory: number };
