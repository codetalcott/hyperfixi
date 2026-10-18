/**
 * After a command's pattern matched, the roles a trailing phrase still carries:
 * a duration (`for 2s`), `in new window`, a role the pattern had no slot for,
 * a `with <style>` and its `as <type>`, and a trailing expression role.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type {
  CommandSemanticNode,
  SemanticValue,
  SemanticRole,
  ActionType,
  LanguageToken,
  TokenStream,
} from '../types';
import { createLiteral, createReference } from '../types';
import { TokenStreamImpl } from '../tokenizers';
import { tryGetProfile } from '../registry';
import { getSchema } from '../generators/command-schemas';
import { endsClauseAt } from './end-words';
import { AS_MARKERS_AFTER, AS_MARKERS_BEFORE, RESPONSE_TYPE_WORDS } from './response-type-words';
import { foldNakedNamedArgsRaw } from './naked-args-fold';
import { joinTokenText, tokenToSemanticValue } from './value-from-tokens';

/**
 * Control-flow / structural keywords that tokenize as identifiers in some
 * languages but can never be a trailing role value (source/destination). Guards
 * tryAttachTrailingRole against capturing a block terminator (`put … end`) or a
 * branch keyword (`… else …`) as a destination.
 */
export const NON_VALUE_KEYWORDS = new Set([
  'then',
  'end',
  'else',
  'if',
  'unless',
  'while',
  'for',
  'repeat',
  'and',
]);

/**
 * Positional keywords that lead a positional-phrase role value (`closest .card`,
 * `next .panel`). tryAttachTrailingRole uses these to reclaim a trailing
 * `<positional> <selector> <marker>` destination as the `{ type: 'expression' }`
 * shape the core runtime evaluates — matching the English reference parse.
 */
export const POSITIONAL_VALUE_KEYWORDS = new Set([
  'first',
  'last',
  'next',
  'previous',
  'random',
  'closest',
]);

/**
 * Reclaim a trailing post-verb role phrase (`source` or `destination`) that the
 * per-command pattern left unconsumed. The grammar transformer emits a
 * command's `from <source>` / `to <destination>` phrase AFTER the verb:
 *   remove .x from body → `.x を 削除 ボディ から` (modal-close-button)
 *   add .x to body      → `.x を 追加 ボディ に`   (modal-open)
 * The per-command pattern ends at the verb, so the trailing `<value> <marker>`
 * (postpositional, SOV) or `<marker> <value>` (prepositional, SVO th) is skipped
 * and the role defaults to `me` — the effect lands on the clicked element
 * instead of the document body. Body-clause twin of the #379 event-wrapper
 * trailing role groups.
 *
 * Conservative by construction: for each of source/destination the command's
 * schema declares and that is currently absent or the defaulted `me`, fires
 * only when the very next tokens form a clean marker+value pair in that
 * marker's position order. So it can neither overwrite a genuinely captured
 * role (accordion's `remove .open from .accordion-item` keeps its source),
 * steal a following command's tokens (a trailing `then add …` has no role
 * marker adjacent), nor touch a positional-phrase destination (`add .open to
 * closest .accordion-item` — the leading token is the `closest` keyword, which
 * isValue rejects, so that phrase is left for the positional path).
 *
 * The `destination` marker is matched by its PRIMARY surface form only: several
 * profiles list dangerous destination *alternatives* that belong to other roles
 * (ko `에서` is the source marker, hi `को` the object marker), so admitting them
 * would mis-capture a source phrase as a destination. The shipped `source`
 * reclaim keeps its broader primary+alternatives+normalized match.
 */
