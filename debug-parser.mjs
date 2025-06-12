// Run with: npx tsx debug-parser.mjs
import { parse } from './src/parser/parser.ts';
import { tokenize } from './src/parser/tokenizer.ts';

const input = 'if x > 5 then add .active else remove .active';
console.log('=== INPUT ===');
console.log(input);

console.log('\n=== TOKENS ===');
const tokens = tokenize(input);
tokens.forEach((token, i) => {
  console.log(`${i}: ${token.type} = '${token.value}'`);
});

console.log('\n=== PARSED AST ===');
const result = parse(input);
console.log('Success:', result.success);
if (result.node) {
  console.log('AST:', JSON.stringify(result.node, null, 2));
}
if (result.error) {
  console.log('Error:', result.error);
}