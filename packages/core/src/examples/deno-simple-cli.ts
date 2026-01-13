#!/usr/bin/env -S deno run --allow-env

/**
 * HyperFixi Deno CLI - Simplified Demo
 * Demonstrates working HyperFixi integration with Deno
 */

import {
  HideCommand,
  createMinimalRuntime,
  getLLMRuntimeInfo,
  logger,
  performance,
} from '../deno-mod';

function printBanner() {
  console.log(`
🚀 HyperFixi - Universal Modern Hyperscript

✅ Working in Deno ${Deno.version.deno}
✅ Full TypeScript integration
✅ LLM agent optimization
✅ Tree-shakeable architecture
`);
}

function demonstrateEnvironment() {
  const info = getLLMRuntimeInfo();

  console.log('🔍 Runtime Environment:');
  console.log(`   Environment: ${info.runtime} ${info.version}`);
  console.log(`   TypeScript: ${info.typescript ? '✅' : '❌'}`);
  console.log(`   Built-in TS: ${info.features.builtinTypescript ? '✅' : '❌'}`);
  console.log(`   JSR Support: ${info.features.jsr ? '✅' : '❌'}`);
  console.log(`   Deno Deploy: ${info.features.denoDeploy ? '✅' : '❌'}`);
  console.log(`   Import Style: ${info.patterns.imports}`);
  console.log(`   Test Runner: ${info.patterns.testing}`);
  console.log('');
}

function demonstrateCommands() {
  console.log('🧪 Command System:');

  const hideCommand = new HideCommand();

  console.log(`   Command: ${hideCommand.name}`);
  console.log(`   Syntax: ${hideCommand.syntax}`);
  console.log(`   Category: ${hideCommand.metadata.category}`);
  console.log(`   Complexity: ${hideCommand.metadata.complexity}`);

  // Show validation in action
  console.log('');
  console.log('   Validation Examples:');

  const valid = hideCommand.validate([]);
  console.log(`   validate([]): ${valid.isValid ? '✅' : '❌'}`);

  const validSelector = hideCommand.validate(['.test']);
  console.log(`   validate(['.test']): ${validSelector.isValid ? '✅' : '❌'}`);

  const invalid = hideCommand.validate(['arg1', 'arg2']);
  console.log(`   validate(['arg1', 'arg2']): ${invalid.isValid ? '✅' : '❌'}`);
  if (!invalid.isValid) {
    console.log(`     Error: ${invalid.errors[0]?.message}`);
    console.log(`     Suggestion: ${invalid.suggestions[0]}`);
  }

  console.log('');
}

function demonstrateRuntime() {
  console.log('⚡ Runtime System:');

  const startTime = performance.now();

  const runtime = createMinimalRuntime();
  runtime.addCommand(new HideCommand());

  const endTime = performance.now();

  console.log(`   Created runtime in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`   Commands available: ${runtime.listCommands().length}`);
  console.log(`   Command list: ${runtime.listCommands().join(', ')}`);
  console.log(`   Environment: ${runtime.environment.name}`);
  console.log('');
}

function demonstrateLLMFeatures() {
  console.log('🤖 LLM Agent Features:');

  const hideCommand = new HideCommand();

  console.log('   Rich Documentation:');
  console.log(`     Summary: "${hideCommand.documentation.summary}"`);
  console.log(`     Parameters: ${hideCommand.documentation.parameters.length} documented`);
  console.log(`     Examples: ${hideCommand.documentation.examples.length} provided`);
  console.log(`     Tags: ${hideCommand.documentation.tags.join(', ')}`);

  console.log('');
  console.log('   Type Safety:');
  console.log(`     Input validation: ✅`);
  console.log(`     Output typing: ${hideCommand.outputType}`);
  console.log(`     Error handling: ✅`);
  console.log(`     Metadata: ${Object.keys(hideCommand.metadata).length} properties`);

  console.log('');
}

async function demonstrateExecution() {
  console.log('🎯 Execution Demo (Simulated):');

  const hideCommand = new HideCommand();

  // Mock context for demonstration
  const mockContext = {
    me: null,
    you: null,
    it: null,
    locals: new Map(),
    globals: new Map(),
    result: null,
  };

  console.log('   Executing: hide command with null context');

  const startTime = performance.now();
  const result = await hideCommand.execute(mockContext);
  const endTime = performance.now();

  console.log(`   Execution time: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`   Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Type: ${result.type}`);
  console.log(
    `   Value: ${Array.isArray(result.value) ? `Array(${result.value.length})` : result.value}`
  );

  console.log('');
}

function printUsageExamples() {
  console.log('📚 Usage Examples:');

  console.log(`
  // Import from Deno module
  import { HideCommand, createMinimalRuntime } from "./deno-mod.ts";
  
  // Create and use commands
  const hideCommand = new HideCommand();
  const result = await hideCommand.execute(context, element);
  
  // Build runtime
  const runtime = createMinimalRuntime()
    .addCommand(new HideCommand());
  
  // Get LLM-friendly information
  import { getLLMRuntimeInfo } from "./deno-mod.ts";
  const info = getLLMRuntimeInfo();
  
  // Deno-specific features
  deno test --allow-env src/*.test.ts
  deno compile --allow-env --output=hyperfixi main.ts
  deployctl deploy --project=hyperfixi main.ts
`);
}

async function main() {
  logger.info('Starting HyperFixi Deno demonstration');

  printBanner();
  demonstrateEnvironment();
  demonstrateCommands();
  demonstrateRuntime();
  demonstrateLLMFeatures();
  await demonstrateExecution();
  printUsageExamples();

  console.log('✨ HyperFixi Deno integration demonstration complete!');
  console.log('');
  console.log('🎯 Key Benefits for Deno:');
  console.log('   ✅ Zero compilation step (native TypeScript)');
  console.log('   ✅ URL-based imports (no package.json)');
  console.log('   ✅ Built-in test runner');
  console.log('   ✅ Single executable deployment');
  console.log('   ✅ Edge function ready');
  console.log('   ✅ Security by default');

  logger.info('Demonstration completed successfully');
}

if (import.meta.main) {
  await main();
}
