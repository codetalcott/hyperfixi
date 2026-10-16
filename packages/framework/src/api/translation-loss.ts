/**
 * Fail-loud translation: what a translation checks before it returns (domains
 * rethink Phase 4.5, `docs-internal/DOMAINS_RETHINK.md`). Moved from
 * `@lokascript/semantic`'s `explicit/lossy.ts`, whose `translate` runs it with
 * hyperscript's rules; `createMultilingualDSL`'s `translate` keeps its own
 * read-back (`TranslationReadBackError`).
 *
 * A parse that matches a prefix of a script and leaves the rest unread used to
 * come back from `translate()` as though it were the whole: `toggle .a .b`
 * became `toggle .a`. A surface that cannot carry a script now says so: the
 * translation throws a {@link LossyTranslationError}, which carries the output
 * it would have returned and what it loses. Four checks, cheapest first:
 *
 *   - `truncation`  the parse of the input left input bound to no role (its
 *                   `unconsumed-input` diagnostics);
 *   - `core-only`   the input holds a form the grammar's writer has no spelling
 *                   for (hyperscript: a form only `@hyperfixi/core` ran, which
 *                   upstream reads with another meaning) — `rules.unwritable`;
 *   - `read-back`   the output, read in the target language, does not read,
 *                   leaves input unread, or differs from what was written
 *                   (`rules.differences`, in order);
 *   - `invariant`   a value the translation must write verbatim is missing
 *                   from the output (`rules.missingValues`).
 *
 * None of them can say a translation is right. Each says one way it is wrong.
 */

export type TranslationLossKind = 'truncation' | 'core-only' | 'read-back' | 'invariant';

/** One way a translation loses part of its input. */
export interface TranslationLoss {
  kind: TranslationLossKind;
  /**
   * What is lost: the input left unread (`truncation`); the forms nothing
   * writes (`core-only`, as `swap <strategy>`); the output left unread or what
   * it reads back without or with in excess (`read-back`, as `-cmd` / `+cmd`);
   * or the verbatim values missing from the output (`invariant`).
   */
  lost: string[];
}

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

/** What the checks read of a parse: its diagnostics. */
export interface LossCheckedNode {
  readonly diagnostics?: ReadonlyArray<{ readonly code?: string; readonly message: string }>;
}

/** The spans a parse left bound to no role (its top node carries them all). */
export function unconsumedSpans(node: LossCheckedNode): string[] {
  const out: string[] = [];
  for (const d of node.diagnostics ?? []) {
    if (d.code !== 'unconsumed-input') continue;
    out.push(/"(.*)"\s*$/s.exec(d.message)?.[1] ?? d.message);
  }
  return out;
}

/** A grammar's rules for `findTranslationLoss`, for its node type `N`. */
export interface TranslationLossRules<N extends LossCheckedNode> {
  /** The forms in `node` the grammar's writer has no spelling for (`core-only`). */
  unwritable?(node: N): string[];
  /**
   * `node` as it was written into the target language, to compare its
   * read-back with (hyperscript: in upstream's spelling for English). Default:
   * `node` itself.
   */
  written?(node: N): N;
  /**
   * How the read-back differs from what was written, checked in order: the
   * first that finds a difference is the loss (hyperscript: commands, then
   * roles, then clauses kept as written).
   */
  readonly differences: ReadonlyArray<(written: N, back: N) => string[]>;
  /** The values `input` holds that `output` must write verbatim and does not (`invariant`). */
  missingValues?(input: string, output: string): string[];
}

/**
 * How a translation of `input` (parsed as `node`) into `output` loses part of
 * it, or undefined. `readBack` parses the output in the target language; it
 * throws when the output does not read.
 */
export function findTranslationLoss<N extends LossCheckedNode>(
  input: string,
  node: N,
  output: string,
  readBack: (output: string) => N,
  rules: TranslationLossRules<N>
): TranslationLoss | undefined {
  const unread = unconsumedSpans(node);
  if (unread.length) return { kind: 'truncation', lost: unread };
  const unwritable = rules.unwritable?.(node) ?? [];
  if (unwritable.length) return { kind: 'core-only', lost: unwritable };

  let back: N;
  try {
    back = readBack(output);
  } catch (e) {
    return { kind: 'read-back', lost: [`the output does not read: ${(e as Error).message}`] };
  }
  const misread = unconsumedSpans(back);
  if (misread.length) return { kind: 'read-back', lost: misread };
  const written = rules.written ? rules.written(node) : node;
  for (const difference of rules.differences) {
    const lost = difference(written, back);
    if (lost.length) return { kind: 'read-back', lost };
  }

  const values = rules.missingValues?.(input, output) ?? [];
  if (values.length) return { kind: 'invariant', lost: values };
  return undefined;
}
