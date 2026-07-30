/**
 * The command-docs generator's coverage — Arc B step 4b.
 *
 * ## Why this file exists
 *
 * `scripts/generate-command-docs.ts` held a hand-maintained `COMMANDS` table of
 * **43** entries against a **59**-command registry, and **nothing compared it to
 * anything**: no npm script ran it, no CI step checked it, and the manifest audit
 * could not see it because the generator lives in `scripts/`. So sixteen shipped
 * commands — `blur`, `breakpoint`, `clear`, `close`, `empty`, `focus`, `morph`,
 * `open`, `process`, `push`, `replace`, `reset`, `scroll`, `select`, `start`,
 * `swap` — were simply undocumented, and would have stayed that way. That is the
 * queue's founding disease verbatim: *a list that describes code, that nothing
 * compares to the code.*
 *
 * The table is now complete, and this is the mechanism that keeps it so.
 *
 * ## Why it reads source TEXT rather than importing
 *
 * The generator is a CLI script with top-level side effects — importing it would
 * write files during the test run. Reading its source is the same approach the
 * manifest audit uses for the cross-package LSP tier lists, and it is why the
 * table's formatting is pinned below: the extraction has to keep working.
 *
 * ## What is deliberately NOT duplicated here
 *
 * Arc A already gates the two lists the Arc B plan named as "cheap completeness
 * tests" — `reference/index.ts` in the manifest audit's §2 ("documents exactly the
 * registered set") and `lsp-metadata`'s `COMMAND_KEYWORDS`/`HOVER_DOCS` in §5,
 * both directions. Re-asserting them here would add a second place to maintain
 * without adding a check. Measured before writing, not assumed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { COMMAND_NAMES } from '../manifest';
import { Runtime } from '../../runtime/runtime';

const GENERATOR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../scripts/generate-command-docs.ts'
);

function generatorSource(): string {
  return readFileSync(GENERATOR, 'utf8');
}

/** The `{ name: 'x', class: X }` rows of the generator's COMMANDS table, in order. */
function tableNames(src: string): string[] {
  const start = src.indexOf('const COMMANDS: CommandEntry[] = [');
  expect(start, 'the COMMANDS table moved — fix this extraction').toBeGreaterThan(-1);
  const end = src.indexOf('\n];', start);
  const block = src.slice(start, end);
  return [...block.matchAll(/\{ name: '([^']+)', class: \w+ \}/g)].map(m => m[1]);
}

describe('the command-docs generator covers the whole command set', () => {
  it('names exactly COMMAND_NAMES, in the same order', () => {
    // ORDERED equality, not set equality: the manifest is sorted in registry
    // order so that adding a command is a one-line diff here too, and an ordered
    // check keeps the two from drifting in arrangement as well as in content.
    expect(tableNames(generatorSource())).toEqual([...COMMAND_NAMES]);
  });

  it('has no duplicate rows', () => {
    // A duplicated row satisfies set-equality and collapses in a Map, so neither
    // the check above nor the generator's own output would notice it; the row
    // count is what rules it out.
    const names = tableNames(generatorSource());
    expect(names.length).toBe(new Set(names).size);
  });

  it('is the same set the engine actually registers', () => {
    // COMMAND_NAMES is the manifest's own list, and the manifest audit holds it
    // to the registry — but this file's whole point is that a docs list must be
    // compared to the CODE, so it asks the runtime directly rather than trusting
    // one hop of indirection.
    const registered = [...new Runtime().getRegistry().getCommandNames()].sort();
    expect([...tableNames(generatorSource())].sort()).toEqual(registered);
  });

  it('emits no timestamp, so `--check` means "content drifted"', () => {
    // The gate is only usable because the output is deterministic. A
    // `Generated: <ISO>` line made a whole-file `--check` fail on every run
    // (measured in step 4a), so its absence is load-bearing, not cosmetic.
    const src = generatorSource();
    expect(src).not.toMatch(/Generated: \$\{new Date\(\)/);
    expect(src).not.toMatch(/generatedAt: new Date\(\)/);
  });

  it('formats its output with prettier, so regenerating is a no-op', () => {
    // Without this the generator emits unpadded markdown tables, the pre-commit
    // hook pads them, and the next run un-pads them — a 252-line diff of pure
    // column padding with identical content (measured in step 4a). A `--check`
    // over a non-idempotent generator can never pass twice.
    expect(generatorSource()).toMatch(/await prettier\.format\(/);
  });
});

describe('every registered command carries publishable prose', () => {
  // Passes today for all 59; it is a RATCHET, not a discovery. The metadata is
  // now the single source for the generated docs, so an empty description here
  // would ship an empty row there — and `commandMeta` cannot catch it, because
  // `''` is a perfectly good `string`.
  const rows = [
    ...(
      new Runtime().getRegistry() as unknown as {
        implementations: Map<string, { metadata?: Record<string, unknown> }>;
      }
    ).implementations,
  ];

  it('has a non-empty description', () => {
    const bad = rows
      .filter(([, impl]) => !String(impl.metadata?.description ?? '').trim())
      .map(([name]) => name);
    expect(bad).toEqual([]);
  });

  it('has at least one syntax form and one example', () => {
    const bad: string[] = [];
    for (const [name, impl] of rows) {
      const syntax = impl.metadata?.syntax;
      const forms = Array.isArray(syntax) ? syntax : syntax ? [syntax] : [];
      if (forms.length === 0) bad.push(`${name}: no syntax`);
      if (!(impl.metadata?.examples as unknown[] | undefined)?.length) {
        bad.push(`${name}: no examples`);
      }
    }
    expect(bad).toEqual([]);
  });
});
