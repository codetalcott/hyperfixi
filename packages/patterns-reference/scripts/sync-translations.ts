/**
 * Sync Translations Script
 *
 * Generates translations for all patterns in all supported languages
 * using grammar transformation for proper word order (SOV/VSO) and
 * dynamic confidence calculation based on actual parsing success.
 *
 * Usage: npx tsx scripts/sync-translations.ts [--db-path <path>] [--dry-run] [--verbose]
 *
 * Options:
 *   --db-path <path>  Path to database file (default: ./data/patterns.db)
 *   --dry-run         Show what would be done without making changes
 *   --verbose         Show detailed translation information
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { pathToFileURL } from 'node:url';
import {
  KNOWN_PROFILES,
  calculateTranslationConfidence,
  parseSemantic,
  render as semanticRender,
  translate as semanticTranslate,
  type LanguageProfile,
} from '@lokascript/semantic';
import { scoreNodes } from '@lokascript/semantic/fidelity';
import { noWorseThan, type CandidateScore } from '../src/sync/renderer-choice';
import { GrammarTransformer, getProfile as getGrammarProfile } from '@lokascript/i18n';
import { maskSpans, unmaskSpans } from '../src/sync/span-mask';
import { writeDbStamp } from '../src/sync/db-stamp';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_DB_PATH = resolve(__dirname, '../data/patterns.db');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const dbPathIndex = args.indexOf('--db-path');
const dbPath = dbPathIndex >= 0 && args[dbPathIndex + 1] ? args[dbPathIndex + 1] : DEFAULT_DB_PATH;

/**
 * Which renderer writes the foreign rows.
 *
 *   i18n     — @lokascript/i18n GrammarTransformer over the masked English
 *              surface (the historical writer; the default).
 *   semantic — @lokascript/semantic `translate()` = render(parse_en(en), L),
 *              the function every runtime surface (MCP translate_code,
 *              hyperfixi.translate, core's MultilingualHyperscript) already uses.
 *              Falls back to the i18n path for a row it cannot render.
 *   best     — render with BOTH, parse each back in L, score each against the
 *              English reference, and store the semantic row unless the i18n
 *              row beats it on some signal. Signals: the ratchet's own scorers
 *              (scoreNodes — R0 action recall, multiset recall, precision, R1
 *              role fidelity, R3 value recall) plus the English ROUND-TRIP
 *              (render(parse_L(row), 'en') equal to the reference's own
 *              English render), which is what catches a `put … before` that
 *              re-renders as `put … into` — role-identical, execution-different,
 *              the R2 class the scorers cannot see — and R4: the candidate's
 *              English render must parse on the real hyperscript.org engine
 *              whenever the i18n row's does. Ties go to semantic, the renderer
 *              the runtime uses. By construction a `best` corpus is never worse
 *              than the i18n one on any ratchet signal; the gates still decide.
 *
 * Read from PATTERNS_RENDERER (env) or --renderer <name>. The choice is folded
 * into the DB provenance stamp (src/sync/db-stamp.ts), so a DB written by one
 * renderer is reported STALE to a gate run expecting the other.
 */
const rendererIndex = args.indexOf('--renderer');
const renderer =
  (rendererIndex >= 0 && args[rendererIndex + 1]) || process.env.PATTERNS_RENDERER || 'i18n';
if (renderer !== 'i18n' && renderer !== 'semantic' && renderer !== 'best') {
  console.error(`Unknown --renderer "${renderer}" (expected i18n | semantic | best)`);
  process.exit(1);
}
if (rendererIndex >= 0) process.env.PATTERNS_RENDERER = renderer;
let semanticRendered = 0;
let semanticFallbacks = 0;
/** `best` only: rows where the i18n surface out-scored the semantic one. */
let bestKeptI18n = 0;

// =============================================================================
// Derive language data from @lokascript/semantic profiles
// =============================================================================

// Build LANGUAGES from semantic profiles
const LANGUAGES: Record<string, { name: string; wordOrder: string }> = Object.fromEntries(
  Object.entries(KNOWN_PROFILES).map(([code, profile]: [string, LanguageProfile]) => [
    code,
    { name: profile.name, wordOrder: profile.wordOrder },
  ])
);

