#!/usr/bin/env tsx
/**
 * Scaffold a new hyperscript command across every surface that must know about
 * it (Arc F step 6 of `docs-internal/COMMAND_ARCHITECTURE_NEXT_STEPS.md`).
 *
 * WHY THIS EXISTS. PR #792 added `prepend` with an exhaustive, explicitly
 * verified plan and still missed a step — the `metadata.ts` counts, caught only
 * because `verify:reference` gates them. The queue's conclusion was that a
 * perfect checklist is not enough: the checklist has to become a tool. This is
 * that tool.
 *
 * WHAT IT DOES NOT DO, and why that is deliberate. Arcs A and E already
 * collapsed much of the old footprint — `commands/manifest.ts` now DRIVES both
 * `parser-constants.ts`'s `COMMANDS` set and `runtime.ts`'s registration loop,
 * and the hybrid bundle executor + parser template are GENERATED. So this
 * scaffolder writes the surfaces that are still hand-maintained and then prints
 * the residual work it cannot decide for you (parser rules, per-language
 * keywords, docs prose). It never edits a generated region.
 *
 *   npx tsx scripts/add-command.ts --name=flash --category=dom \
 *     --description="Briefly highlight an element" --syntax="flash <target>"
 *   npx tsx scripts/add-command.ts --name=flash --category=dom --dry-run
 *
 * After it runs, the gates that police these surfaces are the verification —
 * run them, do not assume:
 *   npm run verify:reference --prefix packages/core
 *   npm run typecheck --prefix packages/core
 *   npm run test:quick --prefix packages/core
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORE_SRC = path.resolve(__dirname, '../src');
const SEMANTIC_SRC = path.resolve(__dirname, '../../semantic/src');

// =============================================================================
// Arguments
// =============================================================================

interface CommandConfig {
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly syntax: string;
  readonly tier: string;
  readonly dryRun: boolean;
}

// MEASURED from the `category:` values real commands pass to commandMeta, not
// from the directory listing — the two DISAGREE: the directory is `events/`
// while the metadata category is `event`. `commandDir()` below bridges them.
const VALID_CATEGORIES = [
  'advanced',
  'animation',
  'async',
  'behaviors',
  'content',
  'control-flow',
  'data',
  'dom',
  'event',
  'execution',
  'navigation',
  'templates',
  'utility',
];

/**
 * "Category" is expressed in FOUR vocabularies that do not agree, all measured
 * from source rather than assumed:
 *
 *   commandMeta (`commands/*`)          'event'
 *   directory   (`commands/events/`)    'events'
 *   reference/index.ts CommandCategory  'events'
 *   semantic CommandCategory            'event' (and a different set entirely)
 *
 * `event` is the only row where they diverge today, but the divergence is real
 * and a scaffolder that assumed one vocabulary emitted uncompilable code — so
 * each mapping is its own function.
 */
function commandDir(category: string): string {
  return category === 'event' ? 'events' : category;
}

/** Category as `reference/index.ts`'s `CommandCategory` union spells it. */
function referenceCategory(category: string): string {
  return category === 'event' ? 'events' : category;
}
// Measured from `CommandTier` (commands/manifest.ts) and
// `BundleAvailability` (reference/index.ts) — the two must agree.
const VALID_TIERS = ['lite', 'lite-plus', 'hybrid', 'full'];

function parseArgs(): CommandConfig {
  const args = new Map<string, string>();
  let dryRun = false;
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) args.set(m[1], m[2]);
  }

  const name = args.get('name');
  const category = args.get('category');
  if (!name || !category) {
    console.error(
      'Usage: tsx scripts/add-command.ts --name=<cmd> --category=<cat> ' +
        '[--description=...] [--syntax=...] [--tier=full] [--dry-run]\n' +
        `  categories: ${VALID_CATEGORIES.join(', ')}\n` +
        `  tiers:      ${VALID_TIERS.join(', ')}`
    );
    process.exit(1);
  }
  if (!/^[a-z][a-zA-Z]*$/.test(name)) {
    console.error(`Invalid command name '${name}': expected lowerCamelCase, letters only.`);
    process.exit(1);
  }
  if (!VALID_CATEGORIES.includes(category)) {
    console.error(
      `Invalid category '${category}'. Expected one of: ${VALID_CATEGORIES.join(', ')}`
    );
    process.exit(1);
  }
  const tier = args.get('tier') ?? 'full';
  if (!VALID_TIERS.includes(tier)) {
    console.error(`Invalid tier '${tier}'. Expected one of: ${VALID_TIERS.join(', ')}`);
    process.exit(1);
  }

  return {
    name,
    category,
    tier,
    description: args.get('description') ?? `TODO: describe the ${name} command`,
    syntax: args.get('syntax') ?? `${name} <target>`,
    dryRun,
  };
}

