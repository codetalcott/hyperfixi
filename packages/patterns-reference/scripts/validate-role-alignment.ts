/**
 * Validate Role Alignment Script
 *
 * Validates that multilingual translations preserve semantic roles.
 * Compares roles extracted from each translation against the English pattern.
 *
 * Usage: npx tsx scripts/validate-role-alignment.ts [--db-path <path>] [--verbose] [--language <lang>]
 *
 * Options:
 *   --db-path <path>    Path to database file (default: ./data/patterns.db)
 *   --verbose           Show detailed alignment info
 *   --language <lang>   Only validate specific language
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { parse, canParse } from '@lokascript/semantic';
import type { SemanticNode } from '@lokascript/semantic';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_DB_PATH = resolve(__dirname, '../data/patterns.db');

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const dbPathIndex = args.indexOf('--db-path');
const dbPath = dbPathIndex >= 0 && args[dbPathIndex + 1] ? args[dbPathIndex + 1] : DEFAULT_DB_PATH;
const langIndex = args.indexOf('--language');
const filterLanguage = langIndex >= 0 && args[langIndex + 1] ? args[langIndex + 1] : null;

// =============================================================================
// Types
// =============================================================================

interface TranslationRow {
  id: number;
  code_example_id: string;
  language: string;
  hyperscript: string;
}

interface PatternRoleRow {
  role: string;
  role_value: string | null;
}

interface AlignmentResult {
  translationId: number;
  patternId: string;
  language: string;
  alignmentScore: number;
  matchedRoles: string[];
  missingRoles: string[];
  extraRoles: string[];
  parseSuccess: boolean;
  error?: string;
}

// =============================================================================
// Role Extraction
// =============================================================================

/**
 * Extract role types from a semantic node.
 */
function extractRolesFromNode(node: SemanticNode): Set<string> {
  const roles = new Set<string>();

  // Add the action
  roles.add('action');

  // Extract all roles from the node
  for (const [role] of node.roles) {
    roles.add(role);
  }

  // Handle compound nodes (event handlers with body)
  if (node.kind === 'event-handler' && 'body' in node) {
    const eventNode = node as any;
    if (Array.isArray(eventNode.body)) {
      for (const child of eventNode.body) {
        const childRoles = extractRolesFromNode(child);
        childRoles.forEach(r => roles.add(r));
      }
    }
  }

  return roles;
}

/**
 * Parse translation and extract roles.
 */
function parseAndExtractRoles(
  code: string,
  language: string
): { roles: Set<string>; success: boolean; error?: string } {
  try {
    if (!canParse(code, language)) {
      return { roles: new Set(), success: false, error: `Cannot parse with ${language} tokenizer` };
    }

    const result = parse(code, language);
    if (!result) {
      return { roles: new Set(), success: false, error: 'Parse returned null' };
    }

    const roles = extractRolesFromNode(result);
    return { roles, success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { roles: new Set(), success: false, error: message };
  }
}

/**
 * Calculate alignment score between two role sets.
 *
 * Score = (matched roles) / (total unique roles across both sets)
 * Returns 1.0 for perfect alignment, 0.0 for no overlap.
 */
function calculateAlignmentScore(
  expectedRoles: Set<string>,
  actualRoles: Set<string>
): { score: number; matched: string[]; missing: string[]; extra: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];
  const extra: string[] = [];

  // Find matched and missing roles
  for (const role of expectedRoles) {
    if (actualRoles.has(role)) {
      matched.push(role);
    } else {
      missing.push(role);
    }
  }

  // Find extra roles
  for (const role of actualRoles) {
    if (!expectedRoles.has(role)) {
      extra.push(role);
    }
  }

  // Calculate score: matched / union
  const union = new Set([...expectedRoles, ...actualRoles]);
  const score = union.size > 0 ? matched.length / union.size : 1.0;

  return { score, matched, missing, extra };
}

// =============================================================================
// Main
// =============================================================================

