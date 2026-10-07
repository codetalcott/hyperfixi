/**
 * Fail-loud translation: what `translate()` checks before it returns.
 *
 * A parse that matches a prefix of a script and leaves the rest unread used to
 * come back from `translate()` as though it were the whole: `toggle .a .b`
 * became `toggle .a`, a `catch` block became the handler's body. A surface that
 * cannot carry a script now says so. `translate()` throws a
 * {@link LossyTranslationError}, which carries the output it would have
 * returned and what the translation loses. A caller that wants the partial
 * output anyway passes `{ lossy: 'allow' }`.
 *
 * Three checks, cheapest first:
 *
 *   - `truncation`  the parse of the input left input bound to no role (its
 *                   `unconsumed-input` diagnostics);
 *   - `read-back`   the output, read in the target language, leaves input
 *                   unread, holds other commands than the input's parse
 *                   (counted, so a dropped repeat shows), or does not read;
 *   - `invariant`   a value a translation writes verbatim (a string, a number,
 *                   a selector, an `@attribute`, a `*style`, a `$`/`:`/`^`
 *                   variable) is in the input and not in the output.
 *
 * None of them can say a translation is right. Each says one way it is wrong;
 * the command-shape gate (testing-framework) measures what they still miss.
 */

import type { SemanticNode } from '../types';
import {
  collectActionsMultiset,
  collectRoleSignature,
  collectRoleSignatureStrict,
} from '../fidelity';
import { parse } from '../parser';
import { toUpstreamSpelling } from './upstream-spelling';

export type TranslationLossKind = 'truncation' | 'read-back' | 'invariant';

/** One way a translation loses part of its input. */
export interface TranslationLoss {
  kind: TranslationLossKind;
  /**
   * What is lost: the input left unread (`truncation`); the output left unread
   * or the commands it reads back without or with in excess (`read-back`, as
   * `-cmd` / `+cmd`); or the verbatim values missing from the output
   * (`invariant`).
   */
  lost: string[];
}

export interface TranslateOptions {
  /**
   * `'throw'` (the default) refuses a translation that loses part of its input
   * with a {@link LossyTranslationError}; `'allow'` returns it anyway.
   */
  lossy?: 'throw' | 'allow';
}

/** A translation `translate()` refused because it loses part of its input. */
export class LossyTranslationError extends Error {
  override readonly name = 'LossyTranslationError';

  constructor(
    /** The output `translate()` would have returned: NOT the whole script. */
    readonly partial: string,
    readonly loss: TranslationLoss,
    readonly from: string,
    readonly to: string
  ) {
    super(
      `translation ${from} → ${to} would lose part of the script (${loss.kind}): ` +
        loss.lost.join(', ')
    );
  }
}

// ---------------------------------------------------------------------------
// truncation
// ---------------------------------------------------------------------------

/** The spans a parse left bound to no role (its top node carries them all). */
export function unconsumedSpans(node: SemanticNode): string[] {
  const out: string[] = [];
  for (const d of node.diagnostics ?? []) {
    if (d.code !== 'unconsumed-input') continue;
    out.push(/"(.*)"\s*$/s.exec(d.message)?.[1] ?? d.message);
  }
  return out;
}

// ---------------------------------------------------------------------------
// read-back
// ---------------------------------------------------------------------------

/** `-cmd` for each command the candidate lacks, `+cmd` for each it adds. */
export function actionDifference(reference: SemanticNode, candidate: SemanticNode): string[] {
  const count = (node: SemanticNode): Map<string, number> => {
    const m = new Map<string, number>();
    for (const a of collectActionsMultiset(node)) m.set(a, (m.get(a) ?? 0) + 1);
    return m;
  };
  const want = count(reference);
  const got = count(candidate);
  const out: string[] = [];
  for (const [action, n] of want)
    for (let i = got.get(action) ?? 0; i < n; i++) out.push(`-${action}`);
  for (const [action, n] of got)
    for (let i = want.get(action) ?? 0; i < n; i++) out.push(`+${action}`);
  return out;
}

/**
 * The roles a command written in the source has and its read-back lacks
 * (`-wait.event`), and the position a `put` names (`-put.manner=at start of`).
 * A role read back that the source left implicit is not a loss: a render may
 * write a default out (`hide me`). Measured on the command-shape gate before it
 * was enforced: it refuses no translation that passes, and it caught the
 * foreign `wait for <event>` renders, which read back as `wait <duration>`.
 */
export function lostRoles(reference: SemanticNode, candidate: SemanticNode): string[] {
  // The reference counts the roles its source wrote; the read-back counts every
  // role it holds, a default included (a pattern may fill `repeat forever`'s
  // form as a default): only a role it lacks outright is lost.
  const features = (node: SemanticNode, collect: (n: unknown) => string[]): Set<string> => {
    const out = new Set(collect(node).map(s => s.replace(/:.*$/, '')));
    for (const manner of putPositions(node)) out.add(`put.manner=${manner}`);
    return out;
  };
  const have = features(candidate, collectRoleSignature);
  return [...features(reference, collectRoleSignatureStrict)]
    .filter(f => !have.has(f))
    .map(f => `-${f}`);
}

