#!/usr/bin/env node
/**
 * Analyze Extracted Patterns and Compare with Registry
 *
 * Identifies new commands, features, and patterns missing from our registry.
 */

import { readFile, writeFile } from 'fs/promises';
import { getAllPatterns } from '../patterns-registry.mjs';

async function analyzePatterns() {
  console.log('📊 Analyzing extracted patterns vs registry...\n');

  // Load extracted patterns
  const extractedData = JSON.parse(await readFile('extracted-patterns.json', 'utf-8'));
  const extractedPatterns = extractedData.patterns;

  // Load registry patterns
  const registryPatterns = getAllPatterns();

  console.log(`📥 Extracted patterns: ${extractedPatterns.length}`);
  console.log(`📚 Registry patterns: ${registryPatterns.length}\n`);

  // Extract commands from patterns
  const extractedCommands = new Set();
  const extractedFeatures = new Set();

  for (const pattern of extractedPatterns) {
    const text = pattern.pattern.toLowerCase();

    // Extract commands (words after 'on event')
    const commandMatches = text.match(/\b(set|add|remove|toggle|put|show|hide|transition|trigger|call|log|wait|get|tell|append|prepend|increment|decrement|take|settle|halt|send|fetch|go|make|async|repeat|continue|break|return|throw|exit|init)\b/g);
    if (commandMatches) {
      commandMatches.forEach(cmd => extractedCommands.add(cmd));
    }

    // Extract features (modifiers, keywords)
    if (text.includes('until ')) extractedFeatures.add('until temporal modifier');
    if (text.includes('while ')) extractedFeatures.add('while temporal modifier');
    if (text.includes('unless ')) extractedFeatures.add('unless conditional');
    if (text.includes(' every ')) extractedFeatures.add('on every event modifier');
    if (text.includes(' in <')) extractedFeatures.add('in <selector> filter');
    if (text.includes('from ')) extractedFeatures.add('from source filter');
    if (text.includes('on mutation')) extractedFeatures.add('on mutation');
    if (text.includes('on intersection')) extractedFeatures.add('on intersection');
    if (text.includes('as json')) extractedFeatures.add('as JSON conversion');
    if (text.includes('as values')) extractedFeatures.add('as Values conversion');
    if (text.includes('as int')) extractedFeatures.add('as Int conversion');
    if (text.includes('as float')) extractedFeatures.add('as Float conversion');
    if (text.includes('as string')) extractedFeatures.add('as String conversion');
  }

  // Extract commands from registry
  const registryCommands = new Set();
  for (const pattern of registryPatterns) {
    const commandMatches = pattern.syntax.toLowerCase().match(/\b(set|add|remove|toggle|put|show|hide|transition|trigger|call|log|wait|get|tell|append|prepend|increment|decrement|take|settle|halt|send|fetch|go|make|async)\b/g);
    if (commandMatches) {
      commandMatches.forEach(cmd => registryCommands.add(cmd));
    }
  }

  // Find missing commands
  const missingCommands = [...extractedCommands].filter(cmd => !registryCommands.has(cmd));
  const existingCommands = [...extractedCommands].filter(cmd => registryCommands.has(cmd));

  // Group patterns by command to find usage examples
  const commandExamples = {};
  for (const cmd of missingCommands) {
    commandExamples[cmd] = extractedPatterns
      .filter(p => p.pattern.toLowerCase().includes(cmd))
      .slice(0, 3)
      .map(p => ({
        pattern: p.pattern.substring(0, 200) + (p.pattern.length > 200 ? '...' : ''),
        file: p.file
      }));
  }

  // Generate analysis report
  const analysis = {
    analyzedAt: new Date().toISOString(),
    summary: {
      extractedPatterns: extractedPatterns.length,
      registryPatterns: registryPatterns.length,
      extractedCommands: extractedCommands.size,
      registryCommands: registryCommands.size,
      missingCommands: missingCommands.length,
      existingCommands: existingCommands.length,
      extractedFeatures: extractedFeatures.size
    },
    missingCommands: missingCommands.sort(),
    existingCommands: existingCommands.sort(),
    commandExamples,
    extractedFeatures: [...extractedFeatures].sort(),
    recommendations: generateRecommendations(missingCommands, extractedFeatures, commandExamples)
  };

  await writeFile('pattern-analysis.json', JSON.stringify(analysis, null, 2));

  // Print summary
  console.log('='.repeat(70));
  console.log(' PATTERN ANALYSIS RESULTS');
  console.log('='.repeat(70));
  console.log();

  console.log('📊 COVERAGE SUMMARY:');
  console.log(`   Extracted patterns: ${extractedPatterns.length}`);
  console.log(`   Registry patterns: ${registryPatterns.length}`);
  console.log(`   Extracted commands: ${extractedCommands.size}`);
  console.log(`   Registry commands: ${registryCommands.size}`);
  console.log();

  console.log(`✅ COMMANDS IN BOTH (${existingCommands.length}):`);
  existingCommands.forEach(cmd => console.log(`   ✓ ${cmd}`));
  console.log();

  console.log(`❌ MISSING COMMANDS (${missingCommands.length}):`);
  if (missingCommands.length > 0) {
    missingCommands.forEach(cmd => {
      const examples = commandExamples[cmd] || [];
      console.log(`   ⚠️  ${cmd}`);
      if (examples.length > 0) {
        console.log(`      Found in: ${examples[0].file}`);
        const preview = examples[0].pattern.split('\n')[0].trim();
        console.log(`      Example: ${preview}`);
      }
    });
  } else {
    console.log('   (None - all commands covered!)');
  }
  console.log();

  console.log(`🔧 EXTRACTED FEATURES (${extractedFeatures.size}):`);
  [...extractedFeatures].forEach(feature => {
    const implemented = registryPatterns.some(p =>
      p.syntax.toLowerCase().includes(feature.toLowerCase()) ||
      p.description.toLowerCase().includes(feature.toLowerCase())
    );
    const icon = implemented ? '✅' : '❌';
    console.log(`   ${icon} ${feature}`);
  });
  console.log();

  console.log('💾 Detailed analysis saved to: pattern-analysis.json');
  console.log('='.repeat(70));

  return analysis;
}

function generateRecommendations(missingCommands, features, examples) {
  const recommendations = [];

  // Priority 1: Missing commands with examples
  for (const cmd of missingCommands) {
    if (examples[cmd] && examples[cmd].length > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'command',
        command: cmd,
        reason: `Found in official tests: ${examples[cmd].length} examples`,
        action: `Implement ${cmd} command`,
        effort: 'Medium (2-4 hours)',
        examples: examples[cmd].map(e => e.pattern.substring(0, 100))
      });
    }
  }

  // Priority 2: Common features
  const highPriorityFeatures = ['until temporal modifier', 'on every event modifier', 'as JSON conversion'];
  for (const feature of features) {
    if (highPriorityFeatures.some(hpf => feature.includes(hpf))) {
      recommendations.push({
        priority: 'HIGH',
        type: 'feature',
        feature,
        reason: 'Common pattern in official tests',
        action: `Implement ${feature}`,
        effort: 'High (6-10 hours)'
      });
    }
  }

  // Sort by priority
  recommendations.sort((a, b) => {
    if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
    if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
    return 0;
  });

  return recommendations;
}

// Run analysis
analyzePatterns().catch(console.error);
