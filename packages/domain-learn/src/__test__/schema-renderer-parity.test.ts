/**
 * Schema ↔ renderer parity: the drift lock.
 *
 * Two renderings of the same command ship in this package and could disagree:
 * the hand-written `renderLearn` and the schema-driven `createSchemaRenderer`
 * over the same schemas. The schema path is what an extension command renders
 * through, so a schema that disagrees with the renderer means a consumer's
 * command renders an unidiomatic surface.
 *
 * `renderLearn`'s output is frozen — lokascript-learn ships the DSL bridge as
 * its renderer and its 919 morphology tests are the enforcement — so this is a
 * LOCK, not a to-do list. It asserts parity *modulo* a declared divergence per
 * command × language, and verifies each exempted cell diverges in EXACTLY the
 * declared way. A new marker, a dropped role or a reordering fails, because
 * none of those classify as any declared kind.
 *
 * domain-learn diverges far more than the other domains, and for a reason that
 * is by design: it is a language-LEARNING DSL, so `renderLearn` writes the
 * COMMANDING form of each verb from its own conjugation tables (`agrega`,
 * `füge hinzu`, `追加して`) while the schema renderer writes the profile's
 * dictionary form (`agregar`, `hinzufügen`, `追加`). No `RoleSpec` field
 * declares a per-language imperative, so this is not closable with schema data.
 *
 * Measured over all 300 cells (15 commands × 10 languages × {all roles,
 * required only}) when this lock was written:
 *
 *   identical           69      verb-and-glue        9
 *   verb-form          126      marker-absence       6
 *   marker-presence     43      glued-marker         5
 *   marker-vocabulary   22      role-order          20
 *
 * Note what that says about the previously-assumed blocker: the glued SOV
 * particle (`#buttonに`, which `buildPhrase` cannot express) is `glued-marker`
 * + `verb-and-glue` = 14 of 231 divergent cells. It is not what keeps
 * domain-learn from parity; the verb form is.
 *
 * Two of the kinds below are real defects rather than stylistic divergence,
 * pinned separately at the bottom of this file:
 *   - `role-order` on `set` (all 10 languages) — the two sides disagree on
 *     which role comes first, which is a round-trip bug, not a cosmetic one.
 *   - `marker-vocabulary` on `get`/`fetch` in ja/ko — the schema marks the
 *     source with the PATIENT particle.
 * Both, plus the finding that `renderLearn`'s output re-parses in only 75 of
 * 150 cases, are written up in
 * `docs-internal/DOMAIN-LEARN-PARITY-FINDINGS.md`.
 */

import { describe, it, expect } from 'vitest';
import { createSchemaRenderer, type SemanticNode } from '@lokascript/framework';
import { allSchemas, ALL_PROFILES, renderLearn } from '../index';

const profiles = Object.values(ALL_PROFILES).map(p => p.patternProfile);
const schemaRenderer = createSchemaRenderer(allSchemas, profiles);
const LANGUAGES = profiles.map(p => p.code);

/**
 * Role values used to build comparison nodes.
 *
 * Synthetic rather than parsed, deliberately: this compares two RENDERERS on
 * the same node, and only synthetic nodes populate every role of every command.
 * A real en parse cannot — `toggle`/`put` silently drop their destination and
 * `set` does not parse at all (see the findings doc), so parsing would quietly
 * shrink the comparison to the subset that already works.
 */
const VALUES: Record<string, string> = {
  patient: '.active',
  destination: '#panel',
  source: '#panel',
};

type Divergence =
  | 'identical'
  /** The verb differs: schema writes the dictionary form, renderLearn the imperative. */
  | 'verb-form'
  /** Only whitespace differs — renderLearn glues the SOV particle to its value. */
  | 'glued-marker'
  /** Both of the above. */
  | 'verb-and-glue'
  /** renderLearn writes a marker the schema omits (ja に/から, en `get from`). */
  | 'marker-presence'
  /** The schema writes a marker renderLearn omits. */
  | 'marker-absence'
  /** Both write a marker, but a DIFFERENT one for the same role. */
  | 'marker-vocabulary'
  /** The two disagree on role order. A round-trip bug, not a style difference. */
  | 'role-order';

/**
 * Declared divergence per command × language. Omitted cells must match byte for
 * byte. A pair is `[all roles populated, required roles only]` — they differ
 * whenever the divergence lives in an OPTIONAL role, which is why dropping that
 * role collapses the cell back to the bare verb difference.
 */