/** The positions (`at start of`, `before`, …) every `put` in a tree names. */
function putPositions(node: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 64 || !node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const n of node) putPositions(n, out, depth + 1);
    return out;
  }
  const rec = node as { action?: unknown; roles?: unknown } & Record<string, unknown>;
  if (rec.action === 'put' && rec.roles instanceof Map) {
    const manner = (rec.roles as Map<string, { type?: string; value?: unknown }>).get('manner');
    if (manner?.type === 'literal') out.push(String(manner.value).trim().toLowerCase());
  }
  for (const [key, child] of Object.entries(rec)) {
    if (key === 'roles' || key === 'metadata' || key === 'diagnostics') continue;
    if (child && typeof child === 'object') putPositions(child, out, depth + 1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// invariant
// ---------------------------------------------------------------------------

const LETTER = /[\p{L}\p{M}\p{N}_]/u;

/**
 * Could the character before `i` end a value, so the sigil at `i` continues it?
 * After a word in any script a `.x` / `#x` / `:x` is a property, part of the
 * word (ru `я.innerHTML`); a `*x` is a product only after an ASCII value, since
 * an SOV particle can come right before a style ref (ja `#a の*color`).
 */
function endsValue(text: string, i: number): boolean {
  const before = text[i - 1] ?? '';
  return text[i] === '*' ? /[\w)\]}"'`]/.test(before) : /[\p{L}\p{M}\p{N}_)\]}"'`]/u.test(before);
}

/**
 * The values a translation writes verbatim, with their counts: string
 * contents, numbers, `.class` / `#id` / `<query/>` refs, `@attribute`,
 * `*style`, and `$` / `:` / `^` variables. A `.x` or `#x` right after a value
 * is a property or part of a word, as the engine's tokenizer reads it; an
 * apostrophe inside a word (`#a's`, uk `прив'язати`) is not a quote; a name
 * ends at its last ASCII word character, since an SOV render writes a particle
 * onto it (ja `#d1の`).
 */
export function invariantValues(text: string): Map<string, number> {
  const out = new Map<string, number>();
  const add = (value: string): void => void out.set(value, (out.get(value) ?? 0) + 1);
  let i = 0;
  while (i < text.length) {
    const c = text[i] as string;
    const next = text[i + 1] ?? '';
    if (c === "'" && LETTER.test(text[i - 1] ?? '') && LETTER.test(next)) {
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== c) j += text[j] === '\\' ? 2 : 1;
      add(`"${text.slice(i + 1, j)}"`);
      i = j + 1;
      continue;
    }
    if (c === '<' && /[\p{L}.#[*:]/u.test(next)) {
      const close = text.indexOf('/>', i);
      if (close > 0 && !/[\s<]/.test(text.slice(i + 1, close).replace(/\[[^\]]*\]/g, ''))) {
        add(text.slice(i, close + 2));
        i = close + 2;
        continue;
      }
    }
    const sigil =
      c === '@' ||
      c === '$' ||
      c === '^' ||
      ((c === '.' || c === '#' || c === '*' || c === ':') && !endsValue(text, i));
    // A name is ASCII: an SOV particle can be written onto it (ja `#d1の`, ko `#d1의`).
    if (sigil && /[A-Za-z_-]/.test(next)) {
      let j = i + 1;
      while (j < text.length && /[\w-]/.test(text[j] as string)) j++;
      add(text.slice(i, j));
      i = j;
      continue;
    }
    if (/\d/.test(c) && !LETTER.test(text[i - 1] ?? '') && text[i - 1] !== '.') {
      let j = i;
      while (j < text.length && /[\d.]/.test(text[j] as string)) j++;
      add(String(Number(text.slice(i, j).replace(/\.$/, ''))));
      i = j;
      continue;
    }
    i++;
  }
  return out;
}

/** The verbatim values of `input` that `output` lacks (counted). */
export function missingInvariants(input: string, output: string): string[] {
  const have = invariantValues(output);
  const out: string[] = [];
  for (const [value, n] of invariantValues(input)) {
    if ((have.get(value) ?? 0) < n) out.push(value);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

/**
 * How a translation of `input` (parsed as `node`) into `output`, in language
 * `to`, loses part of it, or undefined. `readBack` parses the output (by
 * default in `to`); it throws when the output does not read.
 */
export function findTranslationLoss(
  input: string,
  node: SemanticNode,
  output: string,
  to: string,
  readBack: (output: string) => SemanticNode = text => parse(text, to)
): TranslationLoss | undefined {
  const unread = unconsumedSpans(node);
  if (unread.length) return { kind: 'truncation', lost: unread };

  let back: SemanticNode;
  try {
    back = readBack(output);
  } catch (e) {
    return { kind: 'read-back', lost: [`the output does not read: ${(e as Error).message}`] };
  }
  const misread = unconsumedSpans(back);
  if (misread.length) return { kind: 'read-back', lost: misread };
  // English is written in upstream's spelling (explicit/upstream-spelling.ts:
  // the owner's 2026-10-01 rule, each rewrite measured on both engines), which
  // can wrap a command (a view-transition tail becomes `start view transition
  // … end`) or respell one (`prepend` becomes `put … at start of`): compare
  // with what was rendered.
  const rendered = to === 'en' ? toUpstreamSpelling(node) : node;
  const commands = actionDifference(rendered, back);
  if (commands.length) return { kind: 'read-back', lost: commands };
  const roles = lostRoles(rendered, back);
  if (roles.length) return { kind: 'read-back', lost: roles };

  const values = missingInvariants(input, output);
  if (values.length) return { kind: 'invariant', lost: values };
  return undefined;
}
