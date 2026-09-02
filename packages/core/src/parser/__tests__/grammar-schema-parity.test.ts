/**
 * The engine's declared grammar and the front-end's schemas describe the same
 * commands — and where they disagree, it is written down here
 *
 * Arc 3 step 4 chose a core-local grammar (option a) over reusing
 * `@lokascript/semantic`'s schemas (option b). The price of two descriptions
 * is drift, and this is the test the plan asked for in exchange: for every
 * command the generic parser serves, the marker words the grammar opens a
 * slot on are compared with the English marker words the front-end's schema
 * would bind for that command. Agreement is asserted; the known asymmetries
 * are pinned by name so a new one cannot appear silently and a closed one has
 * to be removed here.
 *
 * The front-end is imported dynamically: this is a test, and the boundary
 * ratchet (`check-semantic-boundary`) counts source files, but the point of
 * option (a) is that `parser/` never imports the front-end — so this file
 * must not become a reason to.
 */

import { describe, it, expect } from 'vitest';
import { COMMAND_GRAMMAR } from '../command-grammar';

/**
 * Commands where the two descriptions differ, with why. Each row is a claim
 * about BOTH sides; the test fails if the difference disappears (then delete
 * the row) or changes shape (then re-measure).
 */
const KNOWN_ASYMMETRIES: Readonly<Record<string, string>> = {
  // `copy <source> to clipboard`: the tail is inert — CopyCommand ignores it
  // and the schema models no destination. The grammar keeps `to` so the
  // documented tail is consumed as a slot rather than left in the token
  // stream for the statement loop.
  copy: 'grammar-only [to] schema-only []',
  // The schema gives `get` a destination role (`on`) the engine's GetCommand
  // has never read — it takes `args[0]` only. Schema-side surplus.
  get: 'grammar-only [] schema-only [on]',
  // Constructor syntax: `a`/`an` are articles, `from` opens the argument list
  // and `called` the name. The schema models `make` positionally and has no
  // role for any of them.
  make: 'grammar-only [a,an,from,called] schema-only []',
  // `open <dialog> as modal`: the engine parses `as` INSIDE the expression
  // (an `asExpression`, which OpenCommand reads), so the grammar deliberately
  // opens no slot on it; the schema binds the same word to its `style` role.
  open: 'grammar-only [] schema-only [as]',
  // `settle [for <timeout>]` is documented and now parses, but the front-end's
  // schema has NO duration role for settle — a non-English program cannot say
  // it. A front-end gap, filed in MULTILINGUAL_NEXT_STEPS.md.
  settle: 'grammar-only [for] schema-only []',
};

describe('declared grammar ↔ semantic schema marker parity (English)', () => {
  it('every generic command with marker slots agrees with the schema, except the pinned asymmetries', async () => {
    const semantic = await import('@lokascript/semantic');
    const getSchema = semantic.getSchema as (
      a: string
    ) =>
      | { roles: ReadonlyArray<{ role: string; markerOverride?: Record<string, string> }> }
      | undefined;
    const getRoleMarkers = semantic.getRoleMarkers as (
      lang: string,
      role: string
    ) => { primary: string } | undefined;

    const differences: Record<string, string> = {};
    for (const [command, grammar] of Object.entries(COMMAND_GRAMMAR)) {
      if (command === 'beep!') continue;
      const schema = getSchema(command);
      if (!schema) {
        if (grammar.markers.length > 0)
          differences[command] =
            `grammar markers [${grammar.markers}] but the front-end has no schema`;
        continue;
      }
      const schemaMarkers = new Set<string>();
      for (const role of schema.roles) {
        const marker = role.markerOverride?.en ?? getRoleMarkers('en', role.role)?.primary ?? '';
        if (marker) schemaMarkers.add(marker);
      }
      const onlyGrammar = grammar.markers.filter(m => !schemaMarkers.has(m));
      const onlySchema = [...schemaMarkers].filter(m => !grammar.markers.includes(m));
      if (onlyGrammar.length || onlySchema.length) {
        differences[command] = `grammar-only [${onlyGrammar}] schema-only [${onlySchema}]`;
      }
    }
    expect(differences).toEqual(KNOWN_ASYMMETRIES);
  });
});
