/**
 * Core types for multilingual testing framework
 */

/**
 * Supported languages
 */
export type LanguageCode =
  | 'ar' // Arabic (VSO)
  | 'bn' // Bengali (SOV)
  | 'de' // German (V2)
  | 'en' // English (SVO)
  | 'es' // Spanish (SVO)
  | 'fr' // French (SVO)
  | 'hi' // Hindi (SOV)
  | 'id' // Indonesian (SVO)
  | 'it' // Italian (SVO)
  | 'ja' // Japanese (SOV)
  | 'ko' // Korean (SOV)
  | 'ms' // Malay (SVO)
  | 'pl' // Polish (SVO)
  | 'pt' // Portuguese (SVO)
  | 'qu' // Quechua (SOV)
  | 'ru' // Russian (SVO)
  | 'sw' // Swahili (SVO)
  | 'th' // Thai (SVO)
  | 'tl' // Tagalog (VSO)
  | 'tr' // Turkish (SOV)
  | 'uk' // Ukrainian (SVO)
  | 'vi' // Vietnamese (SVO)
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

  /** Path to the committed baseline JSON (for --regression / --save-baseline). */
  baselinePath?: string;

  /** Run the suite, then write results as the baseline (--save-baseline). */
  saveBaseline?: boolean;

  /** Minimum confidence threshold for semantic parsing */
  confidenceThreshold?: number;

  /** Only test patterns that have verifiedParses = true */
  verifiedOnly?: boolean;

  /** Pattern categories to test */
  categories?: string[];

  /** Number of patterns per language in quick mode */
  quickModeLimit?: number;

  /**
   * Report the semantic parser's `unconsumed-input` firing rate per language,
   * then exit. Read-only: never gates, never writes a baseline.
   */
  diagnoseCoverage?: boolean;
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

  /**
   * Distinct command actions present anywhere in the parsed node tree
   * (event-handler + nested body/statements), excluding the structural
   * `compound` wrapper. Used to compute structural `fidelity` against the
   * English reference parse. Set by the validator.
   */
  actionSignature?: string[];

  /**
   * R0-precision — multiset of command actions (duplicates preserved). Lets a
   * *duplicated* spurious action (a phantom `toggle` ahead of a real one) be
   * counted, which the deduped `actionSignature` absorbs. Set by the validator.
   */
  actionMultisetSignature?: string[];

  /**
   * R1 — role-level signature: `action.role:valueType` for every command node
   * in the tree (`add.patient:selector`, `put.destination:reference`).
   * Cross-language comparison is by role name + value TYPE, never the value
   * string (which is legitimately translated). Set by the validator.
   */
  roleSignature?: string[];

  /**
   * Structural fidelity vs the English reference parse, in [0, 1]: the fraction
   * of the English parse's distinct actions also present in this language's
   * parse (recall). `1` = same command structure; low values flag a *degenerate*
   * pass (parses non-null, but lost most of the source's commands). Computed
   * cross-language after all parses complete; `undefined` when there is no
   * usable English reference or this parse failed.
   */
  fidelity?: number;

  /**
   * R0-precision vs the English reference, in [0, 1]: the fraction of *this*
   * parse's actions justified by the English reference (multiset-aware). Falls
   * below 1.0 when the parse/render adds commands the source never had — the
   * phantom-injection signal recall cannot see. `undefined` when this parse has
   * no actions or there is no usable English reference.
   */
  precision?: number;

  /**
   * R0-recall on the MULTISET vs the English reference, in [0, 1]. `fidelity`
   * above scores the deduped Set, so a parse that drops a REPEATED command
   * (`[bind, bind]` → `[bind]`) still scores 1.0. This counts duplicates, and is
   * the mirror of `precision`: together they see both a dropped and an added
   * copy of a command. `undefined` when there is no usable English reference.
   */
  multisetRecall?: number;

  /**
   * R1 — role fidelity vs the English reference, in [0, 1]: the fraction of the
   * English parse's role-signature entries also present here. Catches a parse
   * that finds the right commands with the WRONG roles (swapped
   * patient/destination executes wrongly while action-fidelity scores 1.0).
   */
  roleFidelity?: number;
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

  /**
   * Mean structural `fidelity` over successful parses that have an English
   * reference (see ParseResult.fidelity). `undefined` for English itself.
   */
  avgFidelity?: number | undefined;

  /**
   * R0-precision — mean `precision` over successful parses with an English
   * reference. Recorded + ratcheted alongside avgFidelity: a drop means a parser
   * change started injecting phantom/spurious commands (invisible to recall).
   */
  avgPrecision?: number | undefined;

  /**
   * R0-recall-multiset — mean `multisetRecall` over successful parses with an
   * English reference. Recorded + ratcheted alongside avgFidelity: a drop means a
   * parser change started dropping a REPEATED command, which the Set-based
   * avgFidelity and avgRoleFidelity cannot see.
   */
  avgMultisetRecall?: number | undefined;

  /**
   * R1 — mean `roleFidelity` over successful parses with an English reference.
   * Recorded + ratcheted in the baseline; the burn-down is deliberately NOT part
   * of the parsing-track goal (see CORRECTNESS_RELIABILITY_PLAN.md §8).
   */
  avgRoleFidelity?: number | undefined;

  /**
   * R2 — mean executionFidelity over the curated execution subset (see
   * validators/execution-validator.ts): 1 per pattern whose jsdom DOM-effect
   * signature exactly matches the en reference's, else 0. Recorded + ratcheted
   * in the baseline; the burn-down is NOT part of any current session goal
   * (CORRECTNESS_RELIABILITY_PLAN.md §8).
   */
  avgExecutionFidelity?: number | undefined;

  /**
   * R2 — curated-subset pattern IDs whose execution diverged from the en
   * reference (error, no effect, or different DOM-effect signature).
   */
  executionFailures?: string[] | undefined;

  /**
   * Pattern IDs that pass (non-null) but parse *degenerately* — fidelity below
   * the harness threshold (lost most of the English command structure). These
   * are real-but-shallow passes the parse-rate metric alone can't surface.
   */
  degeneratePasses?: string[] | undefined;

  /**
   * Pattern IDs that pass with fidelity in [0.5, 1.0) — *lossy* passes that parse
   * non-null and clear the degenerate floor but still silently drop ≥1 command vs
   * the English reference. ~7× more common than degenerate passes; the avgFidelity
   * / faithful→lossy ratchet (R0) makes these visible and non-regressable.
   */
  lossyPasses?: string[] | undefined;

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
        /** Mean structural fidelity vs the English reference parse (see ParseResult.fidelity). */
        avgFidelity?: number | undefined;
        /** R0-precision — mean precision vs the English reference (see ParseResult.precision). */
        avgPrecision?: number | undefined;
        /** R0-recall-multiset — mean multisetRecall vs the English reference (see ParseResult.multisetRecall). */
        avgMultisetRecall?: number | undefined;
        /** R1 — mean role fidelity vs the English reference (see ParseResult.roleFidelity). */
        avgRoleFidelity?: number | undefined;
        /** R2 — mean execution fidelity over the curated execution subset (see LanguageResults.avgExecutionFidelity). */
        avgExecutionFidelity?: number | undefined;
        /** R2 — curated-subset pattern IDs whose execution diverged from the en reference. */
        executionFailures?: string[] | undefined;
        /** Pattern IDs that pass but parse degenerately (fidelity below threshold). */
        degeneratePasses?: string[] | undefined;
        /** Pattern IDs that pass *lossily* (fidelity in [0.5, 1.0) — drop ≥1 command). */
        lossyPasses?: string[] | undefined;
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
  /** Absolute change in avgFidelity (current − baseline). Negative = correctness drop. */
  avgFidelityDelta: number;
  /** R0-precision — absolute change in avgPrecision (current − baseline). 0 when either side lacks data. Negative = phantom commands introduced. */
  avgPrecisionDelta: number;
  /** R0-recall-multiset — absolute change in avgMultisetRecall (current − baseline). 0 when either side lacks data. Negative = a repeated command is being dropped. */
  avgMultisetRecallDelta: number;
  /** R1 — absolute change in avgRoleFidelity (current − baseline). 0 when either side lacks data. */
  avgRoleFidelityDelta: number;
  /** R2 — absolute change in avgExecutionFidelity (current − baseline). 0 when either side lacks data. */
  avgExecutionFidelityDelta: number;
  /**
   * R2 — curated-subset patterns that executed faithfully in the baseline but
   * diverge now. Empty when the baseline carries no execution data yet (never
   * retro-flags); the precise per-pattern execution ratchet.
   */
  newExecutionFailures: string[];
  bundleSizeDelta: number | undefined; // % change
  newFailures: string[]; // pattern IDs
  newSuccesses: string[]; // pattern IDs
  /**
   * Patterns that were a *faithful* pass in the baseline but are now a
   * *degenerate* pass (fidelity dropped below threshold) — a fidelity
   * regression. Empty when the baseline has no fidelity data yet.
   */
  newDegeneratePasses: string[];
  /**
   * Patterns that were a *faithful* (fidelity 1.0) pass in the baseline but are now
   * a *lossy* pass (0.5 ≤ fid < 1.0) — a silent command-drop the degenerate ratchet
   * misses. Empty when the baseline has no lossy data yet (never retro-flags).
   */
  newLossyPasses: string[];
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