/**
 * Reclaim a post-verb bare TIME literal as `duration`.
 *
 * A verb-final language can emit the duration AFTER the verb, where no
 * pattern reaches it — qu's stored corpus surface is
 * `*background-color ta "blue" man ñitiy pi pasay 500ms`, and
 * `transition-qu-generated-simple` matches everything up to `pasay` leaving
 * `500ms` unconsumed. That was the blocker filed against the SOV marker-side
 * fix: it makes the standalone pattern match this shape at all, and without
 * this reclaim the duration is then silently dropped on five qu rows (the R1
 * role-set flip and the R3 value ratchet both catch it).
 *
 * The sibling of the trailing BARE-literal quantity reclaim on the fused
 * path, and gated the same way: an OPTIONAL `duration` role the schema
 * declares and the parse did not fill, and a next token that is literally a
 * time literal. A selector, a `then`/`end` keyword or a bare number never
 * matches, so nothing else can be captured by accident.
 */
export function tryAttachTrailingDuration(stream: TokenStream, command: CommandSemanticNode): void {
  const roles = command.roles as Map<SemanticRole, SemanticValue>;
  if (roles.has('duration' as SemanticRole)) return;
  const schema = getSchema(command.action as ActionType);
  if (!schema?.roles.some(r => r.role === 'duration' && !r.required)) return;
  const next = stream.peek();
  if (!next || !/^\d+(?:\.\d+)?(?:ms|s|m|h)$/.test(next.value)) return;
  roles.set('duration' as SemanticRole, createLiteral(next.value, 'duration'));
  stream.advance();
}

/**
 * Reclaim `go … in new window` after a fused handler pattern. The fused
 * `go-event-*` patterns carry no url variant, so the url rebind in
 * tryAttachTrailingExpressionRole takes the URL itself and left the tail
 * after it unread: in 13 languages `go to url "/x" in new window` lost its
 * window. The phrase is English in every language (IN_NEW_MARKER_ALL_LANGS),
 * and its last word is `window` or the language's word for it.
 */
export function tryAttachNewWindow(stream: TokenStream, command: CommandSemanticNode): void {
  const roles = command.roles as Map<SemanticRole, SemanticValue>;
  if (command.action !== 'go' || roles.has('manner' as SemanticRole)) return;
  const [a, b, c] = [stream.peek(), stream.peek(1), stream.peek(2)];
  if (a?.value.toLowerCase() !== 'in' || b?.value.toLowerCase() !== 'new') return;
  if (!c || (c.normalized ?? c.value).toLowerCase() !== 'window') return;
  roles.set('manner' as SemanticRole, createReference('window'));
  for (let i = 0; i < 3; i++) stream.advance();
}

