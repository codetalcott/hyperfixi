/**
 * No role may be bound to a role MARKER
 *
 * Regression gate for the defect filed by Arc 1 step 4 and fixed the same day
 * (`PARSER_NEXT_STEPS.md`): `toggle .active on #panel`, parsed traditionally
 * and converted with `fromCoreAST`, bound `destination` to the literal
 * identifier `on` — the MARKER — while `#panel`, the thing it marks, was bound
 * to nothing. `aot-compiler`'s `command-transforms.ts` reads `node.roles` in two
 * dozen places, so the marker string reached generated code.
 *
 * ## Why this is an audit and not a handful of cases
 *
 * The defect was invisible to `tools/triage-parse-paths.ts`, which measures
 * where the two parse paths DIFFER — here they agreed, both wrongly, because
 * every affected command was on `parseCommandCore`'s `skipSemanticParsing` list
 * and only one parser ever ran (historical: the in-loop semantic path this describes was deleted by Arc 1 step 6, 2026-09-02 — English is parsed by the core parser alone). A per-case test would have pinned the one
 * example someone happened to look at; sweeping every documented command
 * example is what found that NINE commands were affected, not the one the
 * filing named.
 *
 * ## What a failure means
 *
 * A NEW row means some command's schema gained a marker surface without
 * `argSkipTokens` (or a `methodCarrier`) to match — fix the schema, not this
 * test. A row DISAPPEARING from `KNOWN_UNFIXED` means a deeper defect got
 * fixed: delete the entry, and say so.
 */

import { describe, it, expect } from 'vitest';
import { commandExamples } from '../../parser/__tests__/engine-corpus';
import { hyperscript } from '../../api/hyperscript-api';
import { fromCoreAST } from './from-core';
import { schemaRoleInferrer } from '../../multilingual/schema-roles';

/**
 * English words that are role MARKERS by construction — they introduce a role's
 * value and are never the value. Deliberately excludes words that are
 * legitimately bindable (`me`, `it`, `result`, `first`, `last`).
 */
const MARKER_WORDS = new Set([
  'to',
  'from',
  'into',
  'on',
  'in',
  'at',
  'of',
  'with',
  'for',
  'by',
  'before',
  'after',
  'over',
  'under',
  'as',
  'the',
  'url',
  'then',
  'end',
]);

/**
 * Rows that still bind a marker, each for a REASON, so a silent regression
 * cannot hide among them.
 *
 * - `swap` is not a defect: `over` is swapSchema's `methodCarrier`, and binding
 *   it to `method` is that feature working as designed.
 * - `morph` and `pick` are a deeper, shared defect — the SEMANTIC parser cannot
 *   parse these surfaces either (morph: confidence 0; pick: an unconsumed-input
 *   warning and `patient="source"`), so there is no oracle for the right shape.
 *   Fixing them means teaching a parser, not annotating a schema.
 */
const KNOWN_UNFIXED: ReadonlyArray<`${string}.${string}="${string}"`> = [
  // `swap.method="over"` and `morph.patient="over"` left this list with Arc 3
  // step 3's swap PR: the strategy word is `modifiers.strategy` now, so there
  // is no bare `over` in `args` for the positional pass to bind as a value.
  'pick.patient="from"',
];

function collectCommands(node: unknown, out: Array<Record<string, unknown>>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach(n => collectCommands(n, out));
    return;
  }
  const rec = node as Record<string, unknown>;
  if (rec.type === 'command') out.push(rec);
  Object.values(rec).forEach(v => collectCommands(v, out));
}

/** Every `command.role="markerWord"` binding across the documented examples. */
function auditMarkerBindings(): string[] {
  const found = new Set<string>();

  for (const example of commandExamples()) {
    const compiled = hyperscript.compileSync(example.source, {
      traditional: true,
    } as never) as { ok: boolean; ast?: unknown };
    if (!compiled.ok || !compiled.ast) continue;

    const commands: Array<Record<string, unknown>> = [];
    collectCommands(
      fromCoreAST(compiled.ast as never, { inferRoles: schemaRoleInferrer }),
      commands
    );

    for (const command of commands) {
      const roles = (command.roles ?? {}) as Record<
        string,
        { type?: string; name?: unknown; value?: unknown }
      >;
      for (const [role, value] of Object.entries(roles)) {
        if (value?.type !== 'identifier') continue;
        const word = String(value.name ?? value.value ?? '').toLowerCase();
        if (!MARKER_WORDS.has(word)) continue;
        found.add(`${String(command.name)}.${role}="${word}"`);
      }
    }
  }

  return [...found].sort();
}

describe('interchange roles never bind a role marker', () => {
  it('the audit sees something — otherwise every assertion below is vacuous', () => {
    // The guard on the guard: if compileSync or the corpus ever yields nothing,
    // an empty result set would satisfy the subset check trivially.
    const commands: Array<Record<string, unknown>> = [];
    const compiled = hyperscript.compileSync('toggle .active on #panel', {
      traditional: true,
    } as never) as { ok: boolean; ast?: unknown };
    collectCommands(
      fromCoreAST(compiled.ast as never, { inferRoles: schemaRoleInferrer }),
      commands
    );
    expect(commands.length).toBeGreaterThan(0);
    expect(commandExamples().length).toBeGreaterThan(50);
  });

  it('binds no marker word beyond the known-unfixed list', () => {
    expect(auditMarkerBindings()).toEqual([...KNOWN_UNFIXED].sort());
  });

  it('the fixed commands bind the VALUE the marker introduces', () => {
    const roleValue = (source: string, role: string): unknown => {
      const compiled = hyperscript.compileSync(source, { traditional: true } as never) as {
        ast?: unknown;
      };
      const node = fromCoreAST(compiled.ast as never, {
        inferRoles: schemaRoleInferrer,
      }) as unknown as { roles?: Record<string, { value?: unknown; name?: unknown }> };
      const v = node.roles?.[role];
      return v?.value ?? v?.name;
    };

    // The row that surfaced the defect.
    expect(roleValue('toggle .active on #panel', 'destination')).toBe('#panel');
    expect(roleValue('toggle .active on #panel', 'patient')).toBe('.active');

    expect(roleValue('trigger click on #button', 'destination')).toBe('#button');
    expect(roleValue('remove .active from me', 'source')).toBe('me');
    expect(roleValue('halt the event', 'patient')).toBe('event');

    // `set`'s fix is core-side: from-core.ts's explicit case took args[1] — the
    // `to` keyword — and dropped the value.
    expect(roleValue('set myVar to "value"', 'patient')).toBe('value');
    expect(roleValue('set myVar to "value"', 'destination')).toBe('myVar');
  });
});
