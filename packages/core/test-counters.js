// Quick test of HyperFixi increment/decrement functionality
import { hyperscript } from './dist/index.mjs';

async function testCounters() {
    console.log('🧪 Testing HyperFixi Counter Commands...\n');
    
    try {
        // Test basic increment
        console.log('1. Testing basic increment:');
        await hyperscript.run('set counter to 10');
        console.log('   Set counter to 10');
        await hyperscript.run('increment counter');
        const result1 = await hyperscript.run('counter');
        console.log(`   After increment: ${result1} (expected: 11)`);
        console.log(`   ✅ Basic increment: ${result1 === 11 ? 'PASS' : 'FAIL'}\n`);
        
        // Test basic decrement
        console.log('2. Testing basic decrement:');
        await hyperscript.run('decrement counter');
        const result2 = await hyperscript.run('counter');
        console.log(`   After decrement: ${result2} (expected: 10)`);  
        console.log(`   ✅ Basic decrement: ${result2 === 10 ? 'PASS' : 'FAIL'}\n`);
        
        // Test increment by amount
        console.log('3. Testing increment by amount:');
        await hyperscript.run('increment counter by 5');
        const result3 = await hyperscript.run('counter');
        console.log(`   After increment by 5: ${result3} (expected: 15)`);
        console.log(`   ✅ Increment by amount: ${result3 === 15 ? 'PASS' : 'FAIL'}\n`);
        
        // Test decrement by amount
        console.log('4. Testing decrement by amount:');
        await hyperscript.run('decrement counter by 3');
        const result4 = await hyperscript.run('counter');
        console.log(`   After decrement by 3: ${result4} (expected: 12)`);
        console.log(`   ✅ Decrement by amount: ${result4 === 12 ? 'PASS' : 'FAIL'}\n`);
        
        // Test null handling
        console.log('5. Testing null/undefined handling:');
        await hyperscript.run('increment nullCounter');
        const result5 = await hyperscript.run('nullCounter');
        console.log(`   Increment undefined var: ${result5} (expected: 1)`);
        console.log(`   ✅ Null handling: ${result5 === 1 ? 'PASS' : 'FAIL'}\n`);
        
        console.log('🎉 All counter tests completed!');
        
    } catch (error) {
        console.error('❌ Error during testing:', error);
    }
}

testCounters();