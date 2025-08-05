#!/usr/bin/env node

/**
 * Quick Test Runner - Production version with minimal logging
 * Eliminates memory issues from verbose debug output
 */

import fs from 'fs';

// Minimal DOM polyfill
global.HTMLElement = class HTMLElement {};
global.document = {
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }),
    querySelector: () => null,
    querySelectorAll: () => []
};
global.window = global;

// Suppress verbose console output
const originalLog = console.log;
console.log = (...args) => {
    // Only show important messages, filter out debug spam
    const message = args[0];
    if (typeof message === 'string' && (
        message.includes('🚀') || 
        message.includes('✅') || 
        message.includes('❌') || 
        message.includes('📊') ||
        message.includes('🎉') ||
        !message.includes('🔍') && !message.includes('TOKENIZER') && !message.includes('PARSER')
    )) {
        originalLog.apply(console, args);
    }
};

async function runQuickTests() {
    try {
        console.log('🚀 Quick HyperFixi Test Suite');
        console.log('🎯 Testing core compilation functionality...\n');
        
        const { hyperscript } = await import('./dist/index.mjs');
        
        const tests = [
            { name: 'Simple SET command', code: 'set myVar to "test"' },
            { name: 'The X of Y pattern', code: 'set the textContent of #target to "test"' },
            { name: 'Event handler basic', code: 'on click set myVar to "clicked"' },
            { name: 'Event handler X of Y', code: 'on click set the textContent of #target to "clicked"' },
            { name: 'Constructor call', code: 'set myVar to new Date()' },
            { name: 'Function call', code: 'set myVar to Date()' },
            { name: 'String concatenation', code: 'set myVar to "Hello " + "World"' },
            { name: 'Mathematical expression', code: 'set result to (5 + 3) * 2' },
            { name: 'Enhanced increment', code: 'increment counter' },
            { name: 'Enhanced decrement', code: 'decrement counter by 5' },
            { name: 'Compound command', code: 'on click add .highlight to #target then wait 1s then remove .highlight from #target' }
        ];
        
        let passed = 0;
        let results = [];
        
        for (const test of tests) {
            try {
                const result = hyperscript.compile(test.code);
                if (result && result.success) {
                    console.log(`✅ PASS: ${test.name}`);
                    passed++;
                    results.push({ test: test.name, result: 'PASS', code: test.code });
                } else {
                    console.log(`❌ FAIL: ${test.name}`);
                    if (result.errors) {
                        result.errors.forEach(err => console.log(`   Error: ${err.message}`));
                    }
                    results.push({ test: test.name, result: 'FAIL', code: test.code, errors: result.errors });
                }
            } catch (error) {
                console.log(`❌ FAIL: ${test.name} - Exception: ${error.message}`);
                results.push({ test: test.name, result: 'FAIL', code: test.code, error: error.message });
            }
        }
        
        const failed = tests.length - passed;
        const successRate = Math.round((passed / tests.length) * 100);
        
        console.log('\n📊 Test Results Summary:');
        console.log(`   Total Tests: ${tests.length}`);
        console.log(`   Passed: ${passed} (${successRate}%)`);
        console.log(`   Failed: ${failed}`);
        
        // Save results
        const report = {
            timestamp: new Date().toISOString(),
            summary: { total: tests.length, passed, failed, successRate },
            results
        };
        
        fs.writeFileSync('quick-test-results.json', JSON.stringify(report, null, 2));
        console.log(`💾 Results saved to: quick-test-results.json`);
        
        if (failed === 0) {
            console.log('\n🎉 All tests passed! Automated testing system is working perfectly.');
        } else {
            console.log(`\n⚠️  ${failed} tests failed. Check results for details.`);
        }
        
        return failed === 0;
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        return false;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runQuickTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { runQuickTests };