// =============================================================================
// Edit plan — every mutation is recorded, then applied (or printed) at once
// =============================================================================

interface Edit {
  readonly file: string;
  readonly what: string;
  readonly apply: (src: string) => string;
}

const edits: Edit[] = [];
const creates: Array<{ file: string; what: string; content: string }> = [];

function pascal(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Insert `line` into a sorted string-literal array, preserving sort order. */
function insertSorted(src: string, arrayAnchor: string, entry: string, key: string): string {
  const start = src.indexOf(arrayAnchor);
  if (start === -1) throw new Error(`anchor not found: ${arrayAnchor}`);
  const open = src.indexOf('[', start);
  const close = src.indexOf('\n];', open);
  const body = src.slice(open + 1, close);
  const lines = body.split('\n');
  let insertAt = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*'([a-zA-Z]+)'/);
    if (m && m[1] > key) {
      insertAt = i;
      break;
    }
  }
  lines.splice(insertAt, 0, entry);
  return src.slice(0, open + 1) + lines.join('\n') + src.slice(close);
}

function planEdit(file: string, what: string, apply: (src: string) => string): void {
  edits.push({ file, what, apply });
}

// =============================================================================
// Templates
// =============================================================================

function commandImplementation(c: CommandConfig): string {
  const Cls = `${pascal(c.name)}Command`;
  const q = (s: string) => s.replace(/'/g, "\\'");
  return `/**
 * ${Cls} - ${c.description}
 *
 * Syntax:
 *   ${c.syntax}
 */

import type {
  ExecutionContext,
  TypedExecutionContext,
  ASTNode,
  ExpressionNode,
} from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveTargetsFromArgs } from '../helpers/element-resolution';
import { commandMeta, command, createFactory, type DecoratedCommand } from '../decorators';

export interface ${Cls}Input {
  targets: HTMLElement[];
}

@command({ name: '${c.name}' })
export class ${Cls} implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: '${q(c.description)}',
    syntax: ['${q(c.syntax)}'],
    examples: ['${q(c.syntax)}'],
    sideEffects: [],
    category: '${c.category}',
    compatibility: 'lokascript-extension',
  });

  get metadata() {
    return ${Cls}.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<${Cls}Input> {
    // TODO: adjust to what ${c.name} actually takes. This default resolves a
    // trailing target the way blur/focus do.
    const targets = await resolveTargetsFromArgs(
      raw.args,
      evaluator,
      context,
      '${c.name}',
      { filterPrepositions: true, fallbackModifierKey: 'on' },
      raw.modifiers
    );
    return { targets };
  }

  async execute(_input: ${Cls}Input, _context: TypedExecutionContext): Promise<void> {
    // TODO: implement.
    //
    // The 'it' contract (Arc C): self-assign context.it here IF upstream
    // hyperscript sets 'result' for this command — there is NO runtime
    // propagation from the return value. The gate is
    // runtime/__tests__/command-output-contract.test.ts, which ratchets in
    // both directions, so decide deliberately.
    throw new Error('${c.name}: not implemented');
  }

  validate(input: unknown): input is ${Cls}Input {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<${Cls}Input>;
    if (!Array.isArray(typed.targets)) return false;
    return typed.targets.every(t => isHTMLElement(t));
  }
}

export const create${pascal(c.name)}Command = createFactory(${Cls});
export default ${Cls};
`;
}

function commandTest(c: CommandConfig): string {
  return `import { describe, it, expect } from 'vitest';
import { create${pascal(c.name)}Command } from '../${c.name}';

describe('${c.name} command', () => {
  it('exposes its metadata', () => {
    const cmd = create${pascal(c.name)}Command();
    // NOTE: the name lives on the INSTANCE (installed by @command), not on
    // metadata — the canonical CommandMetadata type has no \`name\` field.
    expect(cmd.name).toBe('${c.name}');
    expect(cmd.metadata.category).toBe('${c.category}');
  });

  // TODO: replace with real behavior tests.
  //
  // Write these as BUG-FINDERS, not as pass-friendly shape checks: assert the
  // observable DOM/context effect the command is FOR, not that it returned
  // something. A check on an end state a fallback also produces measures the
  // fallback (Arc A, Finding 16).
  it.todo('performs its effect');
});
`;
}

/**
 * Core command categories and semantic `CommandCategory` are DIFFERENT unions
 * (`dom` vs `dom-class`/`dom-content`/`dom-visibility`, `utility`/`debug` have
 * no semantic counterpart). Measured from the two source files; the mapping is
 * a starting point the author should narrow by hand.
 */
function semanticCategory(coreCategory: string): string {
  const map: Record<string, string> = {
    dom: 'dom-content',
    content: 'dom-content',
    animation: 'dom-visibility',
    data: 'variable',
    'control-flow': 'control-flow',
    async: 'async',
    event: 'event',
    navigation: 'navigation',
  };
  // execution / utility / advanced / behaviors / templates have no semantic
  // counterpart; 'dom-content' is a placeholder for the author to narrow.
  return map[coreCategory] ?? 'dom-content';
}

function semanticSchema(c: CommandConfig): string {
  return `
/**
 * ${pascal(c.name)} command: ${c.description}
 */
export const ${c.name}Schema: CommandSchema = {
  action: '${c.name}',
  description: '${c.description.replace(/'/g, "\\'")}',
  category: '${semanticCategory(c.category)}',
  primaryRole: 'patient',
  // Declarative semantic-roles → AST mapping (Arc F). Adjust to match what the
  // runtime command reads: each modifier KEY should be the role's English
  // marker unless it is a runtime contract key — ast-shape-consistency.test.ts
  // will make you justify any divergence.
  ast: { args: ['patient'], modifiers: { on: 'destination' } },
  roles: [
    {
      role: 'patient',
      description: 'TODO: what ${c.name} acts on',
      required: true,
      expectedTypes: ['selector'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'destination',
      description: 'The target element (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
};
`;
}

// =============================================================================
// Plan
// =============================================================================

const config = parseArgs();
const { name, category, tier, description, syntax } = config;
const Pascal = pascal(name);

const dir = commandDir(category);
const implPath = path.join(CORE_SRC, 'commands', dir, `${name}.ts`);
const testPath = path.join(CORE_SRC, 'commands', dir, '__tests__', `${name}.test.ts`);

if (existsSync(implPath)) {
  console.error(`Refusing to overwrite existing command: ${implPath}`);
  process.exit(1);
}

creates.push({
  file: implPath,
  what: 'command implementation',
  content: commandImplementation(config),
});
creates.push({ file: testPath, what: 'command tests', content: commandTest(config) });

// 1. manifest.ts — DRIVES parser-constants COMMANDS and runtime registration
planEdit(path.join(CORE_SRC, 'commands/manifest.ts'), 'COMMAND_MANIFEST row', src => {
  const row = `  { name: '${name}', category: '${category}', tier: '${tier}', upstreamOrExtension: 'extension', multiword: false },`;
  const anchor = 'export const COMMAND_MANIFEST';
  const open = src.indexOf('[', src.indexOf(anchor));
  const close = src.indexOf('\n];', open);
  const lines = src.slice(open + 1, close).split('\n');
  let at = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\{ name: '([a-zA-Z]+)'/);
    if (m && m[1] > name) {
      at = i;
      break;
    }
  }
  lines.splice(at, 0, row);
  return src.slice(0, open + 1) + lines.join('\n') + src.slice(close);
});

