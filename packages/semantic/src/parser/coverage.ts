/**
 * Input coverage (Arc C) and the names a parse binds: the marks a speculative
 * parse rolls back to, the dropped-token records, the clauses kept verbatim,
 * and the identifiers a command binds for the rest of the parse.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type { CommandSemanticNode, SemanticRole, ActionType, LanguageToken } from '../types';
import { tryGetProfile } from '../registry';
import { getSchema } from '../generators/command-schemas';
import { isElseKeyword, isThenKeyword } from './clause-keywords';
import { closesBlockAt } from './end-words';
import { MAX_UNCONSUMED_SPAN_CHARS, parseDiagnostic } from './parse-diagnostics';
import { BLOCK_HEAD_ACTIONS, type WalkEntry } from './loop-heads';
import type { ParserState } from './parser-state';

/** Command verbs that also open a clause (`when it matches .x`, `take … for #t`). */
export const CLAUSE_OPENERS: ReadonlySet<string> = new Set(['when', 'for']);

/**
 * A word of the language a token was read in: one it knows (a keyword with
 * its English form, a particle), or a name outside ASCII.
 */
export function isOwnWord(t: LanguageToken): boolean {
  if (t.normalized || t.kind === 'particle') return true;
  return t.kind === 'identifier' && /[^\x00-\x7f]/.test(t.value);
}

/** Commands a clause never follows: a block's head, or a guard. */
export const CLAUSE_LESS: ReadonlySet<string> = new Set([
  ...BLOCK_HEAD_ACTIONS,
  'if',
  'unless',
  'while',
  'else',
]);

/** Words that end a command's clause: a block's structure, or a feature's head. */
export const CLAUSE_BOUNDARIES: ReadonlySet<string> = new Set([
  'else',
  'otherwise',
  'catch',
  'finally',
  'on',
]);

/**
 * Normalized keyword forms that are legitimate skip-residue for the per-segment
 * coverage check (Arc C): role markers the matcher deliberately leaves
 * unconsumed (qu `hina`→as, hi `में`→in), connectives, and structural glue.
 * A dropped run counts as a genuine drop only if a token OUTSIDE this set (and
 * outside the particle/conjunction/boundary classes) survives — see
 * {@link recordDroppedTokens}.
 */
export const COVERAGE_RESIDUE_NORMALIZED = new Set([
  'to',
  'from',
  'into',
  'onto',
  'with',
  'as',
  'at',
  'of',
  'in',
  'on',
  'by',
  'and',
  'or',
  'then',
  'end',
  'else',
  'the',
  'a',
  'an',
  'async',
]);

/** What a tokenizer normalizes a role-marking particle to: the role it marks. */
const MARKED_ROLES: ReadonlySet<string> = new Set([
  'agent',
  'patient',
  'source',
  'destination',
  'goal',
  'event',
  'condition',
  'quantity',
  'duration',
  'responseType',
  'method',
  'style',
  'manner',
  'loopType',
]);

/**
 * A particle a reader may skip: one that marks a role or joins words (normalized to a role, a
 * preposition or connective of the residue list, or nothing), or a role marker's surface. A
 * particle the language maps to a word with content of its own (es `fuera`, `out`) is not
 * residue: dropped, it is part of the script lost. It was skipped in silence, so
 * `al hacer clic fuera quitar .open de mí` came back as `on click remove .open from me`, the
 * dropdown closing on every click (7.3.0 live test).
 */
function isMarkerParticle(t: LanguageToken, language: string): boolean {
  const normalized = (t as { normalized?: string }).normalized?.toLowerCase();
  return (
    normalized === undefined ||
    MARKED_ROLES.has(normalized) ||
    COVERAGE_RESIDUE_NORMALIZED.has(normalized) ||
    getCoverageMarkerSurfaces(language).has(t.value.toLowerCase())
  );
}

/** Current record count of the active coverage frame (for rollback). */
export function coverageMark(state: ParserState): number {
  const frame = state.coverageFrames[state.coverageFrames.length - 1];
  return frame ? frame.length : 0;
}

