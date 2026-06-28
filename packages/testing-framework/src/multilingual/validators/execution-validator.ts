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
 * (an unstable ratchet is worse than none). `set-text-basic` (#id.innerText)
 * is deliberately absent: jsdom does not implement innerText, so its en
 * reference write is an inert expando (empty signature) — a harness
 * limitation, not a runtime gap. `toggle-visibility` and `set-attribute`
 * joined in wave 2b once @attr emitted canonical attributeAccess nodes.
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
  // signature in the current runtime. Eleven candidates were probed; the two
  // then-excluded for unusable EN references (modal-close-button,
  // make-toast-element) joined in waves 3/3b once their en parses were fixed.
  'tabs-content',
  'accordion-exclusive',
  // Expansion wave 2 (session 9, post en-conditional work): control-flow click
  // patterns whose en reference now parses (the if/else conditional fold) and
  // executes (propertyAccess evaluator; matches/exists/is-empty condition
  // forms). Probed through this validator: each produces a non-empty,
  // deterministic effect signature. `unless-condition` stays out — `unless` is
  // deliberately NOT folded (see semantic-parser.tryParseConditionalBlock), so
  // its flat parse still errors at runtime.
  'if-condition',
  'if-matches',
  'if-exists',
  'modal-close-backdrop',
  // Expansion wave 2b (session 9): the @attr family — the semantic value
  // converter / expression parser now emit canonical attributeAccess nodes for
  // `@attr`, so these en references execute (set → setAttribute, toggle →
  // attribute toggle). set-text-basic stays out: its en reference writes
  // `innerText`, which jsdom does not implement (the write becomes an inert
  // expando, empty signature) — a harness limitation, not a runtime gap; it
  // works in real browsers.
  'set-attribute',
  'toggle-visibility',
  'tabs-aria',
  // Expansion wave 2c (session 9): `halt the event` no longer collapses to a
  // bare halt (the semantic halt mapper preserves its patient, so the handler
  // CONTINUES after preventDefault/stopPropagation), and `make a <div.card/>`
  // executes (element literals carry their markup on `raw`; #container added
  // to the fixture as the put destination).
  'halt-propagation',
  'make-element',
  // Expansion wave 2d (session 9): `next .dropdown-menu` folds to a positional
  // call expression (next('.dropdown-menu')) the runtime's positional
  // expressions evaluate — previously it mangled into `next.dropdown - menu`
  // and the toggle target evaluated to NaN. `.dropdown-menu` added to the
  // fixture (appended last; existing snapshot indexes unchanged).
  'dropdown-toggle',
  // Expansion wave 3 (session 10): positional-phrase patients/destinations —
  // the pattern matcher now captures `closest <sel>` and article-led
  // `the next <sel>` as positional expressions (previously the hide/show
  // command dropped from the body entirely). The en reference for
  // modal-close-button now hides the enclosing .modal (PATTERN_SETUP gives
  // #btn a .modal ancestor, mirroring the real-page structure).
  'modal-close-button',
  // Expansion wave 3b (session 10): the at-end-of positional put — en put
  // patterns for `at end of` / `at start of`, the parseBodyWithClauses
  // end-noun guard (the `end` in `at end of` is a position noun, not the
  // block terminator), putMapper reads `manner` (also fixing the latent
  // before/after→into bug), core PutCommand accepts the multi-word modifier
  // keys, and contextReference body/document/window resolve. The en
  // reference appends the toast at end of body: one clean effect line.
  'make-toast-element',
  // Expansion wave 4 (the deferred S1 follow-up): the first non-click,
  // event-reading cell. `on success put event.detail.message into #sr-announce
  // set @role to "alert" on #sr-announce` exercises (1) a custom event name
  // carried as an expression role — buildEventHandler now binds it instead of
  // defaulting to `click`; (2) the `set @attr … on <scope>` plumb landed in S1;
  // (3) per-cell trigger support (PATTERN_TRIGGER) dispatching a CustomEvent
  // with a `detail` payload. The en reference writes the announcement text into
  // #sr-announce and sets role=alert on it: two clean effect lines.
  'announce-screen-reader',
  // Expansion wave 5 (session 12): `remove me` — the bare self-removal positional.
  // Discovery probe (every non-subset, non-network/timer/behavior pattern executed
  // against this fixture, then all 23 translations checked against the en effect
  // signature) found ten patterns with a clean non-empty en effect.
  'remove-element',
  // Expansion wave 6 (session 13): the six wave-5 "worklist" candidates that, when
  // RE-GROUNDED against a freshly `populate`d patterns.db, in fact match the en effect
  // signature in ALL 23 languages — so each keeps avgExecutionFidelity at 1.0. The
  // wave-5 worklist's per-language divergence counts were measured against a STALE
  // committed patterns.db snapshot (the committed copy lags the current dicts — see
  // patterns-reference/CLAUDE.md); e.g. its ms `next-element` carried untranslated
  // `to`/`next` (`apabila click … to next <li/>`), but a fresh populate emits the
  // localized `apabila click tambah .highlight ke seterusnya <li/>`, which executes
  // identically to en. Re-grounded counts (fresh db, all 24 priority langs): these six
  // diverge in 0/23; the wave-5 worklist said next-element 1, toggle-aria-expanded 2,
  // set-opacity 4, set-transform 4, accordion-toggle 6, caret-var-on-target 23 — all
  // stale. No fixture/setup/trigger change needed; each en reference produces a clean
  // non-empty signature against the existing fixture (next/closest positionals fall
  // back to `me` consistently across every language; set *opacity/*transform write
  // inline style; caret-var-on-target clears #btn text — the undefined `^count` resolves
  // the same way in every language). The THREE wave-5 candidates with REAL divergences
  // remain the next-wave worklist (re-grounded fresh-db divergent-lang counts):
  //   multiple-events (7: ja,ko,it,hi,tr,bn,qu — the `or` multi-event separator) ·
  //   put-after (14) · put-before (14) — positional `put … after/before me`, which
  //   errors ("Unknown command: after", "put requires content and position") or inserts
  //   at the wrong offset in most languages. These are invisible to R0/R1 (parse-faithful)
  //   — exactly the class R2 exists to catch — and each must be FIXED before joining, or
  //   it drops R2 below 1.0. Tracked in docs-internal/MULTILINGUAL_NEXT_STEPS.md.
  'next-element',
  'toggle-aria-expanded',
  'set-opacity',
  'set-transform',
  'accordion-toggle',
  'caret-var-on-target',
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
  <div id="container"></div>
  <div class="dropdown-menu"></div>
  <div id="sr-announce"></div>
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
  // `if target matches .modal-backdrop hide .modal-backdrop` — the dispatched
  // click's target is #btn, so the condition only fires when #btn IS the
  // backdrop (the real-page case is a click landing on the backdrop itself).
  'modal-close-backdrop': doc => doc.getElementById('btn')!.classList.add('modal-backdrop'),
  // `hide closest .modal` needs #btn inside a .modal (the real-page case is a
  // close button inside the modal it closes), and `remove .modal-open from
  // body` needs the class present so the body write is scoreable.
  'modal-close-button': doc => {
    doc.querySelector('.card')!.classList.add('modal');
    doc.body.classList.add('modal-open');
  },
};

