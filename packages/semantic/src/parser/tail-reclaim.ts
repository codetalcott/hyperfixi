/**
 * Arc F's tail reclaims: after an event handler's parse leaves spans unread,
 * each one claims a span it can prove the meaning of (a floated `from <source>`,
 * a split compound event name, a stranded `as <type>`, a destination the tree
 * already holds), or returns null.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged, except that the two that re-parse take the parser's
 * `parse` as a parameter.
 */
import type {
  ActionType,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  LanguageToken,
  SemanticNode,
  SemanticRole,
  SemanticValue,
} from '../types';
import { createSelector, isValidReference } from '../types';
import { tokenize as tokenizeInternal } from '../tokenizers';
import { tryGetProfile } from '../registry';
import { getSchema } from '../generators/command-schemas';
import { eventNameTranslations } from '../patterns/event-handler';
import { hoistUnconsumedDiagnostics } from './parse-diagnostics';
import { AS_MARKERS_BEFORE, RESPONSE_TYPE_WORDS } from './response-type-words';

export function droppedTokenCount(node: SemanticNode): number {
  return (node.diagnostics ?? [])
    .filter(d => d.code === 'unconsumed-input')
    .reduce(
      (sum, d) => sum + (parseInt(/left (\d+) token/.exec(d.message)?.[1] ?? '0', 10) || 0),
      0
    );
}

export function unconsumedSpans(node: SemanticNode): string[] {
  return (node.diagnostics ?? [])
    .filter(d => d.code === 'unconsumed-input')
    .map(d => /unconsumed: "(.*)"$/.exec(d.message)?.[1])
    .filter((s): s is string => !!s)
    .map(s => s.replace(/\s+/g, ' ').trim());
}

/** Drop the unconsumed-input diagnostics whose quoted span equals `span`. */
export function withoutSpanDiagnostics<T extends SemanticNode>(node: T, span: string): T {
  return {
    ...node,
    diagnostics: (node.diagnostics ?? []).filter(d => {
      if (d.code !== 'unconsumed-input') return true;
      const q = /unconsumed: "(.*)"$/.exec(d.message)?.[1];
      return !q || q.replace(/\s+/g, ' ').trim() !== span;
    }),
  };
}

/**
 * Type a reclaimed event-source noun the way the matcher's head captures do:
 * a selector, or a reference the tokenizer normalized (ar نافذة / vi `window`
 * → `window`), so the English render says `from window`, not `from "نافذة"`.
 * Anything else keeps the legacy string literal.
 */
export function sourceNounValue(noun: LanguageToken): SemanticValue {
  if (noun.kind === 'selector') return createSelector(noun.value);
  const name = (noun.normalized ?? noun.value).toLowerCase();
  if (isValidReference(name)) return { type: 'reference', value: name };
  return { type: 'literal', value: noun.value, dataType: 'string' };
}

/**
 * Reclaim a dangling `from <source>` phrase left unconsumed by an
 * event-handler parse (Arc F stage 2, the window-resize shape). The grammar
 * transformer floats the handler-head `from window` clause away from the
 * event (SVO renders leave it clause-final after the body — `llamar
 * adjustLayout() de ventana` — SOV renders leave it trailing — `呼び出し
 * ウィンドウ から`), where no pattern consumes it and the two tokens drop.
 * When the dropped span is exactly (or contains) a `<source-marker> <noun>`
 * phrase, excise the phrase, re-parse, and attach the noun as
 * eventModifiers.from — the same field the pattern-extracted `source` role
 * (en `on resize from window …`) lands in, so all languages carry the same
 * shape. Triple-gated: the marker must be profile/normalized-identified,
 * the noun a bare identifier/keyword, and the phrase verbatim inside an
 * actual unconsumed span — a `from` phrase any pattern consumed (fetch
 * from, take … from) never has a matching drop and is untouchable here.
 * Only fires from the event-modifier lift, so ordinary parses never enter.
 */
