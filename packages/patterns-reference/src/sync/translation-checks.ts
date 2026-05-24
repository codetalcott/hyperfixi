/**
 * Post-translation correctness checks. Each check takes the source raw_code
 * and a translated string and returns a pass/fail with a diagnostic message.
 *
 * Designed to catch the artifact classes documented in the patterns-reference
 * fix plan:
 *   A: HTML element reordering (caught by `htmlParityCheck`)
 *   B/C/D: literal/URL/directive bleeding (caught by `literalPreservationCheck`)
 *   E: silent truncation, e.g. zh dropping `to <form/>` (caught by `tokenCountCheck`)
 */

import { maskSpans } from './span-mask';

export interface CheckResult {
  valid: boolean;
  error?: string;
}

// =============================================================================
// HTML well-formedness parity
// =============================================================================

/**
 * Compare the multiset of HTML tags between source and translation. Tag names
 * (case-insensitive) and counts must match. Attribute values are NOT compared
 * because masking + unmasking preserves them verbatim by construction; the
 * concern here is structural.
 */
export function htmlParityCheck(source: string, translated: string): CheckResult {
  const sourceTags = extractTags(source);
  const translatedTags = extractTags(translated);

  if (sourceTags.length === 0 && translatedTags.length === 0) {
    return { valid: true };
  }

  const sourceCount = countTags(sourceTags);
  const translatedCount = countTags(translatedTags);

  for (const [name, n] of sourceCount) {
    const m = translatedCount.get(name) || 0;
    if (m !== n) {
      return {
        valid: false,
        error: `tag <${name}> count mismatch: source has ${n}, translation has ${m}`,
      };
    }
  }
  for (const [name, m] of translatedCount) {
    if (!sourceCount.has(name)) {
      return {
        valid: false,
        error: `tag <${name}> appears in translation but not in source`,
      };
    }
  }

  // Check nesting order: at no point during a left-to-right scan should the
  // running open/close balance per tag name go negative. That would mean a
  // `</tag>` appears before its matching `<tag>` — exactly the artifact A
  // failure mode where SOV reordering produced `World</span> を <span>Hello`.
  const orderError = checkNestingOrder(translatedTags);
  if (orderError) {
    return { valid: false, error: orderError };
  }

  return { valid: true };
}

interface TagToken {
  name: string;
  kind: 'open' | 'close' | 'self';
}

function extractTags(input: string): TagToken[] {
  const tags: TagToken[] = [];
  const re = /<\/?([a-zA-Z][\w-]*)(?:\s[^>]*)?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    const isClose = m[0].startsWith('</');
    // Self-closing detection: the matched tag string ends with `/>`. Using a
    // separate `(\/)?` capture group fails when the inner [^>]* greedily
    // consumes the trailing `/` (it does, because `/` ≠ `>`).
    const isSelf = !isClose && m[0].endsWith('/>');
    tags.push({
      name: m[1].toLowerCase(),
      kind: isClose ? 'close' : isSelf ? 'self' : 'open',
    });
  }
  return tags;
}

function countTags(tags: TagToken[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tags) {
    counts.set(t.name, (counts.get(t.name) || 0) + 1);
  }
  return counts;
}

/**
 * Walk the tag list left-to-right and verify each closing tag has a prior
 * matching opening tag (per name). Returns an error message if a close
 * appears before an open, otherwise null.
 */
function checkNestingOrder(tags: TagToken[]): string | null {
  const open = new Map<string, number>();
  for (const t of tags) {
    if (t.kind === 'self') continue;
    if (t.kind === 'open') {
      open.set(t.name, (open.get(t.name) || 0) + 1);
    } else {
      const count = open.get(t.name) || 0;
      if (count <= 0) {
        return `</${t.name}> appears before its matching <${t.name}>`;
      }
      open.set(t.name, count - 1);
    }
  }
  for (const [name, count] of open) {
    if (count !== 0) {
      return `<${name}> not closed (${count} unclosed)`;
    }
  }
  return null;
}

// =============================================================================
// Literal preservation
// =============================================================================

/**
 * Every string literal, URL, template literal, and directive from the source
 * must appear verbatim in the translation. Catches "translator bled into a
 * string" artifacts (he turning `'Got it!'` into `'Got זה!'`, ms turning
 * `body:` into `badan:`, etc.).
 *
 * Bracket expressions are intentionally excluded: their inner string literals
 * are already covered by the string-* spans, and bracket interiors may contain
 * identifiers that are legitimately translatable (e.g. `[key is 'Escape']`
 * where `key` and `is` may be translated, while `'Escape'` is not).
 */
