/**
 * R2 — execution smoke validator (CORRECTNESS_RELIABILITY_PLAN.md §8).
 *
 * Parse-level ratchets (R0 action-set fidelity, R1 role fidelity) cannot see a
 * parse that EXECUTES wrongly: the session-5 probe found translations whose
 * parse looks plausible but whose runtime behavior diverges from the English
 * reference — a dropped destination role lands the effect on `me` instead of
 * `#menu`, a mis-built AST throws `Unknown command: into`, a quoted literal
 * keeps its quotes in the DOM. This validator executes a CURATED subset of
 * corpus patterns in jsdom (semantic parse → buildAST → runtime.execute →
 * dispatch the trigger event) and compares the resulting DOM effects against
 * the English reference's effects.
 *
 * Effect signature: a before/after diff of every element's classes, attributes,
 * inline style, and leaf text. Selectors/classes/attribute names are code (not
 * translated), so signatures are directly comparable across languages. A
 * pattern scores 1 when its signature EXACTLY matches the en reference's
 * (binary — extra effects are as wrong as missing ones). Trapped runtime
 * errors are recorded for diagnostics but are NOT part of the match: their
 * attribution depends on unhandled-rejection timing (racy), while the effect
 * snapshot is synchronous and deterministic. A mis-built AST that damages
 * behavior diverges in its effects regardless.
 *
 * Determinism: a fresh JSDOM document and a fresh Runtime per execution, no
 * network, no timers beyond a fixed settle window; the probe measured two full
 * sweeps byte-identical. Patterns whose en reference errors or produces no
 * effects are excluded (no usable reference — same semantics as R0/R1).
 */

import { JSDOM } from 'jsdom';
import { parseSemantic, buildAST } from '@lokascript/semantic';
import { getAllPatterns, getTranslationsByLanguage } from '@hyperfixi/patterns-reference';
import type { LanguageCode } from '../types';

/**
 * The curated execution subset: simple, deterministic, fixture-friendly
 * single-handler click patterns. Expand only after the loop is proven stable
 * (an unstable ratchet is worse than none). Three otherwise-eligible patterns
 * are deliberately absent because their EN reference doesn't execute in the
 * current runtime (no usable reference): `toggle-visibility` (attribute
 * toggle), `set-text-basic` (#id.innerText target), `set-attribute`
 * (@attr selector).
 */
export const EXECUTION_SUBSET: readonly string[] = [
  'add-class-basic',
  'add-class-to-other',
  'remove-class-basic',
  'remove-class-from-all',
  'toggle-class-basic',
  'toggle-class-on-other',
  'put-content-basic',
  'show-element',
  'hide-element',
  'increment-counter',
  'decrement-counter',
  'modal-open',
  'tabs-basic',
  'set-text-possessive-dot',
  'set-inner-html-possessive-dot',
  'set-style',
  'closest-ancestor',
  // Expansion wave 1 (session 8): multi-command click patterns — sync,
  // network/timer-free sequences of 2–4 commands. Same eligibility bar as the
  // original subset: the en reference must execute with a non-empty effect
  // signature in the current runtime. Eleven candidates were probed; nine are
  // deliberately absent because their EN reference is unusable:
  //   halt-propagation      — runtime `halt` exits the whole handler (patient
  //                           parses as bare 'the'), second command never runs
  //   tabs-aria             — `set @attr … on <sel>`: "Invalid selector
  //                           @aria-selected" (the set-attribute family gap)
  //   modal-close-button    — en parse DROPS `hide closest .modal`; the
  //                           surviving body-class change is invisible to the
  //                           snapshot (body isn't serialized)
  //   dropdown-toggle       — AST emits a propertyAccess node the runtime
  //                           can't execute
  //   make-element,
  //   make-toast-element    — runtime "Invalid selector <div.card/>" (make
  //                           with an HTML-literal selector)
  //   if-condition, if-matches, if-exists, unless-condition,
  //   modal-close-backdrop  — the en SEMANTIC PARSE flattens if/unless
  //                           branches into sibling commands (condition
  //                           truncated to 'I'); the runtime then rejects the
  //                           bare `if`. Control-flow expansion is blocked on
  //                           the parsing track's dominant cluster — in en too.
  'tabs-content',
  'accordion-exclusive',
];

/**
 * Shared fixture: every element the curated subset's selectors reference.
 * The SAME fixture (plus the same per-pattern setup) is used for the en
 * reference and every translation, so signatures are comparable.
 */