export function reclaimDanglingFromTail(
  handler: EventHandlerSemanticNode,
  input: string,
  language: string,
  parse: (input: string, language: string) => SemanticNode
): { node: EventHandlerSemanticNode; input: string } | null {
  const spans = unconsumedSpans(handler);
  if (spans.length === 0) return null;
  const beforeCount = droppedTokenCount(handler);

  const marker = tryGetProfile(language)?.roleMarkers?.source;
  const markerForms = new Set<string>();
  if (marker?.primary) markerForms.add(marker.primary);
  marker?.alternatives?.forEach(a => markerForms.add(a));

  const toks = tokenizeInternal(input, language).tokens;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.normalized !== 'source' && !markerForms.has(t.value)) continue;
    // Postpositional markers (ja から, ko 에서, tr den) follow the noun;
    // prepositional ones (es de, de von, ar من) precede it.
    const nounIdx = marker?.position === 'after' ? i - 1 : i + 1;
    const noun = toks[nounIdx];
    if (!noun || (noun.kind !== 'identifier' && noun.kind !== 'keyword')) continue;
    const start = Math.min(t.position.start, noun.position.start);
    const end = Math.max(t.position.end, noun.position.end);
    const phrase = input.slice(start, end).replace(/\s+/g, ' ').trim();
    if (!spans.some(s => s === phrase || s.includes(phrase))) continue;
    const excised = (input.slice(0, start).trimEnd() + ' ' + input.slice(end).trimStart()).trim();
    if (!excised || excised === input) continue;
    try {
      // The re-parse runs below the depth-1 wrapper, so its subtree
      // diagnostics were NOT hoisted — hoist here, both for an honest
      // dropped-token comparison and so the returned node (which becomes
      // the top node) still surfaces every residual firing to the sweep.
      const reparsed = parse(excised, language);
      if (!reparsed || reparsed.kind !== 'event-handler') continue;
      const hoisted = hoistUnconsumedDiagnostics(reparsed) as EventHandlerSemanticNode;
      if (droppedTokenCount(hoisted) < beforeCount) {
        return {
          node: {
            ...hoisted,
            eventModifiers: {
              ...hoisted.eventModifiers,
              from: sourceNounValue(noun),
            },
          },
          input: excised,
        };
      }
    } catch {
      // keep scanning — a failed excision must not lose the stage-1 result
    }
  }
  return null;
}

/**
 * Rebind a tokenizer-split compound event name (Arc F). A hand-written name
 * can be several words the tokenizer does not emit whole (ar `تمرير الماوس`,
 * mouseover): the event slot captures only the first word (canonicalized to
 * the WRONG event — `scroll`) and the rest drops unconsumed. (The names the
 * renderer writes are all read whole, so a render never needs this.) When a
 * dangling span, joined offset-exactly with the token immediately before
 * it, hits a compound key in eventNameTranslations — and that preceding
 * token is the very word the current event was
 * canonicalized from — rebind the event to the compound's English name and
 * retire the span's diagnostic: the fragment is consumed by attribution.
 */
export function reclaimEventCompoundTail(
  handler: EventHandlerSemanticNode,
  input: string,
  language: string
): { node: EventHandlerSemanticNode; input: string } | null {
  const spans = unconsumedSpans(handler);
  if (spans.length === 0) return null;
  const table = eventNameTranslations[language];
  if (!table) return null;
  const roles = handler.roles as Map<SemanticRole, SemanticValue>;
  const eventRole = roles.get('event');
  const currentEvent =
    eventRole?.type === 'literal' && typeof eventRole.value === 'string' ? eventRole.value : null;
  if (!currentEvent) return null;
  const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
  const toks = tokenizeInternal(input, language).tokens;
  for (const span of spans) {
    for (let i = 1; i < toks.length; i++) {
      for (let j = i; j < toks.length; j++) {
        const surface = collapse(input.slice(toks[i].position.start, toks[j].position.end));
        if (surface.length > span.length) break;
        if (surface !== span) continue;
        const prev = toks[i - 1];
        const prevEnglish = table[prev.value] ?? prev.normalized;
        if (prevEnglish !== currentEvent) break;
        const candidate = collapse(input.slice(prev.position.start, toks[j].position.end));
        const english = table[candidate];
        if (!english) break;
        roles.set('event', { type: 'literal', value: english, dataType: 'string' });
        return { node: withoutSpanDiagnostics(handler, span), input };
      }
    }
  }
  return null;
}

/**
 * Reclaim a stranded `as <type>` phrase into the body fetch's responseType
 * (Arc F). Lifting the modifier phrase changes which event pattern wins for
 * he/id event-debounce, and the winning fused path strands the as-phrase
 * (`כ json`, `sebagai json`) the losing path used to consume. When a
 * dangling span is exactly `<as-marker> <known-response-word>`, excise it,
 * re-parse, and set the captured word as responseType on the first body
 * command whose schema declares the (optional) role — the same value shape
 * the trailing-responseType reclaim produces.
 */
