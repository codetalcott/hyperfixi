/**
 * `COMMAND_ARITY` is a declared table; this pins it to two measurements:
 * the positional arity the parser emits over each command's documented
 * examples (declared range ⊇ measured), and the highest `raw.args[i]` each
 * `parseInput` reads (below the declared max). A row wider than both is a
 * phantom range; a read beyond the row is the bug this exists to catch.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../parser';
import { commandExamples } from './engine-corpus';
import { COMMAND_ARITY, COMMAND_SLOTS } from '../../ast/command-slots';
import { census, parseInputBodies } from '../../commands/__tests__/parse-input-census';

function walk(node: unknown, into: Map<string, number[]>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, into);
    return;
  }
  const rec = node as Record<string, unknown>;
  if (rec.type === 'command' && typeof rec.name === 'string') {
    const list = into.get(rec.name) ?? [];
    list.push(((rec.args as unknown[] | undefined) ?? []).length);
    into.set(rec.name, list);
  }
  for (const v of Object.values(rec)) if (v && typeof v === 'object') walk(v, into);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('COMMAND_ARITY is the measured truth', () => {
  const measured = new Map<string, number[]>();
  for (const { source } of commandExamples()) {
    const r = parse(source);
    if (r.node) walk(r.node, measured);
  }

  it('has a row for every slot row, and no other', () => {
    expect(Object.keys(COMMAND_ARITY).sort()).toEqual(Object.keys(COMMAND_SLOTS).sort());
  });

  it('every declared range contains the arity the parser emits over the documented examples', () => {
    const outside: string[] = [];
    for (const [name, [min, max]] of Object.entries(COMMAND_ARITY)) {
      for (const n of measured.get(name) ?? []) {
        if (n < min || (max !== null && n > max))
          outside.push(`${name}: emitted ${n}, declared [${min}, ${max}]`);
      }
    }
    expect(outside).toEqual([]);
  });

  it('no parseInput reads a positional index at or beyond its declared max', () => {
    const beyond: string[] = [];
    for (const [body, { file }] of Object.entries(census().commands)) {
      // Not `new URL(template, import.meta.url)`: Vite rewrites that form and only supports static strings.
      const source = readFileSync(join(ROOT, file), 'utf8');
      const text = parseInputBodies(source).join('\n');
      const indices = [...text.matchAll(/raw\.args\[(\d+)\]/g)].map(m => Number(m[1]));
      if (!indices.length) continue;
      const names = body in COMMAND_ARITY ? [body] : [];
      for (const name of names) {
        const [, max] = COMMAND_ARITY[name as keyof typeof COMMAND_ARITY];
        const top = Math.max(...indices);
        if (max !== null && top >= max)
          beyond.push(`${name}: reads args[${top}], declared max ${max}`);
      }
    }
    expect(beyond).toEqual([]);
  });
});
