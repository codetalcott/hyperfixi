#!/usr/bin/env node
/**
 * Comprehensive Pattern Analysis
 *
 * Combines patterns from all sources and analyzes against registry
 */

import { readFile, writeFile } from 'fs/promises';
import { PATTERN_REGISTRY } from '../patterns-registry.mjs';

const SOURCES = {
  official: 'extracted-patterns.json',
  docs: 'extracted-doc-patterns.json',
  lsp: 'extracted-lsp-patterns.json'
};

async function loadAllSources() {
  console.log('📥 Loading patterns from all sources...\n');

  const sources = {};
  for (const [name, file] of Object.entries(SOURCES)) {
    try {
      const data = JSON.parse(await readFile(file, 'utf-8'));
      sources[name] = data;
      console.log(`✅ ${name}: ${data.stats?.totalPatterns || 'loaded'}`);
    } catch (error) {
      console.error(`❌ Failed to load ${name}:`, error.message);
      sources[name] = null;
    }
  }

  return sources;
}

function extractUniquePatterns(sources) {
  console.log('\n🔍 Extracting unique patterns...\n');

  const allPatterns = {
    commands: new Set(),
    events: new Set(),
    features: new Set(),
    expressions: new Set(),
    keywords: new Set(),
    modifiers: new Set(),
    references: new Set(),
    operators: new Set()
  };

  // Extract from official test suite (patterns is an array with category field)
  if (sources.official && sources.official.patterns) {
    for (const p of sources.official.patterns) {
      // Extract first line of pattern as the key pattern
      const key = p.pattern.split('\n')[0].trim();

      if (p.category === 'events') {
        allPatterns.events.add(key);
      } else if (p.hasConditional) {
        allPatterns.keywords.add('if/else');
      } else if (p.hasLoop) {
        allPatterns.keywords.add('repeat');
      } else if (p.hasTemporal) {
        allPatterns.modifiers.add(key);
      }
    }
  }

  // Extract from documentation (patterns is an array with category field)
  if (sources.docs && sources.docs.patterns) {
    for (const p of sources.docs.patterns) {
      // Extract first line of pattern as the key pattern
      const key = p.pattern.split('\n')[0].trim();

      if (p.category === 'events') {
        allPatterns.events.add(key);
      } else if (p.category === 'commands') {
        allPatterns.commands.add(key);
      } else if (p.category === 'references') {
        allPatterns.references.add(key);
      } else if (p.category === 'operators') {
        allPatterns.operators.add(key);
      } else if (p.category === 'temporal') {
        allPatterns.modifiers.add(key);
      } else if (p.category === 'controlFlow') {
        allPatterns.keywords.add(key);
      }
    }
  }

  // Extract from LSP (patterns is an object with category arrays)
  if (sources.lsp && sources.lsp.patterns) {
    if (sources.lsp.patterns.commands) {
      sources.lsp.patterns.commands.forEach(p => {
        if (p.name && !p.name.match(/^\d+$/)) { // Skip numeric names
          allPatterns.commands.add(p.name);
        }
      });
    }
    if (sources.lsp.patterns.expressions) {
      sources.lsp.patterns.expressions.forEach(p => {
        if (p.name) allPatterns.expressions.add(p.name);
      });
    }
    if (sources.lsp.patterns.features) {
      sources.lsp.patterns.features.forEach(p => {
        if (p.name) allPatterns.features.add(p.name);
      });
    }
    if (sources.lsp.patterns.keywords) {
      sources.lsp.patterns.keywords.forEach(p => {
        if (p.name) allPatterns.keywords.add(p.name);
      });
    }
  }

  // Convert sets to arrays and calculate totals
  const uniquePatterns = {};
  let totalUnique = 0;

  for (const [category, patterns] of Object.entries(allPatterns)) {
    uniquePatterns[category] = Array.from(patterns).sort();
    totalUnique += uniquePatterns[category].length;
    console.log(`  ${category.padEnd(15)}: ${uniquePatterns[category].length} unique patterns`);
  }

  console.log(`\n📊 Total unique patterns: ${totalUnique}`);

  return uniquePatterns;
}

