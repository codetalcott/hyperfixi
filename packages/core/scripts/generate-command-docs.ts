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
import * as prettier from 'prettier';
import {
  COMMAND_CATEGORIES,
  COMMAND_SIDE_EFFECTS,
  getSyntaxArray,
  type CommandCategory,
  type CommandMetadata,
} from '../src/types/command-metadata';

// Import every command class, in registry order.
//
// The list is COMPLETE by gate, not by care: `docs-coverage.test.ts` asserts
// the table below names exactly `COMMAND_NAMES`, both directions. Before Arc B
// step 4b it held 43 of 59 and nothing compared it to anything, so sixteen
// shipped commands were simply undocumented.
import { AddCommand } from '../src/commands/dom/add';
import { AppendCommand } from '../src/commands/content/append';
import { AsyncCommand } from '../src/commands/advanced/async';
import { BeepCommand } from '../src/commands/utility/beep';
import { BlurCommand } from '../src/commands/execution/blur';
import { BreakCommand } from '../src/commands/control-flow/break';
import { BreakpointCommand } from '../src/commands/utility/breakpoint';
import { CallCommand } from '../src/commands/execution/call';
import { ClearCommand } from '../src/commands/data/clear';
import { CloseCommand } from '../src/commands/dom/close';
import { ContinueCommand } from '../src/commands/control-flow/continue';
import { CopyCommand } from '../src/commands/utility/copy';
import { NumericModifyCommand } from '../src/commands/data/increment';
import { DefaultCommand } from '../src/commands/data/default';
import { EmptyCommand } from '../src/commands/dom/empty';
import { ExitCommand } from '../src/commands/control-flow/exit';
import { FetchCommand } from '../src/commands/async/fetch';
import { FocusCommand } from '../src/commands/execution/focus';
import { GetCommand } from '../src/commands/data/get';
import { GoCommand } from '../src/commands/navigation/go';
import { HaltCommand } from '../src/commands/control-flow/halt';
import { HideCommand } from '../src/commands/dom/hide';
import { ConditionalCommand } from '../src/commands/control-flow/if';
import { InstallCommand } from '../src/commands/behaviors/install';
import { JsCommand } from '../src/commands/advanced/js';
import { LogCommand } from '../src/commands/utility/log';
import { MakeCommand } from '../src/commands/dom/make';
import { MeasureCommand } from '../src/commands/animation/measure';
import { MorphCommand } from '../src/commands/dom/swap';
import { OpenCommand } from '../src/commands/dom/open';
import { PickCommand } from '../src/commands/utility/pick';
import { PrependCommand } from '../src/commands/content/prepend';
import { ProcessPartialsCommand } from '../src/commands/dom/process-partials';
import { PseudoCommand } from '../src/commands/execution/pseudo-command';
import { HistoryCommand } from '../src/commands/navigation/push-url';
import { PutCommand } from '../src/commands/dom/put';
import { RemoveCommand } from '../src/commands/dom/remove';
import { RenderCommand } from '../src/commands/templates/render';
import { RepeatCommand } from '../src/commands/control-flow/repeat';
import { ResetCommand } from '../src/commands/dom/reset';
import { ReturnCommand } from '../src/commands/control-flow/return';
import { ScrollCommand } from '../src/commands/navigation/scroll-to';
import { SelectCommand } from '../src/commands/dom/select';
import { EventDispatchCommand } from '../src/commands/events/trigger';
import { SetCommand } from '../src/commands/data/set';
import { SettleCommand } from '../src/commands/animation/settle';
import { ShowCommand } from '../src/commands/dom/show';
import { StartViewTransitionCommand } from '../src/commands/animation/start-view-transition';
import { SwapCommand } from '../src/commands/dom/swap';
import { TakeCommand } from '../src/commands/animation/take';
import { TellCommand } from '../src/commands/utility/tell';
import { ThrowCommand } from '../src/commands/control-flow/throw';
import { ToggleCommand } from '../src/commands/dom/toggle';
import { TransitionCommand } from '../src/commands/animation/transition';
import { WaitCommand } from '../src/commands/async/wait';

// ============================================================================
// Command Registry
// ============================================================================

/**
 * A command class carrying its metadata as a type-visible static.
 *
 * Arc B step 3 replaced `@meta`'s runtime `Object.defineProperty` with
 * `static readonly metadata = commandMeta({...})`, so TypeScript now SEES the
 * static and this table can simply require it. Before that it could not: a class
 * decorator returning the original class cannot widen its type, so every read was
 * `TS2339` and a runtime `metadataOf()` assertion stood in for the type — which is
 * also why script typechecking stayed off for six months. Both are gone.
 *
 * `metadata.category` is the class's own declared category; there is no second
 * copy on `@command` to disagree with it any more.
 */
type CommandClass = (abstract new (...args: never[]) => object) & {
  readonly metadata: CommandMetadata;
};

interface CommandEntry {
  name: string;
  class: CommandClass;
}

