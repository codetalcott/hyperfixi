/**
 * English→foreign RENDER-fidelity gate.
 *
 * WHY THIS EXISTS
 * ---------------
 * Nothing gated this direction. The multilingual ratchet scores the STORED
 * `pattern_translations` rows, which @lokascript/i18n's GrammarTransformer
 * writes — it never calls `render(node, L)` at all. `canonical-validity` is
 * en→en and `foreign-canonical-validity` is foreign→en, both of which pass.
 * So `render(parse(en), L)` — the function behind MCP `translate_code`,
 * `hyperfixi.translate`, `getAllTranslations`, core's `MultilingualHyperscript`
 * and the VS Code "Show in my language" badge — was measured by nothing.
 *
 * When it was finally measured (2026-08-26) it was 73.3% structurally clean
 * against the English reference where the i18n-written corpus was 97.0%.
 * `README.md`, `AGENTS.md` and the MCP server instructions all attach a
 * structural-fidelity guarantee to exactly this direction.
 *
 * WHAT IT ASSERTS
 * ---------------
 * For every corpus pattern and every non-English language: render the English
 * source into that language, parse it back, and require that no ACTION and no
 * ROLE from the English reference went missing. Failures are recorded per
 * (pattern, language) against a committed allowlist that may only shrink —
 * the same ratchet shape as `foreign-canonical-validity`.
 *
 * The allowlist is seeded at the level measured when the gate landed, so it
 * lands green and every later improvement is a deletion from it. It is a
 * record of what is known-broken, not a target.
 *
 * DB DEPENDENCY. The rendered text comes from `rawCode`, which is stable, but
 * the SET of rows is not: `populate` re-runs `discoverPatterns` and finds
 * examples the committed (frozen) patterns.db lacks. Measured 2026-08-26:
 * 3588 pairs against a fresh DB, 3542 against the committed one — enough to
 * move the clean rate (75.89% vs 75.97%) and fail the ratchet spuriously. So
 * this gate needs a freshly populated DB, exactly like the foreign one, and
 * its test carries the matching guard.
 *
 * STRICT ROLE SIGNATURES. Scoring uses `collectRoleSignatureStrict`, which
 * ignores roles the matcher injected as schema defaults. Without that, a
 * render that drops `to me` and a parser that puts `destination: me` back are
 * indistinguishable, and a role-dropping render scores as faithful. Both sides
 * are filtered, so a role implicit in the reference and in the candidate
 * cancels out.
 */
import { getAllPatterns } from '@hyperfixi/patterns-reference';
import { parseSemantic, render, type SemanticNode } from '@lokascript/semantic';
// Via the local shim, the path every other gate in this directory uses.
import { collectActions, collectRoleSignatureStrict } from './fidelity';

/**
 * The 23 non-English corpus languages. Mirrors `FOREIGN_LANGUAGES` in
 * foreign-canonical-validity.ts; kept as its own list because this gate can run
 * over a language the corpus has no authored translations for.
 */
export const RENDER_LANGUAGES = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

export interface RenderFidelityFailure {
  readonly id: string;
  readonly language: string;
  readonly english: string;
  readonly rendered: string;
  /** Actions present in the English reference and absent after the round trip. */
  readonly missingActions: readonly string[];
  /** `action.role:valueType` entries present in the reference and absent after. */
  readonly missingRoles: readonly string[];
  /** Set when the rendered surface could not be parsed back at all. */
  readonly unparseable?: boolean;
}

export interface RenderFidelityResult {
  readonly checked: number;
  readonly clean: number;
  readonly failures: readonly RenderFidelityFailure[];
}

function safeParse(code: string, language: string): SemanticNode | null {
  try {
    return parseSemantic(code, language)?.node ?? null;
  } catch {
    return null;
  }
}

/**
 * Render every corpus pattern into every language and score the round trip.
 *
 * A pattern whose English source does not itself parse is skipped rather than
 * counted as a failure — it has no reference to compare against, and that is a
 * parser question this gate does not ask.
 */
export async function checkRenderFidelity(opts?: {
  languages?: readonly string[];
  patterns?: ReadonlyArray<{ id: string; rawCode: string }>;
}): Promise<RenderFidelityResult> {
  const languages = opts?.languages ?? RENDER_LANGUAGES;
  const patterns = opts?.patterns ?? (await getAllPatterns({ limit: 1000 }));

  const failures: RenderFidelityFailure[] = [];
  let checked = 0;
  let clean = 0;

  for (const pattern of patterns) {
    // A pattern whose English source does not parse has no reference to compare
    // against, so it is skipped rather than counted as a failure — that is a
    // parser question, asked by other gates, not this one. This is also what
    // excludes the non-translatable HTML-markup rows: they are not hyperscript,
    // so they never parse, and there is no rendering decision to score.
    const reference = safeParse(pattern.rawCode, 'en');
    if (!reference) continue;

    const refActions = collectActions(reference);
    const refRoles = collectRoleSignatureStrict(reference);

    for (const language of languages) {
      checked++;
      let rendered = '';
      try {
        rendered = render(reference, language);
      } catch {
        failures.push({
          id: pattern.id,
          language,
          english: pattern.rawCode,
          rendered: '',
          missingActions: refActions,
          missingRoles: refRoles,
          unparseable: true,
        });
        continue;
      }

      const roundTripped = safeParse(rendered, language);
      if (!roundTripped) {
        failures.push({
          id: pattern.id,
          language,
          english: pattern.rawCode,
          rendered,
          missingActions: refActions,
          missingRoles: refRoles,
          unparseable: true,
        });
        continue;
      }

      const gotActions = new Set(collectActions(roundTripped));
      const gotRoles = new Set(collectRoleSignatureStrict(roundTripped));
      const missingActions = refActions.filter(a => !gotActions.has(a));
      const missingRoles = refRoles.filter(r => !gotRoles.has(r));

      if (missingActions.length === 0 && missingRoles.length === 0) {
        clean++;
      } else {
        failures.push({
          id: pattern.id,
          language,
          english: pattern.rawCode,
          rendered,
          missingActions,
          missingRoles,
        });
      }
    }
  }

  return { checked, clean, failures };
}

/** Group failures as `{ patternId: [language, …] }` — the committed allowlist shape. */
export function groupFailuresByPattern(
  failures: readonly RenderFidelityFailure[]
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const failure of failures) {
    (grouped[failure.id] ??= []).push(failure.language);
  }
  for (const languages of Object.values(grouped)) languages.sort();
  return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)));
}