// Build KEYWORD_TRANSLATIONS from semantic profiles (fallback for non-grammar languages)
const KEYWORD_TRANSLATIONS: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(KNOWN_PROFILES).map(([code, profile]: [string, LanguageProfile]) => {
    const keywords: Record<string, string> = {};

    // Extract keywords from profile.keywords
    for (const [key, value] of Object.entries(profile.keywords)) {
      keywords[key] = value.primary;
    }

    // Also extract reference translations (me, it, you, etc.)
    if (profile.references) {
      for (const [key, value] of Object.entries(profile.references)) {
        if (typeof value === 'string') {
          keywords[key] = value;
        }
      }
    }

    // Extract possessive adjective translations (my, its, your)
    // Needed for dot notation patterns like my.textContent → mi.textContent
    const englishPossessives: Record<string, string> = {
      me: 'my',
      it: 'its',
      you: 'your',
    };

    // specialForms maps ref → target possessive adj (e.g., Spanish: { me: 'mi' })
    if ((profile as any).possessive?.specialForms) {
      for (const [ref, targetPossessive] of Object.entries(
        (profile as any).possessive.specialForms
      )) {
        const enPoss = englishPossessives[ref];
        if (enPoss && typeof targetPossessive === 'string' && !targetPossessive.includes(' ')) {
          keywords[enPoss] = targetPossessive;
        }
      }
    }

    // For languages with only keywords (reversed map), e.g., Japanese: { 私の: 'me' }
    if ((profile as any).possessive?.keywords && !(profile as any).possessive?.specialForms) {
      for (const [targetWord, ref] of Object.entries((profile as any).possessive.keywords)) {
        const enPoss = englishPossessives[ref as string];
        if (enPoss && !targetWord.includes(' ')) {
          keywords[enPoss] = targetWord;
        }
      }
    }

    return [code, keywords];
  })
);

console.log(`Loaded ${Object.keys(KNOWN_PROFILES).length} languages from @lokascript/semantic`);

// =============================================================================
// Translation Logic
// =============================================================================

interface CodeExample {
  id: string;
  title: string;
  raw_code: string;
  description: string;
  feature: string;
  /** 1 = translate normally; 0 = emit identity rows (HTML markup etc.). */
  translatable: number;
}

// =============================================================================
// Transformer Cache (98% reduction in instantiations)
// =============================================================================

const transformerCache = new Map<string, GrammarTransformer>();

function getCachedTransformer(language: string): GrammarTransformer {
  if (!transformerCache.has(language)) {
    transformerCache.set(language, new GrammarTransformer('en', language));
  }
  return transformerCache.get(language)!;
}

/**
 * Fallback keyword substitution for languages without grammar transformation.
 */
function keywordSubstitute(code: string, language: string): string {
  const translations = KEYWORD_TRANSLATIONS[language];
  if (!translations) {
    return code;
  }

  let translated = code;

  // Sort keywords by length (longest first) to avoid partial replacements
  const sortedKeywords = Object.entries(KEYWORD_TRANSLATIONS.en).sort(
    ([a], [b]) => b.length - a.length
  );

  for (const [enKeyword, _] of sortedKeywords) {
    const targetKeyword = translations[enKeyword];
    if (targetKeyword && targetKeyword !== enKeyword) {
      // Use word boundary regex for safe replacement
      const regex = new RegExp(`\\b${enKeyword}\\b`, 'gi');
      translated = translated.replace(regex, targetKeyword);
    }
  }

  return translated;
}

// =============================================================================
// `best` renderer: pick per row by the ratchet's own scorers + English round-trip
// =============================================================================

type EngineValidate = (src: string) => string[];
let engineValidate: EngineValidate | null = null;

/**
 * Load the real `hyperscript.org` parser headlessly — the same recipe as
 * testing-framework's `loadCanonicalParser` (prebuilt ESM by file URL, no DOM
 * shim). Grammar errors come back in `parse().errors`; tokenizer throws (an
 * unknown non-ASCII character) and `js` bodies throw — both fold into one array.
 */
