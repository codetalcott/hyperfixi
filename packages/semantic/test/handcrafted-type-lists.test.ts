/**
 * The handcrafted patterns' role types are the schema's, not copies of them (M3
 * (a), `docs-internal/MULTILINGUAL_NEXT_STEPS.md`). A copied list drifts: German
 * lost every `get` of a literal to one (PR 130), and vi's `gán … vào …` set kept
 * one without the property path until M3. A role whose types a schema states reads them from
 * `generators/role-types.ts`, which the schema reads too.
 *
 * This counts the literal lists left in `src/patterns/` and only shrinks. A new
 * pattern takes a shared list; a list that narrows its schema's on purpose says
 * why beside it, and the count here comes down when one is derived.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Literal `expectedTypes: [...]` lists in src/patterns/ on 2026-10-12 (139 before M3). */
const MAX_LITERAL_LISTS = 63;

describe('handcrafted pattern type lists', () => {
  it('do not grow back', () => {
    const dir = join(__dirname, '..', 'src', 'patterns');
    let count = 0;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts')) continue;
      count += readFileSync(join(dir, file), 'utf8').match(/expectedTypes: \[/g)?.length ?? 0;
    }
    expect(
      count,
      count > MAX_LITERAL_LISTS
        ? 'use a list from generators/role-types.ts instead of a copy'
        : `${MAX_LITERAL_LISTS - count} fewer: lower MAX_LITERAL_LISTS to ${count}`
    ).toBe(MAX_LITERAL_LISTS);
  });
});