const FIXTURE_HTML = `<!DOCTYPE html><html><body>
  <div class="card"><button id="btn">Click</button></div>
  <div id="item"></div>
  <div id="menu"></div>
  <div id="panel"></div>
  <div id="modal"></div>
  <div id="output"></div>
  <div id="counter">0</div>
  <ul><li class="items active"></li><li class="items active"></li></ul>
  <div class="tab active"></div>
  <div class="tab"></div>
  <div class="tab-panel"></div>
  <div class="tab-panel"></div>
  <div class="accordion-item open"></div>
</body></html>`;

/** Per-pattern fixture preconditions (applied identically for every language). */
const PATTERN_SETUP: Record<string, (doc: Document) => void> = {
  // `remove .highlight from me` needs the class present to have an effect.
  'remove-class-basic': doc => doc.getElementById('btn')!.classList.add('highlight'),
  // `show #modal` needs the modal hidden.
  'show-element': doc => {
    (doc.getElementById('modal') as HTMLElement).style.display = 'none';
  },
  // `add .open to closest .accordion-item` needs #btn inside one; the
  // fixture's standalone `.accordion-item.open` is the exclusivity victim.
  'accordion-exclusive': doc => doc.querySelector('.card')!.classList.add('accordion-item'),
};

/** Result of executing one pattern translation. */
export interface ExecutionResult {
  codeExampleId: string;
  language: LanguageCode;
  /** Sorted effect lines (see snapshot/diff). Empty on error or no effect. */
  effects: string[];
  /** Parse/build/runtime error, when any. */
  error?: string;
  /** 1 = exact signature match vs the en reference, 0 = mismatch. Undefined for en itself or when no usable reference exists. */
  executionFidelity?: number;
}

/**
 * Serialize the identity-relevant state of every element under <body>.
 * Keyed by #id when present, else tag[document-order-index]; the fixture is
 * identical across languages, so keys are comparable.
 */