const EXPECTED: Record<string, Record<string, Divergence | [Divergence, Divergence]>> = {
  add: {
    ja: ['marker-presence', 'verb-form'],
    es: 'verb-form',
    ko: ['verb-and-glue', 'verb-form'],
    fr: 'verb-form',
    tr: ['glued-marker', 'identical'],
    de: 'verb-form',
    pt: 'verb-form',
  },
  remove: {
    ja: ['marker-presence', 'verb-form'],
    es: 'verb-form',
    ar: 'verb-form',
    ko: ['verb-and-glue', 'verb-form'],
    fr: 'verb-form',
    tr: ['verb-and-glue', 'verb-form'],
    de: 'verb-form',
    pt: 'verb-form',
  },
  toggle: {
    en: ['marker-vocabulary', 'identical'],
    ja: ['marker-presence', 'verb-form'],
    es: ['marker-vocabulary', 'verb-form'],
    ar: ['marker-vocabulary', 'identical'],
    zh: ['marker-vocabulary', 'identical'],
    ko: ['verb-and-glue', 'verb-form'],
    fr: ['marker-vocabulary', 'verb-form'],
    tr: ['marker-absence', 'verb-form'],
    de: ['marker-vocabulary', 'verb-form'],
    pt: ['marker-vocabulary', 'verb-form'],
  },
  put: {
    en: ['marker-absence', 'identical'],
    ja: ['marker-presence', 'verb-form'],
    es: ['marker-vocabulary', 'verb-form'],
    ar: ['marker-vocabulary', 'identical'],
    ko: ['verb-and-glue', 'verb-form'],
    fr: ['marker-vocabulary', 'verb-form'],
    tr: ['glued-marker', 'identical'],
    de: ['marker-vocabulary', 'verb-form'],
    pt: ['marker-vocabulary', 'verb-form'],
  },
  set: {
    en: 'role-order',
    ja: 'role-order',
    es: 'role-order',
    ar: 'role-order',
    zh: 'role-order',
    ko: 'role-order',
    fr: 'role-order',
    tr: 'role-order',
    de: 'role-order',
    pt: 'role-order',
  },
  show: {
    ja: 'verb-form',
    es: 'verb-form',
    ko: 'verb-form',
    fr: 'verb-form',
    tr: 'verb-form',
    de: 'verb-form',
    pt: 'verb-form',
  },
  hide: {
    ja: 'verb-form',
    es: 'verb-form',
    ko: 'verb-form',
    fr: 'verb-form',
    de: 'verb-form',
    pt: 'verb-form',
  },
  get: {
    en: 'marker-presence',
    ja: 'marker-vocabulary',
    es: 'marker-presence',
    ar: 'marker-presence',
    zh: 'marker-presence',
    ko: 'marker-vocabulary',
    fr: 'marker-presence',
    tr: 'marker-presence',
    de: 'marker-presence',
    pt: 'marker-presence',
  },
  wait: {
    ja: 'verb-form',
    es: 'verb-form',
    ko: 'verb-form',
    fr: 'verb-form',
    de: 'verb-form',
    pt: 'verb-form',
  },
  fetch: {
    en: 'marker-presence',
    ja: 'marker-vocabulary',
    es: 'marker-presence',
    ar: 'marker-presence',
    zh: 'marker-presence',
    ko: 'marker-vocabulary',
    fr: 'marker-presence',
    tr: 'marker-presence',
    de: 'marker-presence',
    pt: 'marker-presence',
  },
  send: {
    ja: ['verb-and-glue', 'verb-form'],
    es: 'verb-form',
    ko: ['marker-absence', 'identical'],
    fr: 'verb-form',
    tr: ['marker-vocabulary', 'verb-form'],
    de: ['marker-vocabulary', 'verb-form'],
    pt: ['marker-absence', 'verb-form'],
  },
  go: {
    en: 'marker-presence',
    ja: 'marker-presence',
    es: 'verb-form',
    zh: 'marker-presence',
    ko: 'verb-and-glue',
    fr: 'verb-form',
    tr: 'glued-marker',
    de: 'verb-form',
    pt: 'marker-absence',
  },
  increment: {
    ja: 'verb-form',
    es: 'verb-form',
    ko: 'verb-form',
    fr: 'verb-form',
    tr: 'verb-form',
    de: 'verb-form',
    pt: 'verb-form',
  },
  decrement: {
    ja: 'verb-form',
    es: 'verb-form',
    ko: 'verb-form',
    fr: 'verb-form',
    de: 'verb-form',
    pt: 'verb-form',
  },
  take: {
    ja: ['marker-presence', 'verb-form'],
    es: 'verb-form',
    zh: 'verb-form',
    ko: ['verb-and-glue', 'verb-form'],
    fr: 'verb-form',
    tr: ['glued-marker', 'identical'],
    de: 'verb-form',
    pt: 'verb-form',
  },
};

