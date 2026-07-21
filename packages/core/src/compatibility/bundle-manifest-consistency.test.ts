/**
 * Bundle manifest ↔ inline runtime consistency (2026-07-20 pre-release audit).
 *
 * The hand-written bundle entries advertise a `commands: [...]` manifest AND
 * implement their own inline `executeCommand` switch — two copies of the same
 * truth with no check between them. This drifted in practice: `trigger` was
 * advertised by hybrid-complete (and hybrid-hx, which reuses its runtime) but
 * had no case label and no alias entry, making `trigger`/`fire` a silent no-op
 * in both shipped bundles. This test parses the entry source and pins the
 * invariant: every advertised command must have a case label (directly or via
 * the parser's COMMAND_ALIASES canonicalization).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { COMMAND_ALIASES } from '../parser/hybrid/aliases';

const here = dirname(fileURLToPath(import.meta.url));

function loadEntry(filename: string): string {
  return readFileSync(resolve(here, filename), 'utf-8');
}

function extractAdvertised(source: string, key: 'commands' | 'blocks'): string[] {
  const match = source.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  if (!match) throw new Error(`no advertised ${key} array found`);
  return [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

function extractExecuteCommandCases(source: string): Set<string> {
  // Slice the executeCommand function region so expression-evaluator case
  // labels (e.g. 'literal', 'first') can't mask a missing COMMAND case.
  const start = source.indexOf('async function executeCommand');
  expect(start).toBeGreaterThan(-1);
  const rest = source.slice(start);
  const nextFn = rest.slice(1).search(/\n(?:async )?function \w+/);
  const region = nextFn === -1 ? rest : rest.slice(0, nextFn + 1);
  return new Set([...region.matchAll(/case '([^']+)':/g)].map(m => m[1]));
}

describe('hybrid-complete bundle manifest ↔ inline runtime', () => {
  const source = loadEntry('./browser-bundle-hybrid-complete.ts');
  const cases = extractExecuteCommandCases(source);

  it('every advertised command has a case label (directly or via parser alias)', () => {
    const advertised = extractAdvertised(source, 'commands');
    expect(advertised.length).toBeGreaterThan(15);

    const missing = advertised.filter(cmd => {
      const canonical = COMMAND_ALIASES[cmd] ?? cmd;
      return !cases.has(cmd) && !cases.has(canonical);
    });
    expect(
      missing,
      `advertised in the manifest but no executeCommand case (silent no-op at runtime): ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('every advertised block has a case label (if-family folds into the if case)', () => {
    const advertised = extractAdvertised(source, 'blocks');
    // Block cases live in a separate dispatch from executeCommand, so search
    // the whole file for their labels; block names don't collide with the
    // expression-evaluator labels the command check must exclude.
    const allCases = new Set([...source.matchAll(/case '([^']+)':/g)].map(m => m[1]));
    // `else`/`unless` are folded into the `if` case by the parser — they are
    // legitimately advertised without their own labels.
    const folded = new Set(['else', 'unless']);
    const missing = advertised.filter(b => !folded.has(b) && !allCases.has(b));
    expect(missing, `advertised blocks with no case: ${missing.join(', ')}`).toEqual([]);
  });

  it('trigger dispatches like send (the 2026-07-20 silent no-op regression)', () => {
    // Pin the specific fix: the send case must also carry the trigger label,
    // since `fire` canonicalizes to `trigger` (not to `send`).
    expect(source).toMatch(/case 'trigger':\s*\n\s*case 'send': \{/);
  });
});