const COMMANDS: CommandEntry[] = [
  { name: 'add', class: AddCommand },
  { name: 'append', class: AppendCommand },
  { name: 'async', class: AsyncCommand },
  { name: 'beep', class: BeepCommand },
  { name: 'blur', class: BlurCommand },
  { name: 'break', class: BreakCommand },
  { name: 'breakpoint', class: BreakpointCommand },
  { name: 'call', class: CallCommand },
  { name: 'clear', class: ClearCommand },
  { name: 'close', class: CloseCommand },
  { name: 'continue', class: ContinueCommand },
  { name: 'copy', class: CopyCommand },
  { name: 'decrement', class: NumericModifyCommand },
  { name: 'default', class: DefaultCommand },
  { name: 'empty', class: EmptyCommand },
  { name: 'exit', class: ExitCommand },
  { name: 'fetch', class: FetchCommand },
  { name: 'focus', class: FocusCommand },
  { name: 'get', class: GetCommand },
  { name: 'go', class: GoCommand },
  { name: 'halt', class: HaltCommand },
  { name: 'hide', class: HideCommand },
  { name: 'if', class: ConditionalCommand },
  { name: 'increment', class: NumericModifyCommand },
  { name: 'install', class: InstallCommand },
  { name: 'js', class: JsCommand },
  { name: 'log', class: LogCommand },
  { name: 'make', class: MakeCommand },
  { name: 'measure', class: MeasureCommand },
  { name: 'morph', class: MorphCommand },
  { name: 'open', class: OpenCommand },
  { name: 'pick', class: PickCommand },
  { name: 'prepend', class: PrependCommand },
  { name: 'process', class: ProcessPartialsCommand },
  { name: 'pseudo-command', class: PseudoCommand },
  { name: 'push', class: HistoryCommand },
  { name: 'put', class: PutCommand },
  { name: 'remove', class: RemoveCommand },
  { name: 'render', class: RenderCommand },
  { name: 'repeat', class: RepeatCommand },
  { name: 'replace', class: HistoryCommand },
  { name: 'reset', class: ResetCommand },
  { name: 'return', class: ReturnCommand },
  { name: 'scroll', class: ScrollCommand },
  { name: 'select', class: SelectCommand },
  { name: 'send', class: EventDispatchCommand },
  { name: 'set', class: SetCommand },
  { name: 'settle', class: SettleCommand },
  { name: 'show', class: ShowCommand },
  { name: 'start', class: StartViewTransitionCommand },
  { name: 'swap', class: SwapCommand },
  { name: 'take', class: TakeCommand },
  { name: 'tell', class: TellCommand },
  { name: 'throw', class: ThrowCommand },
  { name: 'toggle', class: ToggleCommand },
  { name: 'transition', class: TransitionCommand },
  { name: 'trigger', class: EventDispatchCommand },
  { name: 'unless', class: ConditionalCommand },
  { name: 'wait', class: WaitCommand },
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
  lines.push('> Auto-generated from command metadata by `npm run docs:commands`.');
  lines.push('> Do not edit by hand — `npm run docs:commands:check` fails on drift.');
  lines.push('');

  // Table of contents
  lines.push('## Table of Contents');
  lines.push('');
  for (const category of COMMAND_CATEGORIES) {
    const categoryCommands = commands.filter(c => c.class.metadata.category === category);
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
    const categoryCommands = commands.filter(c => c.class.metadata.category === category);
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
    categories: COMMAND_CATEGORIES,
    sideEffects: COMMAND_SIDE_EFFECTS,
    commands: Object.fromEntries(
      commands.map(cmd => [
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
const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'markdown';
const outputDir = args.includes('--output') ? args[args.indexOf('--output') + 1] : 'docs/commands';
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

// Run the emitted text through prettier with the repo's own config.
//
// Without this the generator is NOT idempotent: it emits unpadded markdown
// tables, the pre-commit hook pads them, and the next run un-pads them again —
// which produced a 252-line diff of pure column padding with identical content
// (Arc B step 4a). A `--check` gate over a non-idempotent generator is unusable,
// so this is a prerequisite for the gate below, not a tidiness pass.
content = await prettier.format(content, {
  ...(await prettier.resolveConfig(path.join(process.cwd(), filename))),
  filepath: filename,
});

// `--check`: fail if the committed artifact differs from what we would write.
// Deterministic by construction — the generator emits no timestamp, precisely
// so that this comparison means "the content drifted" and nothing else.
if (args.includes('--check')) {
  const filePath = path.join(process.cwd(), outputDir, filename);
  const onDisk = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (onDisk !== content) {
    console.error(`\u2717 ${filename} is out of date. Run: npm run docs:commands`);
    if (!onDisk) console.error('  (the file does not exist)');
    process.exit(1);
  }
  console.log(`\u2713 ${filename} is up to date (${COMMANDS.length} commands)`);
  process.exit(0);
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
  console.log(`  Categories: ${new Set(COMMANDS.map(c => c.class.metadata.category)).size}`);
}