const NUL = ' ';
const stripSpace = (text: string): string => text.replace(/\s+/g, '');

/**
 * The verb `renderLearn` writes for this command, obtained exactly rather than
 * guessed: rendering a node with NO roles leaves only the keyword. Handles the
 * multi-word German separable forms (`füge hinzu`) that token-splitting would
 * mangle.
 */
function renderedVerb(action: string, language: string): string {
  return renderLearn({ kind: 'command', action, roles: new Map() } as SemanticNode, language) ?? '';
}

/** Blank the verb, then whitespace, so a glued particle compares equal to a spaced one. */
function withoutVerb(text: string, verb: string): string {
  return stripSpace(verb ? text.replace(verb, NUL) : text);
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const ch of haystack) if (i < needle.length && needle[i] === ch) i++;
  return i === needle.length;
}

/** Role values in the order they appear, so a reorder or a drop is visible. */
function valueOrder(text: string, values: readonly string[]): string[] {
  return values
    .map(v => [v, text.indexOf(v)] as const)
    .filter(([, at]) => at >= 0)
    .sort((a, b) => a[1] - b[1])
    .map(([v]) => v);
}

/**
 * How two renderings of the same node differ.
 *
 * Returns `null` for anything not covered by a declared kind — in particular a
 * role value that one side writes and the other does not. That is the failure
 * this test exists to catch, and it is checked BEFORE any marker or verb
 * reasoning so a drop can never be explained away as a marker difference.
 */
function classify(
  schemaText: string,
  renderText: string,
  schemaVerb: string,
  renderVerb: string,
  values: readonly string[]
): Divergence | null {
  if (schemaText === renderText) return 'identical';

  const schemaOrder = valueOrder(schemaText, values);
  const renderOrder = valueOrder(renderText, values);
  if (schemaOrder.length !== renderOrder.length) return null; // a role value was dropped
  if (schemaOrder.join('|') !== renderOrder.join('|')) return 'role-order';

  const a = withoutVerb(schemaText, schemaVerb);
  const b = withoutVerb(renderText, renderVerb);

  if (a === b) {
    if (schemaVerb === renderVerb) return 'glued-marker';
    return schemaText.replace(schemaVerb, renderVerb) === renderText
      ? 'verb-form'
      : 'verb-and-glue';
  }
  if (isSubsequence(a, b)) return 'marker-presence';
  if (isSubsequence(b, a)) return 'marker-absence';
  return 'marker-vocabulary';
}

function nodeFor(action: string, roles: Map<string, unknown>): SemanticNode {
  return { kind: 'command', action, roles } as SemanticNode;
}

function rolesFor(action: string, requiredOnly: boolean): Map<string, unknown> {
  const schema = allSchemas.find(s => s.action === action);
  const roles = new Map<string, unknown>();
  for (const spec of schema?.roles ?? []) {
    if (!VALUES[spec.role]) continue;
    if (requiredOnly && !spec.required) continue;
    roles.set(spec.role, { type: 'expression', raw: VALUES[spec.role] });
  }
  return roles;
}

function expectedFor(action: string, language: string, requiredOnly: boolean): Divergence {
  const cell = EXPECTED[action]?.[language] ?? 'identical';
  return Array.isArray(cell) ? cell[requiredOnly ? 1 : 0] : cell;
}

describe('createSchemaRenderer agrees with renderLearn, modulo declared divergences', () => {
  for (const schema of allSchemas) {
    for (const language of LANGUAGES) {
      for (const requiredOnly of [false, true]) {
        const label = requiredOnly ? 'required roles only' : 'all roles populated';
        const expected = expectedFor(schema.action, language, requiredOnly);

        it(`${schema.action} × ${language} — ${label} (${expected})`, () => {
          const roles = rolesFor(schema.action, requiredOnly);
          const node = nodeFor(schema.action, roles);
          const schemaText = schemaRenderer.render(node, language) as string;
          const renderText = renderLearn(node, language) as string;
          const values = [...roles.values()].map(v => String((v as { raw: string }).raw));

          const schemaVerb =
            profiles.find(p => p.code === language)?.keywords[schema.action]?.primary ??
            schema.action;

          if (expected === 'identical') expect(schemaText).toBe(renderText);
          expect(
            classify(
              schemaText,
              renderText,
              schemaVerb,
              renderedVerb(schema.action, language),
              values
            )
          ).toBe(expected);
        });
      }
    }
  }
});