/** Discard coverage records made after `mark` (a speculative parse was rejected). */
export function coverageRollback(state: ParserState, mark: number): void {
  const frame = state.coverageFrames[state.coverageFrames.length - 1];
  if (frame && frame.length > mark) frame.length = mark;
}

/** Per-language cache of role-marker surface forms (see residue filter). */
export const coverageMarkerSurfaces = new Map<string, Set<string>>();

/**
 * Rendered marker words the i18n transformer emits that the semantic profile
 * does not model as roleMarkers, left unconsumed BY DESIGN after their value
 * is reclaimed (the trailing responseType reclaim's as-postpositions: hi
 * `के रूप में`, tr `olarak`, qu `hina` — see the reclaim note in
 * buildEventHandler). Pure marker residue; a dropped VALUE next to them
 * (id `sebagai json`) still fires via the value token.
 */
export const LEAKED_RENDER_MARKERS: Record<string, readonly string[]> = {
  hi: ['के', 'रूप', 'में'],
  tr: ['olarak'],
  qu: ['hina'],
};

export function getCoverageMarkerSurfaces(language: string): Set<string> {
  let surfaces = coverageMarkerSurfaces.get(language);
  if (!surfaces) {
    surfaces = new Set<string>();
    const markers = tryGetProfile(language)?.roleMarkers;
    if (markers) {
      for (const marker of Object.values(markers)) {
        if (!marker) continue;
        // Multi-word marker surfaces are tokenized word-by-word — admit each
        // constituent so a phrase marker strips the same as a one-word one.
        if (marker.primary) {
          for (const w of marker.primary.toLowerCase().split(/\s+/)) surfaces.add(w);
        }
        for (const alt of marker.alternatives ?? []) {
          for (const w of alt.toLowerCase().split(/\s+/)) surfaces.add(w);
        }
      }
    }
    for (const w of LEAKED_RENDER_MARKERS[language] ?? []) {
      surfaces.add(w.toLowerCase());
    }
    coverageMarkerSurfaces.set(language, surfaces);
  }
  return surfaces;
}

/**
 * Whether a skipped token is legitimate matcher residue rather than dropped
 * content: particles, conjunctions, block boundaries (`end`/`fin`/`tukuy`,
 * including the `closesTrackedBlock`-annotated closers), and role-marker
 * words (normalized or language-surface forms). See NEXT_STEPS § "Input
 * coverage" step 3 — residue must not fire the diagnostic.
 */
export function isCoverageResidueToken(
  run: readonly LanguageToken[],
  i: number,
  language: string
): boolean {
  const t = run[i]!;
  if (t.kind === 'conjunction') return true;
  if (t.kind === 'particle') return isMarkerParticle(t, language);
  if ((t.metadata as { closesTrackedBlock?: boolean } | undefined)?.closesTrackedBlock) {
    return true;
  }
  if (
    isThenKeyword(t.value, language) ||
    closesBlockAt(run, i, language) ||
    isElseKeyword(t.value, language)
  ) {
    return true;
  }
  const norm = ((t as { normalized?: string }).normalized ?? t.value).toLowerCase();
  if (COVERAGE_RESIDUE_NORMALIZED.has(norm)) return true;
  return getCoverageMarkerSurfaces(language).has(t.value.toLowerCase());
}

/**
 * Record a token run a body/segment parser discarded without producing a
 * command (diagnostic ONLY — never touches scores or parse outcomes; the
 * scoring penalty is Arc D). Fires only when at least one non-residue token
 * survives the filter, so connectives/boundary markers/role particles the
 * matcher legitimately skips stay silent.
 */