planEdit(path.join(CORE_SRC, 'commands/manifest.ts'), 'COMMAND_NAMES entry', src =>
  insertSorted(src, 'export const COMMAND_NAMES', `  '${name}',`, name)
);

// 2. commands/index.ts — factory alias + class re-export (checked, not driven)
planEdit(path.join(CORE_SRC, 'commands/index.ts'), 'factory alias export', src =>
  src.replace(
    /(\nexport \{ create[A-Za-z]+Command as [a-z][a-zA-Z]* \} from '[^']+';\n)(?![\s\S]*\nexport \{ create[A-Za-z]+Command as )/,
    `$1export { create${Pascal}Command as ${name} } from './${dir}/${name}';\n`
  )
);
planEdit(path.join(CORE_SRC, 'commands/index.ts'), 'class re-export', src =>
  src.replace(
    /(\nexport \{ [A-Za-z]+Command, create[A-Za-z]+Command \} from '[^']+';\n)(?![\s\S]*\nexport \{ [A-Za-z]+Command, create[A-Za-z]+Command \} from )/,
    `$1export { ${Pascal}Command, create${Pascal}Command } from './${dir}/${name}';\n`
  )
);

// 3. runtime.ts — COMMAND_FACTORIES entry (name → factory)
planEdit(path.join(CORE_SRC, 'runtime/runtime.ts'), 'COMMAND_FACTORIES entry', src => {
  const anchor = 'const COMMAND_FACTORIES';
  const open = src.indexOf('{', src.indexOf(anchor));
  return `${src.slice(0, open + 1)}\n  ${name}: create${Pascal}Command,${src.slice(open + 1)}`;
});
planEdit(path.join(CORE_SRC, 'runtime/runtime.ts'), 'factory import', src =>
  src.replace(
    /(\nimport \{ create[A-Za-z]+Command \} from '[^']*commands\/[^']+';\n)/,
    `$1import { create${Pascal}Command } from '../commands/${dir}/${name}';\n`
  )
);

