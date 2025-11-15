#!/usr/bin/env node
/**
 * Test script to verify parser correctly handles multi-word commands with modifiers
 */

import { Parser } from './src/parser/parser.js';
import { tokenize } from './src/parser/tokenizer.js';

console.log('Testing Multi-Word Command Parser\n');
console.log('='.repeat(50));

const testCases = [
  {
    name: 'append...to command',
    input: "append 'Hello' to :mystr",
    expected: { command: 'append', modifiers: ['to'] }
  },
  {
    name: 'fetch...as command',
    input: 'fetch "/api/data" as json',
    expected: { command: 'fetch', modifiers: ['as'] }
  },
  {
    name: 'send...to command',
    input: 'send customEvent to #target',
    expected: { command: 'send', modifiers: ['to'] }
  },
  {
    name: 'make a command',
    input: 'make a <div/>',
    expected: { command: 'make', modifiers: ['a'] }
  },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`\nTest: ${testCase.name}`);
  console.log(`Input: "${testCase.input}"`);

  try {
    // Tokenize and parse
    const tokens = tokenize(testCase.input);
    const parser = new Parser(tokens);
    const result = parser.parse();

    if (!result.success) {
      console.log(`❌ FAILED: Parser error: ${result.error?.message || 'Unknown error'}`);
      failed++;
      continue;
    }

    // Extract command node
    let commandNode;
    if (result.node.type === 'program') {
      commandNode = result.node.commands?.[0];
    } else if (result.node.type === 'command') {
      commandNode = result.node;
    }

    if (!commandNode) {
      console.log(`❌ FAILED: No command node found`);
      failed++;
      continue;
    }

    console.log(`Command: ${commandNode.name}`);
    console.log(`Args: ${commandNode.args?.length || 0} arguments`);
    console.log(`Modifiers:`, commandNode.modifiers || 'none');

    // Verify command name
    if (commandNode.name !== testCase.expected.command) {
      console.log(`❌ FAILED: Expected command "${testCase.expected.command}", got "${commandNode.name}"`);
      failed++;
      continue;
    }

    // Verify modifiers exist
    if (!commandNode.modifiers) {
      console.log(`❌ FAILED: No modifiers found, expected: ${testCase.expected.modifiers.join(', ')}`);
      failed++;
      continue;
    }

    // Verify modifier keys
    const actualModifierKeys = Object.keys(commandNode.modifiers);
    const missingModifiers = testCase.expected.modifiers.filter(m => !actualModifierKeys.includes(m));

    if (missingModifiers.length > 0) {
      console.log(`❌ FAILED: Missing modifiers: ${missingModifiers.join(', ')}`);
      failed++;
      continue;
    }

    console.log(`✅ PASSED`);
    passed++;

  } catch (error) {
    console.log(`❌ FAILED: Exception: ${error.message}`);
    failed++;
  }
}

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