export function tryAttachTrailingRole(
  stream: TokenStream,
  command: CommandSemanticNode,
  language: string,
  boundIdentifiers: ReadonlySet<string>
): void {
  const schema = getSchema(command.action as ActionType);
  if (!schema) return;
  const profile = tryGetProfile(language);
  if (!profile) return;
  const roles = command.roles as Map<SemanticRole, SemanticValue>;

  // What counts as a trailing role value. A control-flow keyword never does
  // (`end`/`else`/`then` tokenize as identifiers in some languages and must not
  // be captured). The `strict` variant — used for `destination` — admits only
  // selectors and known DOM reference words; a bare identifier is rejected
  // because the `to`-markers (ja に, ko 에, …) are common enough that admitting
  // arbitrary identifiers makes the reclaim consume tokens a later command
  // needed, cascading into different parses. The non-strict variant — used for
  // `source`, matching the shipped #379/#408 behavior — also admits bare
  // identifiers (the `from`-markers are rarer and were verified safe).
  const isValue = (t: LanguageToken | null, strict: boolean): boolean => {
    if (!t) return false;
    if (t.kind === 'selector') return true;
    const norm = (t.normalized ?? t.value).toLowerCase();
    if (NON_VALUE_KEYWORDS.has(norm)) return false;
    if (
      norm === 'body' ||
      norm === 'it' ||
      norm === 'you' ||
      norm === 'result' ||
      norm === 'document' ||
      norm === 'window'
    )
      return true;
    // A bare identifier the current parse BOUND (a loop binding variable or a
    // set variable — see registerBoundIdentifiers) is a legitimate strict
    // destination (`add .processed to item` in a for-body); arbitrary
    // identifiers stay rejected per the over-capture rationale above.
    if (boundIdentifiers.has(t.value)) return true;
    if (strict) return false;
    return t.kind === 'identifier' || (t.kind as string) === 'reference';
  };

  // remove→source, add/put→destination. A command declares at most one of
  // these trailing markers, so the loop never double-fires for one clause.
  const trailingRoles: ReadonlyArray<{ role: SemanticRole; strict: boolean }> = [
    { role: 'source', strict: false },
    { role: 'destination', strict: true },
  ];
  for (const { role, strict } of trailingRoles) {
    if (!schema.roles.some(r => r.role === role)) continue;
    const marker = profile.roleMarkers?.[role];
    if (!marker) continue;
    const existing = roles.get(role);
    // Only fill a missing role or override the schema's `me` default — never a
    // genuinely captured one.
    if (existing && !(existing.type === 'reference' && existing.value === 'me')) continue;

    const isMarker = (t: LanguageToken | null): boolean => {
      if (!t || (t.kind !== 'particle' && t.kind !== 'keyword')) return false;
      const v = t.value.toLowerCase();
      if (marker.primary?.toLowerCase() === v) return true;
      if (strict) return false;
      if ((t.normalized ?? '').toLowerCase() === role) return true;
      return !!marker.alternatives?.some(a => a.toLowerCase() === v);
    };

    const tok0 = stream.peek();
    const tok1 = stream.peek(1);
    if (!tok0 || !tok1) return;

    // Positional-phrase value: `<closest|next|…> <selector> <marker>`
    // (accordion `add .open to closest .accordion-item` → SOV `… 最も近い
    // .accordion-item に`). Only meaningful for the strict (destination) role and
    // only postpositional — the only corpus shape. Built as the same
    // `{ type: 'expression', raw: 'closest .accordion-item' }` the English
    // reference produces (normalized positional keyword + selector surface), so
    // the core's positional evaluator resolves it identically.
    if (strict && marker.position === 'after') {
      const tok2 = stream.peek(2);
      const pos = (tok0.normalized ?? tok0.value).toLowerCase();
      if (POSITIONAL_VALUE_KEYWORDS.has(pos) && tok1.kind === 'selector' && isMarker(tok2)) {
        roles.set(role, { type: 'expression', raw: `${pos} ${tok1.value}` } as SemanticValue);
        stream.advance();
        stream.advance();
        stream.advance();
        return;
      }
    }

    if (marker.position === 'after') {
      // Postpositional `<value> <marker>` (SOV: ja から/に, ko 에서/에, …).
      if (isValue(tok0, strict) && isMarker(tok1)) {
        const v = tokenToSemanticValue(tok0);
        stream.advance();
        stream.advance();
        if (v) roles.set(role, v);
        return;
      }
      // Postpositional with an untranslated scope qualifier the transformer
      // keeps inline: `<value> in <x> <marker>` (`<button/> in me に`,
      // form-disable-on-submit ×4 SOV). en's add/put schemas have no scope
      // role and DROP the qualifier (`add @disabled to <button/> in me` →
      // destination="<button/>"), so attach the bare value and consume
      // through the marker — the same en-lossiness. Strict (destination)
      // only, single-token qualifier object, and the marker must close the
      // phrase, so `in closest <form/>` (no adjacent marker) is untouched.
      if (strict && isValue(tok0, strict)) {
        const tok2 = stream.peek(2);
        const tok3 = stream.peek(3);
        if (
          (tok1.normalized ?? tok1.value).toLowerCase() === 'in' &&
          tok2 &&
          !isMarker(tok2) &&
          isMarker(tok3)
        ) {
          const v = tokenToSemanticValue(tok0);
          stream.advance();
          stream.advance();
          stream.advance();
          stream.advance();
          if (v) roles.set(role, v);
          return;
        }
      }
    } else {
      // Prepositional `<marker> <value>` (SVO th: จาก/ใน body).
      if (isMarker(tok0) && isValue(tok1, strict)) {
        stream.advance();
        const v = tokenToSemanticValue(stream.advance());
        if (v) roles.set(role, v);
        return;
      }
    }
  }
}

