/**
 * Reading a clause by its verb rather than a pattern: the verb and marker
 * lookups, the roles marked tokens carry, and whether a command begins at a
 * token (SOV clauses, where the verb comes last).
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type {
  SemanticNode,
  SemanticValue,
  ActionType,
  LanguagePattern,
  LanguageToken,
  TokenStream,
} from '../types';
import { createCommandNode } from '../types';
import { TokenStreamImpl } from '../tokenizers';
import { tryGetProfile } from '../registry';
import { getSchema } from '../generators/command-schemas';
import { patternMatcher } from './pattern-matcher';
import { isThenKeyword } from './clause-keywords';
import { isStrayTerminator } from './end-words';
import { KNOWN_EVENTS, WAITABLE_EVENT_WORDS } from './event-words';
import { tokensToSemanticValue } from './value-from-tokens';

/**
 * Build a lookup from native verb keywords to action names for a language profile.
 */
export function buildVerbLookup(profile: {
  keywords: Record<string, { primary: string; alternatives?: string[]; normalized?: string }>;
}): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [action, kw] of Object.entries(profile.keywords)) {
    // Skip non-command keywords (on, if, else, etc.). `for` is deliberately
    // NOT skipped: the SOV grammar transforms put the for-loop keyword
    // clause-FINAL (`item の中 $items を ために` / `item içinde $items i için`)
    // — an order no generated pattern covers — so the verb-anchoring fallback
    // is exactly where it must anchor. This path only runs when nothing else
    // in the clause matched, so a `for` in an otherwise-parseable clause is
    // untouched.
    if (['on', 'if', 'else', 'when', 'where', 'while', 'end', 'then', 'and'].includes(action)) {
      continue;
    }
    lookup.set(kw.primary.toLowerCase(), action);
    if (kw.alternatives) {
      for (const alt of kw.alternatives) {
        lookup.set(alt.toLowerCase(), action);
      }
    }
  }
  return lookup;
}

/**
 * Build a lookup from role marker strings to role names.
 */
export function buildMarkerToRoleLookup(profile: {
  roleMarkers: Record<string, { primary: string; alternatives?: string[] }>;
}): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [role, marker] of Object.entries(profile.roleMarkers)) {
    if (!marker) continue;
    // The `event` role reuses a value role's particle in most SOV profiles
    // (ja event を = patient を, bn event তে = destination তে, tr event i =
    // patient i, ko event 을 = patient 을). This lookup only feeds BODY-clause
    // role extraction (parseSOVClauseByVerbAnchoring), where the event phrase
    // has already been stripped — so letting `event` clobber a value role's
    // marker mis-labels the fronted value as `event` and the role is dropped
    // downstream (ja/tr append-content "append requires content", bn silent
    // no-op; ko survived only because its corpus form uses the 를 ALTERNATIVE,
    // which never clobbered). Event markers may only fill gaps (qu `pi` keeps
    // its entry — no collision — preserving the not-a-verb shield).
    const overwrite = role !== 'event';
    if (overwrite || !lookup.has(marker.primary)) {
      lookup.set(marker.primary, role);
    }
    if (marker.alternatives) {
      for (const alt of marker.alternatives) {
        // Avoid overwriting more specific roles with generic ones
        if (!lookup.has(alt)) {
          lookup.set(alt, role);
        }
      }
    }
  }
  return lookup;
}

/**
 * Parse an SOV clause by finding command verbs and extracting roles from surrounding tokens.
 *
 * The grammar transformer often produces "verb-in-middle" order for two-role commands:
 *   "[role1] [marker1] [verb] [role2] [marker2]"
 *
 * This method:
 * 1. Scans for recognized command verbs in the token stream
 * 2. For each verb, extracts pre-verb and post-verb tokens as roles
 * 3. Uses marker tokens to determine which semantic role each value belongs to
 */