/**
 * Per-pattern trigger override. The subset is overwhelmingly `on click`, so the
 * default (dispatched in `executeInner`) is a bare `Event('click')`. A handler
 * that listens for a different event — or that READS the triggering event (e.g.
 * `on success put event.detail.message …`) — declares the event name and, when
 * needed, a `detail` payload here. With a `detail`, a `CustomEvent` is
 * dispatched so `event.detail.*` resolves; the payload is identical for the en
 * reference and every translation (it is harness-supplied, not translated), so
 * effect signatures stay comparable across languages.
 */
interface PatternTrigger {
  readonly event: string;
  readonly detail?: unknown;
}
const PATTERN_TRIGGER: Record<string, PatternTrigger> = {
  // `on success put event.detail.message into #sr-announce set @role to "alert"
  // on #sr-announce` — a custom event carrying the announcement text. The fixed
  // message lands in #sr-announce's text; role=alert is set on the same node.
  'announce-screen-reader': { event: 'success', detail: { message: 'Saved successfully' } },
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
function serializeElement(el: Element): string {
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
  return `cls[${classes}] attr[${attrs}] style[${style}] text[${text}]`;
}

function snapshot(document: Document): Map<string, string> {
  const out = new Map<string, string>();
  // body participates under its own stable key: body-targeted effects
  // (`add .modal-open to body`, modal-open/modal-close-button) must be
  // visible in the signature now that the runtime resolves `body`. Before
  // wave 3b these writes fell back to `me` (visible by accident); a correct
  // body write was invisible and a dropped one unscoreable.
  out.set('body', serializeElement(document.body));
  document.body.querySelectorAll('*').forEach((el, i) => {
    const key = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}[${i}]`;
    out.set(key, serializeElement(el));
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
      const trigger = PATTERN_TRIGGER[codeExampleId];
      const triggerEvent =
        trigger?.detail !== undefined
          ? new dom.window.CustomEvent(trigger.event, { bubbles: true, detail: trigger.detail })
          : new dom.window.Event(trigger?.event ?? 'click', { bubbles: true });
      btn.dispatchEvent(triggerEvent);
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