/**
 * Reclaim a trailing post-verb `with`-options run as the `style` role. The
 * SOV canonicalOrders carry no `style` slot, so the transformer's safety net
 * appends the with-phrase AFTER the verb with its postposition (ja `フェッチ
 * method:"POST" body:form で`, tr `getir … ile`, qu `apamuy … wan`), where
 * the fused event pattern (`fetch-event-<lang>-sov-patient-first`) and the
 * standalone SOV patterns leave it unconsumed — fetch.style/render.style
 * missing in the whole SOV cohort while en captures `style:expression` (the
 * R1 Family A cluster). The #530 [verb..boundary] re-parse can't recover it:
 * the tail is verb-FIRST relative to the slice while every standalone SOV
 * pattern is verb-final.
 *
 * Scans ahead for the profile's postpositional `style` marker and, when a
 * non-empty run of value tokens ends at it inside the clause, captures the
 * run as `style:expression` and consumes through the marker. Conservative by
 * construction: gated to fetch/render (the only commands whose corpus
 * with-phrase strands — show/hide/transition also declare `style` and stay
 * untouched), to an ABSENT style role, and to a postpositional marker; the
 * scan aborts unconsumed at a clause boundary (conjunction / then / curated
 * end — a run without its marker is never captured) and is capped, so a
 * marker far past the clause can't pull in foreign tokens. Mid-run particles
 * that belong to the blob (formdata's `として`/`olarak`/`hina` as-markers)
 * don't terminate the scan — only the style marker itself does, first match
 * wins (ko's 로 doubles as the as-marker: the first 로 closes the options
 * run, the rest stays unconsumed exactly as before).
 */
