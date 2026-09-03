/**
 * Inert-shape heuristics — Gate 4 of the validation pipeline (arc 3b).
 *
 * A parse can consume every token at confidence 1.0 and still be provably
 * useless at runtime: the agent-bench probe found five plausible phrasings
 * that do exactly that (silent no-op, or effect on the wrong element) with
 * nothing in the response for the validate/repair loop to react to. Each left
 * a distinctive fingerprint in the IR; this gate matches those fingerprints
 * and emits WARNINGS — never errors, and never a confidence change, so parse
 * outcomes are byte-identical and only the diagnostics array grows (the same
 * contract as the arc-3b unconsumed-input propagation).
 *
 * Checks are deliberately narrow — a fingerprint each, not a general theory of
 * inertness — because a false warning teaches an agent to distrust warnings.
 * The known-remaining silent phrasings these do NOT cover are valid code with
 * different intent (e.g. `add .hidden to #menu`), which no compile-time check
 * can catch; that is IR-vs-intent review's job.
 */

import type { Diagnostic } from '../types.js';

/** Quantifier words that read as "the matched set" in English but parse as a
 * bare identifier, making `all.todo` an undefined property access at runtime. */
const QUANTIFIER = /^(all|every|each)\.(\S+)$/;

/** Predicate words that, mis-tokenized as class selectors inside a condition
 * (`#box .has class .danger`), silently make the condition falsy. The pattern
 * requires the word to stand alone — real utility classes like `.is-active`
 * do not match. */
const PREDICATE_AS_CLASS = /(^|\s)\.(has|is|contains|matches|includes)(\s|$)/;

interface RoleValueLike {
  type?: string;
  value?: unknown;
  raw?: string;
  /** property-path values carry object + property instead of value. */
  property?: string;
}

interface NodeLike {
  action?: string;
  roles?: ReadonlyMap<string, unknown>;
  body?: unknown[];
}

function valueString(v: RoleValueLike): string {
  return String(v.value ?? v.raw ?? '');
}

/**
 * Walk a SemanticNode (recursing into command bodies) and return warnings for
 * shapes that are known to execute as no-ops or mis-bindings.
 */
export function checkInertShapes(node: unknown): Diagnostic[] {
  const out: Diagnostic[] = [];
  walk(node, out);
  return out;
}

function walk(node: unknown, out: Diagnostic[]): void {
  if (!node || typeof node !== 'object') return;
  const n = node as NodeLike;

  if (n.roles && typeof n.roles.entries === 'function') {
    for (const [role, raw] of n.roles.entries()) {
      const v = (raw ?? {}) as RoleValueLike;
      const s = valueString(v);

      // `add .done to all .todo` → destination expression `all.todo`:
      // identifier `all` is undefined at runtime, so the effect lands on the
      // default target (usually `me`) or nowhere.
      const q = v.type === 'expression' ? QUANTIFIER.exec(s) : null;
      if (q && (role === 'destination' || role === 'source')) {
        out.push({
          severity: 'warning',
          code: 'INERT_QUANTIFIER_TARGET',
          message: `${role} parsed as property access "${s}" — "${q[1]}" is an undefined identifier at runtime, so this ${role} will not resolve.`,
          suggestion: `Selectors already address every match: write the bare selector (e.g. ".${q[2]}") without "${q[1]}".`,
        });
        continue;
      }

      // `if #box has class .danger` → condition `#box .has class .danger`:
      // the predicate word became a class selector, the condition evaluates
      // falsy, and the body silently never runs.
      if (role === 'condition' && v.type === 'expression' && PREDICATE_AS_CLASS.test(s)) {
        const word = PREDICATE_AS_CLASS.exec(s)?.[2];
        out.push({
          severity: 'warning',
          code: 'HALF_PARSED_CONDITION',
          message: `condition parsed ".${word}" as a class selector (full condition: "${s}") — it will evaluate falsy and the body will never run.`,
          suggestion: 'For class tests use `matches`: `if #box matches .danger`.',
        });
        continue;
      }

      // `add .modal-open to <body/>` → selector "<body/>": query-literal
      // syntax is the traditional parser's; on this path it reaches
      // querySelector verbatim, which throws (swallowed) — a silent no-op.
      if (v.type === 'selector' && s.startsWith('<')) {
        out.push({
          severity: 'warning',
          code: 'UNSUPPORTED_QUERY_LITERAL',
          message: `${role} selector "${s}" uses query-literal syntax, which this parser does not support — at runtime it is an invalid CSS selector and matches nothing.`,
          suggestion: `Use a plain CSS selector instead (e.g. "${s.replace(/^<|\/?>$/g, '')}").`,
        });
        continue;
      }

      // `set the text of #output to "…"` → property-path `#output.text`:
      // `.text` is not a DOM-visible property on ordinary elements, so the
      // write is an invisible expando.
      if (n.action === 'set' && v.type === 'property-path' && v.property === 'text') {
        out.push({
          severity: 'warning',
          code: 'INERT_PROPERTY_WRITE',
          message: `set targets property "text" — on most elements this is not a DOM property, so the write usually changes nothing visible.`,
          suggestion:
            'Use `textContent` (`set the textContent of #el to …`) or `put "…" into #el`.',
        });
      }
    }
  }

  if (Array.isArray(n.body)) for (const child of n.body) walk(child, out);
}
