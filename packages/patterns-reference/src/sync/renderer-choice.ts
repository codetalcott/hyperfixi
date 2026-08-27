/**
 * The `best` corpus writer's choice rule (scripts/sync-translations.ts
 * --renderer best): store the semantic-rendered row unless the i18n row beats
 * it on some signal. Kept as its own module so the rule is unit-tested — the
 * script that applies it is not.
 *
 * Signals, in the order the multilingual ratchet checks them:
 *   - parse at all (R5): a candidate that does not parse back loses to any that does;
 *   - scoreNodes: R0 action recall, multiset recall, precision, R1 role fidelity,
 *     R3 value recall — an undefined score (nothing to compare) never decides;
 *   - the English round-trip (`render(parse_L(row), 'en') === render(ref, 'en')`),
 *     the cheap proxy for R2 (execution): a `put … before` that re-renders as
 *     `put … into` is role-identical and execution-different, and only this sees it;
 *   - engine validity (R4): the real hyperscript.org parser accepts that English.
 * Round-trip and engine validity are VETOES, not scores: a mismatch loses only to
 * a match. Ties go to the semantic candidate — the renderer the runtime uses.
 */
import type { FidelityScores } from '@lokascript/semantic/fidelity';

/** The corpus writers `scripts/sync-translations.ts --renderer` accepts. */
export type RendererName = 'i18n' | 'semantic' | 'best';

/**
 * The writer `npm run populate` uses when PATTERNS_RENDERER is unset. `best`
 * since 2026-08-27 (MULTILINGUAL_NEXT_STEPS.md 2026-08-27c/d): it is never
 * worse than the i18n writer on any ratchet signal by construction, and the
 * rows it still leaves to i18n are ratcheted by the testing-framework's
 * `i18n-kept-rows` gate. Folded into the DB provenance stamp, so a DB written
 * by another renderer reads STALE to a default gate run.
 */
export const DEFAULT_RENDERER: RendererName = 'best';

export function resolveRenderer(value: string | undefined): RendererName {
  if (value === undefined || value === '') return DEFAULT_RENDERER;
  if (value === 'i18n' || value === 'semantic' || value === 'best') return value;
  throw new Error(`Unknown renderer "${value}" (expected i18n | semantic | best)`);
}

export const SCORE_KEYS: ReadonlyArray<keyof FidelityScores> = [
  'actionRecall',
  'multisetRecall',
  'precision',
  'roleFidelity',
  'valueRecall',
];

export interface CandidateScore {
  scores: FidelityScores;
  /** render(parse_L(surface), 'en') equals render(reference, 'en'). */
  roundTrip: boolean;
  /** The engine accepts render(parse_L(surface), 'en'); undefined = engine unavailable. */
  engineValid: boolean | undefined;
}

/** True when candidate `a` is at least as good as `b` on every signal (null = no parse). */
export function noWorseThan(a: CandidateScore | null, b: CandidateScore | null): boolean {
  if (a === null) return b === null;
  if (b === null) return true;
  if (b.roundTrip && !a.roundTrip) return false;
  if (b.engineValid === true && a.engineValid === false) return false;
  return SCORE_KEYS.every(k => {
    const x = a.scores[k];
    const y = b.scores[k];
    return x === undefined || y === undefined || x >= y;
  });
}
