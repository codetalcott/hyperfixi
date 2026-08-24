/**
 * Plausible-phrasing probe — the generator-independent half of the benchmark.
 *
 * WHY THIS EXISTS. The A/B run (`score --run`) needs an agent to generate
 * candidates, so its numbers are only as trustworthy as the generator's
 * independence. This file needs no generator: every entry is a concrete
 * phrasing, and whether it parses and what it DOES are deterministic properties
 * of the parser. The claim is therefore narrow and checkable — "these phrasings
 * behave thus" — not a statistical claim about how often a model emits them.
 *
 * WHAT IT MEASURES. The band the loop cannot currently see. `validate_and_compile`
 * reports ok/diagnostics, so a phrasing that FAILS to parse is already handled:
 * the agent gets an error and repairs. The dangerous phrasings are the ones that
 * parse clean — confidence 1.0, zero diagnostics — and quietly do the wrong
 * thing, or nothing. No amount of looping fixes those, because the loop is never
 * told anything is wrong. Each such row is a candidate diagnostic.
 *
 * SELECTION. Each variant is a phrasing a competent generator plausibly reaches
 * for: a neighbouring English preposition, the other of two documented spellings,
 * a JS-flavoured construction, or a near-synonym event. Deliberate nonsense is
 * excluded — it would inflate the failure count without teaching anything.
 */

export interface Variant {
  /** Task whose fixture/reference this is scored against. */
  taskId: string;
  code: string;
  /** Why a generator plausibly emits this. */
  rationale: string;
}

