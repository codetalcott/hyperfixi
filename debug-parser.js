import { tokenize } from './src/parser/tokenizer.js';
import { parse } from './src/parser/parser.js';

// Test member expression parsing
console.log('=== Testing element[prop] ===');
const tokens1 = tokenize('element[prop]');
console.log('Tokens:', tokens1);

const result1 = parse('element[prop]');
console.log('Parse result:', JSON.stringify(result1, null, 2));

console.log('\n=== Testing element.property ===');
const tokens2 = tokenize('element.property');
console.log('Tokens:', tokens2);

const result2 = parse('element.property');
console.log('Parse result:', JSON.stringify(result2, null, 2));

console.log('\n=== Testing element\'s property ===');
const tokens3 = tokenize("element's property");
console.log('Tokens:', tokens3);

const result3 = parse("element's property");
console.log('Parse result:', JSON.stringify(result3, null, 2));