async function loadEngineValidator(): Promise<EngineValidate | null> {
  try {
    const dir = dirname(require.resolve('hyperscript.org')); // …/hyperscript.org/dist
    const hs = (await import(pathToFileURL(join(dir, '_hyperscript.esm.js')).href)).default;
    return (src: string) => {
      try {
        return (hs.parse(src)?.errors ?? []).map((e: { message: string }) => e.message);
      } catch (e) {
        return ['threw: ' + (e as Error).message.split('\n')[0]];
      }
    };
  } catch (error) {
    console.warn(`  [best] hyperscript.org engine unavailable — R4 not consulted (${error})`);
    return null;
  }
}

function safeParseNode(code: string, language: string): unknown | null {
  try {
    return parseSemantic(code, language)?.node ?? null;
  } catch {
    return null;
  }
}

function safeRenderEn(node: unknown): string | null {
  try {
    return semanticRender(node as Parameters<typeof semanticRender>[0], 'en');
  } catch {
    return null;
  }
}

/** Score a foreign surface against the parsed English reference; null = no parse. */
function scoreSurface(
  reference: unknown,
  referenceEn: string | null,
  surface: string,
  language: string
): CandidateScore | null {
  const node = safeParseNode(surface, language);
  if (!node) return null;
  const back = safeRenderEn(node);
  return {
    scores: scoreNodes(reference, node).scores,
    roundTrip: referenceEn !== null && back !== null && back === referenceEn,
    engineValid:
      engineValidate === null ? undefined : back !== null && engineValidate(back).length === 0,
  };
}

/**
 * Generate a translated version of hyperscript code for a given language.
 * Uses GrammarTransformer for proper word order (SOV/VSO) when available,
 * falls back to keyword substitution for unsupported languages.
 */
function translateHyperscript(code: string, language: string): string {
  if (language === 'en') {
    return code;
  }
  if (renderer === 'best') {
    const reference = safeParseNode(code, 'en');
    const referenceEn = reference ? safeRenderEn(reference) : null;
    let semanticSurface: string | null = null;
    try {
      const rendered = semanticTranslate(code, 'en', language);
      if (rendered && rendered.trim().length > 0) semanticSurface = rendered;
    } catch {
      semanticSurface = null;
    }
    const i18nSurface = i18nTranslate(code, language);
    if (reference && semanticSurface !== null) {
      const semScore = scoreSurface(reference, referenceEn, semanticSurface, language);
      const i18nScore = scoreSurface(reference, referenceEn, i18nSurface, language);
      if (noWorseThan(semScore, i18nScore)) {
        semanticRendered++;
        if (verbose) console.log(`  [best→semantic] ${language}: "${semanticSurface}"`);
        return semanticSurface;
      }
      if (verbose) console.log(`  [best→i18n] ${language}: "${i18nSurface}"`);
    }
    bestKeptI18n++;
    return i18nSurface;
  }
  if (renderer === 'semantic') {
    // Unmasked on purpose: the semantic parser keeps string literals, URLs and
    // selectors typed, and the render-fidelity gate scores exactly this call.
    try {
      const rendered = semanticTranslate(code, 'en', language);
      if (rendered && rendered.trim().length > 0) {
        semanticRendered++;
        if (verbose) console.log(`  [semantic] ${language}: "${code}" -> "${rendered}"`);
        return rendered;
      }
    } catch (error) {
      if (verbose) console.log(`  [semantic-fallback] ${language}: ${error}`);
    }
    semanticFallbacks++;
  }
  return i18nTranslate(code, language);
}

