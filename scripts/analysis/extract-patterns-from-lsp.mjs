#!/usr/bin/env node
/**
 * Extract Patterns from LSP Data
 *
 * Extracts commands, expressions, features, and keywords from LSP JSON files
 */

import { readFile, writeFile } from 'fs/promises';

const LSP_DIR = '/Users/williamtalcott/projects/hyperfixi/packages/core/scripts/lsp-data/';
const LSP_FILES = [
  'markdown_commands.json',
  'markdown_expressions.json',
  'markdown_features.json',
  'markdown_keywords.json',
  'markdown_special_symbols.json'
];
const OUTPUT_FILE = 'extracted-lsp-patterns.json';

async function extractLSPPatterns() {
  console.log('🔍 Extracting patterns from LSP data...\n');

  const patterns = {
    commands: [],
    expressions: [],
    features: [],
    keywords: [],
    symbols: []
  };

  let totalPatterns = 0;

  // Extract commands
  try {
    const commandsData = JSON.parse(await readFile(LSP_DIR + 'markdown_commands.json', 'utf-8'));
    for (const [name, data] of Object.entries(commandsData)) {
      patterns.commands.push({
        name,
        syntax: data.syntax || name,
        description: data.description || '',
        examples: data.examples || [],
        category: 'command'
      });
      totalPatterns++;
    }
    console.log(`✅ Commands: ${patterns.commands.length}`);
  } catch (error) {
    console.error(`❌ Error loading commands:`, error.message);
  }

  // Extract expressions
  try {
    const expressionsData = JSON.parse(await readFile(LSP_DIR + 'markdown_expressions.json', 'utf-8'));
    for (const [name, data] of Object.entries(expressionsData)) {
      patterns.expressions.push({
        name,
        syntax: data.syntax || name,
        description: data.description || '',
        examples: data.examples || [],
        category: 'expression'
      });
      totalPatterns++;
    }
    console.log(`✅ Expressions: ${patterns.expressions.length}`);
  } catch (error) {
    console.error(`❌ Error loading expressions:`, error.message);
  }

  // Extract features
  try {
    const featuresData = JSON.parse(await readFile(LSP_DIR + 'markdown_features.json', 'utf-8'));
    for (const [name, data] of Object.entries(featuresData)) {
      patterns.features.push({
        name,
        syntax: data.syntax || name,
        description: data.description || '',
        examples: data.examples || [],
        category: 'feature'
      });
      totalPatterns++;
    }
    console.log(`✅ Features: ${patterns.features.length}`);
  } catch (error) {
    console.error(`❌ Error loading features:`, error.message);
  }

  // Extract keywords
  try {
    const keywordsData = JSON.parse(await readFile(LSP_DIR + 'markdown_keywords.json', 'utf-8'));
    for (const [name, data] of Object.entries(keywordsData)) {
      patterns.keywords.push({
        name,
        syntax: data.syntax || name,
        description: data.description || '',
        examples: data.examples || [],
        category: 'keyword'
      });
      totalPatterns++;
    }
    console.log(`✅ Keywords: ${patterns.keywords.length}`);
  } catch (error) {
    console.error(`❌ Error loading keywords:`, error.message);
  }

  // Extract special symbols
  try {
    const symbolsData = JSON.parse(await readFile(LSP_DIR + 'markdown_special_symbols.json', 'utf-8'));
    for (const [name, data] of Object.entries(symbolsData)) {
      patterns.symbols.push({
        name,
        syntax: data.syntax || name,
        description: data.description || '',
        examples: data.examples || [],
        category: 'symbol'
      });
      totalPatterns++;
    }
    console.log(`✅ Symbols: ${patterns.symbols.length}`);
  } catch (error) {
    console.error(`❌ Error loading symbols:`, error.message);
  }

  // Generate statistics
  const stats = {
    totalPatterns,
    byCategory: {
      commands: patterns.commands.length,
      expressions: patterns.expressions.length,
      features: patterns.features.length,
      keywords: patterns.keywords.length,
      symbols: patterns.symbols.length
    }
  };

  // Save results
  const output = {
    extractedAt: new Date().toISOString(),
    source: LSP_DIR,
    stats,
    patterns
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log(' LSP PATTERN EXTRACTION COMPLETE');
  console.log('='.repeat(70));
  console.log(`📊 Total patterns extracted: ${totalPatterns}`);
  console.log('\n📂 Patterns by category:');
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`   ${category.padEnd(15)} : ${count}`);
  }
  console.log('\n💾 Results saved to:', OUTPUT_FILE);
  console.log('='.repeat(70));

  // Show sample commands
  if (patterns.commands.length > 0) {
    console.log('\n📝 Sample commands:\n');
    patterns.commands.slice(0, 10).forEach((cmd, i) => {
      console.log(`${i + 1}. ${cmd.name}`);
      if (cmd.syntax) {
        console.log(`   Syntax: ${cmd.syntax}`);
      }
    });
    if (patterns.commands.length > 10) {
      console.log(`\n... and ${patterns.commands.length - 10} more commands\n`);
    }
  }

  return patterns;
}

// Run extraction
extractLSPPatterns().catch(console.error);
