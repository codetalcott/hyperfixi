/**
 * DOM effect signatures — shared by the R2 execution validator (corpus
 * patterns vs the en reference) and the shipped-examples execution gate
 * (shipped handlers vs the upstream engine).
 *
 * A signature is a before/after diff of every element's identity-relevant
 * state: classes, attributes, inline style, and leaf text. Selectors, classes,
 * and attribute names are code (not translated), so signatures are directly
 * comparable across languages — and across engines, which is what makes the
 * upstream-oracle comparison possible at all.
 *
 * Extracted verbatim from validators/execution-validator.ts (R2), which now
 * imports from here. Any change to the serialization changes BOTH gates'
 * signatures at once, deliberately: the two must never disagree about what a
 * DOM effect is.
 */

/**
 * Attributes that are ENGINE bookkeeping, not page behavior: hyperscript
 * source (`_`), hyperfixi's processed-marker, show/hide display memo, and the
 * shipped-examples harness's identity keys. Excluded from signatures so a
 * cross-engine comparison measures what the handler DID to the page, not how
 * each engine annotates its own work. For R2 this changed exactly one locked
 * signature (`hide-with-transition`, which loses its data-original-display
 * memo) and no fidelity numbers — translations are compared against a same-run
 * en reference, so both sides drop the memo together.
 */
const ENGINE_ATTRS = new Set([
  '_',
  'data-hyperscript-powered',
  'data-original-display',
  'data-exec-key',
]);

/**
 * Serialize the identity-relevant state of one element.
 * Leaf text only — container text would duplicate every child mutation.
 */
export function serializeElement(el: Element): string {
  const attrs = Array.from(el.attributes)
    .filter(a => a.name !== 'class' && a.name !== 'style' && !ENGINE_ATTRS.has(a.name))
    .map(a => `${a.name}=${a.value}`)
    .sort()
    .join(',');
  const classes = Array.from(el.classList).sort().join(' ');
  const style = (el as HTMLElement).getAttribute('style') ?? '';
  const text =
    el.childNodes.length === 0 || (el.childNodes.length === 1 && el.firstChild?.nodeType === 3)
      ? (el.textContent ?? '')
      : '';
  return `cls[${classes}] attr[${attrs}] style[${style}] text[${text}]`;
}

/**
 * Snapshot every element under <body>. <body> participates under its own
 * stable key (body-targeted effects must be visible).
 *
 * Keying: `data-exec-key` when present (stamped by the shipped-examples
 * harness BEFORE the engine runs, so the key is the element's IDENTITY — an
 * engine inserting or removing one element cannot shift every later element's
 * key, which flat indices did: one injected node turned a one-line diff into a
 * whole-page churn storm). Elements without a key (added during the run, and
 * the whole R2 corpus fixture, which is never stamped) fall back to `#id` /
 * `tag[document-order-index]` — R2's original keying, byte-identical for its
 * signatures.
 */
export function snapshot(document: Document): Map<string, string> {
  const out = new Map<string, string>();
  out.set('body', serializeElement(document.body));
  document.body.querySelectorAll('*').forEach((el, i) => {
    const execKey = el.getAttribute?.('data-exec-key');
    const key = execKey
      ? `${el.tagName.toLowerCase()}:${execKey}${el.id ? `#${el.id}` : ''}`
      : el.id
        ? `#${el.id}`
        : `${el.tagName.toLowerCase()}[${i}]`;
    out.set(key, serializeElement(el));
  });
  return out;
}

/** Sorted, stable list of per-element changes between two snapshots. */
export function diffSnapshots(before: Map<string, string>, after: Map<string, string>): string[] {
  const effects: string[] = [];
  for (const [k, v] of after) {
    const b = before.get(k);
    if (b === undefined) effects.push(`+${k} ${v}`);
    else if (b !== v) effects.push(`Δ${k} ${v}`);
  }
  for (const k of before.keys()) if (!after.has(k)) effects.push(`-${k}`);
  return effects.sort();
}
