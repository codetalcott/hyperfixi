#!/usr/bin/env npx tsx
/**
 * Harvest the command-shape gate's cases (see src/multilingual/command-shapes.ts)
 * into src/multilingual/command-shapes.cases.json.
 *
 * Sources, in this order (a source met twice keeps its first origin):
 *
 *   1. every `_` attribute and `<script type="text/hyperscript">` body in the
 *      vendored upstream suite (packages/engine/upstream-suite/vendor/<v>/test):
 *      each test file is parsed as JavaScript, every concatenation of string
 *      literals is folded, and each folded string that holds markup is read by
 *      jsdom, as the browser would read it; plus each script a test writes
 *      with `setAttribute('_', '…')`;
 *   2. core's reference examples and patterns (packages/core/src/reference);
 *   3. core's hover examples for commands and features
 *      (packages/core/src/lsp-metadata.ts).
 *
 * A source the engine does not read is left out: upstream's parse-error
 * tests. A page's script is read as the host reads it (a program of
 * features); a documented example as statements (see Reader). The gate reads the committed
 * file, never this tool, so a case only changes when someone re-harvests.
 *
 * Usage: npx tsx tools/harvest-command-shapes.ts [--dry-run]
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { commands as referenceCommands, patterns } from '../../core/src/reference/index';
import { HOVER_DOCS } from '../../core/src/lsp-metadata';
import {
  CASES_PATH,
  collapse,
  loadEngineReaders,
  readerOf,
  vendoredUpstreamVersion,
  type CommandShapeCase,
  type CommandShapeCases,
  type EngineParser,
  type Reader,
} from '../src/multilingual/command-shapes';

const here = path.dirname(fileURLToPath(import.meta.url));
const SUITE = path.resolve(here, '../../engine/upstream-suite');
const DIRS = ['commands', 'core', 'expressions', 'features', 'templates'];

/** Every `.js` file under a directory, sorted, as paths relative to `root`. */
function jsFiles(root: string, dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(path.join(root, dir)).sort()) {
    const rel = path.join(dir, name);
    if (statSync(path.join(root, rel)).isDirectory()) out.push(...jsFiles(root, rel));
    else if (name.endsWith('.js')) out.push(rel);
  }
  return out;
}

/** The value of a string-literal expression (`'a' + "b" + `c``), or undefined. */
function fold(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return fold(node.expression);
  if (isConcatenation(node)) {
    const left = fold(node.left);
    const right = left === undefined ? undefined : fold(node.right);
    return left === undefined || right === undefined ? undefined : left + right;
  }
  return undefined;
}

const isConcatenation = (node: ts.Node): node is ts.BinaryExpression =>
  ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken;

/** The operands of a `+` chain, flattened (`a + b + c` is `(a + b) + c`). */
function operands(node: ts.Expression): ts.Expression[] {
  if (ts.isParenthesizedExpression(node)) return operands(node.expression);
  return isConcatenation(node) ? [...operands(node.left), ...operands(node.right)] : [node];
}

/**
 * What a JavaScript file holds that may be hyperscript: its largest constant
 * strings (markup, read for scripts later), and the scripts it writes with
 * `setAttribute('_', '…')`.
 */
function constantStrings(file: string): { markup: string[]; scripts: string[] } {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const markup: string[] = [];
  const scripts: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'setAttribute' &&
      node.arguments.length === 2 &&
      fold(node.arguments[0] as ts.Expression) === '_'
    ) {
      const script = fold(node.arguments[1] as ts.Expression);
      if (script !== undefined) {
        scripts.push(script);
        return;
      }
    }
    const value = fold(node);
    if (value !== undefined) {
      markup.push(value);
      return;
    }
    // A concatenation with a run-time part: its constant pieces are fragments
    // of markup (an attribute cut off at a variable), not scripts.
    if (isConcatenation(node)) {
      for (const part of operands(node)) if (fold(part) === undefined) visit(part);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { markup, scripts };
}

const dom = new JSDOM('');