export function parseSOVClauseByVerbAnchoring(
  clauseTokens: LanguageToken[],
  language: string
): SemanticNode[] {
  const profile = tryGetProfile(language);
  if (!profile || profile.wordOrder !== 'SOV') return [];

  const verbLookup = buildVerbLookup(profile);
  const markerToRole = buildMarkerToRoleLookup(profile);
  const commands: SemanticNode[] = [];

  let pos = 0;

  while (pos < clauseTokens.length) {
    // Find the next verb token
    let verbIdx = -1;
    let verbAction = '';

    for (let i = pos; i < clauseTokens.length; i++) {
      const token = clauseTokens[i];
      // A known postpositional ROLE MARKER (を/に/를/에/i/কে/…) is NEVER a command
      // verb, even when its surface form doubles as a verb keyword alternative:
      // ja's `に` is both the `set`-value destination marker AND an `into`
      // alternative, so anchoring the trailing `それ に` of `set $users to it`
      // emitted a phantom `into` command (R0-precision). Gate on markerToRole,
      // NOT on `kind==='particle'`: a clause-final loop keyword like tr `için` /
      // bn `জন্য` (`for`) also tokenizes as a particle but is NOT a role marker,
      // and the verb-anchoring fallback must still find it as the `for` verb (else
      // template-literal-list-build drops its loop). See buildVerbLookup's `for` note.
      if (markerToRole.has(token.value)) continue;
      const byValue = verbLookup.get(token.value.toLowerCase());
      const byNormalized = token.normalized
        ? verbLookup.get(token.normalized.toLowerCase())
        : undefined;
      const action = byValue || byNormalized;

      if (action) {
        verbIdx = i;
        verbAction = action;
        break;
      }
    }

    if (verbIdx === -1) break; // No more verbs found

    // Tokens before verb = pre-verb arguments
    const preVerbTokens = clauseTokens.slice(pos, verbIdx);

    // Find end of this command: next verb, then-keyword, or end of tokens
    let endIdx = clauseTokens.length;
    for (let i = verbIdx + 1; i < clauseTokens.length; i++) {
      const t = clauseTokens[i];
      // Stop at then-keywords
      if (t.kind === 'conjunction' || isThenKeyword(t.value, language)) {
        endIdx = i;
        break;
      }
      // Stop at the next verb (start of new command) — but only if preceded by a marker
      // This prevents stopping at "value" tokens that happen to match a verb name.
      // A known role marker is not a verb (see the verb-find guard above): without
      // this exclusion `に` (set's value marker, also an `into` alt) ends the `set`
      // clause one token early, stranding its `it` patient. A non-marker loop
      // keyword (tr `için` / bn `জন্য`) still legitimately stops the clause.
      if (i > verbIdx + 1 && !markerToRole.has(t.value)) {
        const nextAction =
          verbLookup.get(t.value.toLowerCase()) ||
          (t.normalized ? verbLookup.get(t.normalized.toLowerCase()) : undefined);
        if (nextAction) {
          endIdx = i;
          break;
        }
      }
    }

    // Tokens after verb = post-verb arguments
    const postVerbTokens = clauseTokens.slice(verbIdx + 1, endIdx);

    // Extract roles from pre-verb and post-verb tokens using markers
    const roles = extractRolesFromMarkedTokens(
      preVerbTokens,
      postVerbTokens,
      markerToRole,
      verbAction,
      language
    );

    commands.push(
      createCommandNode(verbAction as ActionType, roles, {
        sourceLanguage: language,
        confidence: 0.7,
      })
    );

    pos = endIdx;
    // Skip conjunction/then-keyword if present
    if (pos < clauseTokens.length) {
      const t = clauseTokens[pos];
      if (t.kind === 'conjunction' || isThenKeyword(t.value, language)) {
        pos++;
      }
    }
  }

  return commands;
}

/**
 * Extract semantic roles from pre-verb and post-verb token groups using marker analysis.
 *
 * Recognizes patterns like:
 *   pre-verb:  [expr] [を]   → patient (obj marker)
 *   post-verb: [expr] [に]   → destination (to marker)
 *   pre-verb:  [expr] [から] → source (from marker)
 */