export function reclaimResponseTypeTail(
  handler: EventHandlerSemanticNode,
  input: string,
  language: string,
  parse: (input: string, language: string) => SemanticNode
): { node: EventHandlerSemanticNode; input: string } | null {
  const spans = unconsumedSpans(handler);
  if (spans.length === 0) return null;
  const before = AS_MARKERS_BEFORE[language];
  if (!before) return null;
  const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
  const beforeCount = droppedTokenCount(handler);
  const toks = tokenizeInternal(input, language).tokens;
  for (let i = 0; i + 1 < toks.length; i++) {
    const a = toks[i];
    const b = toks[i + 1];
    if (!before.some(m => a.value.toLowerCase() === m)) continue;
    if (!RESPONSE_TYPE_WORDS.has(b.value.toLowerCase())) continue;
    const phrase = collapse(input.slice(a.position.start, b.position.end));
    if (!spans.includes(phrase)) continue;
    const excised = (
      input.slice(0, a.position.start).trimEnd() +
      ' ' +
      input.slice(b.position.end).trimStart()
    ).trim();
    if (!excised || excised === input) continue;
    try {
      const reparsed = parse(excised, language);
      if (!reparsed || reparsed.kind !== 'event-handler') continue;
      const hoisted = hoistUnconsumedDiagnostics(reparsed) as EventHandlerSemanticNode;
      if (droppedTokenCount(hoisted) >= beforeCount) continue;
      const target = findResponseTypeTarget(hoisted);
      if (!target) continue;
      (target.roles as Map<SemanticRole, SemanticValue>).set('responseType', {
        type: 'expression',
        raw: b.value,
      } as SemanticValue);
      return { node: hoisted, input: excised };
    } catch {
      // keep scanning
    }
  }
  return null;
}

/** First command in the tree whose schema declares an optional, unset responseType. */
export function findResponseTypeTarget(node: SemanticNode): CommandSemanticNode | null {
  let found: CommandSemanticNode | null = null;
  const visit = (n: SemanticNode | null | undefined): void => {
    if (!n || typeof n !== 'object' || found) return;
    if (n.kind === 'command') {
      const cmd = n as CommandSemanticNode;
      const schema = getSchema(cmd.action as ActionType);
      if (
        schema?.roles.some(r => r.role === 'responseType' && !r.required) &&
        !(cmd.roles as Map<SemanticRole, SemanticValue>).has('responseType')
      ) {
        found = cmd;
        return;
      }
    }
    const rec = n as unknown as Record<string, unknown>;
    for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'commands']) {
      const c = rec[f];
      if (Array.isArray(c)) c.forEach(x => visit(x as SemanticNode));
    }
  };
  visit(node);
  return found;
}

/**
 * Retire a provably-false dropped-destination record (Arc F). The zh
 * event-once body walk records `到 我` as dropped in a superseded clause
 * attempt, yet the committed tree HAS the add command's
 * destination:reference=me — the span's content was captured, the record
 * just outlived the attempt that made it. Only when the span is exactly
 * `<destination-marker> <me>` AND a body command carries
 * destination:reference=me is the diagnostic removed; nothing else changes.
 */
export function reclaimCapturedDestinationTail(
  handler: EventHandlerSemanticNode,
  input: string,
  language: string
): { node: EventHandlerSemanticNode; input: string } | null {
  const spans = unconsumedSpans(handler);
  if (spans.length === 0) return null;
  const dest = tryGetProfile(language)?.roleMarkers?.destination;
  const forms = new Set<string>();
  if (dest?.primary) forms.add(dest.primary);
  dest?.alternatives?.forEach(a => forms.add(a));
  if (forms.size === 0) return null;
  const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
  const toks = tokenizeInternal(input, language).tokens;
  for (let i = 0; i + 1 < toks.length; i++) {
    const a = toks[i];
    const b = toks[i + 1];
    const prepositional = forms.has(a.value) && b.normalized === 'me';
    const postpositional = a.normalized === 'me' && forms.has(b.value);
    if (!prepositional && !postpositional) continue;
    const phrase = collapse(input.slice(a.position.start, b.position.end));
    if (!spans.includes(phrase)) continue;
    let captured = false;
    const visit = (n: SemanticNode | null | undefined): void => {
      if (!n || typeof n !== 'object' || captured) return;
      if (n.kind === 'command') {
        const d = (n as CommandSemanticNode).roles.get('destination');
        if (d?.type === 'reference' && d.value === 'me') {
          captured = true;
          return;
        }
      }
      const rec = n as unknown as Record<string, unknown>;
      for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'commands']) {
        const c = rec[f];
        if (Array.isArray(c)) c.forEach(x => visit(x as SemanticNode));
      }
    };
    visit(handler);
    if (!captured) continue;
    return { node: withoutSpanDiagnostics(handler, phrase), input };
  }
  return null;
}
