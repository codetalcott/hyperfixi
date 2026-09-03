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
import { resolve } from 'path';
import {
  KNOWN_PROFILES,
  calculateTranslationConfidence,
  parseSemantic,
  render as semanticRender,
  translate as semanticTranslate,
  type LanguageProfile,
} from '@lokascript/semantic';
import {
  findHyperscriptAttributes,
  isMarkupRow,
  reRenderPreservesContent,
  spliceHyperscriptAttributes,
} from '../src/sync/markup-attributes';
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
 * The writer is SEMANTIC-ONLY.
 *
 * `@lokascript/semantic`'s `translate()` = `render(parse_en(en), L)` — the same
 * function MCP `translate_code`, `hyperfixi.translate` and core's
 * `MultilingualHyperscript` call. Every foreign row in the corpus comes from it.
 *
 * There used to be three modes (`i18n`, `semantic`, `best`), because there used
 * to be two renderers. `best` rendered each row with both and kept whichever won
 * on the ratchet's own signals; the rows it left to i18n were a committed,
 * shrink-only baseline. That baseline reached **zero on 2026-08-28** — semantic
 * wins all 3,657 rows — and `@lokascript/i18n`'s `GrammarTransformer` was retired
 * on the strength of it. A per-row chooser with one renderer is not a chooser, so
 * the modes, the `PATTERNS_RENDERER` env, the `--renderer` flag and the
 * `i18n-kept-rows` gate all go with it.
 *
 * A row semantic cannot render keeps its ENGLISH and is counted (see
 * `semanticFallbacks`). That path is unreachable today — the kept-rows check
 * counted `grammar-transform`, `grammar-transform-no-reference` AND
 * `keyword-substitute` as non-semantic, and all three were zero — so it is a
 * loud floor, not a fallback anyone should rely on.
 */
let semanticRendered = 0;
/** Rows the semantic renderer could not render — kept in ENGLISH. Zero today. */
let semanticFallbacks = 0;
/** Markup rows whose `_=` bodies were all carried by the semantic renderer. */
let markupSemantic = 0;
/** Markup rows where at least one `_=` body could not be translated. */
let markupKept = 0;

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

/**
 * Fallback keyword substitution for languages without grammar transformation.
 *
 * Unreferenced since the semantic-only flip and kept deliberately: it is the only
 * translation path in this file that needs neither a parse nor a renderer, and
 * `KEYWORD_TRANSLATIONS` is still built above. Delete it with the table, not
 * before.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// English-reference helpers (used by the markup path's content guard)
// =============================================================================

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

/**
 * Generate a translated version of hyperscript code for a given language.
 * Uses GrammarTransformer for proper word order (SOV/VSO) when available,
 * falls back to keyword substitution for unsupported languages.
 */
function translateHyperscript(code: string, language: string): string {
  if (language === 'en') {
    return code;
  }
  // HTML-markup rows are not hyperscript: handing the whole markup string to a
  // hyperscript renderer is why every one of them used to fall through to the
  // i18n path (which only re-indented them). Translate the `_=` bodies instead
  // and leave every other byte alone.
  if (isMarkupRow(code)) {
    return translateMarkupRow(code, language);
  }
  return translateBody(code, language);
}

/**
 * Translate one hyperscript body — a whole row, or one `_=` attribute value.
 *
 * Unmasked on purpose: the semantic parser keeps string literals, URLs and
 * selectors typed, and the render-fidelity gate scores exactly this call. (The
 * retired i18n path needed `maskSpans` because a transformer treats its input as
 * a flat token stream and would reorder content inside an HTML element or
 * translate words inside a string literal.)
 *
 * On failure the ENGLISH is kept. Not a translation — a visible hole, counted in
 * `semanticFallbacks` and reported at the end of the run. Zero rows take it today.
 */
function translateBody(code: string, language: string): string {
  try {
    const rendered = semanticTranslate(code, 'en', language);
    if (rendered && rendered.trim().length > 0) {
      semanticRendered++;
      if (verbose) console.log(`  [semantic] ${language}: "${code}" -> "${rendered}"`);
      return rendered;
    }
  } catch (error) {
    if (verbose) console.log(`  [semantic-failed] ${language}: ${error}`);
  }
  semanticFallbacks++;
  return code;
}