export function literalPreservationCheck(source: string, translated: string): CheckResult {
  const { spans } = maskSpans(source);
  const protectedKinds = new Set([
    'string-single',
    'string-double',
    'string-template',
    'url',
    'directive',
    'js-block',
  ]);

  for (const span of spans) {
    if (!protectedKinds.has(span.kind)) continue;
    if (!translated.includes(span.original)) {
      return {
        valid: false,
        error: `${span.kind} literal not preserved: ${truncate(span.original, 50)}`,
      };
    }
  }
  return { valid: true };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// =============================================================================
// Token count guard (truncation detector)
// =============================================================================

/**
 * Whitespace-token-count ratio. If the translation is dramatically shorter
 * than the source, it likely silently dropped trailing roles (artifact E).
 *
 * Tolerances are language-family specific. CJK and SOV non-CJK can compress
 * by ~30% legitimately (particles, agglutinative suffixes), so the floors
 * are looser than for Romance/Germanic. The truncation cases observed in
 * Chinese drop ratios to 0.4-0.5; these bounds catch that without flagging
 * normal compression.
 */
export function tokenCountCheck(source: string, translated: string, language: string): CheckResult {
  const sourceTokens = countWhitespaceTokens(source);
  const translatedTokens = countWhitespaceTokens(translated);

  if (sourceTokens === 0) {
    return { valid: translatedTokens === 0 };
  }

  const ratio = translatedTokens / sourceTokens;
  const [floor, ceiling] = getTolerance(language);

  if (ratio < floor) {
    return {
      valid: false,
      error: `truncation suspected: ${translatedTokens}/${sourceTokens} tokens (ratio ${ratio.toFixed(2)} < floor ${floor})`,
    };
  }
  if (ratio > ceiling) {
    return {
      valid: false,
      error: `expansion suspected: ${translatedTokens}/${sourceTokens} tokens (ratio ${ratio.toFixed(2)} > ceiling ${ceiling})`,
    };
  }
  return { valid: true };
}

function countWhitespaceTokens(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function getTolerance(language: string): [number, number] {
  // [floor, ceiling]. The primary purpose of the truncation guard is to catch
  // *drops* (translation silently losing trailing roles), so the floor is the
  // load-bearing bound. Ceilings are intentionally generous because legitimate
  // SOV/agglutinative translations regularly add particles per substantive
  // word — a 4-token English clause can become 8+ tokens in Korean or
  // Japanese without anything being wrong. Only catch egregious expansion.
  switch (language) {
    case 'en':
      return [1.0, 1.0]; // identity
    case 'he':
    case 'ms':
      return [0.85, 1.5]; // no grammar profile but multi-word translations expand
    case 'es':
    case 'fr':
    case 'de':
    case 'it':
    case 'pt':
    case 'ru':
    case 'uk':
    case 'pl':
      return [0.8, 1.8];
    case 'zh':
    case 'ja':
    case 'ko':
      return [0.65, 2.2]; // CJK adds particles per content word
    case 'tr':
    case 'hi':
    case 'bn':
    case 'qu':
      return [0.7, 2.2]; // SOV with agglutinative markers
    case 'vi':
    case 'th':
    case 'id':
    case 'sw':
    case 'tl':
      return [0.75, 1.8];
    case 'ar':
      return [0.75, 2.0];
    default:
      return [0.7, 2.0];
  }
}

// =============================================================================
// Aggregate runner
// =============================================================================

export type CheckKind = 'html-parity' | 'literal' | 'truncation';

export interface CheckFailure {
  kind: CheckKind;
  error: string;
}

export function runAllChecks(source: string, translated: string, language: string): CheckFailure[] {
  const failures: CheckFailure[] = [];

  const html = htmlParityCheck(source, translated);
  if (!html.valid) failures.push({ kind: 'html-parity', error: html.error! });

  const lit = literalPreservationCheck(source, translated);
  if (!lit.valid) failures.push({ kind: 'literal', error: lit.error! });

  const trunc = tokenCountCheck(source, translated, language);
  if (!trunc.valid) failures.push({ kind: 'truncation', error: trunc.error! });

  return failures;
}
