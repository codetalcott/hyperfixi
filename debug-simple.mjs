// Simple debug for possessive syntax
import { tokenize } from './src/parser/tokenizer.js';
import { parse } from './src/parser/parser.js';

console.log('=== Testing possessive syntax ===');
const input = "element's property";
console.log('Input:', JSON.stringify(input));

const tokens = tokenize(input);
console.log('Tokens:', tokens.map(t => `${t.type}:"${t.value}"`));

const result = parse(input);
console.log('Parse success:', result.success);
console.log('AST type:', result.node?.type);
if (result.node?.type === 'identifier') {
  console.log('Identifier name:', result.node.name);
}
console.log('Full result:', JSON.stringify(result, null, 2));