// Test increment/decrement command parsing
import { hyperscript } from './dist/index.mjs';

async function testIncrementParsing() {
    console.log('🧪 Testing Increment/Decrement Command Parsing...\n');
    
    try {
        // Test basic increment compilation
        console.log('1. Testing basic increment compilation:');
        const incrementResult = hyperscript.compile('increment counter');
        console.log(`   Increment compilation success: ${incrementResult.success}`);
        if (!incrementResult.success) {
            console.log(`   Errors: ${incrementResult.errors?.map(e => e.message).join(', ')}`);
        }
        
        // Test decrement compilation
        console.log('2. Testing basic decrement compilation:');
        const decrementResult = hyperscript.compile('decrement counter');
        console.log(`   Decrement compilation success: ${decrementResult.success}`);
        if (!decrementResult.success) {
            console.log(`   Errors: ${decrementResult.errors?.map(e => e.message).join(', ')}`);
        }
        
        // Test increment by amount compilation
        console.log('3. Testing increment by amount compilation:');
        const incrementByResult = hyperscript.compile('increment counter by 5');
        console.log(`   Increment by amount compilation success: ${incrementByResult.success}`);
        if (!incrementByResult.success) {
            console.log(`   Errors: ${incrementByResult.errors?.map(e => e.message).join(', ')}`);
        }
        
        // Test event handler compilation
        console.log('4. Testing event handler with increment:');
        const eventResult = hyperscript.compile('on click increment counter');
        console.log(`   Event handler compilation success: ${eventResult.success}`);
        if (!eventResult.success) {
            console.log(`   Errors: ${eventResult.errors?.map(e => e.message).join(', ')}`);
        }
        
        // Test complex event handler
        console.log('5. Testing complex event handler:');
        const complexResult = hyperscript.compile('on click increment enhancedCount then set the textContent of #enhanced-counter-display to "Enhanced Count: " + enhancedCount');
        console.log(`   Complex event handler compilation success: ${complexResult.success}`);
        if (!complexResult.success) {
            console.log(`   Errors: ${complexResult.errors?.map(e => e.message).join(', ')}`);
        }
        
    } catch (error) {
        console.error('❌ Error during testing:', error);
    }
}

// Check if we're in Node.js environment (no DOM)
if (typeof window === 'undefined') {
    console.log('⚠️  Running in Node.js - some DOM-related features may not work');
}

testIncrementParsing();