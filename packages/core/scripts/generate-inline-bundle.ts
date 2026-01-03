#!/usr/bin/env npx tsx
/**
 * Inline Bundle Generator CLI
 *
 * Generates minimal inline bundles by including only specified commands.
 * Uses code generation instead of tree-shaking for optimal bundle size.
 *
 * Usage:
 *   npx tsx scripts/generate-inline-bundle.ts --config my-bundle.config.json
 *   npx tsx scripts/generate-inline-bundle.ts --commands toggle,add,remove --output dist/my-bundle.ts
 *
 * Config file format:
 *   {
 *     "name": "my-bundle",
 *     "commands": ["toggle", "add", "remove", "show", "hide"],
 *     "blocks": ["if", "repeat"],
 *     "output": "dist/my-bundle.ts",
 *     "htmxIntegration": true,
 *     "positionalExpressions": true
 *   }
 */

import * as fs from 'fs';
import * as path from 'path';

// Import from the reusable bundle-generator module
import {
  generateBundle,
  getAvailableCommands,
  getAvailableBlocks,
  type GeneratorOptions,
} from '../src/bundle-generator';

// =============================================================================
// CLI UTILITIES
// =============================================================================

function computeImportPath(outputPath: string): string {
  // Compute relative path from output file to parser/hybrid/
  const outputDir = path.dirname(outputPath);
  const parserDir = 'src/parser/hybrid';

  // Normalize paths
  const normalizedOutput = path.normalize(outputDir);
  const normalizedParser = path.normalize(parserDir);

  // Compute relative path
  let relativePath = path.relative(normalizedOutput, normalizedParser);

  // Ensure it starts with . for relative imports
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  // Convert Windows backslashes to forward slashes
  relativePath = relativePath.replace(/\\/g, '/');

  return relativePath;
}

// =============================================================================
// CLI
// =============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Inline Bundle Generator v2

Usage:
  npx tsx scripts/generate-inline-bundle.ts --config <config.json>
  npx tsx scripts/generate-inline-bundle.ts --commands <cmd1,cmd2,...> --output <file.ts>

Options:
  --config <file>       JSON config file
  --commands <list>     Comma-separated list of commands
  --blocks <list>       Comma-separated list of blocks (if, repeat, for, while, fetch)
  --output <file>       Output file path (relative paths supported)
  --name <name>         Bundle name (default: "Custom")
  --htmx                Enable HTMX integration
  --global <name>       Global variable name (default: "hyperfixi")
  --positional          Include positional expressions (first, last, next, closest, parent)
  --strict              Fail on unknown commands or blocks (validation mode)
  --max-iterations <n>  Maximum loop iterations for blocks (default: 1000)

Available commands:
  ${getAvailableCommands().join(', ')}

Available blocks:
  ${getAvailableBlocks().join(', ')}

Examples:
  # Generate to any path (import paths auto-computed)
  npx tsx scripts/generate-inline-bundle.ts --commands toggle,add --output dist/my-bundle.ts

  # With blocks and positional expressions
  npx tsx scripts/generate-inline-bundle.ts --commands toggle,set --blocks if,repeat --positional --output src/custom.ts

  # From config file
  npx tsx scripts/generate-inline-bundle.ts --config bundle-configs/textshelf.config.json
`);
    process.exit(0);
  }

  let config: GeneratorOptions & { output: string };

  const configIndex = args.indexOf('--config');
  if (configIndex !== -1) {
    const configPath = args[configIndex + 1];
    const configContent = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configContent);
  } else {
    const commandsIndex = args.indexOf('--commands');
    const blocksIndex = args.indexOf('--blocks');
    const outputIndex = args.indexOf('--output');
    const nameIndex = args.indexOf('--name');
    const globalIndex = args.indexOf('--global');
    const maxIterationsIndex = args.indexOf('--max-iterations');

    if (commandsIndex === -1 || outputIndex === -1) {
      console.error('Error: Either --config or both --commands and --output are required');
      process.exit(1);
    }

    config = {
      name: nameIndex !== -1 ? args[nameIndex + 1] : 'Custom',
      commands: args[commandsIndex + 1].split(','),
      blocks: blocksIndex !== -1 ? args[blocksIndex + 1].split(',') : [],
      output: args[outputIndex + 1],
      htmxIntegration: args.includes('--htmx'),
      globalName: globalIndex !== -1 ? args[globalIndex + 1] : 'hyperfixi',
      positionalExpressions: args.includes('--positional'),
      maxLoopIterations: maxIterationsIndex !== -1 ? parseInt(args[maxIterationsIndex + 1], 10) : undefined,
    };
  }

  // Add CLI-level strict mode (can also be in config file)
  const strict = args.includes('--strict');
  if (strict) {
    config.validation = { ...config.validation, strict: true };
  }

  // Compute import path based on output location
  const parserImportPath = computeImportPath(config.output);

  // Generate bundle using the module (with validation)
  try {
    const result = generateBundle({
      ...config,
      parserImportPath,
    });

    // Show warnings (even when not in strict mode)
    if (result.warnings.length > 0) {
      console.warn('Warnings:');
      for (const warning of result.warnings) {
        console.warn(`  - ${warning}`);
      }
    }

    const outputPath = path.resolve(process.cwd(), config.output);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result.code);

    console.log(`Generated: ${outputPath}`);
    console.log(`Commands: ${result.commands.join(', ')}`);
    if (result.blocks.length > 0) {
      console.log(`Blocks: ${result.blocks.join(', ')}`);
    }
    if (result.positional) {
      console.log(`Positional expressions: enabled`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

main();
