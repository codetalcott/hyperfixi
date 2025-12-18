#!/usr/bin/env node
/**
 * Pattern Analyzer
 *
 * Extracts adoptable patterns from original _hyperscript that could
 * reduce HyperFixi code size while maintaining type safety.
 *
 * Usage:
 *   node scripts/analysis/comparison/pattern-analyzer.mjs
 *   node scripts/analysis/comparison/pattern-analyzer.mjs --json
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../../..');

// Try multiple locations for original _hyperscript
const ORIGINAL_PATHS = [
  '/Users/williamtalcott/projects/3rd-party-clones/_hyperscript/src/_hyperscript.js',
  '/Users/williamtalcott/projects/_hyperscript/src/_hyperscript.js',
];
let ORIGINAL_PATH = ORIGINAL_PATHS.find(path => existsSync(path)) || ORIGINAL_PATHS[0];

const OUTPUT_DIR = join(PROJECT_ROOT, 'analysis-output/comparison');

/**
 * Pattern definitions to extract from original _hyperscript
 */
const PATTERN_DEFINITIONS = {
  'inline-operation': {
    name: 'Inline Operation Objects',
    description: 'Commands return {args, op} objects where op is the execution function',
    regex: /return\s*\{[^}]*args\s*:\s*\[[^\]]*\][^}]*op\s*:\s*function/gs,
    typeSafeAdaptation: `
interface CompactOperation<TInput, TOutput> {
  parse: (args: ASTNode[], ctx: ExecutionContext) => Promise<TInput>;
  exec: (input: TInput, ctx: TypedExecutionContext) => Promise<TOutput>;
}`,
    estimatedSavings: '40-60 lines per command',
    preservesTypeSafety: true,
  },

  'implicit-loop': {
    name: 'Implicit Loop Pattern',
    description: 'runtime.implicitLoop handles both single elements and collections',
    regex: /runtime\.implicitLoop\s*\(\s*\w+\s*,\s*function\s*\(\s*(\w+)\s*\)/g,
    typeSafeAdaptation: `
function implicitLoop<T extends Element>(
  targets: T | T[] | NodeList,
  fn: (target: T) => void
): void {
  const elements = Array.isArray(targets) ? targets :
    targets instanceof NodeList ? Array.from(targets) : [targets];
  elements.forEach(fn);
}`,
    estimatedSavings: '5-10 lines per command using targets',
    preservesTypeSafety: true,
  },

  'null-check': {
    name: 'Null Check Pattern',
    description: 'runtime.nullCheck validates expressions before use',
    regex: /runtime\.nullCheck\s*\(\s*\w+\s*,\s*\w+\s*\)/g,
    typeSafeAdaptation: `
function nullCheck<T>(value: T | null | undefined, expr: ASTNode): asserts value is T {
  if (value == null) {
    throw new HyperScriptError(\`\${expr.type} evaluated to null\`);
  }
}`,
    estimatedSavings: '2-3 lines per null check',
    preservesTypeSafety: true,
  },

  'find-next': {
    name: 'Command Chaining Pattern',
    description: 'runtime.findNext returns the next command in sequence',
    regex: /return\s+runtime\.findNext\s*\(\s*this\s*,\s*\w+\s*\)/g,
    typeSafeAdaptation: `
// Built into command execution loop
// Each command simply returns void or a value
// Runtime handles chaining automatically`,
    estimatedSavings: '1 line per command (already optimized in HyperFixi)',
    preservesTypeSafety: true,
  },

  'unified-exec': {
    name: 'Unified Execution Pattern',
    description: 'Single entry point handles sync/async command execution',
    regex: /runtime\.unifiedExec\s*\(\s*this\s*,\s*\w+\s*\)/g,
    typeSafeAdaptation: `
// HyperFixi uses async-first with Promise.resolve()
// Already implemented - all commands are async`,
    estimatedSavings: '0 (already optimized)',
    preservesTypeSafety: true,
  },

  'args-array': {
    name: 'Args Array Pattern',
    description: 'args: [...] directly maps parsed expressions to op function params',
    regex: /args\s*:\s*\[\s*([^\]]+)\s*\]/g,
    typeSafeAdaptation: `
// Type-safe adaptation using tuple types:
type CommandArgs<T extends unknown[]> = {
  args: T;
  exec: (...args: T) => void;
};

// Example:
const addCmd: CommandArgs<[Element[], string[]]> = {
  args: [targetExpr, classRefs],
  exec: (targets, classes) => {
    targets.forEach(t => t.classList.add(...classes));
  }
};`,
    estimatedSavings: '10-20 lines per command (eliminates parseInput method)',
    preservesTypeSafety: true,
  },

  'inline-parsing': {
    name: 'Inline Parsing Pattern',
    description: 'Token parsing happens inline within addCommand callback',
    regex: /tokens\.matchToken\s*\(\s*["'][^"']+["']\s*\)/g,
    typeSafeAdaptation: `
// Can adopt with typed token helpers:
const parseCommands = {
  add: (tokens: TokenStream): AddCommandAST => {
    tokens.matchToken('add');
    const classes = parseClassRefs(tokens);
    const target = tokens.matchToken('to')
      ? parseExpression(tokens)
      : implicitMeTarget();
    return { type: 'add', classes, target };
  }
};`,
    estimatedSavings: '20-30 lines per command (consolidate parsing)',
    preservesTypeSafety: true,
  },

  'class-ref-loop': {
    name: 'Class Reference Loop Pattern',
    description: 'Parsing multiple class references in a while loop',
    regex: /while\s*\(\s*\(?\s*classRef\s*=\s*parser\.parseElement\s*\(\s*["']classRef["']/g,
    typeSafeAdaptation: `
function parseClassRefs(tokens: TokenStream): string[] {
  const refs: string[] = [];
  let ref: string | null;
  while ((ref = parseClassRef(tokens))) {
    refs.push(ref);
  }
  return refs;
}`,
    estimatedSavings: '5-8 lines per command using classes',
    preservesTypeSafety: true,
  },

  'for-duration': {
    name: 'Duration/Event Modifiers Pattern',
    description: 'for <time> or until <event> modifiers for temporary operations',
    regex: /tokens\.matchToken\s*\(\s*["']for["']\s*\)|tokens\.matchToken\s*\(\s*["']until["']\s*\)/g,
    typeSafeAdaptation: `
interface TemporalModifier {
  type: 'duration' | 'event';
  duration?: number;
  event?: string;
  source?: Element;
}

function parseTemporalModifier(tokens: TokenStream): TemporalModifier | null {
  if (tokens.matchToken('for')) {
    return { type: 'duration', duration: parseDuration(tokens) };
  }
  if (tokens.matchToken('until')) {
    const event = parseEvent(tokens);
    const source = tokens.matchToken('from') ? parseExpression(tokens) : null;
    return { type: 'event', event, source };
  }
  return null;
}`,
    estimatedSavings: '10-15 lines per command with temporal modifiers',
    preservesTypeSafety: true,
  },

  'style-strategy': {
    name: 'Hide/Show Strategy Pattern',
    description: 'Pluggable strategies for visibility (display, visibility, opacity)',
    regex: /HIDE_SHOW_STRATEGIES\s*=\s*\{/g,
    typeSafeAdaptation: `
// Already implemented in HyperFixi as strategy pattern
// Can be simplified with a map:
const strategies: Record<string, (op: 'show'|'hide'|'toggle', el: Element) => void> = {
  display: (op, el) => { /* ... */ },
  visibility: (op, el) => { /* ... */ },
  opacity: (op, el) => { /* ... */ },
};`,
    estimatedSavings: '0 (already optimized)',
    preservesTypeSafety: true,
  },
};

/**
 * Extract patterns from original _hyperscript
 */
async function extractPatterns(content) {
  const patterns = [];

  for (const [id, def] of Object.entries(PATTERN_DEFINITIONS)) {
    const matches = [];
    let match;

    // Reset regex
    def.regex.lastIndex = 0;

    while ((match = def.regex.exec(content)) !== null) {
      const startLine = content.slice(0, match.index).split('\n').length;
      const context = content.slice(
        Math.max(0, match.index - 50),
        Math.min(content.length, match.index + match[0].length + 50)
      ).replace(/\n/g, ' ').trim();

      matches.push({
        line: startLine,
        snippet: match[0].slice(0, 100),
        context: context.slice(0, 150) + '...',
      });
    }

    patterns.push({
      id,
      ...def,
      occurrences: matches.length,
      examples: matches.slice(0, 3),
    });
  }

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Identify type-safe consolidation opportunities
 */
function identifyConsolidationOpportunities(patterns) {
  const opportunities = [];

  // Group patterns by estimated savings
  const highImpact = patterns.filter(p =>
    p.preservesTypeSafety &&
    p.occurrences >= 5 &&
    !p.estimatedSavings.startsWith('0 ')  // Filter out "0 (already optimized)"
  );

  for (const pattern of highImpact) {
    const savingsMatch = pattern.estimatedSavings.match(/(\d+)-?(\d+)?/);
    const minSavings = savingsMatch ? parseInt(savingsMatch[1]) : 0;
    const maxSavings = savingsMatch && savingsMatch[2] ? parseInt(savingsMatch[2]) : minSavings;
    const avgSavings = (minSavings + maxSavings) / 2;

    opportunities.push({
      pattern: pattern.name,
      id: pattern.id,
      occurrences: pattern.occurrences,
      estimatedTotalSavings: Math.round(avgSavings * pattern.occurrences),
      implementation: pattern.typeSafeAdaptation,
      priority: pattern.occurrences * avgSavings > 100 ? 'HIGH' : 'MEDIUM',
    });
  }

  return opportunities.sort((a, b) => b.estimatedTotalSavings - a.estimatedTotalSavings);
}

/**
 * Generate compact command template
 */
function generateCompactTemplate() {
  return `
/**
 * PROPOSED: Type-Safe Compact Command Pattern
 *
 * This pattern reduces boilerplate while maintaining full TypeScript safety.
 * Based on patterns extracted from original _hyperscript.
 */

// Base types
interface CompactCommand<TInput, TOutput = void> {
  /** Command name for registration */
  readonly name: string;

  /** Parse tokens/AST into typed input */
  parse(args: ASTNode[], ctx: ExecutionContext): Promise<TInput>;

  /** Execute with typed input - no separate parseInput/execute split */
  exec(input: TInput, ctx: TypedExecutionContext): Promise<TOutput>;

  /** Optional: metadata for documentation/tooling */
  meta?: CommandMetadata;
}

// Shared utilities (from original's runtime)
const runtime = {
  /** Handle both single element and collections */
  implicitLoop<T extends Element>(
    targets: T | T[] | NodeList | null,
    fn: (target: T) => void
  ): void {
    if (!targets) return;
    const elements = Array.isArray(targets) ? targets :
      targets instanceof NodeList ? Array.from(targets as NodeListOf<T>) : [targets];
    elements.forEach(fn);
  },

  /** Assert non-null with error context */
  nullCheck<T>(value: T | null | undefined, context: string): asserts value is T {
    if (value == null) {
      throw new Error(\`Expression evaluated to null: \${context}\`);
    }
  },
};

// Example: AddCommand reduced from 159 lines to ~35 lines
const addCommand: CompactCommand<AddInput> = {
  name: 'add',

  async parse(args, ctx) {
    const first = await evalFirst(args[0], ctx);

    // Object literal = styles
    if (isPlainObject(first)) {
      return { type: 'styles', styles: first, targets: await resolveTargets(args.slice(1), ctx) };
    }

    // String starting with @ = attribute
    if (typeof first === 'string' && first.startsWith('@')) {
      const { name, value } = parseAttribute(first);
      return { type: 'attribute', name, value, targets: await resolveTargets(args.slice(1), ctx) };
    }

    // Default = classes
    return { type: 'classes', classes: parseClasses(first), targets: await resolveTargets(args.slice(1), ctx) };
  },

  async exec(input) {
    switch (input.type) {
      case 'classes':
        runtime.implicitLoop(input.targets, t => t.classList.add(...input.classes));
        break;
      case 'attribute':
        runtime.implicitLoop(input.targets, t => t.setAttribute(input.name, input.value));
        break;
      case 'styles':
        runtime.implicitLoop(input.targets, t => Object.assign(t.style, input.styles));
        break;
    }
  },

  meta: {
    description: 'Add classes, attributes, or styles to elements',
    syntax: 'add <classes|@attr|{styles}> [to <target>]',
    examples: ['add .active to me', 'add [@data-x="1"] to #el'],
  },
};

// Registration (tree-shakeable)
function registerCommand<T, O>(cmd: CompactCommand<T, O>): void {
  commandRegistry.set(cmd.name, cmd);
}

registerCommand(addCommand);
`;
}

/**
 * Print pattern analysis
 */
function printPatternAnalysis(patterns, opportunities) {
  console.log('═'.repeat(80));
  console.log('  PATTERN ANALYSIS: Compact Patterns from Original _hyperscript');
  console.log('═'.repeat(80));

  console.log('\n' + '─'.repeat(80));
  console.log('PATTERNS EXTRACTED');
  console.log('─'.repeat(80));

  for (const p of patterns) {
    console.log(`\n📌 ${p.name} (${p.occurrences} occurrences)`);
    console.log(`   ${p.description}`);
    console.log(`   Estimated savings: ${p.estimatedSavings}`);
    console.log(`   Type-safe: ${p.preservesTypeSafety ? '✓ YES' : '✗ NO'}`);

    if (p.examples.length > 0) {
      console.log(`   Example (line ${p.examples[0].line}):`);
      console.log(`     ${p.examples[0].snippet.slice(0, 70)}...`);
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('CONSOLIDATION OPPORTUNITIES (Type-Safe)');
  console.log('─'.repeat(80));

  let totalSavings = 0;
  for (const opp of opportunities) {
    console.log(`\n[${opp.priority}] ${opp.pattern}`);
    console.log(`   Occurrences: ${opp.occurrences}`);
    console.log(`   Estimated total savings: ~${opp.estimatedTotalSavings} lines`);
    totalSavings += opp.estimatedTotalSavings;
  }

  console.log('\n' + '─'.repeat(80));
  console.log('SUMMARY');
  console.log('─'.repeat(80));
  console.log(`  Total patterns found: ${patterns.length}`);
  console.log(`  Type-safe patterns: ${patterns.filter(p => p.preservesTypeSafety).length}`);
  console.log(`  High-impact opportunities: ${opportunities.filter(o => o.priority === 'HIGH').length}`);
  console.log(`  Estimated total savings: ~${totalSavings} lines`);

  console.log('\n' + '─'.repeat(80));
  console.log('PROPOSED COMPACT COMMAND TEMPLATE');
  console.log('─'.repeat(80));
  console.log(generateCompactTemplate());
}

async function main() {
  const jsonOutput = process.argv.includes('--json');

  if (!existsSync(ORIGINAL_PATH)) {
    console.error(`Original _hyperscript not found at: ${ORIGINAL_PATH}`);
    process.exit(1);
  }

  const content = await readFile(ORIGINAL_PATH, 'utf-8');
  const patterns = await extractPatterns(content);
  const opportunities = identifyConsolidationOpportunities(patterns);

  if (jsonOutput) {
    const output = {
      timestamp: new Date().toISOString(),
      patterns,
      opportunities,
      compactTemplate: generateCompactTemplate(),
    };

    await mkdir(OUTPUT_DIR, { recursive: true });
    const outputPath = join(OUTPUT_DIR, 'pattern-analysis.json');
    await writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(outputPath);
  } else {
    printPatternAnalysis(patterns, opportunities);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
