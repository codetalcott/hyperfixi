/**
 * Schema ↔ renderer parity: the drift lock.
 *
 * Two renderings of the same command ship in this package and could disagree:
 * the hand-written `renderBehaviorSpec` and the schema-driven
 * `createSchemaRenderer` over the same schemas. The schema path is what an
 * extension command renders through, so a schema that disagrees with the
 * renderer means a consumer's command renders an unidiomatic surface.
 *
 * Every command reaches byte parity except `test`, which cannot: `renderTest`
 * always quotes the scenario name (`test "login"`, even for a single word),
 * and `quoteMultiword` — the only quoting field a `RoleSpec` has — quotes only
 * when the value contains whitespace. That one divergence is declared below
 * and verified to be EXACTLY quoting: strip the quotes and the two renderings
 * must be identical, so a marker, a reorder or a dropped role still fails.
 */

import { describe, it, expect } from 'vitest';
import { createSchemaRenderer, type SemanticNode } from '@lokascript/framework';
import { allSchemas, allProfiles, createBehaviorSpecDSL, renderBehaviorSpec } from '../index';

const schemaRenderer = createSchemaRenderer(allSchemas, allProfiles);
const dsl = createBehaviorSpecDSL();
const LANGUAGES = allProfiles.map(p => p.code);

/** One English example per command, exercising every role the command has. */
const EXAMPLES: Record<string, string> = {
  test: 'test "Add to cart"',
  given: 'given page /home',
  when: 'when user clicks on #button into #form',
  expect: 'expect #toast shows saying Added',
  after: 'after 300ms',
  not: 'not visible',
};

/**
 * Commands whose renderer quotes a role the schema renderer leaves bare.
 * Everything not listed must match byte for byte.
 */
const ALWAYS_QUOTED = new Set(['test']);

/** Drop every optional role, leaving only what the schema requires. */
function stripOptionalRoles(node: SemanticNode): SemanticNode {
  const schema = allSchemas.find(s => s.action === node.action);
  const required = new Set(schema?.roles.filter(r => r.required).map(r => r.role) ?? []);
  const roles = new Map([...node.roles].filter(([role]) => required.has(role)));
  return { ...node, roles };
}

const unquote = (text: string): string => text.replace(/"/g, '');

describe('createSchemaRenderer agrees with renderBehaviorSpec', () => {
  for (const schema of allSchemas) {
    const example = EXAMPLES[schema.action];
    if (!example) {
      it(`${schema.action} has an example to compare`, () => {
        expect.fail(`No example for "${schema.action}" — add one to EXAMPLES.`);
      });
      continue;
    }

    const full = dsl.parse(example, 'en');
    const minimal = stripOptionalRoles(full);
    const quoted = ALWAYS_QUOTED.has(schema.action);

    it(`${schema.action}'s example populates every role`, () => {
      const missing = schema.roles.map(r => r.role).filter(role => !full.roles.has(role));
      expect(missing).toEqual([]);
    });

    for (const language of LANGUAGES) {
      it(`${schema.action} × ${language} — all roles populated`, () => {
        const schemaText = schemaRenderer.render(full, language);
        const renderText = renderBehaviorSpec(full, language) as string;
        if (quoted) expect(unquote(renderText)).toBe(unquote(schemaText));
        else expect(schemaText).toBe(renderText);
      });

      it(`${schema.action} × ${language} — required roles only`, () => {
        const schemaText = schemaRenderer.render(minimal, language);
        const renderText = renderBehaviorSpec(minimal, language) as string;
        if (quoted) expect(unquote(renderText)).toBe(unquote(schemaText));
        else expect(schemaText).toBe(renderText);
      });
    }
  }
});

describe('the quoting exception stays honest', () => {
  // If `test` ever reaches byte parity, it must leave ALWAYS_QUOTED rather
  // than sit there as a permanently-granted exemption.
  const node = dsl.parse(EXAMPLES.test, 'en');

  for (const language of LANGUAGES) {
    it(`test × ${language} still quotes the name`, () => {
      const rendered = renderBehaviorSpec(node, language) as string;
      expect(rendered).toContain('"');
      expect(rendered).not.toBe(schemaRenderer.render(node, language));
    });
  }
});

describe('renderBehaviorSpec omits a marker whose role is absent', () => {
  // `when`'s target is optional, and the `on` marker used to be emitted
  // regardless — `when clicks on`, `を clicks 操作`. A marker belongs to its
  // role; with no role there is nothing to introduce.
  const node = dsl.parse('when user clicks', 'en');

  it('parses without a target', () => {
    expect(node.roles.has('target')).toBe(false);
  });

  for (const language of LANGUAGES) {
    it(`when × ${language} renders no dangling marker`, () => {
      expect(renderBehaviorSpec(node, language)).toBe(schemaRenderer.render(node, language));
    });
  }
});

describe('keyword tables agree with the language profiles', () => {
  // renderBehaviorSpec reads its own COMMAND_KEYWORDS table; the schema
  // renderer reads the profiles. A keyword that drifts between them would show
  // up above as an opaque string diff, so check it directly.
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
