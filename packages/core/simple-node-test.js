#!/usr/bin/env node

/**
 * Simple Node.js test to verify basic compilation works
 * This bypasses DOM dependencies for core parsing functionality
 */

import fs from 'fs';

// Simple DOM polyfill for Node.js testing
global.HTMLElement = class HTMLElement {};
global.document = {
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }),
    querySelector: () => null,
    querySelectorAll: () => []
};
global.window = global;

async function testBasicCompilation() {
    try {
        console.log('🧪 Testing basic hyperscript compilation...');
        
        // Import with DOM polyfill in place
        const { hyperscript } = await import('./dist/index.mjs');
        
        if (!hyperscript || typeof hyperscript.compile !== 'function') {
            console.error('❌ hyperscript.compile not available');
            return false;
        }
        
        console.log('✅ Successfully loaded hyperscript module');
        console.log('🔍 Available methods:', Object.keys(hyperscript));
        
        // Test basic compilation
        const tests = [
            'set myVar to "test"',
            'on click log "hello"',
            'add .highlight to #target'
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const testCode of tests) {
            try {
                const result = hyperscript.compile(testCode);
                if (result && result.success) {
                    console.log(`✅ PASS: "${testCode}"`);
                    passed++;
                } else {
                    console.log(`❌ FAIL: "${testCode}" - Compilation failed`);
                    if (result.errors) {
                        result.errors.forEach(err => console.log(`   Error: ${err.message}`));
                    }
                    failed++;
                }
            } catch (error) {
                console.log(`❌ FAIL: "${testCode}" - Exception: ${error.message}`);
                failed++;
            }
        }
        
        console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
        return failed === 0;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    testBasicCompilation().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { testBasicCompilation };