/** The historical writer: GrammarTransformer over the masked surface. */
function i18nTranslate(code: string, language: string): string {
  // Mask non-translatable spans (string literals, URLs, HTML inner text,
  // bracket expressions, component directives) before handing the surface
  // to the transformer or keyword substituter. Both treat input as a flat
  // token stream and would otherwise reorder content inside HTML elements,
  // translate words inside string literals, etc.
  const { masked, spans } = maskSpans(code);

  // Check if language has grammar transformation support
  const grammarProfile = getGrammarProfile(language);
  if (grammarProfile) {
    try {
      // Use cached transformer for performance (98% fewer instantiations)
      const transformer = getCachedTransformer(language);
      const transformed = transformer.transform(masked);
      const result = unmaskSpans(transformed, spans);
      if (verbose) {
        console.log(`  [grammar] ${language}: "${code}" -> "${result}"`);
      }
      return result;
    } catch (error) {
      // Fall back to keyword substitution if transformation fails
      if (verbose) {
        console.log(
          `  [fallback] ${language}: grammar transform failed (${error}), using keywords`
        );
      }
      return unmaskSpans(keywordSubstitute(masked, language), spans);
    }
  }

  // Languages without grammar support use keyword substitution
  return unmaskSpans(keywordSubstitute(masked, language), spans);
}

/**
 * Calculate confidence dynamically based on actual parsing success.
 * Uses the semantic parser's pattern matcher to verify the translation parses correctly.
 */
function getConfidence(language: string, translatedCode: string): number {
  // English is always 1.0 (canonical source)
  if (language === 'en') return 1.0;

  try {
    const result = calculateTranslationConfidence(translatedCode, language);
    // Use actual confidence if parsing succeeded, minimum 0.5 otherwise
    const confidence = result.parseSuccess ? result.confidence : 0.5;
    if (verbose) {
      console.log(
        `  [confidence] ${language}: ${confidence.toFixed(2)} (parse: ${result.parseSuccess})`
      );
    }
    return confidence;
  } catch (error) {
    if (verbose) {
      console.log(`  [confidence] ${language}: 0.50 (error: ${error})`);
    }
    return 0.5; // Fallback for parse errors
  }
}

// =============================================================================
// Main
// =============================================================================