export function extractRolesFromMarkedTokens(
  preVerbTokens: LanguageToken[],
  postVerbTokens: LanguageToken[],
  markerToRole: Map<string, string>,
  action: string,
  language: string
): Record<string, SemanticValue> {
  const roles: Record<string, SemanticValue> = {};

  // Process a group of tokens: collect value tokens until a marker is found
  const processGroup = (tokens: LanguageToken[]) => {
    let valueTokens: LanguageToken[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // A block terminator the SOV reorder absorbed into a role phrase is
      // structural residue, never part of a value (isStrayTerminator).
      if (isStrayTerminator(token, tokens[i + 1], language)) continue;
      const role = markerToRole.get(token.value);
      if (role && token.kind === 'particle' && valueTokens.length > 0) {
        // This is a marker — assign the preceding value tokens to this role
        const value = tokensToSemanticValue(valueTokens, language);
        if (value) {
          // Map the role name, avoiding overwrites of existing roles
          const roleKey = mapRoleForCommand(role, action, roles);
          if (roleKey) {
            roles[roleKey] = value;
          }
        }
        valueTokens = [];
      } else {
        valueTokens.push(token);
      }
    }

    // Remaining tokens without a following marker
    if (valueTokens.length > 0) {
      // A lone TIME-shaped trailing token (`300ms`, `2s`) is a DURATION, not
      // a patient/destination: the SOV render leaves it bare after the goal
      // phrase (`遷移 0 に 300ms` = `transition … to 0 over 300ms` — the
      // `over` marker never survives translation), and the value-slot
      // fallback below either mistyped it or dropped it (the in-branch
      // sibling of the fused-path trailing-DURATION reclaim). Schema-gated
      // to an action that declares a still-empty `duration` role.
      const soleTime =
        valueTokens.length === 1 &&
        /^\d+(\.\d+)?(ms|s)$/i.test(valueTokens[0].value) &&
        !roles.duration &&
        getSchema(action as ActionType)?.roles.some(r => r.role === 'duration');
      if (soleTime) {
        roles.duration = {
          type: 'literal',
          value: valueTokens[0].value,
          dataType: 'string',
        } as SemanticValue;
      } else {
        const value = tokensToSemanticValue(valueTokens, language);
        if (value) {
          // Unmarked trailing tokens: assign based on what's missing
          if (!roles.patient) {
            roles.patient = value;
          } else if (!roles.destination) {
            roles.destination = value;
          }
        }
      }
    }
  };

  processGroup(preVerbTokens);
  processGroup(postVerbTokens);

  return roles;
}

/**
 * Map a marker-derived role name to the appropriate semantic role for a command,
 * handling cases where marker roles overlap (e.g., both patient and destination
 * use similar particles in some languages).
 */
export function mapRoleForCommand(
  markerRole: string,
  action: string,
  existingRoles: Record<string, SemanticValue>
): string | null {
  // `set`'s surface order is DESTINATION-first (`set <dest> to <value>`), so
  // the SOV reorder marks the DESTINATION with the patient particle (`$x を
  // beep! 私の値 に 設定`) and the VALUE with the destination particle —
  // systematically, not just on slot collision. The collision-only swap
  // below left every fallback-parsed set with flipped roles vs the en
  // reference (beep-debug-expression across the SOV cohort, R1 Family D).
  // set only: `put <value> into <dest>` is VALUE-first, so put's patient
  // particle really does mark the patient.
  if (action === 'set') {
    if (markerRole === 'patient') markerRole = 'destination';
    else if (markerRole === 'destination') markerRole = 'patient';
  }
  // Direct mapping — if the role isn't taken yet, use it
  if (!existingRoles[markerRole]) {
    return markerRole;
  }

  // If the marker role is already taken, try to assign to a related role
  // For "set" and "put": patient marker (を/i) is the destination, dest marker (に/e) is the patient value
  if (markerRole === 'patient' && !existingRoles.destination) {
    return 'destination';
  }
  if (markerRole === 'destination' && !existingRoles.patient) {
    return 'patient';
  }
  if (markerRole === 'source' && !existingRoles.source) {
    return 'source';
  }

  return null; // Can't assign
}

