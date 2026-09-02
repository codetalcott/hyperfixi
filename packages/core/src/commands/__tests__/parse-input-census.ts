/**
 * The parseInput census — the measurement behind Arc 3 step 1's ratchet
 *
 * Shared by `parse-input-census.test.ts` (the gate) and
 * `scripts/generate-parse-input-census.ts` (the regenerator), the way
 * `engine-corpus.ts` is shared by the AST-equivalence gate and its generator:
 * one implementation, so the baseline cannot be written by a different
 * measurement than the one that checks it. Lives under `__tests__` because
 * it reads source files at runtime and is not shipped.
 *
 * Per `parseInput` body: line count, branch count (`if (` / `case` /
 * ternary), syntax-discrimination sites (positional `args[i]` reads and
 * keyword-name compares — the grammar re-derived at runtime, which Arc 3
 * moves into the parser) and value-evaluation sites (evaluator calls and
 * `raw.modifiers` reads — the slot work that stays).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface CensusRow {
  readonly file: string;
  readonly lines: number;
  readonly branches: number;
  /** syntax discrimination: positional reads + keyword-name compares */
  readonly syntaxSites: number;
  /** value evaluation: evaluator calls + modifier reads */
  readonly valueSites: number;
}

export interface Census {
  readonly $comment: string;
  readonly generated: string;
  readonly totals: {
    bodies: number;
    lines: number;
    branches: number;
    syntaxSites: number;
    valueSites: number;
  };
  readonly commands: Record<string, CensusRow>;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const COMMANDS_DIR = join(ROOT, 'src', 'commands');
export const BASELINE = join(ROOT, 'baselines', 'parse-input-census.json');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== '__tests__') walk(p, out);
    } else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

/** The text of every `parseInput(` method body in a file, brace-matched. */
function parseInputBodies(source: string): string[] {
  const bodies: string[] = [];
  const re = /\n\s*(?:async\s+)?parseInput\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const close = source.indexOf(')', m.index + m[0].length);
    const open = source.indexOf('{', close);
    let depth = 0;
    let i = open;
    for (; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}' && --depth === 0) break;
    }
    bodies.push(source.slice(m.index + 1, i + 1));
  }
  return bodies;
}

function count(re: RegExp, text: string): number {
  return (text.match(re) ?? []).length;
}

export function census(): Census {
  const commands: Record<string, CensusRow> = {};
  for (const file of walk(COMMANDS_DIR).sort()) {
    const source = readFileSync(file, 'utf8');
    const bodies = parseInputBodies(source);
    if (bodies.length === 0) continue;
    // One row per body; a file with two classes (swap.ts holds swap and
    // morph) gets two rows, named by the nearest preceding @command / name.
    const names = [
      ...source.matchAll(
        /@command\(\{\s*name:\s*'([^']+)'|readonly name = '([^']+)'|abstract class (\w+)/g
      ),
    ].map(x => x[1] ?? x[2] ?? x[3]);
    bodies.forEach((body, index) => {
      const name = names[index] ?? `${relative(COMMANDS_DIR, file)}#${index}`;
      commands[name] = {
        file: relative(ROOT, file),
        lines: body.split('\n').length,
        branches: count(/\bif\s*\(|\bcase\s|\?\s*[^.:?]/g, body),
        syntaxSites:
          count(/\bargs\[\d+\]/g, body) +
          count(
            /\.name\s*===\s*'|\bname\s*===\s*'|===\s*'(?:to|from|into|with|by|at|before|after|over|on|in|as|for|until|between|and)'/g,
            body
          ),
        valueSites:
          count(
            /evaluator\.evaluate\(|resolveTargetsFromArgs\(|resolveTargetElements\(|parseTemporalModifiers\(/g,
            body
          ) + count(/raw\.modifiers/g, body),
      };
    });
  }
  const rows = Object.values(commands);
  const sum = (k: keyof Omit<CensusRow, 'file'>) => rows.reduce((n, r) => n + r[k], 0);
  return {
    $comment:
      'Arc 3 step 1 census of every parseInput body (docs-internal/ENGINE_MIGRATION_PLAN.md). Per command: line count, branch count, syntax-discrimination sites (positional args[i] reads + keyword-name compares) and value-evaluation sites (evaluator calls + raw.modifiers reads). Shrink-only: parse-input-census.test.ts fails on any increase. Regenerate with `npx tsx scripts/generate-parse-input-census.ts --update` in the SAME PR that lowers a number.',
    generated: new Date().toISOString().slice(0, 10),
    totals: {
      bodies: rows.length,
      lines: sum('lines'),
      branches: sum('branches'),
      syntaxSites: sum('syntaxSites'),
      valueSites: sum('valueSites'),
    },
    commands,
  };
}