// 4. reference/index.ts — CommandRef (verify:reference gates this)
planEdit(path.join(CORE_SRC, 'reference/index.ts'), 'CommandRef entry', src => {
  const anchor = 'export const commands: Record<string, CommandRef> = {';
  const at = src.indexOf(anchor) + anchor.length;
  const entry = `\n  ${name}: {\n    name: '${name}',\n    description: '${description.replace(/'/g, "\\'")}',\n    syntax: '${syntax.replace(/'/g, "\\'")}',\n    category: '${referenceCategory(category)}',\n    availability: '${tier}',\n    examples: ['${syntax.replace(/'/g, "\\'")}'],\n  },`;
  return src.slice(0, at) + entry + src.slice(at);
});

// 5. lsp-metadata.ts — hover/completion entry
planEdit(path.join(CORE_SRC, 'lsp-metadata.ts'), 'LSP metadata entry', src => {
  const at = src.indexOf('  toggle: {');
  if (at === -1) throw new Error('lsp-metadata anchor not found');
  const entry = `  ${name}: {\n    title: '${name}',\n    description: '${description.replace(/'/g, "\\'")}',\n    example: '${syntax.replace(/'/g, "\\'")}',\n    category: 'command',\n  },\n`;
  return src.slice(0, at) + entry + src.slice(at);
});

// 6. semantic types.ts — ActionType member
planEdit(path.join(SEMANTIC_SRC, 'types.ts'), 'ActionType member', src =>
  src.replace(/(\n  \| 'compound';)/, `\n  | '${name}'$1`)
);

// 7. semantic command-schemas.ts — schema + ast descriptor + registry row
planEdit(path.join(SEMANTIC_SRC, 'generators/command-schemas.ts'), 'command schema', src => {
  // Must land BEFORE `commandSchemas`, which references it — inserting after
  // the registry produces TS2448 'used before its declaration'.
  const at = src.lastIndexOf('\n/**', src.indexOf('export const commandSchemas'));
  if (at === -1) throw new Error('command-schemas anchor not found');
  return src.slice(0, at) + '\n' + semanticSchema(config) + src.slice(at);
});
planEdit(path.join(SEMANTIC_SRC, 'generators/command-schemas.ts'), 'schema registry row', src =>
  src.replace(
    /(\n  \/\/ Meta commands \(for compound structures\))/,
    `\n  ${name}: ${name}Schema,$1`
  )
);

