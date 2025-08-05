#!/usr/bin/env node

/**
 * Node.js test to verify the "the X of Y" pattern compilation
 * This bypasses browser issues and tests the core logic directly
 */

import { hyperscript } from './src/api/hyperscript-api.ts';

console.log('🚀 NODE TEST: Starting direct compilation test...');

const testCases = [
    {
        name: 'Simple possessive (should work)',
        code: 'set my textContent to "test"'
    },
    {
        name: 'Direct possessive (should work)', 
        code: 'set #test-target\'s textContent to "test"'
    },
    {
        name: 'THE PROBLEM: The X of Y pattern',
        code: 'set the textContent of #test-target to "test"'
    },
    {
        name: 'Event handler with The X of Y',
        code: 'on click set the textContent of #test-target to "test"'
    }
];

console.log(`🧪 NODE TEST: Testing ${testCases.length} patterns...\n`);

for (const [i, test] of testCases.entries()) {
    console.log(`🔍 NODE TEST ${i + 1}: ${test.name}`);
    console.log(`   Code: ${test.code}`);
    
    try {
        const result = hyperscript.compile(test.code);
        
        if (result.success) {
            console.log(`   ✅ SUCCESS: Compilation passed!`);
            if (test.name.includes('PROBLEM')) {
                console.log('   🎉 BREAKTHROUGH: "The X of Y" Pattern Fixed!');
            }
        } else {
            console.log(`   ❌ FAILED: Compilation failed`);
            result.errors.forEach(error => {
                console.log(`      • ${error.message} (line ${error.line}, col ${error.column})`);
            });
            
            if (test.name.includes('PROBLEM')) {
                console.log('   ❌ Still Failing: "The X of Y" Pattern');
            }
        }
    } catch (e) {
        console.log(`   ❌ EXCEPTION: ${e.message}`);
    }
    console.log('');
}

console.log('🏁 NODE TEST: Direct compilation test completed');