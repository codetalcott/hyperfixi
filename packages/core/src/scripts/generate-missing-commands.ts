/**
 * Generate missing commands from LSP data
 * Practical script to accelerate development
 */

import { CodeGenerator } from './code-generator';
import { existsSync } from 'fs';
import { join } from 'path';

// Critical missing commands we want to implement first
const PRIORITY_COMMANDS = [
  'put', // Content insertion - CRITICAL
  'set', // Variable assignment - CRITICAL
  'if', // Conditional execution - CRITICAL
  'repeat', // Loops and iteration - CRITICAL
  'call', // Function execution - HIGH
  'append', // Content addition - HIGH
  'make', // Element creation - HIGH
  'send', // Event dispatching - HIGH
];

function getCurrentlyImplemented(): string[] {
  // Check what's already implemented by looking for existing command files
  const commandDirs = [
    'src/commands/dom',
    'src/commands/async',
    'src/commands/data',
    'src/commands/control-flow',
    'src/commands/advanced',
  ];

  commandDirs.forEach(dir => {
    const fullPath = join(process.cwd(), dir);
    if (existsSync(fullPath)) {
      // Would scan for .ts files, but for now use known list
    }
  });

  // Known implemented commands
  return ['hide', 'show', 'toggle', 'add', 'remove', 'fetch'];
}

function generatePriorityCommands(): void {
  console.log('🎯 Generating priority commands with LSP data...');

  const generator = new CodeGenerator();
  const { commands } = generator.loadLSPData();
  const implemented = getCurrentlyImplemented();

  // Filter to priority commands that aren't implemented
  const toGenerate = commands.filter(
    cmd => PRIORITY_COMMANDS.includes(cmd.name) && !implemented.includes(cmd.name)
  );

  console.log(`📋 Found ${toGenerate.length} priority commands to generate:`);
  toGenerate.forEach(cmd => {
    console.log(`   - ${cmd.name}: ${cmd.syntax_canonical}`);
  });

  if (toGenerate.length === 0) {
    console.log('✅ All priority commands already implemented!');
    return;
  }

  // Generate each command
  toGenerate.forEach(commandData => {
    try {
      const implementation = generator.generateCommandInterface(commandData);
      const test = generator.generateCommandTest(commandData);

      console.log(`\n🚀 Generating ${commandData.name} command...`);
      console.log(`   Implementation: ${implementation.filePath}`);
      console.log(`   Tests: ${test.filePath}`);
      console.log(`   Examples: ${commandData.example_usage?.length || 0}`);

      // In a real implementation, we would write the files here
      // For now, let's just show what would be generated
      console.log(`\n📝 Generated interface preview:`);
      console.log(implementation.code.substring(0, 200) + '...');
    } catch (error) {
      console.error(`❌ Error generating ${commandData.name}:`, error);
    }
  });

  console.log('\n✅ Code generation completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Review generated code');
  console.log('2. Implement actual command logic');
  console.log('3. Write proper test cases');
  console.log('4. Run TDD cycle for each command');
}

function analyzeImplementationGap(): void {
  console.log('🔍 Analyzing implementation gap...');

  const generator = new CodeGenerator();
  const { commands, features } = generator.loadLSPData();
  const implemented = getCurrentlyImplemented();

  console.log(`\n📊 Current Status:`);
  console.log(`   Implemented Commands: ${implemented.length}`);
  console.log(`   Total Commands: ${commands.length}`);
  console.log(
    `   Implementation Rate: ${Math.round((implemented.length / commands.length) * 100)}%`
  );

  const missing = commands.filter(cmd => !implemented.includes(cmd.name));
  const priorityMissing = missing.filter(cmd => PRIORITY_COMMANDS.includes(cmd.name));

  console.log(`\n🔴 Missing Commands (${missing.length}):`);
  console.log(`   Priority Missing: ${priorityMissing.length}`);
  console.log(`   Regular Missing: ${missing.length - priorityMissing.length}`);

  console.log(`\n🎯 Priority Commands Status:`);
  PRIORITY_COMMANDS.forEach(cmd => {
    const status = implemented.includes(cmd) ? '✅' : '❌';
    const data = commands.find(c => c.name === cmd);
    console.log(`   ${status} ${cmd}: ${data?.syntax_canonical || 'Not found in LSP data'}`);
  });

  console.log(`\n📋 Features Status:`);
  console.log(`   Total Features: ${features.length}`);
  features.forEach(feature => {
    const status = feature.name === 'on' ? '✅' : '❌';
    console.log(`   ${status} ${feature.name}: ${feature.syntax_canonical}`);
  });
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'analyze':
      analyzeImplementationGap();
      break;
    case 'generate':
      generatePriorityCommands();
      break;
    default:
      console.log('Usage:');
      console.log('  node generate-missing-commands.js analyze  - Show implementation gaps');
      console.log('  node generate-missing-commands.js generate - Generate priority commands');
  }
}

export { generatePriorityCommands, analyzeImplementationGap };