// =============================================================================
// Apply
// =============================================================================

console.log(`\nScaffolding command '${name}' (category: ${category}, tier: ${tier})\n`);

for (const c of creates) {
  const rel = path.relative(process.cwd(), c.file);
  if (config.dryRun) {
    console.log(`  CREATE  ${rel}  (${c.what})`);
    continue;
  }
  mkdirSync(path.dirname(c.file), { recursive: true });
  writeFileSync(c.file, c.content);
  console.log(`  created ${rel}`);
}

const failures: string[] = [];
const byFile = new Map<string, Edit[]>();
for (const e of edits) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file)!.push(e);
}

for (const [file, fileEdits] of byFile) {
  const rel = path.relative(process.cwd(), file);
  let src = readFileSync(file, 'utf8');
  const before = src;
  for (const e of fileEdits) {
    try {
      const next = e.apply(src);
      if (next === src) {
        failures.push(`${rel}: ${e.what} (anchor matched nothing — apply by hand)`);
      }
      src = next;
    } catch (err) {
      failures.push(`${rel}: ${e.what} (${(err as Error).message})`);
    }
  }
  if (config.dryRun) {
    console.log(`  EDIT    ${rel}  (${fileEdits.map(e => e.what).join(', ')})`);
  } else if (src !== before) {
    writeFileSync(file, src);
    console.log(`  edited  ${rel}  (${fileEdits.map(e => e.what).join(', ')})`);
  }
}

if (failures.length) {
  console.log('\n  UNAPPLIED — do these by hand:');
  for (const f of failures) console.log(`    ! ${f}`);
}

// =============================================================================
// Residual checklist — the part a tool cannot decide
// =============================================================================

console.log(`
Scaffolded surfaces are stubs, not implementations. Remaining work:

  1. Implement parseInput/execute in
       packages/core/src/commands/${dir}/${name}.ts
     and decide the \`it\` contract (set ctx.it iff upstream sets \`result\`).

  2. Replace the it.todo in
       packages/core/src/commands/${dir}/__tests__/${name}.test.ts
     with tests that assert the observable effect.

  3. Parser support — ONLY if '${name}' is not a plain identifier-plus-args
     command. Keyword-led syntax needs a custom parser:
       packages/core/src/parser/command-parsers/
     and the command added to COMPOUND_COMMANDS. (A keyword argument silently
     drops trailing args through the generic parser.)

  4. Slim-bundle coverage — if '${name}' should work in the lite/hybrid
     bundles, add cases to
       packages/core/src/bundle-generator/templates.ts
       packages/core/src/bundle-generator/template-capabilities.ts
     then run: npm run generate:bundles --prefix packages/core
     NEVER hand-edit between the #region generated markers.

  5. Semantic schema — fill in the roles and the \`ast\` descriptor in
       packages/semantic/src/generators/command-schemas.ts
     Each modifier key should be the role's English marker; the gate
     ast-shape-consistency.test.ts makes you justify divergences.

  6. Per-language keywords for all 24 languages:
       packages/semantic/src/generators/profiles/<lang>.ts
     then: npm run sync-keywords --prefix packages/vite-plugin

  7. LSP tier list:  packages/language-server/src/command-tiers.ts
  8. Docs:           apps/docs-site/en/api/commands/${category}.md

Then run the gates — they are the verification, not this script:

  npm run verify:reference   --prefix packages/core
  npm run typecheck          --prefix packages/core
  npm run test:quick         --prefix packages/core
  npm run docs:commands:check --prefix packages/core
  npm run generate:bundles:check --prefix packages/core
  npm run check:mapper-parity --prefix packages/semantic
  npm test --prefix packages/semantic
`);
