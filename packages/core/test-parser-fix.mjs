// Test the increment/decrement parsing fix
import { hyperscript } from './dist/index.mjs';

// Mock DOM environment
global.HTMLElement = class {};
global.document = {
  createElement: () => ({}),
  querySelector: () => null,
  querySelectorAll: () => []
};
global.window = global;

async function testParsingFix() {
    console.log('🧪 Testing Increment/Decrement Parsing Fix...\n');
    
    try {
        // Test basic increment
        console.log('1. Testing basic increment parsing:');
        const result1 = hyperscript.compile('increment counter');
        console.log(`   Success: ${result1.success}`);
        if (!result1.success) {
            console.log(`   Errors: ${result1.errors?.map(e => e.message).join(', ')}`);
        }
        
        // Test increment with by amount
        console.log('2. Testing increment by amount parsing:');
        const result2 = hyperscript.compile('increment counter by 5');
        console.log(`   Success: ${result2.success}`);
        if (!result2.success) {
            console.log(`   Errors: ${result2.errors?.map(e => e.message).join(', ')}`);
        }
        
        // Test complex event handler
        console.log('3. Testing event handler parsing:');
        const result3 = hyperscript.compile('on click increment enhancedCount then set the textContent of #display to "test"');
        console.log(`   Success: ${result3.success}`);
        if (!result3.success) {
            console.log(`   Errors: ${result3.errors?.map(e => e.message).join(', ')}`);
        }
        
        // Test decrement with by amount
        console.log('4. Testing decrement by amount parsing:');
        const result4 = hyperscript.compile('decrement counter by 3');
        console.log(`   Success: ${result4.success}`);
        if (!result4.success) {
            console.log(`   Errors: ${result4.errors?.map(e => e.message).join(', ')}`);
        }
        
        console.log('\n🎉 Parsing tests completed!');
        
    } catch (error) {
        console.error('❌ Error during testing:', error);
    }
}

testParsingFix();