function compareWithRegistry(uniquePatterns) {
  console.log('\n🔍 Comparing with pattern registry...\n');

  // Build registry lookup
  const registryPatterns = {
    commands: new Set(),
    events: new Set(),
    features: new Set(),
    expressions: new Set(),
    keywords: new Set(),
    modifiers: new Set(),
    references: new Set(),
    operators: new Set()
  };

  // Extract from registry
  for (const [categoryKey, category] of Object.entries(PATTERN_REGISTRY)) {
    for (const pattern of category.patterns) {
      const syntax = pattern.syntax.toLowerCase();

      if (categoryKey === 'commands') {
        registryPatterns.commands.add(syntax);
      } else if (categoryKey === 'eventHandlers') {
        registryPatterns.events.add(syntax);
      } else if (categoryKey === 'temporalModifiers') {
        registryPatterns.modifiers.add(syntax);
      } else if (categoryKey === 'references') {
        registryPatterns.references.add(syntax);
      } else if (categoryKey === 'operators') {
        registryPatterns.operators.add(syntax);
      } else if (categoryKey === 'controlFlow') {
        registryPatterns.keywords.add(syntax);
      }
    }
  }

  // Compare and find gaps
  const analysis = {};
  let totalMissing = 0;
  let totalCovered = 0;

  for (const [category, patterns] of Object.entries(uniquePatterns)) {
    const registrySet = registryPatterns[category];
    const missing = [];
    const covered = [];

    for (const pattern of patterns) {
      const normalized = pattern.toLowerCase().trim();

      // Check if pattern or any part of it is in registry
      let found = false;

      // Direct match
      if (registrySet.has(normalized)) {
        found = true;
      } else {
        // Check for partial matches (e.g., "on click" matches "click")
        const words = normalized.split(/\s+/);
        for (const word of words) {
          if (registrySet.has(word)) {
            found = true;
            break;
          }
        }
      }

      if (found) {
        covered.push(pattern);
      } else {
        missing.push(pattern);
      }
    }

    analysis[category] = { missing, covered, total: patterns.length };
    totalMissing += missing.length;
    totalCovered += covered.length;

    console.log(`${category.padEnd(15)}: ${covered.length}/${patterns.length} covered (${missing.length} missing)`);
  }

  console.log(`\n📊 Overall: ${totalCovered}/${totalCovered + totalMissing} patterns covered (${totalMissing} missing)`);
  console.log(`   Coverage: ${Math.round((totalCovered / (totalCovered + totalMissing)) * 100)}%`);

  return analysis;
}