export function recordDroppedTokens(
  state: ParserState,
  run: readonly LanguageToken[],
  language: string,
  context: string
): void {
  if (run.length === 0) return;
  const frame = state.coverageFrames[state.coverageFrames.length - 1];
  if (!frame) return;
  if (!run.some((_, i) => !isCoverageResidueToken(run, i, language))) return;
  const text = run
    .map(t => t.value)
    .join(' ')
    .trim();
  if (!text) return;
  const shown =
    text.length > MAX_UNCONSUMED_SPAN_CHARS ? `${text.slice(0, MAX_UNCONSUMED_SPAN_CHARS)}…` : text;
  frame.push(
    parseDiagnostic(
      `${context} left ${run.length} token(s) unconsumed: "${shown}"`,
      'warning',
      'unconsumed-input'
    )
  );
}

/**
 * Keep a run the clause walker would drop as the clause of the command before
 * it (`add .foo to .bar when it matches .doh`): its pattern does not model the
 * clause, so it is kept as written and written back as written (M1 phase 3,
 * group 3) in place of dropping it. A run that holds a command verb or a
 * structure word (`otherwise`, `on`) is an unread command, not a clause, and
 * stays dropped, and so does one glued to the command.
 */
export function keepVerbatimClause(
  state: ParserState,
  owner: WalkEntry | undefined,
  run: readonly LanguageToken[],
  before: LanguageToken | undefined,
  language: string
): boolean {
  const first = run[0];
  if (!owner || owner.kind !== 'command' || !first) return false;
  // What follows a block's head is its body (`repeat 3 times xyzzy end`).
  if (CLAUSE_LESS.has((owner as CommandSemanticNode).action)) return false;
  // Residue alone (`and` between two commands) is dropped by design.
  if (run.every((_, i) => isCoverageResidueToken(run, i, language))) return false;
  // In another language the clause is the English a translation wrote: a run
  // that holds a word of the language itself is that language unread.
  if (language !== 'en' && run.some(t => isOwnWord(t))) return false;
  // Glued to the command, the run splits a value the pattern read part of
  // (`the event` + `'s bubbling`): what was read is wrong, not incomplete. A
  // comma only separates (`log me, my`).
  if (before && before.position.end === first.position.start && first.value !== ',') {
    return false;
  }
  const unread = run.some((t, i) => {
    const words = [t.value.toLowerCase(), (t.normalized ?? t.value).toLowerCase()];
    if (i === 0 && words.some(w => CLAUSE_OPENERS.has(w))) return false;
    return (
      words.some(w => CLAUSE_BOUNDARIES.has(w)) ||
      isThenKeyword(t.value, language) ||
      closesBlockAt(run, i, language) ||
      isElseKeyword(t.value, language) ||
      (t.kind === 'keyword' && words.some(w => !!getSchema(w as ActionType)))
    );
  });
  if (unread) return false;
  let text = '';
  run.forEach((t, i) => {
    const prev = run[i - 1];
    text += !prev || prev.position.end === t.position.start ? t.value : ` ${t.value}`;
  });
  const node = owner as { verbatimClause?: string };
  node.verbatimClause = node.verbatimClause ? `${node.verbatimClause} ${text}` : text;
  // No role reads it: a tool that checks a script (validate, a fidelity
  // score) still sees the part no pattern models. Translation does not.
  state.coverageFrames[state.coverageFrames.length - 1]?.push(
    parseDiagnostic(
      `clause kept as written, read by no role: "${text}"`,
      'warning',
      'verbatim-clause'
    )
  );
  return true;
}

/** Record identifiers a just-built command binds (repeat/for patient, set destination). */
export function registerBoundIdentifiers(state: ParserState, node: CommandSemanticNode): void {
  const role =
    node.action === 'repeat' || node.action === 'for'
      ? 'patient'
      : node.action === 'set'
        ? 'destination'
        : null;
  if (!role) return;
  const v = node.roles.get(role as SemanticRole) as { type?: string; raw?: unknown } | undefined;
  if (v?.type === 'expression' && typeof v.raw === 'string' && /^[A-Za-z_]\w*$/.test(v.raw)) {
    state.boundIdentifiers.add(v.raw);
  }
}
