#!/usr/bin/env node
/**
 * CLI utility for validating enhanced command pattern compliance
 * Usage: deno run --allow-read src/validation/validate-cli.ts [command-name]
 */

import {
  CommandPatternValidator,
  CommandSuiteValidator,
  ValidationReporter,
} from './command-pattern-validator';

// Import all commands for validation
import { HideCommand, createHideCommand } from '../commands/dom/hide';
import { ShowCommand, createShowCommand } from '../commands/dom/show';
import { ToggleCommand, createToggleCommand } from '../commands/dom/toggle';
import { AddCommand, createAddCommand } from '../commands/dom/add';
import { RemoveCommand, createRemoveCommand } from '../commands/dom/remove';

// Command registry for validation
const COMMAND_REGISTRY = [
  {
    name: 'HideCommand',
    filePath: './src/commands/dom/hide.ts',
    CommandClass: HideCommand,
    factoryFunction: createHideCommand,
    category: 'dom',
  },
  {
    name: 'ShowCommand',
    filePath: './src/commands/dom/show.ts',
    CommandClass: ShowCommand,
    factoryFunction: createShowCommand,
    category: 'dom',
  },
  {
    name: 'ToggleCommand',
    filePath: './src/commands/dom/toggle.ts',
    CommandClass: ToggleCommand,
    factoryFunction: createToggleCommand,
    category: 'dom',
  },
  {
    name: 'AddCommand',
    filePath: './src/commands/dom/add.ts',
    CommandClass: AddCommand,
    factoryFunction: createAddCommand,
    category: 'dom',
  },
  {
    name: 'RemoveCommand',
    filePath: './src/commands/dom/remove.ts',
    CommandClass: RemoveCommand,
    factoryFunction: createRemoveCommand,
    category: 'dom',
  },
];

/**
 * Validate a specific command by name
 */
async function validateSingleCommand(commandName: string): Promise<void> {
  const command = COMMAND_REGISTRY.find(
    cmd =>
      cmd.name.toLowerCase() === commandName.toLowerCase() ||
      cmd.name.toLowerCase().replace('command', '') === commandName.toLowerCase()
  );

  if (!command) {
    console.error(`❌ Command "${commandName}" not found in registry`);
    console.log('Available commands:', COMMAND_REGISTRY.map(c => c.name).join(', '));
    return;
  }

  console.log(`🔍 Validating ${command.name}...`);

  let sourceCode: string | undefined;
  try {
    const fs = await import('fs');
    sourceCode = fs.readFileSync(command.filePath, 'utf-8');
  } catch (error) {
    console.warn(`⚠️  Could not read source code: ${error}`);
  }

  const result = CommandPatternValidator.validateCommand(
    command.CommandClass,
    command.factoryFunction,
    sourceCode
  );

  const analysis = {
    commandName: command.name,
    filePath: command.filePath,
    validation: result,
    recommendations: result.suggestions.slice(0, 3),
  };

  ValidationReporter.printCommandValidation(analysis);

  if (!result.isEnhanced) {
    console.log(`\n⚠️  ${command.name} needs enhancement work!`);
    process.exit(1);
  } else {
    console.log(`\n✅ ${command.name} meets enhanced pattern standards!`);
  }
}

/**
 * Validate all commands in a category or all commands
 */
async function validateCommandSuite(category?: string): Promise<void> {
  let commandsToValidate = COMMAND_REGISTRY;

  if (category) {
    commandsToValidate = COMMAND_REGISTRY.filter(cmd => cmd.category === category);
    if (commandsToValidate.length === 0) {
      console.error(`❌ No commands found in category "${category}"`);
      console.log(
        'Available categories:',
        [...new Set(COMMAND_REGISTRY.map(c => c.category))].join(', ')
      );
      return;
    }
    console.log(`🔍 Validating ${category} commands...`);
  } else {
    console.log('🔍 Validating all commands...');
  }

  const suiteResult = await CommandSuiteValidator.validateCommandSuite(commandsToValidate);

  ValidationReporter.printSuiteValidation(suiteResult);

  // Show individual command details if any need work
  const needsWork = suiteResult.commands.filter(cmd => !cmd.validation.isEnhanced);
  if (needsWork.length > 0) {
    console.log('\n⚠️  Commands that need enhancement:');
    needsWork.forEach(cmd => {
      console.log(`\n📋 ${cmd.commandName}:`);
      console.log(`   Score: ${cmd.validation.score}/100`);
      console.log(`   Top Issues: ${cmd.validation.failed.slice(0, 2).join(', ')}`);
      console.log(`   Priority: ${cmd.recommendations[0] || 'See full analysis'}`);
    });

    process.exit(1);
  } else {
    console.log('\n🎉 All commands meet enhanced pattern standards!');
  }
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
🏗️  HyperFixi Command Pattern Validator

Usage:
  deno run --allow-read src/validation/validate-cli.ts [options]

Options:
  <command-name>     Validate a specific command (e.g., "hide", "HideCommand")
  --category <cat>   Validate all commands in a category (e.g., "dom")
  --all             Validate all commands (default)
  --help            Show this help message

Examples:
  deno run --allow-read src/validation/validate-cli.ts hide
  deno run --allow-read src/validation/validate-cli.ts --category dom
  deno run --allow-read src/validation/validate-cli.ts --all

Categories:
  ${[...new Set(COMMAND_REGISTRY.map(c => c.category))].join(', ')}

Available Commands:
  ${COMMAND_REGISTRY.map(c => c.name.replace('Command', '')).join(', ')}
`);
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--all')) {
    await validateCommandSuite();
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--category')) {
    const categoryIndex = args.indexOf('--category');
    const category = args[categoryIndex + 1];
    if (!category) {
      console.error('❌ --category requires a category name');
      showHelp();
      return;
    }
    await validateCommandSuite(category);
    return;
  }

  // Assume first argument is a command name
  const commandName = args[0];
  await validateSingleCommand(commandName);
}

// Run CLI when invoked directly
// Supports both ESM (import.meta.url) and CJS (require.main) contexts
const isMainModule =
  typeof require !== 'undefined' && typeof module !== 'undefined'
    ? require.main === module
    : import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMainModule) {
  main().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

// Export for testing
export { validateSingleCommand, validateCommandSuite, COMMAND_REGISTRY };
