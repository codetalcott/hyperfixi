/**
 * Schema ↔ renderer parity: the drift lock.
 *
 * Two renderings of the same command ship in this package and could disagree:
 * the hand-written `renderBDD` and the schema-driven `createSchemaRenderer`
 * over the same schemas. The schema path is what an extension command renders
 * through, so a schema that disagrees with the renderer means a consumer's
 * command renders an unidiomatic surface.
 *
 * Unlike the other domains, bdd cannot reach byte parity with the fields a
 * `RoleSpec` has today. Two divergences are structural:
 *
 *   - **capitalization** — `renderBDD` writes Gherkin-style `Given`/`When`/
 *     `Then`; the profiles carry lowercase keywords (parsing is
 *     case-insensitive for latin scripts, so both parse).
 *   - **lexicalization** — `renderBDD` translates role VALUES through its own
 *     tables (`exists` → `es existe` / `が 存在` / `mevcut dir`, `click` →
 *     `clic en` / `を クリック`). The schema renderer writes values verbatim,
 *     and no `RoleSpec` field declares a per-language value vocabulary.
 *
 * So this asserts parity *modulo those two*, and — the part that makes it a
 * lock rather than a blanket exemption — it verifies that each exempted cell
 * diverges in EXACTLY the declared way: same token count, differing tokens are
 * role values, casing accounts for the rest. A new marker, a dropped role or a
 * reordering fails, because none of those classify as either kind.
 */

import { describe, it, expect } from 'vitest';
import { createSchemaRenderer, type SemanticNode } from '@lokascript/framework';
import { allSchemas, allProfiles, createBDDDSL, renderBDD } from '../index';

const schemaRenderer = createSchemaRenderer(allSchemas, allProfiles);
const bdd = createBDDDSL();
const LANGUAGES = allProfiles.map(p => p.code);

/** One English example per command, exercising every role the command has. */
const EXAMPLES: Record<string, string> = {
  given: 'given #button is exists',
  when: 'when click on #button',
  then: 'then #button has .active',
  and: 'and visible',
};

type Divergence = 'identical' | 'capitalization' | 'lexicalization' | 'both';

/**
 * The declared divergence per command × language. `identical` cells are
 * omitted — anything not listed must match byte for byte.
 *
 * Read the table as a map of what is still hand-written rather than derived:
 * every `capitalization` entry is a latin-script language whose Gherkin
 * keyword is title-cased, and every `lexicalization` entry is a language whose
 * state/action words live in `bdd-renderer.ts` rather than in the schema.
 */
const EXPECTED: Record<string, Record<string, Divergence>> = {
  given: {
    en: 'capitalization',
    es: 'both',
    ja: 'lexicalization',
    ar: 'lexicalization',
    ko: 'lexicalization',
    zh: 'lexicalization',
    tr: 'both',
    fr: 'both',
  },
  when: {
    en: 'capitalization',
    es: 'both',
    ja: 'lexicalization',
    ar: 'lexicalization',
    ko: 'lexicalization',
    zh: 'lexicalization',
    tr: 'both',
    fr: 'both',
  },
  then: {
    en: 'capitalization',
    es: 'capitalization',
    tr: 'capitalization',
    fr: 'capitalization',
  },
  and: {},
};

/** Drop every optional role, leaving only what the schema requires. */
function stripOptionalRoles(node: SemanticNode): SemanticNode {
  const schema = allSchemas.find(s => s.action === node.action);
  const required = new Set(schema?.roles.filter(r => r.required).map(r => r.role) ?? []);
  const roles = new Map([...node.roles].filter(([role]) => required.has(role)));
  return { ...node, roles };
}

function roleValues(node: SemanticNode): Set<string> {
  const values = new Set<string>();
  for (const value of node.roles.values()) {
    const raw = String((value as { raw?: unknown; value?: unknown }).raw ?? '');
    for (const token of raw.toLowerCase().split(/\s+/).filter(Boolean)) values.add(token);
  }
  return values;
}

/**
 * How two renderings of the same node differ.
 *
 * Anything that is not pure casing and not a value-for-value substitution at
 * the same token positions comes back as `null` — an unclassifiable
 * divergence, which is the failure this test exists to catch.
 */
