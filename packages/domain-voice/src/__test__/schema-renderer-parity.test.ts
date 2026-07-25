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
 * The one exception ran the other way: parity showed `renderScroll` dropping a
 * `quantity` the parser had filled, so `scroll down by 500` rendered as
 * `scroll down`. Nothing in the schema could teach that, because the schema was
 * the correct one — the renderer was fixed instead. The round-trip case below
 * keeps it fixed.
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

    const full = voice.parse(example, 'en');
    const minimal = stripOptionalRoles(full);

    it(`${schema.action}'s example populates every role`, () => {
      const unreachable = new Set(UNREACHABLE_ROLES[schema.action] ?? []);
      const missing = schema.roles
        .map(r => r.role)
        .filter(role => !full.roles.has(role) && !unreachable.has(role));
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

describe('renderVoice keeps scroll’s quantity', () => {
  // `renderScroll` used to drop the role outright: `scroll down by 500`
  // rendered as `scroll down`, so translating a scroll step silently lost the
  // amount. The parity comparison above would catch a relapse as a string
  // diff; this states the property directly so the failure names the bug.
  const withQuantity = voice.parse('scroll down by 500', 'en');

  it('the parser populates the role', () => {
    expect(withQuantity.roles.has('quantity')).toBe(true);
  });

  for (const language of LANGUAGES) {
    it(`scroll × ${language} — the amount survives rendering`, () => {
      const rendered = renderVoice(withQuantity, language) as string;
      expect(rendered).toContain('500');
      expect(rendered).not.toBe(renderVoice(withoutRole(withQuantity, 'quantity'), language));
    });
  }
});

describe('renderVoice round-trips through the parser', () => {
  // A rendered surface its own parser cannot read back is a broken
  // translation. Checked on the SOV three, where marker position and the
  // pre/post-verb split make it easiest to get wrong.
  //
  // `back`/`forward`/`help` are here because they used to be the counter-example:
  // all three write their argument AFTER the verb (`戻る 2`, `ヘルプ 移動`), which
  // `sovSlot: 'postVerb'` declares, but pattern generation did not read that
  // field — so the generated SOV pattern expected the argument pre-verb and
  // dropped it on re-parse. The command survived; its argument did not. Pattern
  // generation now buckets by `sovSlot` exactly as the renderer does.
  for (const action of ['scroll', 'search', 'click', 'type', 'back', 'forward', 'help']) {
    const node = voice.parse(EXAMPLES[action], 'en');

    for (const language of ['ja', 'ko', 'tr']) {
      it(`${action} × ${language} — rendered text parses back to the same roles`, () => {
        const surface = renderVoice(node, language) as string;
        const reparsed = voice.parse(surface, language);
        expect(reparsed.action).toBe(action);
        expect([...reparsed.roles.keys()].sort()).toEqual([...node.roles.keys()].sort());
      });
    }
  }
});

describe('post-verb SOV arguments keep their VALUE, not just their role', () => {
  // The role-key comparison above would still pass if the argument re-parsed
  // into the right role with the wrong text. State the value directly, since
  // the whole point of the `sovSlot` fix is that `戻る 2` reads back as 2.
  for (const [action, value] of [
    ['back', '2'],
    ['forward', '2'],
    ['help', 'navigate'],
  ] as const) {
    const node = voice.parse(EXAMPLES[action], 'en');
    const role = action === 'help' ? 'patient' : 'quantity';

    for (const language of ['ja', 'ko', 'tr']) {
      it(`${action} × ${language} — the argument survives the round trip`, () => {
        const surface = renderVoice(node, language) as string;
        const reparsed = voice.parse(surface, language);
        // A numeric page count re-parses as a `literal` (carrying `value`), a
        // help topic as an `expression` (carrying `raw`) — read whichever.
        const parsed = reparsed.roles.get(role) as { value?: unknown; raw?: unknown } | undefined;
        expect(String(parsed?.value ?? parsed?.raw ?? '')).toBe(value);
      });
    }
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