describe('the divergence table stays honest', () => {
  // A cell that stops diverging must leave the table, or the table drifts into
  // a list of things that USED to be wrong.
  for (const [action, byLanguage] of Object.entries(EXPECTED)) {
    for (const [language, cell] of Object.entries(byLanguage)) {
      const kinds = Array.isArray(cell) ? cell : [cell, cell];
      for (const [index, kind] of kinds.entries()) {
        if (kind === 'identical') continue;
        const requiredOnly = index === 1;
        it(`${action} × ${language} still diverges by ${kind} (${requiredOnly ? 'minimal' : 'full'})`, () => {
          const node = nodeFor(action, rolesFor(action, requiredOnly));
          expect(schemaRenderer.render(node, language)).not.toBe(renderLearn(node, language));
        });
      }
    }
  }
});

describe('every role value survives both renderings', () => {
  // The strongest property here, and the one that holds with NO exceptions:
  // whatever the two disagree about, neither may lose a value the node carries.
  // Checked independently of `classify` so it cannot be absorbed by a declared
  // divergence kind.
  for (const schema of allSchemas) {
    for (const language of LANGUAGES) {
      it(`${schema.action} × ${language} — both renderings write every role value`, () => {
        const roles = rolesFor(schema.action, false);
        const node = nodeFor(schema.action, roles);
        const schemaText = schemaRenderer.render(node, language) as string;
        const renderText = renderLearn(node, language) as string;

        for (const value of roles.values()) {
          const raw = String((value as { raw: string }).raw);
          expect(schemaText).toContain(raw);
          expect(renderText).toContain(raw);
        }
      });
    }
  }
});

describe('known defect: `set` renders its two roles in opposite orders', () => {
  // Not a stylistic divergence — the schema writes `set <destination> to
  // <patient>` (target first, the hyperscript shape) and `renderLearn` writes
  // `set <patient> to <destination>`. One of them means the wrong thing, and
  // `set` is also the one command whose en rendering does not re-parse at all.
  // Pinned so the fix is visible when it lands; `renderLearn` output is frozen,
  // so closing it is a downstream-coordinated change.
  for (const language of LANGUAGES) {
    it(`set × ${language} — the two orders are still opposed`, () => {
      const roles = rolesFor('set', false);
      const node = nodeFor('set', roles);
      const schemaText = schemaRenderer.render(node, language) as string;
      const renderText = renderLearn(node, language) as string;

      // Stated as "reversed", not as a fixed sequence: SOV writes the pair in
      // the opposite absolute order from SVO, but the two renderers disagree
      // with each other in every language, which is the defect.
      const schemaOrder = valueOrder(schemaText, ['#panel', '.active']);
      const renderOrder = valueOrder(renderText, ['#panel', '.active']);
      expect(schemaOrder).toHaveLength(2);
      expect(renderOrder).toEqual([...schemaOrder].reverse());
    });
  }
});

describe('known defect: ja/ko `get`/`fetch` mark their source with the patient particle', () => {
  // The schema gives `source` the patient particle (ja を, ko 를) while
  // `renderLearn` writes the ablative (から / 에서), which is the correct one.
  // Here the RENDERER is right and the schema is wrong — the mirror of this
  // arc's usual direction — so it is a schema fix, not a renderer one.
  const ABLATIVE: Record<string, string> = { ja: 'から', ko: '에서' };

  for (const action of ['get', 'fetch']) {
    for (const [language, ablative] of Object.entries(ABLATIVE)) {
      it(`${action} × ${language} — renderLearn uses ${ablative}, the schema does not`, () => {
        const node = nodeFor(action, rolesFor(action, false));
        expect(renderLearn(node, language)).toContain(ablative);
        expect(schemaRenderer.render(node, language)).not.toContain(ablative);
      });
    }
  }
});

describe('keyword tables agree with the language profiles', () => {
  // renderLearn reads its own COMMAND_KEYWORDS table; the schema renderer reads
  // the profiles. A command missing from a profile would show up above as an
  // opaque string diff, so check it directly for a readable failure.
  for (const schema of allSchemas) {
    it(`${schema.action} has a profile keyword in every supported language`, () => {
      const missing = LANGUAGES.filter(
        code => !profiles.find(p => p.code === code)?.keywords[schema.action]?.primary
      );
      expect(missing).toEqual([]);
    });
  }
});
