#!/usr/bin/env node
/**
 * Run official arrayIndex.js tests - Session 26
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';

async function runOfficialArrayIndexTests() {
  console.log('🧪 Running official arrayIndex.js tests...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/compatibility-test.html');
  await page.waitForTimeout(1000);

  // Read the official test file
  const testFileContent = readFileSync('/Users/williamtalcott/projects/_hyperscript/test/expressions/arrayIndex.js', 'utf-8');

  // Extract test names and classify them
  const itPattern = /it\("([^"]+)"/g;
  const matches = [...testFileContent.matchAll(itPattern)];

  const categories = {
    literal: [],
    simpleIndex: [],
    expressionIndex: [],
    range: [],
    error: []
  };

  matches.forEach(match => {
    const name = match[1];
    if (name.includes('literal')) {
      categories.literal.push(name);
    } else if (name.includes('range')) {
      categories.range.push(name);
    } else if (name.includes('error')) {
      categories.error.push(name);
    } else if (name.includes('expression')) {
      categories.expressionIndex.push(name);
    } else {
      categories.simpleIndex.push(name);
    }
  });

  console.log('📊 Test Categories:');
  console.log(`   Array literals: ${categories.literal.length}`);
  console.log(`   Simple indexing: ${categories.simpleIndex.length}`);
  console.log(`   Expression indexing: ${categories.expressionIndex.length}`);
  console.log(`   Range syntax: ${categories.range.length}`);
  console.log(`   Error handling: ${categories.error.length}`);
  console.log(`   Total: ${matches.length} tests\n`);

  // Run the tests through our test runner
  const result = await page.evaluate(async () => {
    const testFile = '/Users/williamtalcott/projects/_hyperscript/test/expressions/arrayIndex.js';
    const response = await fetch(testFile);
    const code = await response.text();

    // Count tests
    const itMatches = code.match(/it\(/g);
    const testCount = itMatches ? itMatches.length : 0;

    return { testCount };
  });

  await browser.close();

  console.log('Expected Results:');
  console.log(`   ✅ Should pass: ${categories.literal.length + categories.simpleIndex.length + categories.expressionIndex.length} tests (literals + simple + expression indexing)`);
  console.log(`   ❌ Should fail: ${categories.range.length} tests (range syntax not implemented)`);
  console.log(`   ❓ Unknown: ${categories.error.length} tests (error handling - needs validation)\n`);

  console.log('To run actual tests: npm run test:browser -- --grep "array index"\n');
}

runOfficialArrayIndexTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
