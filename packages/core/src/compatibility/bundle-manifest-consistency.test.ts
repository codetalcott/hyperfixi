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
 * an alias map).
 *
 * ---------------------------------------------------------------------------
 * STILL LOAD-BEARING AFTER GENERATION (Arc E step 4)
 * ---------------------------------------------------------------------------
 *
 * hybrid-complete's two switch bodies are now GENERATED from the manifest by
 * `scripts/generate-bundles.ts`, so for that file the drift this was written to
 * catch is structurally impossible — which raises the fair question of whether
 * it still earns its place. It does, for three reasons:
 *
 *   - it reads the COMMITTED file, so it fails if the committed output is stale
 *     for any reason the `--check` gate is not currently run for (a hand-edit
 *     inside the markers, a bad merge resolution, a partial revert);
 *   - the `blocks` half is not generated from the block manifest at all —
 *     `else`/`unless` are advertised syntax with no case of their own, so that
 *     mapping stays hand-checked;
 *   - it is the only gate stated over SOURCE TEXT. The execution gates import
 *     the module, so both are blind to a file that is correct in the ways they
 *     sample and wrong in the committed bytes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { COMMAND_ALIASES } from '../parser/hybrid/aliases';
import { resolveCommandKey } from '../bundle-generator/template-capabilities';

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

  it('every advertised command has a case label (directly or via an alias)', () => {
    const advertised = extractAdvertised(source, 'commands');
    expect(advertised.length).toBeGreaterThan(15);

    // TWO alias maps resolve a name here, and conflating them is what made this
    // check wrong once generation landed (Arc E step 4):
    //
    //   - `parser/hybrid/aliases.ts` maps SPELLINGS a user may type onto a
    //     canonical command (`fire` → `trigger`, `dispatch` → `send`).
    //   - `bundle-generator/template-capabilities.ts` maps an ADVERTISED name
    //     onto the template that implements it (`trigger` → `send`, `push-url`
    //     → `push`). This is the map generation itself resolves through, so it
    //     is the one that decides which `case` label ends up in the file.
    //
    // `trigger` is a VALUE in the first map and a KEY in the second, so
    // resolving through the parser map alone left it looking unimplemented
    // while it executed correctly — the parser emits a `send` node for both
    // spellings, which is why `case 'trigger':` was unreachable dead code
    // before step 4 removed it structurally.
    const missing = advertised.filter(cmd => {
      const canonical = COMMAND_ALIASES[cmd] ?? cmd;
      return !cases.has(cmd) && !cases.has(canonical) && !cases.has(resolveCommandKey(cmd));
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

  it('trigger still resolves to an implemented template (the 2026-07-20 regression)', () => {
    // TRANSFORMED in Arc E step 4, deliberately not deleted.
    //
    // This used to pin `case 'trigger':\n case 'send': {` by source regex. That
    // label was measured to be UNREACHABLE — the parser emits a `send` node for
    // both spellings, so nothing could ever dispatch to it — and generation
    // removed it structurally, since the templates carry no `trigger` case.
    // A source-text pin on a dead label was asserting the presence of code that
    // could not run, so keeping it would have blocked the fix it was written to
    // protect.
    //
    // The invariant it actually guarded — `trigger` must not be a silent no-op —
    // is now covered twice over, both more strongly than a regex:
    //
    //   - here, structurally: `trigger` resolves to a template that IS emitted;
    //   - in `shipped-bundle-execution.test.ts`, by EXECUTION: `trigger foo on
    //     #t` must dispatch on the named target and NOT on `me`.
    expect(resolveCommandKey('trigger')).toBe('send');
    expect(cases.has(resolveCommandKey('trigger'))).toBe(true);
    expect(extractAdvertised(source, 'commands')).toContain('trigger');
  });
});
