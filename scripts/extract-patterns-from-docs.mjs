#!/usr/bin/env node
/**
 * Extract Patterns from Official _hyperscript Documentation
 *
 * Extracts patterns from markdown documentation files (cookbook, docs, expressions, etc.)
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const DOC_DIR = '/Users/williamtalcott/projects/_hyperscript/www/';
const DOC_FILES = [
  'docs.md',
  'cookbook.md',
  'expressions.md',
  'reference.md',
  'comparison.md',
  'a-fun-guide.md'
];
const OUTPUT_FILE = 'extracted-doc-patterns.json';

async function extractDocPatterns() {
  console.log('📚 Extracting patterns from _hyperscript documentation...\n');

  const patterns = [];
  const uniquePatterns = new Set();
  const patternsByFile = {};

  for (const file of DOC_FILES) {
    const filePath = DOC_DIR + file;

    if (!existsSync(filePath)) {
      console.log(`⏭️  Skipping ${file} (not found)`);
      continue;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      console.log(`📖 Processing ${file}...`);

      const filePatterns = [];

      // Extract patterns from _="" attributes in markdown
      const hyperscriptMatches = content.matchAll(/_="([^"]*)"/g);
      for (const match of hyperscriptMatches) {
        const pattern = match[1].trim();
        if (pattern && !uniquePatterns.has(pattern)) {
          uniquePatterns.add(pattern);
          filePatterns.push({
            pattern,
            source: 'attribute',
            category: categorizePattern(pattern)
          });
        }
      }

      // Extract patterns from code blocks (```hyperscript or indented)
      const codeBlockMatches = content.matchAll(/```hyperscript\n([\s\S]*?)```/g);
      for (const match of hyperscriptMatches) {
        const pattern = match[1].trim();
        if (pattern && !uniquePatterns.has(pattern)) {
          uniquePatterns.add(pattern);
          filePatterns.push({
            pattern,
            source: 'code-block',
            category: categorizePattern(pattern)
          });
        }
      }

      // Extract inline code examples (on ..., set ..., etc.)
      const inlinePatterns = content.matchAll(/`(on\s+[^`]+)`/g);
      for (const match of inlinePatterns) {
        const pattern = match[1].trim();
        if (pattern && !uniquePatterns.has(pattern)) {
          uniquePatterns.add(pattern);
          filePatterns.push({
            pattern,
            source: 'inline-code',
            category: categorizePattern(pattern)
          });
        }
      }

      // Extract command examples (looking for command syntax)
      const commandMatches = content.matchAll(/\n\s*(set|add|remove|toggle|put|show|hide|transition|trigger|call|log|wait|get|tell|append|make|fetch|send|repeat)\s+([^\n]{10,100})/gi);
      for (const match of commandMatches) {
        const pattern = match[0].trim();
        if (pattern && !uniquePatterns.has(pattern) && !pattern.includes('```')) {
          uniquePatterns.add(pattern);
          filePatterns.push({
            pattern,
            source: 'command-example',
            category: categorizePattern(pattern)
          });
        }
      }

      patterns.push(...filePatterns);
      patternsByFile[file] = filePatterns;

      console.log(`   Found ${filePatterns.length} patterns`);

    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  // Generate statistics
  const stats = {
    totalFiles: DOC_FILES.length,
    filesProcessed: Object.keys(patternsByFile).length,
    totalPatterns: patterns.length,
    uniquePatterns: uniquePatterns.size,
    byFile: Object.fromEntries(
      Object.entries(patternsByFile).map(([file, pats]) => [file, pats.length])
    ),
    byCategory: {}
  };

  // Count by category
  for (const pattern of patterns) {
    if (!stats.byCategory[pattern.category]) {
      stats.byCategory[pattern.category] = 0;
    }
    stats.byCategory[pattern.category]++;
  }

  // Save results
  const output = {
    extractedAt: new Date().toISOString(),
    source: DOC_DIR,
    stats,
    patterns,
    patternsByFile
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log(' DOCUMENTATION PATTERN EXTRACTION COMPLETE');
  console.log('='.repeat(70));
  console.log(`📊 Total patterns extracted: ${patterns.length}`);
  console.log(`🔢 Unique patterns: ${uniquePatterns.size}`);
  console.log('\n📁 Patterns by file:');
  for (const [file, count] of Object.entries(stats.byFile)) {
    if (count > 0) {
      console.log(`   ${file.padEnd(25)} : ${count}`);
    }
  }
  console.log('\n📂 Patterns by category:');
  for (const [category, count] of Object.entries(stats.byCategory)) {
    if (count > 0) {
      console.log(`   ${category.padEnd(15)} : ${count}`);
    }
  }
  console.log('\n💾 Results saved to:', OUTPUT_FILE);
  console.log('='.repeat(70));

  // Show sample patterns
  console.log('\n📝 Sample patterns:\n');
  const samplePatterns = [...uniquePatterns].slice(0, 10);
  samplePatterns.forEach((pattern, i) => {
    const preview = pattern.length > 80
      ? pattern.substring(0, 77) + '...'
      : pattern;
    console.log(`${i + 1}. ${preview}`);
  });
  if (uniquePatterns.size > 10) {
    console.log(`\n... and ${uniquePatterns.size - 10} more patterns\n`);
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
  if (lower.match(/\b(set|add|remove|toggle|put|show|hide|transition|trigger|call|log|wait|get|tell|append|make|fetch|send|repeat)\b/)) {
    return 'commands';
  }

  return 'other';
}

// Run extraction
extractDocPatterns().catch(console.error);