export const VARIANTS: readonly Variant[] = [
  // ── destination markers: the omitted-preposition family ───────────────────
  {
    taskId: 'toggle-other-class',
    code: 'on click toggle .open #panel',
    rationale: 'omits the destination marker "on" — reads naturally, mirrors CSS',
  },
  {
    taskId: 'toggle-other-class',
    code: 'on click toggle .open in #panel',
    rationale: '"in" instead of "on" — plausible English for a containment target',
  },
  {
    taskId: 'add-class-other',
    code: 'on click add .highlight #item',
    rationale: 'omits "to"',
  },
  {
    taskId: 'add-class-other',
    code: 'on click add .highlight on #item',
    rationale: '"on" instead of "to" — the marker toggle uses',
  },
  {
    taskId: 'remove-class-all',
    code: 'on click remove .active from all .row',
    rationale: '"from all" — English plural emphasis',
  },

  // ── attributes: three spellings, one of which works ───────────────────────
  {
    taskId: 'set-attribute',
    code: 'on click set @aria-expanded of #panel to "true"',
    rationale: '"of" form — reads best, and is what the docs use for style props',
  },
  {
    taskId: 'set-attribute',
    code: 'on click set @aria-expanded on #panel to "true"',
    rationale: '"on" form',
  },
  {
    taskId: 'set-attribute',
    code: 'on click add @aria-expanded="true" to #panel',
    rationale: 'HTML-flavoured: attribute literal added to a target',
  },
  {
    taskId: 'toggle-attribute',
    code: 'on click toggle @hidden of #message',
    rationale: '"of" instead of "on" for an attribute target',
  },

  // ── properties: possessive vs dot ─────────────────────────────────────────
  {
    taskId: 'set-inner-html',
    code: 'on click set #output.innerHTML to "Done"',
    rationale: 'JS member access instead of the possessive',
  },
  {
    taskId: 'set-inner-html',
    code: 'on click set the innerHTML of #output to "Done"',
    rationale: '"the X of Y" — the most natural English phrasing',
  },
  {
    taskId: 'set-style',
    code: 'on click set the style.backgroundColor of #swatch to "red"',
    rationale: 'JS style-object path',
  },
  {
    taskId: 'set-style',
    code: 'on click set #swatch\'s *background-color to "red"',
    rationale: 'possessive form of the style sigil',
  },

  // ── put/into ──────────────────────────────────────────────────────────────
  {
    taskId: 'put-text',
    code: 'on click put "Saved" in #output',
    rationale: '"in" instead of "into"',
  },
  {
    taskId: 'put-text',
    code: 'on click set the text of #output to "Saved"',
    rationale: 'set-phrasing for a content write',
  },
  {
    taskId: 'put-text',
    code: 'on click put "Saved" into the #output',
    rationale: 'stray article before the selector',
  },

  // ── sequencing ────────────────────────────────────────────────────────────
  {
    taskId: 'two-commands',
    code: 'on click add .busy to me and put "Loading" into #output',
    rationale: '"and" instead of "then" to join commands',
  },
  {
    taskId: 'two-commands',
    code: 'on click add .busy to me, put "Loading" into #output',
    rationale: 'comma-separated commands',
  },
  {
    taskId: 'tabs-switch',
    code: 'on click remove .active from .tab and add .active to #tab2',
    rationale: '"and" joining a two-step tab switch',
  },

  // ── conditionals ──────────────────────────────────────────────────────────
  {
    taskId: 'conditional-class',
    code: 'on click if #box has class .danger add .warned to #box end',
    rationale: '"has class" instead of "matches"',
  },
  {
    taskId: 'conditional-class',
    code: 'on click if #box matches .danger then add .warned to #box end',
    rationale: 'explicit "then" after the condition',
  },

  // ── element removal vs class removal ──────────────────────────────────────
  {
    taskId: 'remove-element',
    code: 'on click remove element #item',
    rationale: 'disambiguating word "element" — remove is overloaded',
  },
  {
    taskId: 'remove-element',
    code: 'on click remove the #item',
    rationale: 'stray article',
  },

  // ── show/hide ─────────────────────────────────────────────────────────────
  {
    taskId: 'hide-element',
    code: 'on click hide the #menu',
    rationale: 'stray article',
  },
  {
    taskId: 'hide-element',
    code: 'on click add .hidden to #menu',
    rationale: 'class-based hiding — a common idiom, but not what hide does',
  },

  // ── events ────────────────────────────────────────────────────────────────
  {
    taskId: 'mouseenter-hover',
    code: 'on mouseover add .hover to me',
    rationale: 'mouseover is the more familiar event name',
  },
  {
    taskId: 'custom-event',
    code: 'on "refresh" put "Refreshed" into #output',
    rationale: 'quoted event name',
  },

  // ── self-reference ────────────────────────────────────────────────────────
  {
    taskId: 'toggle-self-class',
    code: 'on click toggle .active',
    rationale: 'omits the target entirely, relying on an implicit self default',
  },
  {
    taskId: 'toggle-self-class',
    code: 'on click toggle .active on this',
    rationale: '"this" instead of "me" — the JS spelling',
  },
  {
    taskId: 'toggle-self-class',
    code: 'on click toggle class .active on me',
    rationale: 'the word "class" before the selector',
  },

  // ── multi-target / body ───────────────────────────────────────────────────
  {
    taskId: 'add-class-multiple',
    code: 'on click add .done to all .todo',
    rationale: '"to all" plural emphasis',
  },
  {
    taskId: 'add-class-multiple',
    code: 'on click add .done to every .todo',
    rationale: '"every" — the wording used in the prompt itself',
  },
  {
    taskId: 'add-to-body',
    code: 'on click add .modal-open to the body',
    rationale: 'stray article before body',
  },
  {
    taskId: 'add-to-body',
    code: 'on click add .modal-open to <body/>',
    rationale: 'query literal for a tag target',
  },

  // ── positional ────────────────────────────────────────────────────────────
  {
    taskId: 'closest-ancestor',
    code: 'on click add .selected to the closest .card',
    rationale: 'stray article before a positional expression',
  },
  {
    taskId: 'closest-ancestor',
    code: 'on click add .selected to closest .card to me',
    rationale: 'explicit anchor for closest',
  },
  {
    taskId: 'show-element',
    code: 'on click show the #modal',
    rationale: 'stray article',
  },
] as const;