function classify(schemaText: string, renderText: string, node: SemanticNode): Divergence | null {
  if (schemaText === renderText) return 'identical';

  const casingOnly = schemaText.toLowerCase() === renderText.toLowerCase();
  if (casingOnly) return 'capitalization';

  const a = schemaText.toLowerCase().split(/\s+/).filter(Boolean);
  const b = renderText.toLowerCase().split(/\s+/).filter(Boolean);
  if (a.length !== b.length) return null;

  const values = roleValues(node);
  const differing = a.map((token, i) => [token, b[i]] as const).filter(([x, y]) => x !== y);
  // Every difference must be the schema writing a raw role value where the
  // renderer writes that value's translation.
  if (!differing.every(([x]) => values.has(x))) return null;

  // Did the keyword differ in case as well? Compare the tokens that are NOT
  // value substitutions.
  const structuralMatch =
    a.filter((_, i) => a[i] === b[i]).join(' ') === b.filter((_, i) => a[i] === b[i]).join(' ');
  if (!structuralMatch) return null;

  return schemaText.split(/\s+/).some((token, i) => {
    const other = renderText.split(/\s+/)[i];
    return other !== undefined && token !== other && token.toLowerCase() === other.toLowerCase();
  })
    ? 'both'
    : 'lexicalization';
}

describe('createSchemaRenderer agrees with renderBDD, modulo declared divergences', () => {
  for (const schema of allSchemas) {
    const example = EXAMPLES[schema.action];
    if (!example) {
      it(`${schema.action} has an example to compare`, () => {
        expect.fail(`No example for "${schema.action}" — add one to EXAMPLES.`);
      });
      continue;
    }

    const full = bdd.parse(example, 'en');
    const minimal = stripOptionalRoles(full);

    for (const language of LANGUAGES) {
      const expected = EXPECTED[schema.action]?.[language] ?? 'identical';

      it(`${schema.action} × ${language} — all roles populated (${expected})`, () => {
        const schemaText = schemaRenderer.render(full, language);
        const renderText = renderBDD(full, language) as string;
        if (expected === 'identical') expect(schemaText).toBe(renderText);
        expect(classify(schemaText, renderText, full)).toBe(expected);
      });

      it(`${schema.action} × ${language} — required roles only (${expected})`, () => {
        const schemaText = schemaRenderer.render(minimal, language);
        const renderText = renderBDD(minimal, language) as string;
        if (expected === 'identical') expect(schemaText).toBe(renderText);
        expect(classify(schemaText, renderText, minimal)).toBe(expected);
      });
    }
  }
});

describe('the divergence table stays honest', () => {
  // A cell that stops diverging must leave the table, or the table drifts into
  // a list of things that USED to be wrong.
  for (const [action, byLanguage] of Object.entries(EXPECTED)) {
    for (const [language, kind] of Object.entries(byLanguage)) {
      it(`${action} × ${language} still diverges by ${kind}`, () => {
        const node = bdd.parse(EXAMPLES[action], 'en');
        expect(schemaRenderer.render(node, language)).not.toBe(renderBDD(node, language));
      });
    }
  }
});

describe('keyword tables agree with the language profiles', () => {
  // renderBDD reads its own STEP_KEYWORDS table; the schema renderer reads the
  // profiles. A keyword that drifts between them would show up above as an
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

describe('renderBDD translates every word it writes', () => {
  // `renderThen`'s CSS-class branch used to hardcode English `has`, so Spanish
  // rendered `Entonces #button has .active`. The assertion word now comes from
  // the schema, which carries it per language.
  const node = bdd.parse('then #button has .active', 'en');
  const HAS_WORD: Record<string, string> = {
    en: 'has',
    es: 'tiene',
    ar: 'يحتوي',
    zh: '有',
    fr: 'a',
    tr: 'sahip',
  };

  for (const [language, word] of Object.entries(HAS_WORD)) {
    it(`then × ${language} uses "${word}"`, () => {
      expect(renderBDD(node, language)).toContain(word);
    });
  }

  for (const language of ['es', 'ar', 'zh', 'fr']) {
    it(`then × ${language} does not leak the English word`, () => {
      expect(renderBDD(node, language)).not.toContain('has');
    });
  }
});

describe('renderBDD omits a marker whose role is absent', () => {
  // `ACTION_WORDS` bundles the verb with the preposition that introduces the
  // target (`click on`, `を クリック`). `target` is optional, so a step
  // without one used to render dangling text: `When click on`.
  const node = bdd.parse('when click', 'en');

  it('parses without a target', () => {
    expect(node.roles.has('target')).toBe(false);
  });

  const TRAILING: Record<string, string> = {
    en: 'on',
    es: 'en',
    ar: 'على',
    fr: 'sur',
  };
  const LEADING: Record<string, string> = {
    ja: 'を',
    ko: '를',
    tr: 'üzerinde',
  };

  for (const [language, marker] of Object.entries(TRAILING)) {
    it(`when × ${language} does not end with "${marker}"`, () => {
      expect(renderBDD(node, language)).not.toMatch(new RegExp(`${marker}$`));
    });
  }

  for (const [language, marker] of Object.entries(LEADING)) {
    it(`when × ${language} does not start with "${marker}"`, () => {
      expect(renderBDD(node, language)).not.toMatch(new RegExp(`^${marker}`));
    });
  }
});
