/**
 * Schema ↔ renderer parity: the drift lock.
 *
 * Two renderings of the same command ship in this package and could disagree:
 * the hand-written `renderVoice` and the schema-driven `createSchemaRenderer`
 * over the same schemas, with nothing asserting they agree. This asserts it for
 * every command × language, on a fully-populated node and on a minimal one.
 *
 * `renderVoice`'s output is frozen (downstream depends on it), so a mismatch is
 * fixed by teaching the SCHEMA what the renderer does — never the other way
 * round. The schema path is what an extension command renders through, so a
 * schema that disagrees with the renderer means extensions render an
 * unidiomatic surface.
 *
 * One command is exempt, and deliberately so — see `scroll` at the bottom.
 */

import { describe, it, expect } from 'vitest';
import { createSchemaRenderer, type SemanticNode } from '@lokascript/framework';
import { allSchemas, allProfiles, createVoiceDSL, renderVoice } from '../index';

const schemaRenderer = createSchemaRenderer(allSchemas, allProfiles);
const voice = createVoiceDSL();
const LANGUAGES = allProfiles.map(p => p.code);

/** One English example per command, exercising every role the command has. */
const EXAMPLES: Record<string, string> = {
  navigate: 'navigate to home',
  click: 'click submit',
  type: 'type hello into search',
  scroll: 'scroll down by 500',
  read: 'read heading',
  zoom: 'zoom in',
  select: 'select all',
  back: 'back 2',
  forward: 'forward 2',
  focus: 'focus search',
  close: 'close dialog',
  open: 'open settings',
  search: 'search hello in page',
  help: 'help navigate',
  toggle: 'toggle .active on #panel',
  add: 'add .active to #panel',
  remove: 'remove .active from #panel',
  show: 'show #panel',
  hide: 'hide #panel',
};

/**
 * `renderVoice` drops `scroll`'s optional `quantity` — `scroll down by 500`
 * renders as `scroll down`, losing the amount. That is a renderer bug, not a
 * schema one: the schema is right that the role exists (the parser fills it),
 * so "teach the schema what the renderer does" has nothing to teach, and no
 * `RoleSpec` field says "never render this role". Locked below as an explicit
 * divergence instead of silently skipped, so a fix to `renderScroll` fails
 * this test and gets the entry removed.
 */
const RENDERER_DROPS_ROLE: Record<string, string> = { scroll: 'quantity' };

/**
 * Roles no English voice surface can express, so the example cannot populate
 * them. `show`/`hide` reuse the semantic package's schemas, whose optional
 * `style` literal (`show #panel with fade`) has no voice pattern.
 */
const UNREACHABLE_ROLES: Record<string, readonly string[]> = {
  show: ['style'],
  hide: ['style'],
};

/** Drop every optional role, leaving only what the schema requires. */
function stripOptionalRoles(node: SemanticNode): SemanticNode {
  const schema = allSchemas.find(s => s.action === node.action);
  const required = new Set(schema?.roles.filter(r => r.required).map(r => r.role) ?? []);
  const roles = new Map([...node.roles].filter(([role]) => required.has(role)));
  return { ...node, roles };
}

function withoutRole(node: SemanticNode, role: string): SemanticNode {
  const roles = new Map([...node.roles].filter(([name]) => name !== role));
  return { ...node, roles };
}

describe('createSchemaRenderer agrees with renderVoice', () => {
  for (const schema of allSchemas) {
    const example = EXAMPLES[schema.action];
    if (!example) {
      it(`${schema.action} has an example to compare`, () => {
        expect.fail(`No example for "${schema.action}" — add one to EXAMPLES.`);
      });
      continue;
    }

    const parsed = voice.parse(example, 'en');
    // For the one command whose renderer drops a role, compare on a node
    // without it. Everything else about that command still has to agree.
    const dropped = RENDERER_DROPS_ROLE[schema.action];
    const full = dropped ? withoutRole(parsed, dropped) : parsed;
    const minimal = stripOptionalRoles(parsed);

    it(`${schema.action}'s example populates every role`, () => {
      const unreachable = new Set(UNREACHABLE_ROLES[schema.action] ?? []);
      const missing = schema.roles
        .map(r => r.role)
        .filter(role => !parsed.roles.has(role) && !unreachable.has(role));
      expect(missing).toEqual([]);
    });

    for (const language of LANGUAGES) {
      it(`${schema.action} × ${language} — all roles populated`, () => {
        expect(schemaRenderer.render(full, language)).toBe(renderVoice(full, language));
      });

      it(`${schema.action} × ${language} — required roles only`, () => {
        expect(schemaRenderer.render(minimal, language)).toBe(renderVoice(minimal, language));
      });
    }
  }
});

describe('known divergence: renderVoice drops scroll’s quantity', () => {
  const withQuantity = voice.parse('scroll down by 500', 'en');

  it('the parser does populate the role', () => {
    expect(withQuantity.roles.has('quantity')).toBe(true);
  });

  for (const language of LANGUAGES) {
    it(`scroll × ${language} — renderVoice omits it, the schema renderer keeps it`, () => {
      const rendered = renderVoice(withQuantity, language) as string;
      expect(rendered).toBe(renderVoice(withoutRole(withQuantity, 'quantity'), language));
      expect(schemaRenderer.render(withQuantity, language)).not.toBe(rendered);
    });
  }
});

describe('keyword tables agree with the language profiles', () => {
  // renderVoice reads its own COMMAND_KEYWORDS table; the schema renderer reads
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