async function syncTranslations() {
  console.log(`Syncing translations with the ${renderer} renderer...`);
  console.log(`Database path: ${dbPath}`);
  if (dryRun) {
    console.log('DRY RUN - no changes will be made\n');
  }
  if (verbose) {
    console.log('VERBOSE - showing detailed translation info\n');
  }

  // Check database exists
  if (!existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    console.error('Run: npx tsx scripts/init-db.ts --force');
    process.exit(1);
  }

  if (renderer === 'best') {
    engineValidate = await loadEngineValidator();
    console.log(
      `  [best] hyperscript.org engine: ${engineValidate ? 'loaded (R4 consulted)' : 'unavailable'}`
    );
  }

  const db = new Database(dbPath);

  try {
    // Get all code examples
    const examples = db.prepare('SELECT * FROM code_examples').all() as CodeExample[];
    console.log(`Found ${examples.length} code examples\n`);

    // Prepare statements
    const checkExists = db.prepare(
      'SELECT id FROM pattern_translations WHERE code_example_id = ? AND language = ?'
    );
    const insertTranslation = db.prepare(`
      INSERT INTO pattern_translations (code_example_id, language, hyperscript, word_order, confidence, verified_parses, translation_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const updateTranslation = db.prepare(`
      UPDATE pattern_translations
      SET hyperscript = ?, word_order = ?, confidence = ?, translation_method = ?, updated_at = CURRENT_TIMESTAMP
      WHERE code_example_id = ? AND language = ?
    `);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let grammarUsed = 0;
    let keywordUsed = 0;

    // Generate translations for each example and language
    for (const example of examples) {
      if (verbose) {
        console.log(`\nProcessing: ${example.title}`);
        console.log(`  English: "${example.raw_code}"`);
      }

      // Non-translatable patterns (HTML markup, etc.) emit identity rows
      // across all languages — keeps the per-language presence so downstream
      // queries don't have NULL holes, but skips the grammar transformation
      // that would mangle the markup.
      const isTranslatable = example.translatable !== 0;

      for (const [langCode, langInfo] of Object.entries(LANGUAGES)) {
        const before = semanticRendered;
        const translated = isTranslatable
          ? translateHyperscript(example.raw_code, langCode)
          : example.raw_code;
        const semanticSurface = semanticRendered > before ? translated : null;
        const confidence = isTranslatable
          ? getConfidence(langCode, translated)
          : langCode === 'en'
            ? 1.0
            : 0.5;
        const verifiedParses = langCode === 'en' ? 1 : 0;

        // Track which method was used
        const hasGrammarProfile = getGrammarProfile(langCode) !== undefined;
        if (langCode !== 'en' && isTranslatable) {
          if (hasGrammarProfile) {
            grammarUsed++;
          } else {
            keywordUsed++;
          }
        }

        // Determine translation method
        const translationMethod = !isTranslatable
          ? 'non-translatable-identity'
          : langCode === 'en'
            ? 'original'
            : (renderer === 'semantic' || renderer === 'best') && translated === semanticSurface
              ? 'semantic-render'
              : hasGrammarProfile
                ? 'grammar-transform'
                : 'keyword-substitute';

        // Check if translation exists
        const existing = checkExists.get(example.id, langCode) as { id: number } | undefined;

        if (existing) {
          if (!dryRun) {
            updateTranslation.run(
              translated,
              langInfo.wordOrder,
              confidence,
              translationMethod,
              example.id,
              langCode
            );
          }
          updated++;
        } else {
          if (!dryRun) {
            insertTranslation.run(
              example.id,
              langCode,
              translated,
              langInfo.wordOrder,
              confidence,
              verifiedParses,
              translationMethod
            );
          }
          inserted++;
        }
      }
    }

    // Delete orphan-language rows: anything not in KNOWN_PROFILES gets
    // removed. Catches removed variants (es-MX), retired languages, or
    // typos in past sync runs. Skipped during --dry-run.
    let orphansDeleted = 0;
    if (!dryRun) {
      const knownLangs = Object.keys(LANGUAGES);
      const placeholders = knownLangs.map(() => '?').join(',');
      const orphanResult = db
        .prepare(`DELETE FROM pattern_translations WHERE language NOT IN (${placeholders})`)
        .run(...knownLangs);
      orphansDeleted = orphanResult.changes;
    }

    // Print summary
    console.log('\nSync complete!');
    console.log(`  - Inserted: ${inserted}`);
    console.log(`  - Updated: ${updated}`);
    console.log(`  - Skipped: ${skipped}`);
    console.log(`  - Orphan language rows deleted: ${orphansDeleted}`);
    console.log(`  - Grammar transforms: ${grammarUsed}`);
    if (renderer === 'semantic') {
      console.log(`  - Semantic renders: ${semanticRendered}`);
      console.log(`  - Semantic fallbacks to i18n: ${semanticFallbacks}`);
    }
    if (renderer === 'best') {
      console.log(`  - Semantic renders chosen: ${semanticRendered}`);
      console.log(`  - i18n rows kept (out-scored semantic, or no reference): ${bestKeptI18n}`);
    }
    console.log(`  - Keyword substitutes: ${keywordUsed}`);

    // Print stats
    const stats = db
      .prepare(
        `
      SELECT language, COUNT(*) as count, AVG(confidence) as avg_confidence
      FROM pattern_translations
      GROUP BY language
      ORDER BY avg_confidence DESC
    `
      )
      .all() as { language: string; count: number; avg_confidence: number }[];

    console.log('\nTranslations by language (sorted by confidence):');
    for (const row of stats) {
      const emoji = row.avg_confidence >= 0.8 ? '✓' : row.avg_confidence >= 0.6 ? '~' : '!';
      console.log(
        `  ${emoji} ${row.language}: ${row.count} patterns (avg confidence: ${row.avg_confidence.toFixed(2)})`
      );
    }

    // Calculate overall average
    const overallAvg = stats.reduce((sum, row) => sum + row.avg_confidence, 0) / stats.length;
    console.log(`\nOverall average confidence: ${overallAvg.toFixed(2)}`);

    // Stamp the DB with the provenance of its source inputs, so the multilingual
    // gate can detect a stale (cross-branch) DB before trusting a baseline compare.
    writeDbStamp(dbPath);
    console.log(`Wrote DB provenance stamp: ${dbPath}.stamp`);
  } finally {
    db.close();
  }
}

// Run
syncTranslations().catch(console.error);
