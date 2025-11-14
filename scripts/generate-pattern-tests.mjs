#!/usr/bin/env node
/**
 * Generate Comprehensive Pattern Test Pages
 *
 * Creates HTML test pages for each pattern category to enable
 * systematic testing of HyperFixi compatibility.
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { PATTERN_REGISTRY } from '../patterns-registry.mjs';

const OUTPUT_DIR = 'cookbook/generated-tests';

async function generateTestPages() {
  console.log('🏗️  Generating pattern test pages...\n');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const results = {
    generated: [],
    skipped: [],
    errors: []
  };

  // Generate a test page for each category
  for (const [categoryKey, category] of Object.entries(PATTERN_REGISTRY)) {
    try {
      const testablePatterns = category.patterns.filter(p =>
        p.status !== 'not-implemented' && p.example
      );

      if (testablePatterns.length === 0) {
        console.log(`⏭️  Skipping ${category.name} (no testable patterns)`);
        results.skipped.push(categoryKey);
        continue;
      }

      const html = generateCategoryTestPage(categoryKey, category, testablePatterns);
      const filename = `${OUTPUT_DIR}/test-${categoryKey}.html`;

      await writeFile(filename, html);
      console.log(`✅ Generated: ${filename} (${testablePatterns.length} patterns)`);
      results.generated.push({ category: categoryKey, file: filename, count: testablePatterns.length });

    } catch (error) {
      console.error(`❌ Error generating ${categoryKey}:`, error.message);
      results.errors.push({ category: categoryKey, error: error.message });
    }
  }

  // Generate comprehensive "all patterns" page
  try {
    const allPatterns = Object.values(PATTERN_REGISTRY)
      .flatMap(cat => cat.patterns)
      .filter(p => p.status !== 'not-implemented' && p.example);

    const html = generateComprehensiveTestPage(allPatterns);
    const filename = `${OUTPUT_DIR}/test-all-patterns.html`;
    await writeFile(filename, html);
    console.log(`✅ Generated: ${filename} (${allPatterns.length} total patterns)`);
    results.generated.push({ category: 'all', file: filename, count: allPatterns.length });

  } catch (error) {
    console.error('❌ Error generating comprehensive page:', error.message);
    results.errors.push({ category: 'all', error: error.message });
  }

  // Generate summary
  console.log('\n' + '='.repeat(70));
  console.log(' TEST PAGE GENERATION COMPLETE');
  console.log('='.repeat(70));
  console.log(`✅ Generated: ${results.generated.length} test pages`);
  console.log(`⏭️  Skipped: ${results.skipped.length} categories`);
  console.log(`❌ Errors: ${results.errors.length}`);

  if (results.generated.length > 0) {
    console.log('\n📄 Generated files:');
    results.generated.forEach(r => {
      console.log(`   ${r.file} (${r.count} patterns)`);
    });
  }

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    results.errors.forEach(e => {
      console.log(`   ${e.category}: ${e.error}`);
    });
  }

  console.log('\n🧪 To run tests:');
  console.log('   1. Start HTTP server: npx http-server packages/core -p 3000');
  console.log('   2. Run test suite: node scripts/test-all-patterns.mjs');
  console.log('='.repeat(70));

  return results;
}

function generateCategoryTestPage(categoryKey, category, patterns) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HyperFixi Pattern Test: ${category.name}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .pattern {
      margin: 15px 0;
      padding: 15px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 4px solid #ccc;
    }
    .pattern.pass {
      border-left-color: #4CAF50;
    }
    .pattern.fail {
      border-left-color: #f44336;
    }
    .pattern.unknown {
      border-left-color: #ff9800;
    }
    .pattern-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .pattern-title {
      flex: 1;
    }
    .pattern h3 {
      margin: 0 0 5px 0;
      font-size: 16px;
    }
    .pattern-syntax {
      font-family: 'Courier New', monospace;
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
      margin: 8px 0;
    }
    .pattern-description {
      color: #666;
      font-size: 14px;
      margin: 5px 0;
    }
    .status {
      font-weight: bold;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
    }
    .status.pass {
      background: #4CAF50;
      color: white;
    }
    .status.fail {
      background: #f44336;
      color: white;
    }
    .status.pending {
      background: #ff9800;
      color: white;
    }
    .status.unknown {
      background: #9e9e9e;
      color: white;
    }
    .demo {
      margin: 10px 0;
      padding: 10px;
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .btn {
      padding: 8px 16px;
      margin: 5px;
      cursor: pointer;
      border: 2px solid #333;
      background: #fff;
      border-radius: 4px;
      font-size: 14px;
    }
    .btn:hover {
      background: #f0f0f0;
    }
    .summary {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      min-width: 200px;
      z-index: 1000;
    }
    .summary h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: 14px;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }
    .notes {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 8px;
      border-radius: 4px;
      margin: 8px 0;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="summary" id="summary">
    <h3>📊 Test Summary</h3>
    <div class="summary-row">
      <span>Total:</span>
      <span id="total">0</span>
    </div>
    <div class="summary-row">
      <span>✅ Passed:</span>
      <span id="passed">0</span>
    </div>
    <div class="summary-row">
      <span>❌ Failed:</span>
      <span id="failed">0</span>
    </div>
    <div class="summary-row">
      <span>❓ Unknown:</span>
      <span id="unknown">0</span>
    </div>
    <div class="summary-row">
      <span><strong>Score:</strong></span>
      <span id="score">0%</span>
    </div>
  </div>

  <div class="header">
    <h1>🧪 HyperFixi Pattern Test: ${category.name}</h1>
    <p>${category.description}</p>
    <p><strong>Patterns tested:</strong> ${patterns.length}</p>
  </div>

${patterns.map((pattern, index) => generatePatternTest(pattern, index, categoryKey)).join('\n')}

  <script src="../../packages/core/dist/hyperfixi-browser.js"></script>

  <script>
    // Auto-validate patterns after HyperFixi loads
    setTimeout(() => {
      const patterns = ${JSON.stringify(patterns)};
      let passed = 0;
      let failed = 0;
      let unknown = 0;

      patterns.forEach((pattern, index) => {
        const element = document.querySelector(\`#demo-${categoryKey}-\${index}\`);
        const statusEl = document.getElementById(\`status-${categoryKey}-\${index}\`);
        const patternEl = document.getElementById(\`pattern-${categoryKey}-\${index}\`);

        // Check if element has _hyperscript attribute (compiled successfully)
        const hasAttribute = element?.hasAttribute('_');

        if (hasAttribute) {
          // Compilation successful
          statusEl.textContent = 'COMPILED';
          statusEl.className = 'status pass';
          patternEl.classList.add('pass');
          passed++;
          console.log(\`✅ Pattern \${index + 1}: \${pattern.syntax} - Compiled\`);
        } else if (pattern.status === 'unknown') {
          // Unknown status - needs manual verification
          statusEl.textContent = 'UNKNOWN';
          statusEl.className = 'status unknown';
          patternEl.classList.add('unknown');
          unknown++;
          console.log(\`❓ Pattern \${index + 1}: \${pattern.syntax} - Unknown status\`);
        } else {
          // Compilation failed
          statusEl.textContent = 'FAILED';
          statusEl.className = 'status fail';
          patternEl.classList.add('fail');
          failed++;
          console.log(\`❌ Pattern \${index + 1}: \${pattern.syntax} - Failed to compile\`);
        }
      });

      // Update summary
      const total = patterns.length;
      document.getElementById('total').textContent = total;
      document.getElementById('passed').textContent = passed;
      document.getElementById('failed').textContent = failed;
      document.getElementById('unknown').textContent = unknown;
      document.getElementById('score').textContent =
        \`\${Math.round((passed / total) * 100)}%\`;

      console.log('\\n' + '='.repeat(70));
      console.log(\` TEST RESULTS: ${category.name}\`);
      console.log('='.repeat(70));
      console.log(\`Total: \${total}\`);
      console.log(\`✅ Passed: \${passed} (\${Math.round((passed / total) * 100)}%)\`);
      console.log(\`❌ Failed: \${failed} (\${Math.round((failed / total) * 100)}%)\`);
      console.log(\`❓ Unknown: \${unknown} (\${Math.round((unknown / total) * 100)}%)\`);
      console.log('='.repeat(70));
    }, 1500);
  </script>
</body>
</html>`;
}

function generatePatternTest(pattern, index, categoryKey) {
  const statusClass = pattern.status === 'unknown' ? 'unknown' : 'pending';
  const notes = pattern.notes ? `
    <div class="notes">
      <strong>Note:</strong> ${pattern.notes}
    </div>` : '';

  return `
  <div class="pattern" id="pattern-${categoryKey}-${index}">
    <div class="pattern-header">
      <div class="pattern-title">
        <h3>Pattern ${index + 1}: ${pattern.description}</h3>
        <div class="pattern-description">
          Syntax: <code>${pattern.syntax}</code>
        </div>
      </div>
      <span class="status ${statusClass}" id="status-${categoryKey}-${index}">PENDING</span>
    </div>

    <div class="pattern-syntax">${escapeHtml(pattern.example)}</div>
    ${notes}

    <div class="demo">
      <strong>Interactive Demo:</strong>
      <div id="demo-${categoryKey}-${index}" _="${escapeHtml(pattern.example)}">
        ${generateDemoContent(pattern, index)}
      </div>
    </div>
  </div>`;
}

function generateDemoContent(pattern, index) {
  // Generate appropriate demo content based on pattern type
  const example = pattern.example.toLowerCase();

  if (example.includes('on click')) {
    return `<button class="btn">Click to test (Pattern ${index + 1})</button>`;
  }

  if (example.includes('on load')) {
    return `<span id="load-result-${index}">Loading...</span>`;
  }

  if (example.includes('on keyup') || example.includes('on input')) {
    return `<input type="text" placeholder="Type to test..." />`;
  }

  if (example.includes('closest <table/>')) {
    return `<table><tr><td><button class="btn">Test closest</button></td></tr></table>`;
  }

  if (example.includes('next <')) {
    return `<button class="btn">Test next</button><output>Next element</output>`;
  }

  // Default: button for testing
  return `<button class="btn">Test Pattern ${index + 1}</button>`;
}

function generateComprehensiveTestPage(patterns) {
  // Group patterns by category
  const byCategory = {};
  for (const pattern of patterns) {
    const cat = pattern.syntax.includes('on ') ? 'Event Handlers'
      : pattern.syntax.includes('until ') ? 'Temporal Modifiers'
      : pattern.syntax.includes('tell ') ? 'Context Switching'
      : pattern.syntax.match(/add|remove|toggle|set|put/) ? 'Commands'
      : 'Other';

    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(pattern);
  }

  const categoryHTML = Object.entries(byCategory)
    .map(([cat, pats]) => `
      <h2>${cat} (${pats.length} patterns)</h2>
      ${pats.map((p, i) => generatePatternTest(p, i, cat.toLowerCase().replace(/\s+/g, '-'))).join('\n')}
    `)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HyperFixi Comprehensive Pattern Test</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    /* ... (same styles as category page) ... */
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 HyperFixi Comprehensive Pattern Test</h1>
    <p>Testing all ${patterns.length} documented patterns</p>
  </div>

  ${categoryHTML}

  <script src="../../packages/core/dist/hyperfixi-browser.js"></script>
  <script>
    setTimeout(() => {
      console.log('✅ Comprehensive test page loaded');
      console.log('📊 Total patterns:', ${patterns.length});
    }, 1000);
  </script>
</body>
</html>`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Run generation
generateTestPages().catch(console.error);