/**
 * A command word that begins a handler's BODY, ending the head: a keyword whose
 * normalized form is a command this language parses. A command that is also an
 * event name (`on focus or blur`) is the head's event, not a body verb.
 */
export function isBodyCommandWord(tok: LanguageToken, commands: ReadonlySet<string>): boolean {
  const norm = (tok.normalized ?? tok.value).toLowerCase();
  return (
    tok.kind === 'keyword' &&
    commands.has(norm) &&
    !KNOWN_EVENTS.has(norm) &&
    !WAITABLE_EVENT_WORDS.has(norm)
  );
}

/**
 * Check if a token is a 'then' keyword in the given language.
 */
/**
 * Consume the next token when it is the language's rendered `for` word (bn
 * `জন্য`, tr `için`) trailing a just-reclaimed phrase (a wait-for event, a
 * transition duration). The word doubles as the for-loop keyword, so left in
 * the stream it anchors a phantom bare `for` command in the remaining body
 * tokens. Homonym particles carry no `normalized`, so the profile's surface
 * forms are matched too.
 */
export function consumeForPostposition(tokens: TokenStream, language: string): void {
  const post = tokens.peek();
  if (!post) return;
  const postNorm = (post.normalized ?? '').toLowerCase();
  const forKw = tryGetProfile(language)?.keywords?.for;
  const isForWord =
    postNorm === 'for' ||
    post.value === forKw?.primary ||
    (forKw?.alternatives ?? []).includes(post.value);
  if (isForWord) tokens.advance();
}

/** Whether a command pattern matches at the head of the given token slice. */
export function tokensBeginCommand(
  toks: LanguageToken[],
  commandPatterns: LanguagePattern[],
  language: string
): boolean {
  if (toks.length === 0) return false;
  const stream = new TokenStreamImpl(toks, language);
  return patternMatcher.matchBest(stream, commandPatterns) !== null;
}

/**
 * Whether the token slice begins an SOV *verb-medial* command
 * (`{value} {marker} … {verb} …`, e.g. `triggerEl を 設定 私 に` = `set triggerEl
 * to me`). matchBest can't recognise these — it anchors on a selector/typed
 * role — so the conditional split's {@link tokensBeginCommand} misses a
 * verb-medial then-branch head and folds it into the condition (the A2a
 * behavior-`init` `set` drop: the then-branch parser handles `set` fine once it
 * *receives* it; only the boundary detection was blind to it).
 *
 * Mirrors the recognition {@link parseSOVClauseByVerbAnchoring} relies on: one
 * or more `{value}{particle-marker}` role pairs followed by a command verb
 * keyword. Conservative by construction — a bare-verb command (no leading role)
 * already matches via matchBest, and a condition predicate (`X is empty`,
 * `X exists`) carries copulas/operators rather than a `{value}{marker}{verb}`
 * head, so it can't spuriously trip this.
 */
export function sovCommandStartsAt(
  toks: LanguageToken[],
  verbLookup: Map<string, string> | null
): boolean {
  if (!verbLookup) return false;
  const isVerb = (t: LanguageToken): boolean =>
    verbLookup.has(t.value.toLowerCase()) ||
    (!!t.normalized && verbLookup.has(t.normalized.toLowerCase()));
  const isValue = (t: LanguageToken): boolean =>
    t.kind === 'identifier' ||
    t.kind === 'selector' ||
    t.kind === 'literal' ||
    (t.kind as string) === 'reference';
  let i = 0;
  let pairs = 0;
  while (i + 1 < toks.length) {
    const val = toks[i];
    const mark = toks[i + 1];
    if (!isValue(val) || mark.kind !== 'particle') break;
    pairs += 1;
    i += 2;
    const next = toks[i];
    if (pairs >= 1 && next && isVerb(next)) return true;
  }
  return false;
}
