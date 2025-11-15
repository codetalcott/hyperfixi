import hyperscript from './dist/index.mjs';

// Test the compilation of 'the X of Y' syntax directly
console.log('=== Testing "the X of Y" syntax after parser fix ===');
const result = hyperscript.compile('on click set the textContent of #element to "test"');

console.log('Compilation result:', result.success ? 'SUCCESS ✅' : 'FAILED ❌');

if (!result.success) {
  console.log('Errors:', result.errors);
} else {
  console.log('✅ "the textContent of #element" syntax compiles successfully!');
}

// Test a few more cases
const tests = [
  'set the innerHTML of #target to "content"',
  'set the className of #element to "highlight"', 
  'on click set the textContent of #output to "success"'
];

console.log('\n🧪 Testing multiple "the X of Y" patterns:');
tests.forEach((test, i) => {
  const result = hyperscript.compile(test);
  console.log(`${i + 1}. ${result.success ? '✅' : '❌'} ${test}`);
  if (!result.success) {
    console.log('   Errors:', result.errors);
  }
});