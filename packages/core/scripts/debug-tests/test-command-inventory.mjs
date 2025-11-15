#!/usr/bin/env node
/**
 * Command System Inventory - Session 28
 * Compare official _hyperscript commands with HyperFixi implementations
 */

import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

console.log('📋 Command System Inventory - Session 28\n');

// Official _hyperscript command tests
const officialCommands = [
  'add',
  'append',
  'async',
  'call',
  'default',
  'fetch',
  'hide',
  'if',
  'increment',
  'js',
  'log',
  'make',
  'measure',
  'pick',
  'pseudoCommand',
  'put',
  'remove',
  'repeat',
  'send',
  'set',
  'settle',
  'show',
  'take',
  'tell',
  'throw',
  'toggle',
  'transition',
  'trigger',
  'unlessModifier'
];

// HyperFixi command base path
const hyperFixiCommandsBase = '/Users/williamtalcott/projects/hyperfixi/packages/core/src/commands';

// Search for command implementations
const commandCategories = readdirSync(hyperFixiCommandsBase, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log('🔍 Searching for command implementations...\n');

const inventory = [];

for (const cmd of officialCommands) {
  const result = {
    command: cmd,
    official: true,
    hyperFixi: false,
    path: null,
    category: null
  };

  // Search in each category
  for (const category of commandCategories) {
    const categoryPath = join(hyperFixiCommandsBase, category);
    const possiblePaths = [
      join(categoryPath, `${cmd}.ts`),
      join(categoryPath, `simple-${cmd}.ts`),
      join(categoryPath, `${cmd}-command.ts`)
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        result.hyperFixi = true;
        result.path = path;
        result.category = category;
        break;
      }
    }

    if (result.hyperFixi) break;
  }

  // Special cases
  if (cmd === 'unlessModifier') {
    const unlessPath = join(hyperFixiCommandsBase, 'control-flow/unless.ts');
    if (existsSync(unlessPath)) {
      result.hyperFixi = true;
      result.path = unlessPath;
      result.category = 'control-flow';
    }
  }

  inventory.push(result);
}

// Print results
console.log('='.repeat(70));
console.log('📊 COMMAND IMPLEMENTATION STATUS');
console.log('='.repeat(70) + '\n');

const implemented = inventory.filter(item => item.hyperFixi);
const notImplemented = inventory.filter(item => !item.hyperFixi);

console.log(`✅ Implemented: ${implemented.length}/${inventory.length} commands\n`);

// Group by category
const byCategory = {};
implemented.forEach(item => {
  if (!byCategory[item.category]) {
    byCategory[item.category] = [];
  }
  byCategory[item.category].push(item.command);
});

console.log('By Category:');
for (const [category, commands] of Object.entries(byCategory).sort()) {
  console.log(`  ${category}: ${commands.sort().join(', ')}`);
}

console.log();

if (notImplemented.length > 0) {
  console.log(`❌ Not Implemented (${notImplemented.length} commands):`);
  notImplemented.forEach(item => {
    console.log(`  • ${item.command}`);
  });
  console.log();
}

// Summary statistics
const coverage = ((implemented.length / inventory.length) * 100).toFixed(1);
console.log('='.repeat(70));
console.log(`Coverage: ${implemented.length}/${inventory.length} (${coverage}%)`);
console.log('='.repeat(70) + '\n');

// Additional HyperFixi commands not in official tests
console.log('🔍 Checking for additional HyperFixi commands...\n');

const allHyperFixiCommands = [];
for (const category of commandCategories) {
  const categoryPath = join(hyperFixiCommandsBase, category);
  try {
    const files = readdirSync(categoryPath)
      .filter(f => f.endsWith('.ts') && !f.includes('test') && !f.includes('types') && !f.includes('registry'));

    files.forEach(f => {
      const cmdName = f.replace('.ts', '').replace('simple-', '').replace('-command', '');
      allHyperFixiCommands.push({ name: cmdName, category, file: f });
    });
  } catch (e) {
    // Skip if not a directory
  }
}

const additionalCommands = allHyperFixiCommands.filter(hf =>
  !officialCommands.includes(hf.name) &&
  !hf.file.includes('executor') &&
  !hf.file.includes('unified') &&
  !hf.file.includes('profiler')
);

if (additionalCommands.length > 0) {
  console.log(`✨ Additional HyperFixi Commands (${additionalCommands.length}):`);
  const additionalByCategory = {};
  additionalCommands.forEach(cmd => {
    if (!additionalByCategory[cmd.category]) {
      additionalByCategory[cmd.category] = [];
    }
    additionalByCategory[cmd.category].push(cmd.name);
  });

  for (const [category, commands] of Object.entries(additionalByCategory).sort()) {
    console.log(`  ${category}: ${[...new Set(commands)].sort().join(', ')}`);
  }
  console.log();
}

// Export summary
const summary = {
  official: inventory.length,
  implemented: implemented.length,
  notImplemented: notImplemented.length,
  coverage: parseFloat(coverage),
  additional: additionalCommands.length,
  byCategory,
  missing: notImplemented.map(i => i.command)
};

console.log('Summary saved to memory for Session 28 documentation\n');

process.exit(0);