function main() {
  console.log('Validating semantic role alignment for translations...');
  console.log(`Database path: ${dbPath}`);
  if (filterLanguage) {
    console.log(`Filtering by language: ${filterLanguage}`);
  }

  // Check database exists
  if (!existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    console.log('Run init-db.ts first to create the database.');
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    // Add column if it doesn't exist (for existing databases)
    try {
      db.prepare('SELECT role_alignment_score FROM pattern_translations LIMIT 1').get();
    } catch {
      console.log('Adding role_alignment_score column to pattern_translations...');
      db.prepare('ALTER TABLE pattern_translations ADD COLUMN role_alignment_score REAL').run();
    }

    // Get English pattern roles (our reference)
    const getEnglishRoles = db.prepare(`
      SELECT role, role_value FROM pattern_roles
      WHERE code_example_id = ?
    `);

    // Get translations to validate
    let translationsQuery = `
      SELECT id, code_example_id, language, hyperscript
      FROM pattern_translations
      WHERE language != 'en'
    `;
    if (filterLanguage) {
      translationsQuery += ` AND language = '${filterLanguage}'`;
    }

    const translations = db.prepare(translationsQuery).all() as TranslationRow[];
    console.log(`Found ${translations.length} translations to validate`);

    // Prepare update statement
    const updateScore = db.prepare(`
      UPDATE pattern_translations
      SET role_alignment_score = ?
      WHERE id = ?
    `);

    // Stats
    const results: AlignmentResult[] = [];
    let successCount = 0;
    let failCount = 0;
    let totalScore = 0;
    const byLanguage: Record<string, { count: number; totalScore: number }> = {};

    // Process each translation
    for (const translation of translations) {
      // Get English roles for this pattern
      const englishRoles = getEnglishRoles.all(translation.code_example_id) as PatternRoleRow[];
      const expectedRoles = new Set(englishRoles.map(r => r.role));

      // Parse translation and extract roles
      const { roles: actualRoles, success, error } = parseAndExtractRoles(
        translation.hyperscript,
        translation.language
      );

      let result: AlignmentResult;

      if (success) {
        const alignment = calculateAlignmentScore(expectedRoles, actualRoles);
        result = {
          translationId: translation.id,
          patternId: translation.code_example_id,
          language: translation.language,
          alignmentScore: alignment.score,
          matchedRoles: alignment.matched,
          missingRoles: alignment.missing,
          extraRoles: alignment.extra,
          parseSuccess: true,
        };

        // Update database
        updateScore.run(alignment.score, translation.id);
        successCount++;
        totalScore += alignment.score;

        // Track by language
        if (!byLanguage[translation.language]) {
          byLanguage[translation.language] = { count: 0, totalScore: 0 };
        }
        byLanguage[translation.language].count++;
        byLanguage[translation.language].totalScore += alignment.score;
      } else {
        result = {
          translationId: translation.id,
          patternId: translation.code_example_id,
          language: translation.language,
          alignmentScore: 0,
          matchedRoles: [],
          missingRoles: Array.from(expectedRoles),
          extraRoles: [],
          parseSuccess: false,
          error,
        };

        // Set score to null for failed parses
        updateScore.run(null, translation.id);
        failCount++;
      }

      results.push(result);

      if (verbose) {
        const icon = result.parseSuccess ? (result.alignmentScore >= 0.8 ? '✓' : '⚠') : '✗';
        console.log(
          `  ${icon} ${translation.language}:${translation.code_example_id} - ${
            result.parseSuccess
              ? `${Math.round(result.alignmentScore * 100)}% aligned`
              : `Failed: ${result.error}`
          }`
        );
        if (result.missingRoles.length > 0) {
          console.log(`      Missing: ${result.missingRoles.join(', ')}`);
        }
        if (result.extraRoles.length > 0) {
          console.log(`      Extra: ${result.extraRoles.join(', ')}`);
        }
      }
    }

    // Also set English translations to 1.0 (perfect alignment)
    const updateEnglish = db.prepare(`
      UPDATE pattern_translations
      SET role_alignment_score = 1.0
      WHERE language = 'en'
    `);
    const englishResult = updateEnglish.run();
    console.log(`\nSet ${englishResult.changes} English translations to 100% alignment`);

    // Print summary
    console.log('\n=== Alignment Validation Summary ===');
    console.log(`Translations processed: ${translations.length}`);
    console.log(`  - Successfully parsed: ${successCount}`);
    console.log(`  - Failed to parse: ${failCount}`);

    if (successCount > 0) {
      console.log(`\nAverage alignment score: ${Math.round((totalScore / successCount) * 100)}%`);

      console.log('\nBy language:');
      const sortedLanguages = Object.entries(byLanguage).sort(
        ([, a], [, b]) => b.totalScore / b.count - a.totalScore / a.count
      );
      for (const [lang, stats] of sortedLanguages) {
        const avgScore = Math.round((stats.totalScore / stats.count) * 100);
        console.log(`  ${lang}: ${avgScore}% average (${stats.count} translations)`);
      }
    }

    // Show low alignment translations
    const lowAlignment = results.filter(r => r.parseSuccess && r.alignmentScore < 0.7);
    if (lowAlignment.length > 0) {
      console.log(`\n⚠ Low alignment translations (< 70%):`);
      for (const r of lowAlignment.slice(0, 10)) {
        console.log(`  - ${r.language}:${r.patternId} (${Math.round(r.alignmentScore * 100)}%)`);
      }
      if (lowAlignment.length > 10) {
        console.log(`  ... and ${lowAlignment.length - 10} more`);
      }
    }

    // Verify update
    const scoreCount = db
      .prepare('SELECT COUNT(*) as count FROM pattern_translations WHERE role_alignment_score IS NOT NULL')
      .get() as { count: number };
    console.log(`\nDatabase now has ${scoreCount.count} translations with alignment scores`);
  } finally {
    db.close();
  }
}

// Run
main();
