/**
 * Schema ↔ renderer parity: the drift lock.
 *
 * Two renderings of the same command shipped in this package and could disagree:
 * the hand-written `renderSQL` and the schema-driven `createSchemaRenderer` over
 * the same schemas, with nothing asserting they agree. This asserts it for every
 * command × language, on a fully-populated node and on a minimal one.
 *
 * `renderSQL`'s output is frozen (downstream depends on it), so a mismatch is
 * fixed by teaching the SCHEMA what the renderer does — never the other way round.
 */

import { describe, it, expect } from 'vitest';
import { createSchemaRenderer, type SemanticNode } from '@lokascript/framework';
import { allSchemas, allProfiles, createSQLDSL, renderSQL } from '../index';

const schemaRenderer = createSchemaRenderer(allSchemas, allProfiles);
const sql = createSQLDSL();
const LANGUAGES = allProfiles.map(p => p.code);

/** One English example per command, exercising every role the command has. */
const EXAMPLES: Record<string, string> = {
  select: 'select name from users where age > 18',
  insert: 'insert data into users',
  update: 'update users set active where id = 1',
  delete: 'delete from users where id = 1',
  get: 'get users where active limit 10',
};

/** Drop every optional role, leaving only what the schema requires. */
function stripOptionalRoles(node: SemanticNode): SemanticNode {
  const schema = allSchemas.find(s => s.action === node.action);
  const required = new Set(schema?.roles.filter(r => r.required).map(r => r.role) ?? []);
  const roles = new Map([...node.roles].filter(([role]) => required.has(role)));
  return { ...node, roles };
}

describe('createSchemaRenderer agrees with renderSQL', () => {
  for (const schema of allSchemas) {
    const example = EXAMPLES[schema.action];
    if (!example) {
      it(`${schema.action} has an example to compare`, () => {
        expect.fail(`No example for "${schema.action}" — add one to EXAMPLES.`);
      });
      continue;
    }

    const full = sql.parse(example, 'en');
    const minimal = stripOptionalRoles(full);

    for (const language of LANGUAGES) {
      it(`${schema.action} × ${language} — all roles populated`, () => {
        expect(schemaRenderer.render(full, language)).toBe(renderSQL(full, language));
      });

      it(`${schema.action} × ${language} — required roles only`, () => {
        expect(schemaRenderer.render(minimal, language)).toBe(renderSQL(minimal, language));
      });
    }
  }
});

describe('keyword tables agree with the language profiles', () => {
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
