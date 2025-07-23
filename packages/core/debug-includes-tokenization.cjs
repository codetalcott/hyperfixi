#!/usr/bin/env node

/**
 * Debug script to trace includes tokenization flow
 */

const fs = require('fs');
const path = require('path');

// Read the tokenizer source
const tokenizerPath = path.join(__dirname, 'src/parser/tokenizer.ts');
const tokenizerSource = fs.readFileSync(tokenizerPath, 'utf8');

// Create a modified version with debug logging
const debugTokenizerSource = tokenizerSource
  .replace('function tokenizeIdentifier(tokenizer: Tokenizer): void {', `
function tokenizeIdentifier(tokenizer: Tokenizer): void {
  console.log('=== tokenizeIdentifier called ===');
  console.log('Current position:', tokenizer.position);
  console.log('Current char:', tokenizer.input[tokenizer.position]);
  console.log('Remaining input:', tokenizer.input.slice(tokenizer.position, tokenizer.position + 20));`)
  .replace('// Check for multi-word operators starting with this identifier', `
  console.log('Identifier value:', value);
  
  // Check for multi-word operators starting with this identifier`)
  .replace('// Classify the identifier', `
  console.log('About to classify identifier:', value);
  
  // Classify the identifier`)
  .replace('function classifyIdentifier(value: string): TokenType {', `
function classifyIdentifier(value: string): TokenType {
  console.log('=== classifyIdentifier called ===');
  console.log('Value:', value);
  console.log('Lowercase value:', value.toLowerCase());`)
  .replace('return TokenType.IDENTIFIER;', `
  console.log('Returning IDENTIFIER for:', value);
  return TokenType.IDENTIFIER;`)
  .replace('return TokenType.COMPARISON_OPERATOR;', `
  console.log('Returning COMPARISON_OPERATOR for:', value);
  return TokenType.COMPARISON_OPERATOR;`)
  .replace('function tryTokenizeCompoundOperator(tokenizer: Tokenizer, firstWord: string, start: number): boolean {', `
function tryTokenizeCompoundOperator(tokenizer: Tokenizer, firstWord: string, start: number): boolean {
  console.log('=== tryTokenizeCompoundOperator called ===');
  console.log('First word:', firstWord);
  console.log('Start position:', start);`)
  .replace('// No compound operator found, reset position', `
  console.log('No compound operator found for:', firstWord);
  
  // No compound operator found, reset position`);

// Write debug version
const debugTokenizerPath = path.join(__dirname, 'debug-tokenizer.cjs');
fs.writeFileSync(debugTokenizerPath, `
// Debug tokenizer with logging
${debugTokenizerSource.replace(/import.*from.*\.js';/g, '').replace(/export /g, '')}

// Test the includes tokenization
const input = 'array includes value';
console.log('\\n=== TOKENIZING:', input, '===\\n');

try {
  const tokens = tokenize(input);
  console.log('\\n=== RESULT TOKENS ===');
  tokens.forEach((token, i) => {
    console.log(\`Token \${i}: \${token.type} = "\${token.value}"\`);
  });
} catch (error) {
  console.error('\\n=== ERROR ===');
  console.error(error.message);
}
`);

console.log('Debug tokenizer created. Running...');

// Execute the debug version
require(debugTokenizerPath);