#!/usr/bin/env npx tsx
/**
 * Command Metadata Audit Script
 *
 * Validates all command metadata against the standardized schema.
 * Reports errors, warnings, and generates summary statistics.
 *
 * Usage:
 *   npx tsx scripts/audit-command-metadata.ts
 *   npx tsx scripts/audit-command-metadata.ts --fix  # Show suggested fixes
 *   npx tsx scripts/audit-command-metadata.ts --json # Output as JSON
 */

import {
  validateCommandMetadata,
  normalizeCategory,
  COMMAND_CATEGORIES,
  type MetadataValidationResult,
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
import { PrependCommand } from '../src/commands/content/prepend';
import { RenderCommand } from '../src/commands/templates/render';

import { InstallCommand } from '../src/commands/behaviors/install';

// ============================================================================
// Command Registry
// ============================================================================

interface CommandEntry {
  name: string;
  class: any;
  file: string;
}

const COMMANDS: CommandEntry[] = [
  // DOM
  { name: 'add', class: AddCommand, file: 'dom/add.ts' },
  { name: 'remove', class: RemoveCommand, file: 'dom/remove.ts' },
  { name: 'toggle', class: ToggleCommand, file: 'dom/toggle.ts' },
  { name: 'show', class: ShowCommand, file: 'dom/show.ts' },
  { name: 'hide', class: HideCommand, file: 'dom/hide.ts' },
  { name: 'put', class: PutCommand, file: 'dom/put.ts' },
  { name: 'make', class: MakeCommand, file: 'dom/make.ts' },

  // Async
  { name: 'wait', class: WaitCommand, file: 'async/wait.ts' },
  { name: 'fetch', class: FetchCommand, file: 'async/fetch.ts' },

  // Animation
  { name: 'transition', class: TransitionCommand, file: 'animation/transition.ts' },
  { name: 'measure', class: MeasureCommand, file: 'animation/measure.ts' },
  { name: 'settle', class: SettleCommand, file: 'animation/settle.ts' },
  { name: 'take', class: TakeCommand, file: 'animation/take.ts' },

  // Control Flow
  { name: 'if', class: IfCommand, file: 'control-flow/if.ts' },
  { name: 'repeat', class: RepeatCommand, file: 'control-flow/repeat.ts' },
  { name: 'break', class: BreakCommand, file: 'control-flow/break.ts' },
  { name: 'continue', class: ContinueCommand, file: 'control-flow/continue.ts' },
  { name: 'return', class: ReturnCommand, file: 'control-flow/return.ts' },
  { name: 'exit', class: ExitCommand, file: 'control-flow/exit.ts' },
  { name: 'halt', class: HaltCommand, file: 'control-flow/halt.ts' },
  { name: 'throw', class: ThrowCommand, file: 'control-flow/throw.ts' },
  { name: 'unless', class: UnlessCommand, file: 'control-flow/unless.ts' },

  // Data
  { name: 'set', class: SetCommand, file: 'data/set.ts' },
  { name: 'get', class: GetCommand, file: 'data/get.ts' },
  { name: 'increment', class: IncrementCommand, file: 'data/increment.ts' },
  { name: 'decrement', class: DecrementCommand, file: 'data/decrement.ts' },
  { name: 'default', class: DefaultCommand, file: 'data/default.ts' },
  { name: 'persist', class: PersistCommand, file: 'data/persist.ts' },
  { name: 'bind', class: BindCommand, file: 'data/bind.ts' },

  // Events
  { name: 'trigger', class: TriggerCommand, file: 'events/trigger.ts' },
  { name: 'send', class: SendCommand, file: 'events/send.ts' },

  // Utility
  { name: 'log', class: LogCommand, file: 'utility/log.ts' },
  { name: 'beep', class: BeepCommand, file: 'utility/beep.ts' },
  { name: 'tell', class: TellCommand, file: 'utility/tell.ts' },
  { name: 'pick', class: PickCommand, file: 'utility/pick.ts' },
  { name: 'copy', class: CopyCommand, file: 'utility/copy.ts' },

  // Execution
  { name: 'call', class: CallCommand, file: 'execution/call.ts' },
  { name: 'pseudo-command', class: PseudoCommand, file: 'execution/pseudo-command.ts' },

  // Advanced
  { name: 'js', class: JsCommand, file: 'advanced/js.ts' },
  { name: 'async', class: AsyncCommand, file: 'advanced/async.ts' },

  // Navigation
  { name: 'go', class: GoCommand, file: 'navigation/go.ts' },

  // Content
  { name: 'append', class: AppendCommand, file: 'content/append.ts' },
  { name: 'prepend', class: PrependCommand, file: 'content/prepend.ts' },
  { name: 'render', class: RenderCommand, file: 'templates/render.ts' },

  // Behaviors
  { name: 'install', class: InstallCommand, file: 'behaviors/install.ts' },
];

// ============================================================================
// Audit Logic
// ============================================================================

interface AuditResult {
  command: string;
  file: string;
  hasMetadata: boolean;
  isStatic: boolean;
  validation: MetadataValidationResult | null;
  metadata: any;
  issues: string[];
}

function auditCommand(entry: CommandEntry): AuditResult {
  const issues: string[] = [];
  const Cmd = entry.class;

  // Check if metadata exists
  const hasStaticMetadata = 'metadata' in Cmd;
  const instance = new Cmd();
  const hasInstanceMetadata = 'metadata' in instance;

  if (!hasStaticMetadata && !hasInstanceMetadata) {
    return {
      command: entry.name,
      file: entry.file,
      hasMetadata: false,
      isStatic: false,
      validation: null,
      metadata: null,
      issues: ['No metadata property found'],
    };
  }

  // Get metadata (prefer static)
  const metadata = hasStaticMetadata ? Cmd.metadata : instance.metadata;
  const isStatic = hasStaticMetadata;

  if (!isStatic) {
    issues.push('Metadata is instance property, should be static readonly');
  }

  // Validate metadata
  const validation = validateCommandMetadata(metadata, entry.name);

  // Check for category normalization issues
  if (metadata.category && metadata.category !== normalizeCategory(metadata.category)) {
    issues.push(`Category '${metadata.category}' should be '${normalizeCategory(metadata.category)}'`);
  }

  // Check for missing instance getter (for backward compatibility)
  if (isStatic && !hasInstanceMetadata) {
    issues.push('Missing instance getter for metadata (backward compatibility)');
  }

  return {
    command: entry.name,
    file: entry.file,
    hasMetadata: true,
    isStatic,
    validation,
    metadata,
    issues,
  };
}

function runAudit(): AuditResult[] {
  return COMMANDS.map(auditCommand);
}

// ============================================================================
// Reporting
// ============================================================================

function printReport(results: AuditResult[], showFixes: boolean): void {
  console.log('\n========================================');
  console.log('  Command Metadata Audit Report');
  console.log('========================================\n');

  let errorCount = 0;
  let warningCount = 0;
  let passCount = 0;

  // Group by status
  const errors: AuditResult[] = [];
  const warnings: AuditResult[] = [];
  const passed: AuditResult[] = [];

  for (const result of results) {
    const hasErrors =
      !result.hasMetadata ||
      (result.validation && !result.validation.isValid) ||
      result.issues.length > 0;
    const hasWarnings = result.validation && result.validation.warnings.length > 0;

    if (hasErrors) {
      errors.push(result);
      errorCount++;
    } else if (hasWarnings) {
      warnings.push(result);
      warningCount++;
    } else {
      passed.push(result);
      passCount++;
    }
  }

  // Print errors
  if (errors.length > 0) {
    console.log('\x1b[31m--- ERRORS ---\x1b[0m\n');
    for (const result of errors) {
      console.log(`\x1b[31m✗\x1b[0m ${result.command} (${result.file})`);

      if (!result.hasMetadata) {
        console.log('  - No metadata found');
      } else {
        for (const issue of result.issues) {
          console.log(`  - ${issue}`);
        }
        if (result.validation) {
          for (const error of result.validation.errors) {
            console.log(`  - ${error}`);
          }
        }
      }

      if (showFixes && result.hasMetadata) {
        console.log('\n  \x1b[36mSuggested fix:\x1b[0m');
        console.log('  static readonly metadata = {');
        console.log(`    description: '${result.metadata?.description || 'TODO: Add description'}',`);
        console.log(`    syntax: '${result.metadata?.syntax || 'TODO: Add syntax'}',`);
        console.log(`    examples: ${JSON.stringify(result.metadata?.examples || ['TODO'])},`);
        console.log(`    category: '${normalizeCategory(result.metadata?.category || 'utility')}',`);
        if (result.metadata?.sideEffects) {
          console.log(`    sideEffects: ${JSON.stringify(result.metadata.sideEffects)},`);
        }
        console.log('  } as const;\n');
      }
      console.log('');
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log('\x1b[33m--- WARNINGS ---\x1b[0m\n');
    for (const result of warnings) {
      console.log(`\x1b[33m⚠\x1b[0m ${result.command} (${result.file})`);
      if (result.validation) {
        for (const warning of result.validation.warnings) {
          console.log(`  - ${warning}`);
        }
      }
      console.log('');
    }
  }

  // Print summary
  console.log('========================================');
  console.log('  Summary');
  console.log('========================================\n');
  console.log(`Total commands: ${results.length}`);
  console.log(`\x1b[32m✓ Passed: ${passCount}\x1b[0m`);
  console.log(`\x1b[33m⚠ Warnings: ${warningCount}\x1b[0m`);
  console.log(`\x1b[31m✗ Errors: ${errorCount}\x1b[0m`);

  // Category breakdown
  console.log('\n--- By Category ---\n');
  const byCategory = new Map<string, number>();
  for (const result of results) {
    if (result.metadata?.category) {
      const cat = normalizeCategory(result.metadata.category);
      byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
    }
  }
  for (const cat of COMMAND_CATEGORIES) {
    const count = byCategory.get(cat) || 0;
    if (count > 0) {
      console.log(`  ${cat}: ${count}`);
    }
  }

  // Static vs instance
  const staticCount = results.filter((r) => r.isStatic).length;
  const instanceCount = results.filter((r) => r.hasMetadata && !r.isStatic).length;
  console.log('\n--- Metadata Pattern ---\n');
  console.log(`  static readonly: ${staticCount}`);
  console.log(`  instance (needs migration): ${instanceCount}`);

  console.log('\n');
}

function printJson(results: AuditResult[]): void {
  const output = {
    timestamp: new Date().toISOString(),
    totalCommands: results.length,
    passed: results.filter(
      (r) => r.hasMetadata && r.validation?.isValid && r.issues.length === 0
    ).length,
    warnings: results.filter(
      (r) => r.hasMetadata && r.validation?.isValid && r.validation.warnings.length > 0
    ).length,
    errors: results.filter(
      (r) => !r.hasMetadata || !r.validation?.isValid || r.issues.length > 0
    ).length,
    results: results.map((r) => ({
      command: r.command,
      file: r.file,
      status: !r.hasMetadata || !r.validation?.isValid || r.issues.length > 0
        ? 'error'
        : r.validation?.warnings.length > 0
          ? 'warning'
          : 'pass',
      issues: [
        ...r.issues,
        ...(r.validation?.errors || []),
      ],
      warnings: r.validation?.warnings || [],
      metadata: r.metadata,
    })),
  };
  console.log(JSON.stringify(output, null, 2));
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2);
const showFixes = args.includes('--fix');
const jsonOutput = args.includes('--json');

const results = runAudit();

if (jsonOutput) {
  printJson(results);
} else {
  printReport(results, showFixes);
}

// Exit with error code if there are errors
const hasErrors = results.some(
  (r) => !r.hasMetadata || !r.validation?.isValid || r.issues.length > 0
);
process.exit(hasErrors ? 1 : 0);
