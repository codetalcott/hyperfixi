#!/usr/bin/env node

/**
 * Simple test for includes tokenization
 */

// Set up happy-dom for DOM testing
const { Window } = require('happy-dom');
global.window = new Window();
global.document = window.document;

// Import the tokenizer directly
const { Lexer } = require('./dist/index.min.js');

console.log('Testing includes tokenization...\n');

const testCases = [
  'includes',
  'array includes value',
  'contains',
  'array contains value'
];

testCases.forEach((input, i) => {
  console.log(`Test ${i + 1}: "${input}"`);
  try {
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();
    console.log('Tokens:');
    tokens.forEach((token, j) => {
      console.log(`  [${j}] ${token.type}: "${token.text}"`);
    });
    console.log('✓ Success\n');
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
  }
});