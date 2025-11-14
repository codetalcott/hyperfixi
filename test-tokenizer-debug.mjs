#!/usr/bin/env node
import { Parser } from './packages/core/dist/src/parser/parser.js';
import { Tokenizer } from './packages/core/dist/src/tokenizer/tokenizer.js';

// Test string that's failing
const testCode = 'set :idx to it';

console.log('📝 Testing tokenization of:', testCode);
console.log('');

// Create tokenizer and tokenize
const tokenizer = new Tokenizer();
const tokens = tokenizer.tokenize(testCode);

console.log('🔍 Tokens produced:');
tokens.forEach((token, index) => {
  console.log(`  ${index}: type="${token.type}" value="${token.value}" start=${token.start} end=${token.end}`);
});

console.log('');
console.log('🎯 Analysis:');
const colonTokenIndex = tokens.findIndex(t => t.value === ':');
if (colonTokenIndex >= 0) {
  console.log(`  ✓ Found ':' as separate token at index ${colonTokenIndex}`);
  if (colonTokenIndex + 1 < tokens.length) {
    console.log(`  ✓ Next token: "${tokens[colonTokenIndex + 1].value}"`);
  }
} else {
  console.log(`  ✗ No separate ':' token found`);
  const colonPrefixToken = tokens.find(t => t.value && t.value.startsWith(':'));
  if (colonPrefixToken) {
    console.log(`  ✓ Found ':' as part of token: "${colonPrefixToken.value}"`);
  } else {
    console.log(`  ✗ No token with ':' prefix found either`);
  }
}