function snapshot(document: Document): Map<string, string> {
  const out = new Map<string, string>();
  document.body.querySelectorAll('*').forEach((el, i) => {
    const key = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}[${i}]`;
    const attrs = Array.from(el.attributes)
      .filter(a => a.name !== 'class' && a.name !== 'style')
      .map(a => `${a.name}=${a.value}`)
      .sort()
      .join(',');
    const classes = Array.from(el.classList).sort().join(' ');
    const style = (el as HTMLElement).getAttribute('style') ?? '';
    // Leaf text only — container text would duplicate every child mutation.
    const text =
      el.childNodes.length === 0 || (el.childNodes.length === 1 && el.firstChild?.nodeType === 3)
        ? (el.textContent ?? '')
        : '';
    out.set(key, `cls[${classes}] attr[${attrs}] style[${style}] text[${text}]`);
  });
  return out;
}

/** Sorted, stable list of per-element changes between two snapshots. */
function diffSnapshots(before: Map<string, string>, after: Map<string, string>): string[] {
  const effects: string[] = [];
  for (const [k, v] of after) {
    const b = before.get(k);
    if (b === undefined) effects.push(`+${k} ${v}`);
    else if (b !== v) effects.push(`Δ${k} ${v}`);
  }
  for (const k of before.keys()) if (!after.has(k)) effects.push(`-${k}`);
  return effects.sort();
}

/** How long to let the dispatched handler settle (ms). The subset contains no
 * waits/transitions/fetches, so this only needs to drain micro/macrotasks. */
const SETTLE_MS = 20;

/** Per-execution hard timeout — a hung execution must not hang the sweep. */
const EXECUTION_TIMEOUT_MS = 5000;

/**
 * R2 execution validator. `initialize()` MUST complete before `execute()`:
 * it bootstraps jsdom globals and only then loads `@hyperfixi/core`, whose
 * module evaluation touches `Element`/`document`.
 */
export class ExecutionValidator {
  private core: {
    Runtime: new () => { execute(ast: unknown, ctx: unknown): Promise<unknown> };
    createContext: (el: HTMLElement) => unknown;
  } | null = null;

  /** Errors thrown inside dispatched listeners surface as unhandled rejections
   * (the handler is async); trap them into the current execution's sink. */
  private listenerErrors: string[] = [];
  private trapInstalled = false;

  async initialize(): Promise<void> {
    if (this.core) return;

    // Bootstrap DOM globals BEFORE importing @hyperfixi/core (its dist
    // evaluates `Element` at module load). The per-execution fresh document
    // replaces these for each run.
    this.installGlobals(new JSDOM(FIXTURE_HTML));

    const core = await import('@hyperfixi/core');
    this.core = {
      Runtime: core.Runtime as unknown as new () => {
        execute(ast: unknown, ctx: unknown): Promise<unknown>;
      },
      createContext: core.createContext as unknown as (el: HTMLElement) => unknown,
    };

    if (!this.trapInstalled) {
      process.on('unhandledRejection', (reason: unknown) => {
        const msg = reason instanceof Error ? reason.message : String(reason);
        this.listenerErrors.push(msg);
      });
      this.trapInstalled = true;
    }
  }

  getName(): string {
    return 'ExecutionValidator';
  }

  private installGlobals(dom: JSDOM): void {
    const g = globalThis as Record<string, unknown>;
    g.window = dom.window;
    g.document = dom.window.document;
    g.Event = dom.window.Event;
    g.CustomEvent = dom.window.CustomEvent;
    g.HTMLElement = dom.window.HTMLElement;
    g.Element = dom.window.Element;
    g.Node = dom.window.Node;
    g.MutationObserver = dom.window.MutationObserver;
    g.getComputedStyle = dom.window.getComputedStyle;
  }

  /**
   * Execute one pattern translation in a fresh fixture and return its effect
   * signature. Never throws; failures come back as `error`.
   */
  async execute(codeExampleId: string, code: string, lang: string): Promise<ExecutionResult> {
    const run = this.executeInner(codeExampleId, code, lang);
    const timeout = new Promise<ExecutionResult>(resolve =>
      setTimeout(
        () =>
          resolve({
            codeExampleId,
            language: lang as LanguageCode,
            effects: [],
            error: `execution timed out (${EXECUTION_TIMEOUT_MS}ms)`,
          }),
        EXECUTION_TIMEOUT_MS
      )
    );
    return Promise.race([run, timeout]);
  }

  private async executeInner(
    codeExampleId: string,
    code: string,
    lang: string
  ): Promise<ExecutionResult> {
    if (!this.core) await this.initialize();
    const base: ExecutionResult = {
      codeExampleId,
      language: lang as LanguageCode,
      effects: [],
    };

    const dom = new JSDOM(FIXTURE_HTML);
    this.installGlobals(dom);
    const document = dom.window.document;
    PATTERN_SETUP[codeExampleId]?.(document);
    const btn = document.getElementById('btn')!;
    this.listenerErrors = [];

    // The runtime logs every failing command via console — across a full
    // multi-language sweep that is pure noise; silence it for the execution.
    const saved = { log: console.log, warn: console.warn, error: console.error };
    console.log = console.warn = console.error = () => {};
    try {
      const parsed = parseSemantic(code, lang);
      if (!parsed.node || parsed.confidence < 0.5) {
        return { ...base, error: `parse failed (confidence ${parsed.confidence?.toFixed(2)})` };
      }
      const built = buildAST(parsed.node);
      if (!built.ast) return { ...base, error: 'buildAST returned no AST' };

      const runtime = new this.core!.Runtime();
      const ctx = this.core!.createContext(btn as unknown as HTMLElement);
      // Installs the event handler (or runs bare commands immediately).
      await runtime.execute(built.ast, ctx);

      const before = snapshot(document);
      btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, SETTLE_MS));
      const after = snapshot(document);

      const effects = diffSnapshots(before, after);
      if (this.listenerErrors.length > 0) {
        return { ...base, effects, error: `runtime: ${this.listenerErrors.join('; ')}` };
      }
      return { ...base, effects };
    } catch (e: unknown) {
      return { ...base, error: e instanceof Error ? e.message : String(e) };
    } finally {
      console.log = saved.log;
      console.warn = saved.warn;
      console.error = saved.error;
      dom.window.close();
    }
  }
}

/** The subset's source text per language: en from code_examples.raw_code,
 * other languages from pattern_translations. */
export async function loadExecutionSubset(
  languages: readonly LanguageCode[]
): Promise<Map<LanguageCode, Map<string, string>>> {
  const subset = new Set(EXECUTION_SUBSET);
  const result = new Map<LanguageCode, Map<string, string>>();

  for (const lang of languages) {
    const byId = new Map<string, string>();
    if (lang === 'en') {
      const patterns = await getAllPatterns();
      for (const p of patterns) {
        if (subset.has(p.id)) byId.set(p.id, p.rawCode);
      }
    } else {
      const translations = await getTranslationsByLanguage(lang, 1000);
      for (const t of translations) {
        if (subset.has(t.codeExampleId)) byId.set(t.codeExampleId, t.hyperscript);
      }
    }
    result.set(lang, byId);
  }
  return result;
}
