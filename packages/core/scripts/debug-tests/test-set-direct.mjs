// Direct test of SET command components
import { EnhancedSetCommand } from './src/commands/data/enhanced-set.js';
import { EnhancedCommandAdapter } from './src/runtime/enhanced-command-adapter.js';

async function testSetDirect() {
    console.log('🔧 Testing SET command components directly');
    
    try {
        // Create enhanced SET command
        const setCommand = new EnhancedSetCommand();
        console.log('✅ Created enhanced SET command:', setCommand.name);
        
        // Create adapter
        const adapter = new EnhancedCommandAdapter(setCommand);
        console.log('✅ Created adapter');
        
        // Test input object
        const testInput = {
            target: 'x',
            value: 42,
            toKeyword: 'to'
        };
        console.log('🔧 Test input:', testInput);
        
        // Create mock context
        const mockContext = {
            me: null,
            it: null,
            you: null,
            result: null,
            event: null,
            variables: new Map(),
            locals: new Map(),
            globals: new Map(),
            events: new Map(),
            meta: {}
        };
        
        // Test direct execution
        console.log('🔧 Testing direct enhanced SET command execution...');
        const directResult = await setCommand.execute(testInput, mockContext);
        console.log('✅ Direct execution result:', directResult);
        
        // Test adapter execution
        console.log('🔧 Testing adapter execution...');
        const adapterResult = await adapter.execute(mockContext, testInput);
        console.log('✅ Adapter execution result:', adapterResult);
        
    } catch (error) {
        console.error('❌ Direct test failed:', error);
        console.error('❌ Error stack:', error.stack);
    }
}

testSetDirect();