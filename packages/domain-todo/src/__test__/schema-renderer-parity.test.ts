/**
 * Schema ↔ renderer parity: the drift lock.
 *
 * Two renderings of the same command ship in this package and could disagree:
 * the hand-written `renderTodo` and the schema-driven `createSchemaRenderer`
 * over the same schemas, with nothing asserting they agree. This asserts it for
 * every command × language, on a fully-populated node and on a minimal one.
 *
 * `renderTodo`'s output is frozen (downstream depends on it), so a mismatch is
 * fixed by teaching the SCHEMA what the renderer does — never the other way
 * round. The schema path is what an extension command renders through, so a
 * schema that disagrees with the renderer means extensions render an
 * unidiomatic surface.
 */

import { describe, it, expect } from 'vitest';
import { createSchemaRenderer, type SemanticNode } from '@lokascript/framework';
import { allSchemas, allProfiles, createTodoDSL, renderTodo } from '../index';

const schemaRenderer = createSchemaRenderer(allSchemas, allProfiles);
const todo = createTodoDSL();
const LANGUAGES = allProfiles.map(p => p.code);

/** One English example per command, exercising every role the command has. */
const EXAMPLES: Record<string, string> = {
  add: 'add milk to groceries',
  complete: 'complete milk',
  list: 'list groceries',
};

/** Drop every optional role, leaving only what the schema requires. */
function stripOptionalRoles(node: SemanticNode): SemanticNode {
  const schema = allSchemas.find(s => s.action === node.action);
  const required = new Set(schema?.roles.filter(r => r.required).map(r => r.role) ?? []);
  const roles = new Map([...node.roles].filter(([role]) => required.has(role)));
  return { ...node, roles };
}

describe('createSchemaRenderer agrees with renderTodo', () => {
  for (const schema of allSchemas) {
    const example = EXAMPLES[schema.action];
    if (!example) {
      it(`${schema.action} has an example to compare`, () => {
        expect.fail(`No example for "${schema.action}" — add one to EXAMPLES.`);
      });
      continue;
    }

    const full = todo.parse(example, 'en');
    const minimal = stripOptionalRoles(full);

    it(`${schema.action}'s example populates every role`, () => {
      const missing = schema.roles.map(r => r.role).filter(role => !full.roles.has(role));
      expect(missing).toEqual([]);
    });

    for (const language of LANGUAGES) {
      it(`${schema.action} × ${language} — all roles populated`, () => {
        expect(schemaRenderer.render(full, language)).toBe(renderTodo(full, language));
      });

      it(`${schema.action} × ${language} — required roles only`, () => {
        expect(schemaRenderer.render(minimal, language)).toBe(renderTodo(minimal, language));
      });
    }
  }
});

describe('keyword tables agree with the language profiles', () => {
  // renderTodo reads its own COMMAND_KEYWORDS table; the schema renderer reads
  // the profiles. A keyword that drifts between them would show up above as an
  // opaque string diff, so check it directly for a readable failure.
  for (const schema of allSchemas) {
    it(`${schema.action} has a profile keyword in every supported language`, () => {
      const missing = LANGUAGES.filter(code => {
        const profile = allProfiles.find(p => p.code === code);
        return !profile?.keywords[schema.action]?.primary;
      });
      expect(missing).toEqual([]);
    });
  }
});
