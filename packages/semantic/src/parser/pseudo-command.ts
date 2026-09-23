/**
 * English pseudo-commands — `click() me`, `setAttribute('a', 'b') on #x`,
 * `reset() the closest <form/>`.
 *
 * _hyperscript lets a method call stand as a command: `<method>(<args>)`
 * followed by an optional preposition (`the`/`to`/`on`/`with`/`into`/`from`/
 * `at`, or a bare `me`) and the object to call it on (the engine's
 * `pseudoCommand` grammar element). The semantic layer had no model for it:
 * the clause was left unconsumed and a handler whose whole body was one
 * (the book's `on load click() me`, Hypermedia Systems ch. 10) rendered as an
 * empty `on load` in all 23 languages.
 *
 * A pseudo-command is exactly `call <target>.<method>(<args>)`, which every
 * language already renders natively and round-trips. So this is a rewrite,
 * not a new action: it recognizes the pseudo-command at a token position and
 * returns the equivalent English `call …` text, which the caller parses with
 * the ordinary `call` patterns. The round trip therefore comes back as `call
 * me.click()` — engine-valid, and executable by core, which rejects
 * `click() me` outright (C2 in the hxi18n plan).
 *
 * English only: the surface is English syntax (a preposition list and the
 * engine's `me` shorthand), and no language renders a pseudo-command.
 *
 * The target is limited to shapes whose `call` spelling is unambiguous:
 * a reference (`me`, `it`), an `#id`, a variable, or — parenthesized —
 * a positional query, a class selector or a query literal
 * (`(closest <form/>).reset()`). Anything else returns null and the clause
 * stays unconsumed, so the drop is still reported rather than guessed at.
 */
import type { LanguageToken } from '../types';
import { isValidReference } from '../types';
import { matchPositionalRun } from './utils/expression-lexicon';
import type { LanguageProfile } from '../generators/profiles/types';

/** The engine's pseudo-command prepositions (`the` included — it is one there). */
const PREPOSITIONS = new Set(['the', 'to', 'on', 'with', 'into', 'from', 'at']);

const NAME_RE = /^[A-Za-z_$][\w$]*$/;
const MAX_ARG_TOKENS = 64;

export interface PseudoCommandRewrite {
  /** The equivalent English command, e.g. `call me.click()`. */
  readonly text: string;
  /** Tokens consumed from `start`. */
  readonly consumed: number;
}

/**
 * Join a token run back into source text, one space wherever the source had
 * whitespace between two tokens (offset gap) and none where it had none. The
 * token values are surface text, so `(1, 2)` and `('a', 'b')` survive.
 */
function spanText(tokens: readonly LanguageToken[]): string {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    if (prev && t.position.start > prev.position.end) out += ' ';
    out += t.value;
  }
  return out;
}

/** Index just past the `)` that closes the `(` at `open`, or -1. */
function closeParen(tokens: readonly LanguageToken[], open: number): number {
  let depth = 0;
  for (let i = open; i < tokens.length && i - open <= MAX_ARG_TOKENS; i++) {
    const v = tokens[i].value;
    if (v === '(') depth++;
    else if (v === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Whether `b` directly abuts `a` in the source (no whitespace between). */
function abuts(a: LanguageToken, b: LanguageToken): boolean {
  return b.position.start === a.position.end;
}

/**
 * Recognize a pseudo-command at `tokens[start]` and return its `call` form.
 *
 * `isCommandWord` rejects heads that are real commands (`focus() me` stays the
 * `focus` command, as it is in the engine, where `focus` is a command).
 */
export function rewritePseudoCommand(
  tokens: readonly LanguageToken[],
  start: number,
  profile: LanguageProfile | undefined,
  isCommandWord: (token: LanguageToken) => boolean
): PseudoCommandRewrite | null {
  const head = tokens[start];
  if (!head || (head.kind !== 'identifier' && head.kind !== 'keyword')) return null;
  if (!NAME_RE.test(head.value) || isCommandWord(head)) return null;

  // Head: `method` or a dotted `obj.method` (`me.click()`, `console.log(1)`).
  // The tokenizer emits each `.member` as a selector-shaped token glued to the
  // one before it.
  let i = start + 1;
  let callee = head.value;
  while (
    tokens[i]?.kind === 'selector' &&
    /^\.[A-Za-z_$][\w$]*$/.test(tokens[i].value) &&
    abuts(tokens[i - 1], tokens[i])
  ) {
    callee += tokens[i].value;
    i++;
  }
  const dotted = i > start + 1;

  const open = tokens[i];
  if (!open || open.value !== '(' || !abuts(tokens[i - 1], open)) return null;
  const afterArgs = closeParen(tokens, i);
  if (afterArgs < 0) return null;
  const call = callee + spanText(tokens.slice(i, afterArgs));

  // A dotted head names its own receiver; the engine takes a target only for
  // a bare `method(…)`.
  if (dotted) return { text: `call ${call}`, consumed: afterArgs - start };

  let j = afterArgs;
  const next = tokens[j];
  const nextWord = next?.value.toLowerCase();
  let target: string | null = null;
  if (nextWord === 'me') {
    target = 'me';
    j++;
  } else if (nextWord !== undefined && PREPOSITIONS.has(nextWord)) {
    j++;
    if (tokens[j]?.value.toLowerCase() === 'the') j++;
    const t = tokens[j];
    if (!t) return null;
    const run = matchPositionalRun(tokens, j, profile);
    if (run) {
      target = `(${spanText(tokens.slice(j, j + run.consumed))})`;
      j += run.consumed;
    } else if (
      t.kind === 'selector' &&
      t.value.startsWith('#') &&
      !/[.[:\s]/.test(t.value.slice(1))
    ) {
      target = t.value;
      j++;
    } else if (t.kind === 'selector' && /^[.<]/.test(t.value)) {
      target = `(${t.value})`;
      j++;
    } else if (
      (t.kind === 'keyword' || t.kind === 'identifier') &&
      NAME_RE.test(t.value) &&
      (isValidReference(t.value.toLowerCase()) || t.kind === 'identifier')
    ) {
      target = t.value;
      j++;
    } else {
      return null;
    }
  }
  return {
    text: target ? `call ${target}.${call}` : `call ${call}`,
    consumed: j - start,
  };
}
