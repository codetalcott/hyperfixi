#!/usr/bin/env -S deno run --allow-dom --allow-env --allow-net

/**
 * HyperFixi Deno CLI Example
 * Demonstrates HyperFixi running in Deno with full TypeScript support
 * 
 * Usage:
 *   deno run --allow-dom --allow-env examples/deno-cli.ts
 *   deno compile --allow-dom --allow-env examples/deno-cli.ts -o hyperfixi-cli
 */

import {
  HideCommand,
  createMinimalRuntime,
  getLLMRuntimeInfo,
  logger,
  performance,
} from '../mod.js';

// ============================================================================
// CLI Interface
// ============================================================================

function printBanner() {
  console.log(`
🚀 HyperFixi - Modern Hyperscript for Deno

A TypeScript-native, tree-shakeable hyperscript implementation
optimized for modern tooling and LLM code agents.
`);
}

function printRuntimeInfo() {
  const info = getLLMRuntimeInfo();
  
  console.log('🔍 Runtime Information:');
  console.log(`  Environment: ${info.runtime} ${info.version}`);
  console.log(`  TypeScript: ${info.typescript ? '✅' : '❌'}`);
  console.log(`  DOM Support: ${info.capabilities.dom ? '✅' : '❌'}`);
  console.log(`  Web APIs: ${info.capabilities.webapis ? '✅' : '❌'}`);
  console.log(`  File System: ${info.capabilities.filesystem ? '✅' : '❌'}`);
  console.log(`  Networking: ${info.capabilities.networking ? '✅' : '❌'}`);
  
  if (info.features.builtinTypescript) {
    console.log('  🎯 Built-in TypeScript support detected');
  }
  
  if (info.features.jsr) {
    console.log('  📦 JSR registry support available');
  }
  
  console.log('');
}

function demonstrateCommands() {
  console.log('🧪 Command Demonstration:');
  
  // Create a hide command
  const hideCommand = new HideCommand();
  
  console.log(`  Command: ${hideCommand.name}`);
  console.log(`  Syntax: ${hideCommand.syntax}`);
  console.log(`  Description: ${hideCommand.description}`);
  console.log(`  Category: ${hideCommand.metadata.category}`);
  console.log(`  Complexity: ${hideCommand.metadata.complexity}`);
  console.log(`  Side Effects: ${hideCommand.metadata.sideEffects.join(', ')}`);
  
  // Demonstrate validation
  const validResult = hideCommand.validate(['.test']);
  console.log(`  Validation ('.test'): ${validResult.isValid ? '✅' : '❌'}`);
  
  const invalidResult = hideCommand.validate(['arg1', 'arg2', 'arg3']);
  console.log(`  Validation (too many args): ${invalidResult.isValid ? '✅' : '❌'}`);
  if (!invalidResult.isValid) {
    console.log(`    Error: ${invalidResult.errors[0]?.message}`);
    console.log(`    Suggestion: ${invalidResult.suggestions[0]}`);
  }
  
  console.log('');
}

function demonstrateRuntime() {
  console.log('⚡ Runtime Demonstration:');
  
  const startTime = performance.now();
  
  // Create minimal runtime
  const runtime = createMinimalRuntime();
  
  // Add commands
  runtime.addCommand(new HideCommand());
  
  const endTime = performance.now();
  
  console.log(`  Runtime created in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`  Commands available: ${runtime.commands.size}`);
  console.log(`  Environment: ${runtime.environment.runtime}`);
  console.log('');
}

function demonstrateTypeScript() {
  console.log('🔷 TypeScript Integration:');
  
  // Show that we have full type information
  const hideCommand = new HideCommand();
  
  console.log('  Type Information Available:');
  console.log(`    - Input Schema: ${hideCommand.inputSchema ? '✅' : '❌'}`);
  console.log(`    - Output Type: ${hideCommand.outputType}`);
  console.log(`    - Metadata: ${Object.keys(hideCommand.metadata).length} properties`);
  console.log(`    - Documentation: ${Object.keys(hideCommand.documentation).length} sections`);
  
  // Show LLM-friendly documentation
  console.log('  LLM Documentation:');
  console.log(`    - Summary: "${hideCommand.documentation.summary}"`);
  console.log(`    - Parameters: ${hideCommand.documentation.parameters.length}`);
  console.log(`    - Examples: ${hideCommand.documentation.examples.length}`);
  console.log(`    - Tags: ${hideCommand.documentation.tags.join(', ')}`);
  
  console.log('');
}

async function demonstrateDOMIntegration() {
  console.log('🌐 DOM Integration (Simulated):');
  
  try {
    // In a real Deno DOM environment (with --allow-dom and jsdom)
    // this would work with actual DOM elements
    
    console.log('  DOM APIs available:');
    console.log(`    - CustomEvent: ${typeof CustomEvent !== 'undefined' ? '✅' : '❌'}`);
    console.log(`    - Event: ${typeof Event !== 'undefined' ? '✅' : '❌'}`);
    
    // We can't test actual DOM without jsdom, but we can show the structure
    console.log('  Example execution flow:');
    console.log('    1. Parse hyperscript: "hide me"');
    console.log('    2. Resolve target: context.me');
    console.log('    3. Execute: element.style.display = "none"');
    console.log('    4. Dispatch: hyperscript:hidden event');
    
  } catch (error) {
    logger.warn('DOM integration requires --allow-dom flag and jsdom setup');
  }
  
  console.log('');
}

function printUsageExamples() {
  console.log('📚 Usage Examples:');
  
  console.log(`
  // Basic command usage
  import { HideCommand } from "jsr:@hyperfixi/core";
  
  const hideCommand = new HideCommand();
  const result = await hideCommand.execute(context, element);
  
  // Runtime with multiple commands
  import { createMinimalRuntime } from "jsr:@hyperfixi/core";
  
  const runtime = createMinimalRuntime()
    .addCommand(new HideCommand())
    .addCommand(new ShowCommand());
  
  // Environment detection
  import { getLLMRuntimeInfo } from "jsr:@hyperfixi/core";
  
  const info = getLLMRuntimeInfo();
  console.log(\`Running on \${info.runtime}\`);
`);
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  printBanner();
  printRuntimeInfo();
  demonstrateCommands();
  demonstrateRuntime();
  demonstrateTypeScript();
  await demonstrateDOMIntegration();
  printUsageExamples();
  
  console.log('✨ HyperFixi Deno integration complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  - Run tests: deno test --allow-dom');
  console.log('  - Compile CLI: deno compile --allow-dom examples/deno-cli.ts');
  console.log('  - Deploy to Deno Deploy: deployctl deploy --project=hyperfixi main.ts');
}

// Run if this is the main module
if (import.meta.main) {
  await main();
}