function identifyPriorities(analysis) {
  console.log('\n🎯 Identifying implementation priorities...\n');

  const priorities = {
    critical: [],    // Core commands/features used frequently
    high: [],        // Important patterns from official tests
    medium: [],      // Documentation patterns
    low: []          // LSP/edge cases
  };

  // Commands are critical
  if (analysis.commands?.missing.length > 0) {
    priorities.critical.push(...analysis.commands.missing.map(p => ({
      pattern: p,
      category: 'command',
      reason: 'Core command functionality'
    })));
  }

  // Events are high priority
  if (analysis.events?.missing.length > 0) {
    priorities.high.push(...analysis.events.missing.slice(0, 10).map(p => ({
      pattern: p,
      category: 'event',
      reason: 'Event handler pattern'
    })));
  }

  // Features are medium priority
  if (analysis.features?.missing.length > 0) {
    priorities.medium.push(...analysis.features.missing.map(p => ({
      pattern: p,
      category: 'feature',
      reason: 'Feature enhancement'
    })));
  }

  // Display priorities
  for (const [priority, items] of Object.entries(priorities)) {
    if (items.length > 0) {
      console.log(`\n${priority.toUpperCase()} Priority (${items.length} patterns):`);
      items.slice(0, 5).forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.pattern} (${item.category})`);
      });
      if (items.length > 5) {
        console.log(`  ... and ${items.length - 5} more`);
      }
    }
  }

  return priorities;
}

function generateImplementationRoadmap(analysis, priorities) {
  console.log('\n📋 Generating implementation roadmap...\n');

  const roadmap = {
    phase1_critical: {
      title: 'Phase 1: Critical Commands (Week 1)',
      duration: '40-60 hours',
      patterns: priorities.critical.slice(0, 10),
      estimatedHours: 50
    },
    phase2_high: {
      title: 'Phase 2: High-Priority Patterns (Week 2-3)',
      duration: '30-40 hours',
      patterns: priorities.high.slice(0, 15),
      estimatedHours: 35
    },
    phase3_medium: {
      title: 'Phase 3: Medium-Priority Features (Week 4-5)',
      duration: '20-30 hours',
      patterns: priorities.medium.slice(0, 10),
      estimatedHours: 25
    },
    phase4_low: {
      title: 'Phase 4: Edge Cases & Completeness (Week 6+)',
      duration: '10-20 hours',
      patterns: priorities.low.slice(0, 10),
      estimatedHours: 15
    }
  };

  console.log('Roadmap overview:');
  for (const [phaseKey, phase] of Object.entries(roadmap)) {
    console.log(`\n${phase.title}`);
    console.log(`  Duration: ${phase.duration}`);
    console.log(`  Patterns: ${phase.patterns.length}`);
    console.log(`  Estimated: ${phase.estimatedHours} hours`);
  }

  const totalEstimate = Object.values(roadmap).reduce((sum, phase) => sum + phase.estimatedHours, 0);
  console.log(`\n📊 Total estimated effort: ${totalEstimate} hours (${Math.round(totalEstimate / 40)} weeks at 40h/week)`);

  return roadmap;
}

async function generateReport(sources, uniquePatterns, analysis, priorities, roadmap) {
  console.log('\n📝 Generating comprehensive report...\n');

  const report = {
    generatedAt: new Date().toISOString(),
    sources: {
      official: sources.official?.stats?.totalPatterns || 0,
      docs: sources.docs?.stats?.totalPatterns || 0,
      lsp: sources.lsp?.stats?.totalPatterns || 0
    },
    uniquePatterns: Object.entries(uniquePatterns).reduce((acc, [cat, patterns]) => {
      acc[cat] = patterns.length;
      return acc;
    }, {}),
    analysis,
    priorities,
    roadmap,
    summary: {
      totalExtracted: sources.official?.stats?.totalPatterns + sources.docs?.stats?.totalPatterns + sources.lsp?.stats?.totalPatterns,
      totalUnique: Object.values(uniquePatterns).reduce((sum, arr) => sum + arr.length, 0),
      totalMissing: Object.values(analysis).reduce((sum, cat) => sum + (cat.missing?.length || 0), 0),
      totalCovered: Object.values(analysis).reduce((sum, cat) => sum + (cat.covered?.length || 0), 0),
      coveragePercent: null
    }
  };

  report.summary.coveragePercent = Math.round(
    (report.summary.totalCovered / (report.summary.totalCovered + report.summary.totalMissing)) * 100
  );

  // Save JSON
  await writeFile('comprehensive-pattern-analysis.json', JSON.stringify(report, null, 2));

  // Generate Markdown
  const markdown = generateMarkdownReport(report);
  await writeFile('COMPREHENSIVE_PATTERN_ANALYSIS.md', markdown);

  console.log('✅ Reports saved:');
  console.log('   - comprehensive-pattern-analysis.json');
  console.log('   - COMPREHENSIVE_PATTERN_ANALYSIS.md');

  return report;
}

function generateMarkdownReport(report) {
  return `# Comprehensive Pattern Analysis

**Generated:** ${new Date(report.generatedAt).toLocaleString()}

## Executive Summary

### Pattern Sources

| Source | Patterns Extracted |
|--------|-------------------|
| Official Test Suite | ${report.sources.official} |
| Documentation | ${report.sources.docs} |
| LSP Data | ${report.sources.lsp} |
| **Total Extracted** | **${report.summary.totalExtracted}** |

### Unique Patterns Discovered

| Category | Unique Patterns |
|----------|----------------|
${Object.entries(report.uniquePatterns).map(([cat, count]) => `| ${cat} | ${count} |`).join('\n')}
| **Total Unique** | **${report.summary.totalUnique}** |

### Coverage Analysis

- **Total Covered:** ${report.summary.totalCovered} patterns
- **Total Missing:** ${report.summary.totalMissing} patterns
- **Coverage:** ${report.summary.coveragePercent}%

## Detailed Analysis by Category

${Object.entries(report.analysis).map(([category, data]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)}

- **Total patterns:** ${data.total}
- **Covered:** ${data.covered.length} (${Math.round((data.covered.length / data.total) * 100)}%)
- **Missing:** ${data.missing.length}

${data.missing.length > 0 ? `
**Missing patterns:**
${data.missing.slice(0, 20).map((p, i) => `${i + 1}. \`${p}\``).join('\n')}
${data.missing.length > 20 ? `\n... and ${data.missing.length - 20} more` : ''}
` : ''}
`).join('\n')}

