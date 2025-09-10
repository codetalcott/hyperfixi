import { hyperscript } from './packages/core/src/index.ts';

console.log('Testing hyperscript.evaluate functionality...');

async function testEvaluate() {
  try {
    // Test the evaluate method
    console.log('Testing: hyperscript.evaluate("on click toggle .active on me")');
    
    // This should parse and be ready to execute (though it won't actually execute without a DOM context)
    const result = await hyperscript.evaluate('on click toggle .active on me');
    
    console.log('✅ hyperscript.evaluate() works!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Error testing hyperscript.evaluate():', error);
    console.error('Stack:', error.stack);
  }
}

testEvaluate();