export function tryAttachTrailingStyle(
  stream: TokenStream,
  command: CommandSemanticNode,
  language: string
): void {
  if (command.action !== 'fetch' && command.action !== 'render') return;
  const roles = command.roles as Map<SemanticRole, SemanticValue>;
  const schema = getSchema(command.action as ActionType);
  if (!schema?.roles.some(r => r.role === 'style')) return;

  // Continuation refold: a naked-args run whose HEAD token was already
  // bound into the style slot — the Slavic with/from collision patterns
  // (pl `z`/ru `с`/uk `з`) capture `method` as the source-marked group's
  // expression and the relabel above shifts it to style, leaving the stream
  // at `: "POST" body:form`. Refold the pending key with the rest of the
  // run (Arc E — the fetch-options family). Gated to a bare code-shaped
  // key + a colon at the stream head, so a genuine style capture (`with
  // {…}` / a folded run) never re-fires.
  const existing = roles.get('style') as { type?: string; raw?: string } | undefined;
  if (existing) {
    if (
      existing.type === 'expression' &&
      typeof existing.raw === 'string' &&
      /^[A-Za-z_][\w-]*$/.test(existing.raw) &&
      stream.peek()?.value === ':'
    ) {
      const refolded = foldNakedNamedArgsRaw(stream, existing.raw);
      if (refolded) {
        roles.set('style', { type: 'expression', raw: refolded } as SemanticValue);
      }
    }
    // The trailing as-phrase is stranded whenever the style run ended without
    // one — which now includes a style the PATTERN captured, since the fused
    // event-handler patterns gained a `[with {style}]` slot from the schema.
    // Before that they always left the whole run to the reclaim above, so
    // this call only ever ran on the refold path and id's `sebagai JSON`
    // silently lost its responseType the moment the slot started matching.
    // Self-gating (already-captured role, schema must declare it), so
    // reaching it from the pattern path adds no new capture surface.
    tryAttachResponseTypeAfterStyle(stream, command, language);
    return;
  }

  // The same continuation via the Slavic with/from collision shape (pl `z`,
  // ru `с`, uk `з`): the fused event pattern binds the URL to {patient} and
  // the with-run's HEAD key to {source} — normalizeCommandRoles shifts
  // source→style / patient→source only ONCE at the end of the whole parse,
  // so at reclaim time the pending key sits in `source`. Refold there and
  // let the late relabel do the role gymnastics it already owns (its gate —
  // patient + expression-typed source + empty style — still holds: the
  // refolded `{…}` raw stays an expression).
  if (command.action === 'fetch') {
    const pat = roles.get('patient');
    const src = roles.get('source') as { type?: string; raw?: string } | undefined;
    if (
      pat &&
      src &&
      (pat.type === 'literal' || pat.type === 'expression') &&
      src.type === 'expression' &&
      typeof src.raw === 'string' &&
      /^[A-Za-z_][\w-]*$/.test(src.raw) &&
      stream.peek()?.value === ':'
    ) {
      const refolded = foldNakedNamedArgsRaw(stream, src.raw);
      if (refolded) {
        roles.set('source', { type: 'expression', raw: refolded } as SemanticValue);
        tryAttachResponseTypeAfterStyle(stream, command, language);
      }
      return;
    }
  }

  const profile = tryGetProfile(language);
  const marker = profile?.roleMarkers?.style;
  if (!marker) return;

  // Prepositional `<with-marker> key:value …` (es `con`, de `mit`, zh `用`,
  // ar `بـ`, tl `nang`, he `עם` — the corpus render surfaces). The fused
  // event patterns and the handcrafted fetch patterns end at the source, so
  // the whole with-run strands after the match (Arc C: 18 firings per naked
  // row). The fold either consumes a complete pair run or resets — a
  // marker-homonym followed by anything else leaves the stream untouched.
  if (marker.position === 'before') {
    const preSurfaces = new Set(
      [marker.primary, ...(marker.alternatives ?? [])].map(s => s.toLowerCase())
    );
    const head = stream.peek();
    if (!head || !preSurfaces.has(head.value.toLowerCase())) return;
    const preMark = stream.mark();
    stream.advance();
    const folded = foldNakedNamedArgsRaw(stream);
    if (!folded) {
      stream.reset(preMark);
      return;
    }
    roles.set('style', { type: 'expression', raw: folded } as SemanticValue);
    tryAttachResponseTypeAfterStyle(stream, command, language);
    return;
  }
  if (marker.position !== 'after') return;

  const surfaces = new Set(
    [marker.primary, ...(marker.alternatives ?? [])].map(s => s.toLowerCase())
  );
  // Cap comfortably above the widest corpus blob (qu fetch-with-headers
  // splits to 13 tokens) while keeping a runaway scan impossible.
  const SCAN_CAP = 24;
  let markerOffset = -1;
  let depth = 0; // (…)/{…} nesting — ko's 로 doubles as the as-marker and
  for (let i = 0; i < SCAN_CAP; i++) {
    // appears INSIDE formdata's parenthesized body; only a depth-0 marker
    // closes the options run.
    const t = stream.peek(i);
    if (!t || endsClauseAt(stream.tokens, stream.position() + i, language)) break;
    if (t.value === '(' || t.value === '{') depth++;
    else if (t.value === ')' || t.value === '}') depth = Math.max(0, depth - 1);
    if (
      depth === 0 &&
      (t.kind === 'particle' || t.kind === 'keyword') &&
      surfaces.has(t.value.toLowerCase())
    ) {
      markerOffset = i;
      break;
    }
  }
  // No marker in range, or an empty run (`<verb> で …` has no options).
  if (markerOffset <= 0) return;

  const run: LanguageToken[] = [];
  for (let i = 0; i < markerOffset; i++) {
    const t = stream.peek(i);
    if (t) run.push(t);
  }
  // ko's style marker 로 doubles as its AS-marker, so a bare `json 로`
  // as-phrase (event-debounce) would misread as a with-phrase. A run that is
  // a single known response-type word is an as-phrase — leave it unconsumed
  // exactly as before (the en reference drops it too: equal lossiness).
  if (run.length === 1 && RESPONSE_TYPE_WORDS.has(run[0].value.toLowerCase())) {
    return;
  }
  // A run that is entirely a naked named-arg form folds to the
  // object-literal raw the en reference now captures (`{method:"POST",
  // body:form}` — offset-exact inside values, so qu's shattered
  // `FormDa`+`ta` re-joins). Any other run keeps the legacy space-join
  // byte-identical (render's paren-runs, braced blobs).
  const runStream = new TokenStreamImpl(run, language);
  const foldedRun = foldNakedNamedArgsRaw(runStream);
  roles.set('style', {
    type: 'expression',
    raw: foldedRun && runStream.isAtEnd() ? foldedRun : joinTokenText(run, language),
  } as SemanticValue);
  for (let i = 0; i <= markerOffset; i++) stream.advance();
  tryAttachResponseTypeAfterStyle(stream, command, language);
}

