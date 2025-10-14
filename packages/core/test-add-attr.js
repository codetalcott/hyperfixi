const { tokenize } = require('./dist/hyperscript-fixi.mjs');

const input = 'add [@data-test="value"] to #test5';
console.log('Tokenizing:', input);
try {
  const tokens = tokenize(input);
  console.log('Tokens:', tokens.map(t => `${t.type}:${t.value}`).join(' '));
} catch (error) {
  console.error('Error:', error.message);
}
