#!/usr/bin/env node
/**
 * Extract _hyperscript Patterns from Official Test Suite
 *
 * This script scans the official _hyperscript test suite and extracts
 * all unique patterns found in _="" attributes.
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const OFFICIAL_TEST_DIR = '/Users/williamtalcott/projects/_hyperscript/www/test/0.9.14/test/';
const OUTPUT_FILE = 'extracted-patterns.json';

async function extractPatterns() {
  console.log('🔍 Extracting patterns from official _hyperscript test suite...\n');

  if (!existsSync(OFFICIAL_TEST_DIR)) {
    console.error(`❌ Error: Official test directory not found at ${OFFICIAL_TEST_DIR}`);
    console.error('   Please ensure you have cloned the official _hyperscript repository.');
    process.exit(1);
  }

  try {
    const files = await readdir(OFFICIAL_TEST_DIR);
    const testFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.js'));

    console.log(`📂 Found ${testFiles.length} test files`);

    const patterns = [];
    const uniquePatterns = new Set();
    const patternsByCategory = {
      commands: [],
      events: [],
      temporal: [],
      operators: [],
      references: [],
      controlFlow: [],
      other: []
    };

    for (const file of testFiles) {
      try {
        const content = await readFile(join(OFFICIAL_TEST_DIR, file), 'utf-8');

        // Extract patterns from _="" attributes
        const hyperscriptMatches = content.matchAll(/_="([^"]*)"/g);

        for (const match of hyperscriptMatches) {
          const pattern = match[1].trim();
          if (pattern && !uniquePatterns.has(pattern)) {
            uniquePatterns.add(pattern);

            const category = categorizePattern(pattern);
            const patternObj = {
              pattern,
              category,
              file,
              syntax: extractSyntaxPattern(pattern),
              hasEvent: pattern.includes('on '),
              hasTemporal: pattern.includes('until ') || pattern.includes('while '),
              hasConditional: pattern.includes('if ') || pattern.includes('when '),
              hasLoop: pattern.includes('for ') || pattern.includes('repeat ')
            };

            patterns.push(patternObj);
            patternsByCategory[category].push(patternObj);
          }
        }

        // Also extract from script test definitions
        const scriptTestMatches = content.matchAll(/hyperscript\s*=\s*["']([^"']+)["']/g);
        for (const match of scriptTestMatches) {
          const pattern = match[1].trim();
          if (pattern && !uniquePatterns.has(pattern)) {
            uniquePatterns.add(pattern);

            const category = categorizePattern(pattern);
            const patternObj = {
              pattern,
              category,
              file,
              syntax: extractSyntaxPattern(pattern),
              hasEvent: pattern.includes('on '),
              hasTemporal: pattern.includes('until ') || pattern.includes('while '),
              hasConditional: pattern.includes('if ') || pattern.includes('when '),
              hasLoop: pattern.includes('for ') || pattern.includes('repeat ')
            };

            patterns.push(patternObj);
            patternsByCategory[category].push(patternObj);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Skipping ${file}: ${error.message}`);
      }
    }

    // Generate statistics
    const stats = {
      totalFiles: testFiles.length,
      totalPatterns: patterns.length,
      uniquePatterns: uniquePatterns.size,
      byCategory: Object.fromEntries(
        Object.entries(patternsByCategory).map(([cat, pats]) => [cat, pats.length])
      ),
      withEvents: patterns.filter(p => p.hasEvent).length,
      withTemporal: patterns.filter(p => p.hasTemporal).length,
      withConditional: patterns.filter(p => p.hasConditional).length,
      withLoops: patterns.filter(p => p.hasLoop).length,
    };

    // Save results
    const output = {
      extractedAt: new Date().toISOString(),
      source: OFFICIAL_TEST_DIR,
      stats,
      patterns,
      patternsByCategory
    };

    await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log(' PATTERN EXTRACTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`📊 Total patterns extracted: ${patterns.length}`);
    console.log(`🔢 Unique patterns: ${uniquePatterns.size}`);
    console.log('\n📁 Patterns by category:');
    for (const [category, count] of Object.entries(stats.byCategory)) {
      if (count > 0) {
        console.log(`   ${category.padEnd(15)} : ${count}`);
      }
    }
    console.log('\n🏷️  Pattern features:');
    console.log(`   Event handlers  : ${stats.withEvents}`);
    console.log(`   Temporal mods   : ${stats.withTemporal}`);
    console.log(`   Conditionals    : ${stats.withConditional}`);
    console.log(`   Loops           : ${stats.withLoops}`);
    console.log('\n💾 Results saved to:', OUTPUT_FILE);
    console.log('='.repeat(70));

    // Show sample patterns from each category
    console.log('\n📝 Sample patterns by category:\n');
    for (const [category, pats] of Object.entries(patternsByCategory)) {
      if (pats.length > 0) {
        console.log(`${category.toUpperCase()}:`);
        pats.slice(0, 3).forEach(p => {
          const preview = p.pattern.length > 80
            ? p.pattern.substring(0, 77) + '...'
            : p.pattern;
          console.log(`  - ${preview}`);
        });
        if (pats.length > 3) {
          console.log(`  ... and ${pats.length - 3} more`);
        }
        console.log();
      }
    }

  } catch (error) {
    console.error('❌ Error extracting patterns:', error);
    process.exit(1);
  }
}

function categorizePattern(pattern) {
  const lower = pattern.toLowerCase();

  // Event handlers
  if (lower.startsWith('on ')) {
    return 'events';
  }

  // Temporal modifiers
  if (lower.includes(' until ') || lower.includes(' while ') || lower.includes(' unless ')) {
    return 'temporal';
  }

  // Control flow
  if (lower.includes('if ') || lower.includes('for ') || lower.includes('repeat ') || lower.includes('loop ')) {
    return 'controlFlow';
  }

  // Operators (comparison, logical)
  if (lower.match(/\b(and|or|not|contains|matches|==|!=|>|<|>=|<=)\b/)) {
    return 'operators';
  }

  // References
  if (lower.match(/\b(me|it|you|the event|the target|closest|next|previous|first|last)\b/)) {
    return 'references';
  }

  // Commands (everything else)
  if (lower.match(/\b(set|add|remove|toggle|put|show|hide|transition|trigger|call|log|wait|get|tell)\b/)) {
    return 'commands';
  }

  return 'other';
}

function extractSyntaxPattern(pattern) {
  // Convert specific values to generic placeholders
  let syntax = pattern;

  // Replace string literals
  syntax = syntax.replace(/"[^"]*"/g, '"<string>"');
  syntax = syntax.replace(/'[^']*'/g, "'<string>'");

  // Replace numbers
  syntax = syntax.replace(/\b\d+(\.\d+)?\b/g, '<number>');

  // Replace CSS selectors
  syntax = syntax.replace(/<[^>]+>/g, '<selector>');
  syntax = syntax.replace(/#[\w-]+/g, '#<id>');
  syntax = syntax.replace(/\.[\w-]+/g, '.<class>');

  // Replace property access
  syntax = syntax.replace(/\b\w+\.\w+/g, '<target>.<property>');

  return syntax;
}

// Run extraction
extractPatterns().catch(console.error);
