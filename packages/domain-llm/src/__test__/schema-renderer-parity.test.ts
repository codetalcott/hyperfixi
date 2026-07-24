/**
 * Schema ↔ renderer parity: the drift lock.
 *
 * Two renderings of the same command shipped in this package and disagreed: the
 * hand-written `renderLLM` and the schema-driven `createSchemaRenderer` over the
 * same schemas. A consumer had no way to tell which was authoritative — that
 * ambiguity is the root cause of the SCHEMA_DEVIATIONS / LEARNING_OVERRIDES
 * tables lokascript-learn maintains.
 *
 * This asserts they agree for every command × language, on a fully-populated
 * node and on a minimal one. `renderLLM`'s output is frozen (downstream depends
 * on it), so a mismatch is fixed by teaching the SCHEMA what the renderer does —
 * never the other way round.
 */

import { describe, it, expect } from 'vitest';
import { createSchemaRenderer, type SemanticNode } from '@lokascript/framework';
import {
  allSchemas,
  allProfiles,
  createLLMDSL,
  renderLLM,
  describeCommands,
  LLM_LANGUAGE_CODES,
} from '../index.js';

const schemaRenderer = createSchemaRenderer(allSchemas, allProfiles);
const llm = createLLMDSL();

/** Drop every optional role, leaving only what the schema requires. */
function stripOptionalRoles(node: SemanticNode): SemanticNode {
  const schema = allSchemas.find(s => s.action === node.action);
  const required = new Set(schema?.roles.filter(r => r.required).map(r => r.role) ?? []);
  const roles = new Map([...node.roles].filter(([role]) => required.has(role)));
  return { ...node, roles };
}

describe('createSchemaRenderer agrees with renderLLM', () => {
  for (const cmd of describeCommands()) {
    const full = llm.parse(cmd.examples.en, 'en');
    const minimal = stripOptionalRoles(full);

    for (const language of LLM_LANGUAGE_CODES) {
      it(`${cmd.action} × ${language} — all roles populated`, () => {
        expect(schemaRenderer.render(full, language)).toBe(renderLLM(full, language));
      });

      it(`${cmd.action} × ${language} — required roles only`, () => {
        expect(schemaRenderer.render(minimal, language)).toBe(renderLLM(minimal, language));
      });
    }
  }
});

describe('keyword tables agree with the language profiles', () => {
  // renderLLM reads its own COMMAND_KEYWORDS table; the schema renderer reads
  // the profiles. A keyword that drifts between them would show up above as an
  // opaque string diff, so check it directly for a readable failure.
  for (const cmd of describeCommands()) {
    it(`${cmd.action} has a profile keyword in every supported language`, () => {
      const missing = LLM_LANGUAGE_CODES.filter(code => {
        const profile = allProfiles.find(p => p.code === code);
        return !profile?.keywords[cmd.action]?.primary;
      });
      expect(missing).toEqual([]);
    });
  }
});
