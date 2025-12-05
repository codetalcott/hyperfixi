#!/usr/bin/env npx tsx
/**
 * Command Documentation Generator
 *
 * Generates markdown documentation from command metadata.
 * Part of the napi-rs-inspired patterns implementation.
 *
 * Usage:
 *   npx tsx scripts/generate-command-docs.ts              # Generate markdown
 *   npx tsx scripts/generate-command-docs.ts --format json  # Generate JSON schema
 *   npx tsx scripts/generate-command-docs.ts --output docs/commands/  # Custom output dir
 *   npx tsx scripts/generate-command-docs.ts --stdout       # Print to stdout
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  COMMAND_CATEGORIES,
  COMMAND_SIDE_EFFECTS,
  getSyntaxArray,
  type CommandCategory,
  type CommandMetadata,
} from '../src/types/command-metadata';

// Import all command classes
import { AddCommand } from '../src/commands/dom/add';
import { RemoveCommand } from '../src/commands/dom/remove';
import { ToggleCommand } from '../src/commands/dom/toggle';
import { ShowCommand } from '../src/commands/dom/show';
import { HideCommand } from '../src/commands/dom/hide';
import { PutCommand } from '../src/commands/dom/put';
import { MakeCommand } from '../src/commands/dom/make';

import { WaitCommand } from '../src/commands/async/wait';
import { FetchCommand } from '../src/commands/async/fetch';

import { TransitionCommand } from '../src/commands/animation/transition';
import { MeasureCommand } from '../src/commands/animation/measure';
import { SettleCommand } from '../src/commands/animation/settle';
import { TakeCommand } from '../src/commands/animation/take';

import { IfCommand } from '../src/commands/control-flow/if';
import { RepeatCommand } from '../src/commands/control-flow/repeat';
import { BreakCommand } from '../src/commands/control-flow/break';
import { ContinueCommand } from '../src/commands/control-flow/continue';
import { ReturnCommand } from '../src/commands/control-flow/return';
import { ExitCommand } from '../src/commands/control-flow/exit';
import { HaltCommand } from '../src/commands/control-flow/halt';
import { ThrowCommand } from '../src/commands/control-flow/throw';
import { UnlessCommand } from '../src/commands/control-flow/unless';

import { SetCommand } from '../src/commands/data/set';
import { GetCommand } from '../src/commands/data/get';
import { IncrementCommand } from '../src/commands/data/increment';
import { DecrementCommand } from '../src/commands/data/decrement';
import { DefaultCommand } from '../src/commands/data/default';
import { PersistCommand } from '../src/commands/data/persist';
import { BindCommand } from '../src/commands/data/bind';

import { TriggerCommand } from '../src/commands/events/trigger';
import { SendCommand } from '../src/commands/events/send';

import { LogCommand } from '../src/commands/utility/log';
import { BeepCommand } from '../src/commands/utility/beep';
import { TellCommand } from '../src/commands/utility/tell';
import { PickCommand } from '../src/commands/utility/pick';
import { CopyCommand } from '../src/commands/utility/copy';

import { CallCommand } from '../src/commands/execution/call';
import { PseudoCommand } from '../src/commands/execution/pseudo-command';

import { JsCommand } from '../src/commands/advanced/js';
import { AsyncCommand } from '../src/commands/advanced/async';

import { GoCommand } from '../src/commands/navigation/go';

import { AppendCommand } from '../src/commands/content/append';
import { RenderCommand } from '../src/commands/templates/render';

import { InstallCommand } from '../src/commands/behaviors/install';

// ============================================================================
// Command Registry
// ============================================================================

interface CommandEntry {
  name: string;
  class: { metadata: CommandMetadata };
}

const COMMANDS: CommandEntry[] = [
  // DOM
  { name: 'add', class: AddCommand },
  { name: 'remove', class: RemoveCommand },
  { name: 'toggle', class: ToggleCommand },
  { name: 'show', class: ShowCommand },
  { name: 'hide', class: HideCommand },
  { name: 'put', class: PutCommand },
  { name: 'make', class: MakeCommand },

  // Async
  { name: 'wait', class: WaitCommand },
  { name: 'fetch', class: FetchCommand },

  // Animation
  { name: 'transition', class: TransitionCommand },
  { name: 'measure', class: MeasureCommand },
  { name: 'settle', class: SettleCommand },
  { name: 'take', class: TakeCommand },

  // Control Flow
  { name: 'if', class: IfCommand },
  { name: 'repeat', class: RepeatCommand },
  { name: 'break', class: BreakCommand },
  { name: 'continue', class: ContinueCommand },
  { name: 'return', class: ReturnCommand },
  { name: 'exit', class: ExitCommand },
  { name: 'halt', class: HaltCommand },
  { name: 'throw', class: ThrowCommand },
  { name: 'unless', class: UnlessCommand },

  // Data
  { name: 'set', class: SetCommand },
  { name: 'get', class: GetCommand },
  { name: 'increment', class: IncrementCommand },
  { name: 'decrement', class: DecrementCommand },
  { name: 'default', class: DefaultCommand },
  { name: 'persist', class: PersistCommand },
  { name: 'bind', class: BindCommand },

  // Events
  { name: 'trigger', class: TriggerCommand },
  { name: 'send', class: SendCommand },

  // Utility
  { name: 'log', class: LogCommand },
  { name: 'beep', class: BeepCommand },
  { name: 'tell', class: TellCommand },
  { name: 'pick', class: PickCommand },
  { name: 'copy', class: CopyCommand },

  // Execution
  { name: 'call', class: CallCommand },
  { name: 'pseudo-command', class: PseudoCommand },

  // Advanced
  { name: 'js', class: JsCommand },
  { name: 'async', class: AsyncCommand },

  // Navigation
  { name: 'go', class: GoCommand },

  // Content
  { name: 'append', class: AppendCommand },
  { name: 'render', class: RenderCommand },

  // Behaviors
  { name: 'install', class: InstallCommand },
];

// ============================================================================
// Category Display Names
// ============================================================================

const CATEGORY_NAMES: Record<CommandCategory, string> = {
  animation: 'Animation',
  async: 'Asynchronous',
  'control-flow': 'Control Flow',
  data: 'Data',
  dom: 'DOM Manipulation',
  content: 'Content',
  navigation: 'Navigation',
  utility: 'Utility',
  advanced: 'Advanced',
  event: 'Events',
  storage: 'Storage',
  execution: 'Execution',
  templates: 'Templates',
  behaviors: 'Behaviors',
};

// ============================================================================
// Markdown Generation
// ============================================================================

function generateMarkdown(commands: CommandEntry[]): string {
  const lines: string[] = [];

  lines.push('# HyperFixi Command Reference');
  lines.push('');
  lines.push('> Auto-generated from command metadata');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Table of contents
  lines.push('## Table of Contents');
  lines.push('');
  for (const category of COMMAND_CATEGORIES) {
    const categoryCommands = commands.filter((c) => c.class.metadata.category === category);
    if (categoryCommands.length === 0) continue;
    lines.push(`- [${CATEGORY_NAMES[category]} Commands](#${category}-commands)`);
  }
  lines.push('');

  // Quick reference table
  lines.push('## Quick Reference');
  lines.push('');
  lines.push('| Command | Category | Description |');
  lines.push('|---------|----------|-------------|');
  for (const cmd of commands.sort((a, b) => a.name.localeCompare(b.name))) {
    const meta = cmd.class.metadata;
    const desc = meta.description.split('.')[0] + '.'; // First sentence
    lines.push(`| \`${cmd.name}\` | ${meta.category} | ${desc} |`);
  }
  lines.push('');

  // Commands by category
  for (const category of COMMAND_CATEGORIES) {
    const categoryCommands = commands.filter((c) => c.class.metadata.category === category);
    if (categoryCommands.length === 0) continue;

    lines.push(`## ${CATEGORY_NAMES[category]} Commands`);
    lines.push('');

    for (const cmd of categoryCommands.sort((a, b) => a.name.localeCompare(b.name))) {
      const meta = cmd.class.metadata;

      lines.push(`### ${cmd.name}`);
      lines.push('');
      lines.push(meta.description);
      lines.push('');

      // Syntax
      lines.push('**Syntax:**');
      lines.push('');
      const syntaxes = getSyntaxArray(meta);
      for (const syntax of syntaxes) {
        lines.push('```hyperscript');
        lines.push(syntax);
        lines.push('```');
      }
      lines.push('');

      // Examples
      if (meta.examples.length > 0) {
        lines.push('**Examples:**');
        lines.push('');
        for (const example of meta.examples) {
          lines.push('```hyperscript');
          lines.push(example);
          lines.push('```');
        }
        lines.push('');
      }

      // Side effects
      if (meta.sideEffects && meta.sideEffects.length > 0) {
        lines.push(`**Side Effects:** ${meta.sideEffects.join(', ')}`);
        lines.push('');
      }

      // Related commands
      if (meta.relatedCommands && meta.relatedCommands.length > 0) {
        lines.push(`**See Also:** ${meta.relatedCommands.join(', ')}`);
        lines.push('');
      }

      // Deprecation warning
      if (meta.deprecated) {
        lines.push(`> **DEPRECATED:** ${meta.deprecationMessage || 'This command is deprecated.'}`);
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  // Side effects reference
  lines.push('## Side Effects Reference');
  lines.push('');
  lines.push('Commands may produce the following side effects:');
  lines.push('');
  lines.push('| Effect | Description |');
  lines.push('|--------|-------------|');
  for (const effect of COMMAND_SIDE_EFFECTS) {
    lines.push(`| \`${effect}\` | ${getSideEffectDescription(effect)} |`);
  }
  lines.push('');

  return lines.join('\n');
}

function getSideEffectDescription(effect: string): string {
  const descriptions: Record<string, string> = {
    'dom-mutation': 'Modifies DOM elements (add/remove classes, attributes, etc.)',
    'dom-query': 'Queries or selects DOM elements',
    'dom-creation': 'Creates new DOM elements',
    'dom-observation': 'Observes DOM changes (MutationObserver)',
    'element-modification': 'Modifies element properties',
    'context-modification': 'Modifies execution context variables',
    'context-switching': 'Changes the current context (me, you, it)',
    'context-mutation': 'Mutates context state',
    'state-mutation': 'Mutates application state',
    'conditional-execution': 'Conditionally executes code branches',
    iteration: 'Iterates over collections or repeats actions',
    'control-flow': 'Affects control flow (break, continue, return)',
    'execution-termination': 'Terminates script execution',
    time: 'Delays or schedules execution',
    'event-listening': 'Adds event listeners',
    'event-dispatch': 'Dispatches events',
    'event-dispatching': 'Dispatches custom events',
    'event-prevention': 'Prevents default event behavior',
    'event-listeners': 'Manages event listeners',
    'custom-events': 'Creates custom events',
    'command-execution': 'Executes other commands',
    'code-execution': 'Executes arbitrary code',
    'function-execution': 'Executes functions',
    'method-execution': 'Executes object methods',
    'async-execution': 'Executes asynchronously',
    'data-mutation': 'Mutates data structures',
    'data-binding': 'Creates data bindings',
    'property-transfer': 'Transfers properties between elements',
    network: 'Makes network requests',
    storage: 'Accesses browser storage',
    navigation: 'Navigates to URLs',
    clipboard: 'Accesses clipboard',
    'clipboard-write': 'Writes to clipboard',
    console: 'Writes to console',
    'console-output': 'Outputs to console',
    animation: 'Creates animations or transitions',
    focus: 'Changes element focus',
    scroll: 'Scrolls elements or viewport',
    'template-execution': 'Executes template logic',
    'behavior-installation': 'Installs behaviors on elements',
    'random-selection': 'Makes random selections',
    debugging: 'Assists with debugging',
    'error-throwing': 'Throws errors',
  };
  return descriptions[effect] || 'No description available';
}

// ============================================================================
// JSON Generation
// ============================================================================

function generateJSON(commands: CommandEntry[]): string {
  const output = {
    $schema: 'https://hyperfixi.dev/schemas/commands.json',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    categories: COMMAND_CATEGORIES,
    sideEffects: COMMAND_SIDE_EFFECTS,
    commands: Object.fromEntries(
      commands.map((cmd) => [
        cmd.name,
        {
          ...cmd.class.metadata,
          syntax: getSyntaxArray(cmd.class.metadata),
        },
      ])
    ),
  };
  return JSON.stringify(output, null, 2);
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2);
const format = args.includes('--format')
  ? args[args.indexOf('--format') + 1]
  : 'markdown';
const outputDir = args.includes('--output')
  ? args[args.indexOf('--output') + 1]
  : 'docs/commands';
const toStdout = args.includes('--stdout');

// Generate content
let content: string;
let filename: string;

if (format === 'json') {
  content = generateJSON(COMMANDS);
  filename = 'commands.json';
} else {
  content = generateMarkdown(COMMANDS);
  filename = 'REFERENCE.md';
}

// Output
if (toStdout) {
  console.log(content);
} else {
  const outputPath = path.join(process.cwd(), outputDir);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  const filePath = path.join(outputPath, filename);
  fs.writeFileSync(filePath, content);
  console.log(`✓ Generated ${filePath}`);
  console.log(`  Format: ${format}`);
  console.log(`  Commands: ${COMMANDS.length}`);
  console.log(`  Categories: ${new Set(COMMANDS.map((c) => c.class.metadata.category)).size}`);
}