## Implementation Priorities

${Object.entries(report.priorities).map(([priority, items]) => `
### ${priority.toUpperCase()} Priority (${items.length} patterns)

${items.slice(0, 10).map((item, i) => `${i + 1}. **${item.pattern}** (${item.category}) - ${item.reason}`).join('\n')}
${items.length > 10 ? `\n... and ${items.length - 10} more` : ''}
`).join('\n')}

## Implementation Roadmap

${Object.values(report.roadmap).map(phase => `
### ${phase.title}

- **Duration:** ${phase.duration}
- **Patterns to implement:** ${phase.patterns.length}
- **Estimated effort:** ${phase.estimatedHours} hours

${phase.patterns.map((p, i) => `${i + 1}. ${p.pattern} (${p.category})`).join('\n')}
`).join('\n')}

## Next Steps

1. **Review Critical Priorities** - Validate the ${report.priorities.critical.length} critical patterns
2. **Update Pattern Registry** - Add ${report.summary.totalMissing} missing patterns to registry
3. **Generate Test Pages** - Create tests for newly discovered patterns
4. **Begin Implementation** - Start with Phase 1 (${report.roadmap.phase1_critical.estimatedHours} hours)

---

**Generated by:** HyperFixi Pattern Analysis System
**Date:** ${new Date(report.generatedAt).toLocaleString()}
`;
}

// Main execution
async function main() {
  console.log('=' .repeat(70));
  console.log(' COMPREHENSIVE PATTERN ANALYSIS');
  console.log('='.repeat(70));
  console.log();

  const sources = await loadAllSources();
  const uniquePatterns = extractUniquePatterns(sources);
  const analysis = compareWithRegistry(uniquePatterns);
  const priorities = identifyPriorities(analysis);
  const roadmap = generateImplementationRoadmap(analysis, priorities);
  const report = await generateReport(sources, uniquePatterns, analysis, priorities, roadmap);

  console.log('\n' + '='.repeat(70));
  console.log(' ANALYSIS COMPLETE');
  console.log('='.repeat(70));
  console.log(`\n📊 Summary:`);
  console.log(`   Total extracted: ${report.summary.totalExtracted} patterns`);
  console.log(`   Unique patterns: ${report.summary.totalUnique}`);
  console.log(`   Coverage: ${report.summary.coveragePercent}%`);
  console.log(`   Missing: ${report.summary.totalMissing} patterns`);
  console.log(`\n📋 Next: Review COMPREHENSIVE_PATTERN_ANALYSIS.md for detailed roadmap`);
  console.log('='.repeat(70));
}

main().catch(console.error);
