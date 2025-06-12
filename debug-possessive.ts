// Debug possessive syntax parsing
import { tokenize } from './src/parser/tokenizer.js';
import { parse } from './src/parser/parser.js';

// Test the exact string from the test
const input = "element's property";
console.log('Input:', JSON.stringify(input));

const tokens = tokenize(input);
console.log('Tokens:', tokens.map(t => `${t.type}:"${t.value}"`));

const result = parse(input);
console.log('Parse result success:', result.success);
console.log('AST node type:', result.node?.type);
console.log('Full result:', JSON.stringify(result, null, 2));