/**
 * Translate the hyperscript inside an HTML-markup row, byte-preserving.
 *
 * Each `_="…"` body goes through the same renderer as a standalone row,
 * behind one extra guard: the body is replaced only if the ENGLISH parse carries
 * its whole content (`reRenderPreservesContent`). A truncating parse — `set
 * ^user to attrs.data as JSON`, whose `as JSON` lands in no role and therefore
 * scores "faithful" against its own truncation in all 23 languages — leaves the
 * body in English rather than shipping the truncation into every language.
 * The row counts as semantic only when EVERY body was carried.
 */
function translateMarkupRow(code: string, language: string): string {
  const spans = findHyperscriptAttributes(code);
  if (spans.length === 0) {
    // Markup with no hyperscript at all: nothing to translate, in any language.
    // (The corpus flags such rows non-translatable, so this is belt-and-braces —
    // it keeps the row verbatim rather than handing markup to a renderer.)
    markupKept++;
      return code;
  }

  let allSemantic = true;
  const replacements = spans.map(span => {
    const body = span.body;
    const reference = safeParseNode(body, 'en');
    const referenceEn = reference ? safeRenderEn(reference) : null;
    if (!reference || referenceEn === null || !reRenderPreservesContent(body, referenceEn)) {
      allSemantic = false;
      if (verbose) {
        console.log(`  [markup→verbatim] ${language}: "${body}" (parse drops content)`);
      }
      return body;
    }
    const before = semanticRendered;
    const translated = translateBody(body, language);
    if (semanticRendered === before) allSemantic = false;
    return translated;
  });

  if (allSemantic) markupSemantic++;
  else markupKept++;
  return spliceHyperscriptAttributes(code, spans, replacements);
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
  console.log('Syncing translations with the semantic renderer...');
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
    const skipped = 0;
    let grammarUsed = 0;

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
        const beforeSemantic = semanticRendered;
        const beforeMarkupSemantic = markupSemantic;
        const translated = isTranslatable
          ? translateHyperscript(example.raw_code, langCode)
          : example.raw_code;
        // A whole-row semantic render returns the semantic surface itself. A
        // markup row is a splice of N bodies, and `translateBody` advances the
        // body counter for each carried one — so for markup the ONLY honest row
        // verdict is `markupSemantic`, which rises only when EVERY body was
        // carried. Mixing the two labelled a partially-carried row semantic.
        const rowIsMarkup = isTranslatable && isMarkupRow(example.raw_code);
        const markupWasSemantic = markupSemantic > beforeMarkupSemantic;
        const semanticSurface = rowIsMarkup
          ? null
          : semanticRendered > beforeSemantic
            ? translated
            : null;
        const confidence = isTranslatable
          ? getConfidence(langCode, translated)
          : langCode === 'en'
            ? 1.0
            : 0.5;
        const verifiedParses = langCode === 'en' ? 1 : 0;

        if (langCode !== 'en' && isTranslatable) grammarUsed++;

        // Determine translation method. Two outcomes now, where there were five:
        // the renderer carried the row, or it did not and the English stands.
        // `english-fallback` is a floor, not a mode — no row takes it today, and
        // a row that does is a translation the corpus is missing, not a worse
        // one it settled for.
        const translationMethod = !isTranslatable
          ? 'non-translatable-identity'
          : langCode === 'en'
            ? 'original'
            : (rowIsMarkup ? markupWasSemantic : translated === semanticSurface)
              ? 'semantic-render'
              : 'english-fallback';

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
    console.log(`  - Translatable non-English rows: ${grammarUsed}`);
    console.log(`  - Semantic renders: ${semanticRendered}`);
    console.log(`  - markup rows with every \`_=\` body carried: ${markupSemantic}`);
    console.log(`  - markup rows keeping >=1 body in English: ${markupKept}`);
    // Loud on purpose: this is the number that must stay 0. A row here is a
    // translation the corpus is MISSING, not a worse one it settled for.
    if (semanticFallbacks > 0) {
      console.log(`  ! ENGLISH FALLBACKS (renderer failed): ${semanticFallbacks}`);
    } else {
      console.log('  - English fallbacks (renderer failed): 0');
    }

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