/**
 * Consume a trailing as-phrase into `responseType` right after a style
 * capture (`fetch /api/me with headers:{…} as JSON` — the with-run used to
 * strand BEFORE the as-phrase, so the trailing-responseType reclaim above
 * never saw it; once the style run is consumed the as-phrase is next).
 * Only called on a just-captured style, so a bare as-phrase without options
 * (ko event-debounce `json 로`) keeps its existing handling. Accepts
 * `<as-marker> <word>` (SVO/VSO), `<word> [<as-postposition…>]` (SOV), and
 * the bare word (ja/bn renders) — the word must be a KNOWN response-type
 * loanword, mirroring the trailing-responseType reclaim's gate.
 */
export function tryAttachResponseTypeAfterStyle(
  stream: TokenStream,
  command: CommandSemanticNode,
  language: string
): void {
  const roles = command.roles as Map<SemanticRole, SemanticValue>;
  if (roles.has('responseType')) return;
  const schema = getSchema(command.action as ActionType);
  if (!schema?.roles.some(r => r.role === 'responseType' && !r.required)) return;
  const isResponseWord = (w: string | undefined): w is string =>
    !!w && RESPONSE_TYPE_WORDS.has(w.toLowerCase());

  const t0 = stream.peek();
  if (!t0) return;
  const setResponseType = (word: string): void => {
    roles.set('responseType', { type: 'expression', raw: word } as SemanticValue);
  };

  const before = AS_MARKERS_BEFORE[language];
  if (before?.some(m => t0.value.toLowerCase() === m)) {
    const t1 = stream.peek(1);
    if (t1 && isResponseWord(t1.value)) {
      stream.advance();
      stream.advance();
      setResponseType(t1.value);
    }
    return;
  }

  if (isResponseWord(t0.value)) {
    stream.advance();
    setResponseType(t0.value);
    for (const seq of AS_MARKERS_AFTER[language] ?? []) {
      if (seq.every((w, i) => stream.peek(i)?.value.toLowerCase() === w)) {
        for (let i = 0; i < seq.length; i++) stream.advance();
        break;
      }
    }
  }
}

/**
 * Reclaim a trailing post-verb EXPRESSION run for the fused `*-sov-simple`
 * drops — the Family A geometry with per-command terminators. The fused
 * simple event patterns capture only the verb and DEFAULT the primary role
 * to `me`, leaving the real argument unconsumed after the verb, where the
 * #530 [verb..boundary] re-parse can't recover it (the tail is verb-FIRST
 * while every standalone SOV pattern is verb-final):
 *   ja `クリック で JS実行 console.log("from js") 終わり`   → js.patient dropped
 *   ja `クリック で 移動 url "/page" に`                    → go.destination dropped
 *   tr `tıklama de kaydır sonuncu <.message/> içinde #chat e` → scroll.destination
 * The en reference types each as `expression` (js-opaque-en / the en
 * generated patterns), so the SOV default `reference=me` was an R1 miss on
 * js-inline / go-url / last-in-collection across the cohort (Family D).
 *
 * Per-command terminator: js's code run ends at the clause boundary
 * (then/end/conjunction — mirroring en's js-opaque `js … end` capture);
 * go/scroll's destination phrase ends at the profile's postpositional
 * destination marker, PRIMARY surface only (several profiles list
 * destination alternatives that belong to other roles — the
 * tryAttachTrailingRole precedent). Only fires on an absent or defaulted-
 * `me` role, never on a genuine capture; the scan is depth-aware, aborts
 * unconsumed at a clause boundary, and is capped.
 */
