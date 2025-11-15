#!/usr/bin/env node
/**
 * Debug tokenizer for range syntax
 */

import { tokenize } from './src/parser/tokenizer.js';

const testCases = [
  'arr[..3]',   // Test 1 - WORKS
  'arr[2..3]',  // Test 2 - FAILS
  'arr[3..]',   // Test 3 - FAILS
];

console.log('🔍 Tokenizer Debug\n');

for (const code of testCases) {
  console.log(`\nTesting: ${code}`);
  console.log('='.repeat(50));

  try {
    const tokens = tokenize(code);
    tokens.forEach((token, i) => {
      console.log(`[${i}] ${token.type.padEnd(20)} "${token.value}"`);
    });
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}