/** The hyperscript in a piece of markup: `_` attributes and hyperscript script bodies. */
function scriptsIn(markup: string): string[] {
  if (!/_\s*=|text\/hyperscript/.test(markup)) return [];
  const template = dom.window.document.createElement('template');
  template.innerHTML = markup;
  const out: string[] = [];
  for (const element of template.content.querySelectorAll('[_]')) {
    out.push(element.getAttribute('_') ?? '');
  }
  for (const script of template.content.querySelectorAll('script')) {
    if (script.getAttribute('type') === 'text/hyperscript') out.push(script.textContent ?? '');
  }
  return out;
}

/**
 * Indentation common to every non-blank line after the first, removed (the
 * first line starts right after the opening quote); ends trimmed.
 */
function dedent(text: string): string {
  const [first = '', ...rest] = text.replace(/\r\n/g, '\n').split('\n');
  const indents = rest
    .filter(line => line.trim())
    .map(line => /^[ \t]*/.exec(line)?.[0].length ?? 0);
  const cut = indents.length ? Math.min(...indents) : 0;
  return [first.trim(), ...rest.map(line => line.slice(cut).trimEnd())].join('\n').trim();
}

const idOf = (source: string): string =>
  createHash('sha1').update(collapse(source)).digest('hex').slice(0, 10);

/** Does the engine read the source, the way the case will be read? */
function engineReads(readers: Record<Reader, EngineParser>, shape: CommandShapeCase): boolean {
  try {
    readers[readerOf(shape)].parse(shape.source);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  // The engine is ESM-only, and tsx runs this file as CommonJS: loaded here.
  const readers = await loadEngineReaders();
  const version = vendoredUpstreamVersion();
  const testRoot = path.join(SUITE, 'vendor', version, 'test');
  const found: Array<{ source: string; origin: string; family: string }> = [];

  for (const dir of DIRS) {
    for (const rel of jsFiles(testRoot, dir)) {
      const stem = path.basename(rel, '.js');
      const family = dir === 'commands' || dir === 'features' ? stem : `${dir}/${stem}`;
      const { markup, scripts } = constantStrings(path.join(testRoot, rel));
      for (const script of [...markup.flatMap(scriptsIn), ...scripts]) {
        found.push({ source: dedent(script), origin: `upstream:${rel}`, family });
      }
    }
  }
  for (const [key, ref] of Object.entries(referenceCommands)) {
    for (const example of ref.examples) {
      found.push({ source: dedent(example), origin: `reference:${key}`, family: key });
    }
  }
  for (const pattern of patterns) {
    found.push({
      source: dedent(pattern.code),
      origin: `reference-pattern:${pattern.name}`,
      family: 'reference/patterns',
    });
  }
  for (const [key, doc] of Object.entries(HOVER_DOCS)) {
    if (doc.category !== 'command' && doc.category !== 'feature') continue;
    found.push({ source: dedent(doc.example), origin: `hover:${key}`, family: key });
  }

  const seen = new Set<string>();
  const cases: CommandShapeCase[] = [];
  let rejected = 0;
  for (const f of found) {
    const key = collapse(f.source);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const shape = { id: idOf(f.source), source: f.source, origin: f.origin, family: f.family };
    if (!engineReads(readers, shape)) {
      rejected++;
      continue;
    }
    cases.push(shape);
  }
  const ids = new Set(cases.map(c => c.id));
  if (ids.size !== cases.length) throw new Error('two sources share an id: lengthen idOf');

  const doc: CommandShapeCases = {
    description:
      "The command-shape gate's cases (src/multilingual/command-shapes.ts): every script in the " +
      "vendored upstream suite, core's reference examples and its hover examples, that the " +
      'engine parses. Harvested by tools/harvest-command-shapes.ts; do not edit by hand.',
    upstream: version,
    cases,
  };
  const byOrigin = cases.reduce<Record<string, number>>((m, c) => {
    const kind = c.origin.split(':')[0] ?? '';
    m[kind] = (m[kind] ?? 0) + 1;
    return m;
  }, {});
  console.log(
    `${seen.size} unique sources; ${rejected} the engine does not parse; ${cases.length} cases`,
    JSON.stringify(byOrigin)
  );
  if (process.argv.includes('--dry-run')) return;
  writeFileSync(CASES_PATH, JSON.stringify(doc, null, 2) + '\n');
  console.log(`wrote ${path.relative(process.cwd(), CASES_PATH)}`);
}

main().then(
  () => process.exit(0),
  e => {
    console.error(e);
    process.exit(1);
  }
);