export function tryAttachTrailingExpressionRole(
  stream: TokenStream,
  command: CommandSemanticNode,
  language: string
): void {
  const action = command.action as string;
  const spec: { role: SemanticRole; terminator: 'boundary' | 'destination-marker' } | null =
    action === 'js'
      ? { role: 'patient' as SemanticRole, terminator: 'boundary' }
      : action === 'go' || action === 'scroll'
        ? { role: 'destination' as SemanticRole, terminator: 'destination-marker' }
        : null;
  if (!spec) return;
  const roles = command.roles as Map<SemanticRole, SemanticValue>;
  const existing = roles.get(spec.role);
  // go-url REBIND: a fused event pattern (go-event-*-vso and kin) can bind
  // the invariant `url` keyword itself as the destination and leave the real
  // URL unconsumed right behind it (`en clic ir a url "/page"` →
  // destination=expression:"url", "/page" dropped). Mirror the command-path
  // url variant: destination = the value, keyword carried as `method`.
  // (The en reference captures exactly this shape via the generated
  // go-en-generated-url pattern.)
  if (
    action === 'go' &&
    existing &&
    existing.type === 'expression' &&
    String((existing as { raw?: unknown }).raw).toLowerCase() === 'url'
  ) {
    const next = stream.peek();
    if (next && !NON_VALUE_KEYWORDS.has((next.normalized ?? next.value).toLowerCase())) {
      const v = tokenToSemanticValue(next);
      if (v.type === 'literal' || v.type === 'selector') {
        roles.set(spec.role, v);
        roles.set('method', { type: 'literal', value: 'url' } as SemanticValue);
        stream.advance();
        return;
      }
    }
    // The fused pattern may have swallowed the URL into a schema-invalid
    // `patient` slot instead of leaving it in the stream (go declares no
    // patient) — relabel it (the responseType-relabel precedent).
    const pat = roles.get('patient');
    if (pat && (pat.type === 'literal' || pat.type === 'selector')) {
      roles.set(spec.role, pat);
      roles.set('method', { type: 'literal', value: 'url' } as SemanticValue);
      roles.delete('patient');
      return;
    }
  }

  // Same idiom, already-glued shape: an upstream fold captured the whole
  // phrase as one expression (`url /page`, qu whole-handler fold) with
  // nothing left in the stream. Split it in place.
  if (action === 'go' && existing && existing.type === 'expression') {
    const m = /^url\s+(\S+)$/i.exec(String((existing as { raw?: unknown }).raw ?? ''));
    if (m) {
      const value = m[1].replace(/^["']|["']$/g, '');
      roles.set(spec.role, { type: 'literal', value, dataType: 'string' } as SemanticValue);
      roles.set('method', { type: 'literal', value: 'url' } as SemanticValue);
      return;
    }
  }

  // Same idiom, patient-slot shape: the fused es-vso class binds the `url`
  // keyword under PATIENT (destination still absent here — the patient→
  // primaryRole relabel runs later, in normalizeCommandRoles) with the URL
  // token next in the stream. Capture it now, before the relabel turns the
  // keyword itself into the destination and the URL drops.
  if (action === 'go' && !existing) {
    const pat = roles.get('patient');
    if (
      pat &&
      pat.type === 'expression' &&
      String((pat as { raw?: unknown }).raw).toLowerCase() === 'url'
    ) {
      const next = stream.peek();
      if (next && !NON_VALUE_KEYWORDS.has((next.normalized ?? next.value).toLowerCase())) {
        const v = tokenToSemanticValue(next);
        if (v.type === 'literal' || v.type === 'selector') {
          roles.set(spec.role, v);
          roles.set('method', { type: 'literal', value: 'url' } as SemanticValue);
          roles.delete('patient');
          stream.advance();
          return;
        }
      }
    }
  }

  if (existing && !(existing.type === 'reference' && existing.value === 'me')) return;

  const profile = tryGetProfile(language);
  if (!profile) return;
  let markerSurface: string | null = null;
  if (spec.terminator === 'destination-marker') {
    const marker = profile.roleMarkers?.destination;
    if (!marker || marker.position !== 'after') return;
    markerSurface = marker.primary.toLowerCase();
  }

  const SCAN_CAP = 24;
  const run: LanguageToken[] = [];
  let depth = 0;
  let sawMarker = false;
  for (let i = 0; i < SCAN_CAP; i++) {
    const t = stream.peek(i);
    if (!t || endsClauseAt(stream.tokens, stream.position() + i, language)) break;
    if (t.value === '(' || t.value === '{') depth++;
    else if (t.value === ')' || t.value === '}') depth = Math.max(0, depth - 1);
    if (
      markerSurface !== null &&
      depth === 0 &&
      (t.kind === 'particle' || t.kind === 'keyword') &&
      t.value.toLowerCase() === markerSurface
    ) {
      sawMarker = true;
      break;
    }
    run.push(t);
  }
  // A marker-terminated role must SEE its marker inside the window — a
  // boundary/EOF-terminated scan means the phrase isn't the corpus shape
  // and is left untouched. js (boundary-terminated) just needs a run.
  if (run.length === 0) return;
  if (markerSurface !== null && !sawMarker) return;

  const consume = run.length + (sawMarker ? 1 : 0);

  // go-url IDIOM: a two-token run `url <value>` is the navigation idiom, not
  // an opaque expression — capture destination = the value and carry the
  // invariant keyword as `method`, matching the en reference (which parses
  // this via the generated go-en-generated-url pattern). Gluing it
  // (`expression:"url \"/page\""`) was faithful only while the en reference
  // itself was corrupted the same way.
  if (action === 'go' && run.length === 2 && run[0].value.toLowerCase() === 'url') {
    const v = tokenToSemanticValue(run[1]);
    if (v.type === 'literal' || v.type === 'selector') {
      roles.set(spec.role, v);
      roles.set('method', { type: 'literal', value: 'url' } as SemanticValue);
      const pat = roles.get('patient');
      if (
        pat &&
        pat.type === 'reference' &&
        pat.value === 'me' &&
        !getSchema(action as ActionType)?.roles.some(r => r.role === 'patient')
      ) {
        roles.delete('patient');
      }
      for (let i = 0; i < consume; i++) stream.advance();
      return;
    }
  }

  // The ja tokenizer splits the compound verb `JS実行` into `JS<keyword>` +
  // `実行<identifier>`; the fused pattern's verb matched the `JS` head, so
  // the leftover verb FRAGMENT leads the run. Trim leading tokens that are
  // substrings of the action's own keyword so they never pollute the code
  // expression. Consumption still covers them — they belong to the verb.
  let trimmed = run;
  if (action === 'js') {
    const kw = profile.keywords?.js;
    const isVerbFragment = (t: LanguageToken): boolean =>
      [kw?.primary, ...(kw?.alternatives ?? [])].some(
        k => !!k && k.length > t.value.length && k.includes(t.value)
      );
    let from = 0;
    while (from < trimmed.length && isVerbFragment(trimmed[from])) from++;
    trimmed = trimmed.slice(from);
    if (trimmed.length === 0) return;
  }

  roles.set(spec.role, {
    type: 'expression',
    raw: joinTokenText(trimmed, language),
  } as SemanticValue);
  // Drop the fused default-patient leak (`patient:reference=me`) for
  // commands whose schema declares no patient (go/scroll) — the
  // repeat/wait reclaim precedent; a REAL patient capture is never touched.
  if (spec.role !== 'patient') {
    const pat = roles.get('patient');
    if (
      pat &&
      pat.type === 'reference' &&
      pat.value === 'me' &&
      !getSchema(action as ActionType)?.roles.some(r => r.role === 'patient')
    ) {
      roles.delete('patient');
    }
  }
  for (let i = 0; i < consume; i++) stream.advance();
}
