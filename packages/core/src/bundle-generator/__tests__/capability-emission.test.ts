// @vitest-environment jsdom
/**
 * Does a generated bundle actually RUN what `template-capabilities.ts` advertises?
 *
 * ---------------------------------------------------------------------------
 * THE ORACLE IS EXECUTION, and that is a deliberate escalation.
 * ---------------------------------------------------------------------------
 *
 * Three questions have been asked of these lists, each strictly stronger:
 *
 *   1. `capability-ghosts.test.ts` — does the entry name a REAL command?
 *   2. this file, as written by Arc A step 4.2 — can the bundle PARSER produce
 *      a node for it? (Answer then: no, for 14 of 38 — Finding 13.)
 *   3. this file now — does a generated bundle, imported and executed against a
 *      DOM, produce the command's observable effect?
 *
 * Question 2 was not sufficient, and the gap was not theoretical. `take` passed
 * it and threw `Invalid selector .` in every bundle that carried it; `morph`
 * passed it and threw ReferenceError because the generator never emitted the
 * morphlex import its template calls; `trigger foo on #t` reached a node while
 * abandoning `on #t`, so the dispatch landed on `me`. None of those is visible
 * to a parse-level check, because a parse tree is not an outcome.
 *
 * Every `check` below MUST assert a real effect — a DOM mutation, a dispatched
 * event, a history entry, a resolved value, a thrown signal. `() => true` is
 * banned: step 4.2 recorded that nine of the fourteen dead labels first scored
 * "RUNS" precisely because their check was vacuous, and an empty command list
 * throws nothing. Absence of an error is not evidence of a command.
 *
 * See `docs-internal/HANDOFF-command-arch-manifest.md`, Finding 13.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  AVAILABLE_COMMANDS,
  AVAILABLE_BLOCKS,
  FULL_RUNTIME_ONLY_COMMANDS,
  COMMAND_ALIASES,
  resolveCommandKey,
} from '../template-capabilities';
import { COMMAND_IMPLEMENTATIONS, BLOCK_IMPLEMENTATIONS } from '../templates';
import { HYBRID_PARSER_TEMPLATE } from '../parser-templates';
import { HybridParser } from '../../parser/hybrid/parser-core';
import { generateBundle } from '../generator';

// ===========================================================================
// 1. The lists mirror the implementation maps, both directions
// ===========================================================================

describe('the capability lists mirror the generator implementation maps', () => {
  it('AVAILABLE_COMMANDS is exactly the template keys plus the advertised aliases', () => {
    // The equality that makes AVAILABLE_COMMANDS a checked mirror rather than a
    // third hand-maintained copy of the same fact. Set equality both ways: an
    // advertised name with no template is a phantom capability, and a template
    // nobody advertises is dead weight the scanner never routes to.
    const expected = [...Object.keys(COMMAND_IMPLEMENTATIONS), ...Object.keys(COMMAND_ALIASES)];
    expect([...AVAILABLE_COMMANDS].sort()).toEqual(expected.sort());
  });

  it('AVAILABLE_BLOCKS is exactly the block template keys', () => {
    expect([...AVAILABLE_BLOCKS].sort()).toEqual(Object.keys(BLOCK_IMPLEMENTATIONS).sort());
  });

  it('nothing full-runtime-only has a template — that is what the label means', () => {
    const emittable = FULL_RUNTIME_ONLY_COMMANDS.filter(
      name => COMMAND_IMPLEMENTATIONS[resolveCommandKey(name)]
    );
    expect(emittable).toEqual([]);
  });

  it('every advertised alias resolves to a real template key', () => {
    for (const [advertised, key] of Object.entries(COMMAND_ALIASES)) {
      expect(COMMAND_IMPLEMENTATIONS[key], `${advertised} → ${key}`).toBeDefined();
    }
  });
});

// ===========================================================================
// 2. Execution: does a generated bundle produce the effect?
// ===========================================================================

interface Outcome {
  doc: Document;
  me: Element;
  result: unknown;
  error: Error | null;
}

interface Surface {
  /** Hyperscript a user would write to invoke this command. */
  code: string;
  /** Blocks the surface needs (`repeat` for break/continue). */
  blocks?: string[];
  /** Extra templates the surface needs to WITNESS the effect (never to cause it). */
  also?: string[];
  setup?: (doc: Document, me: Element) => void;
  /** The observable effect. Must be falsifiable — see the module header. */
  check: (o: Outcome) => boolean;
}

const clipboardWrites: string[] = [];
const consoleLines: unknown[][] = [];
const t = (d: Document) => d.querySelector('#t') as HTMLElement;
/** The node `morph` must REUSE rather than replace — see that surface's note. */
let morphNodeBefore: Element | null = null;

/**
 * One executable surface per advertised command. This is the review artifact:
 * each row records the syntax a user writes and the effect they are entitled to
 * expect, so the next reader re-verifies rather than trusting a boolean.
 *
 * The `push-url`/`replace-url` rows deliberately write `push url`/`replace url`.
 * Those two are bundle-CONFIG aliases, not source spellings — the full parser
 * rejects `push-url "/x"` outright — so the honest question for them is whether
 * requesting the alias yields a bundle that runs the real syntax.
 */
const SURFACES: Record<string, Surface> = {
  toggle: { code: 'toggle .x on #t', check: o => t(o.doc).classList.contains('x') },
  add: { code: 'add .x to #t', check: o => t(o.doc).classList.contains('x') },
  remove: { code: 'remove #t', check: o => !o.doc.querySelector('#t') },
  removeClass: { code: 'remove .seed from #t', check: o => !t(o.doc).classList.contains('seed') },
  show: {
    code: 'show #t',
    setup: d => (t(d).style.display = 'none'),
    check: o => t(o.doc).style.display === '',
  },
  hide: { code: 'hide #t', check: o => t(o.doc).style.display === 'none' },
  put: { code: 'put "PUT" into #t', check: o => t(o.doc).innerHTML === 'PUT' },
  append: { code: 'append "AP" to #t', check: o => t(o.doc).innerHTML === 'seedAP' },
  prepend: { code: 'prepend "PR" to #t', check: o => t(o.doc).innerHTML === 'PRseed' },
  take: { code: 'take .x from #t', check: o => o.me.classList.contains('x') },
  empty: { code: 'empty #t', check: o => t(o.doc).innerHTML === '' },
  set: { code: 'set #t\'s innerHTML to "S"', check: o => t(o.doc).innerHTML === 'S' },
  get: { code: 'get "G"', check: o => o.result === 'G' },
  increment: {
    code: 'increment #t',
    setup: d => (t(d).textContent = '4'),
    check: o => t(o.doc).textContent === '5',
  },
  decrement: {
    code: 'decrement #t',
    setup: d => (t(d).textContent = '4'),
    check: o => t(o.doc).textContent === '3',
  },
  wait: { code: 'wait 7ms', check: o => o.result === 7 },
  transition: {
    code: "transition #t's opacity to 0.5",
    check: o => t(o.doc).style.opacity === '0.5',
  },
  send: { code: 'send foo to #t', check: o => t(o.doc).hasAttribute('data-got-foo') },
  // The sharpest of the fourteen: this reported success and dispatched nothing.
  trigger: { code: 'trigger foo on #t', check: o => t(o.doc).hasAttribute('data-got-foo') },
  log: { code: 'log "LOGGED"', check: () => consoleLines.some(l => l.includes('LOGGED')) },
  call: { code: 'call window.__capCall()', check: () => Boolean(win().__capCall_ran) },
  copy: { code: 'copy "COPIED"', check: () => clipboardWrites.includes('COPIED') },
  beep: { code: 'beep "BEEPED"', check: () => consoleLines.some(l => l.includes('BEEPED')) },
  go: { code: 'go to url "#gone"', check: () => location.hash === '#gone' },
  push: { code: 'push url "/pushed"', check: () => location.pathname === '/pushed' },
  'push-url': {
    code: 'push url "/pushed-alias"',
    check: () => location.pathname === '/pushed-alias',
  },
  replace: { code: 'replace url "/replaced"', check: () => location.pathname === '/replaced' },
  'replace-url': {
    code: 'replace url "/replaced-alias"',
    check: () => location.pathname === '/replaced-alias',
  },
  focus: { code: 'focus #i', check: o => o.doc.activeElement?.id === 'i' },
  blur: {
    code: 'blur #i',
    setup: d => (d.querySelector('#i') as HTMLElement).focus(),
    check: o => o.doc.activeElement?.id !== 'i',
  },
  // executeAST catches the {type:'return'} signal and resolves to its value.
  return: { code: 'return 42', check: o => o.result === 42 },
  // Runs the body once and stops: 'B', not 'BBB'. `append` only witnesses it.
  break: {
    code: 'repeat 3 times append "B" to #t then break end',
    blocks: ['repeat'],
    also: ['append'],
    setup: d => (t(d).innerHTML = ''),
    check: o => t(o.doc).innerHTML === 'B',
  },
  // Skips the rest of the body on all three passes: nothing is appended.
  continue: {
    code: 'repeat 3 times continue then append "C" to #t end',
    blocks: ['repeat'],
    also: ['append'],
    setup: d => (t(d).innerHTML = ''),
    check: o => t(o.doc).innerHTML === '',
  },
  halt: { code: 'halt', check: o => /HALT_EXECUTION/.test(o.error?.message ?? '') },
  exit: { code: 'exit', check: o => /EXIT_COMMAND/.test(o.error?.message ?? '') },
  throw: { code: 'throw "BOOM"', check: o => o.error?.message === 'BOOM' },
  js: { code: 'js window.__capJs = 42 end', check: () => win().__capJs === 42 },
  /**
   * Morphing is asserted by STATE PRESERVATION, not by the resulting markup.
   *
   * The template wraps its morphlex calls in a try/catch that falls back to
   * `innerHTML = content`, so a check on markup alone passes whether the morph
   * ran or crashed into the fallback — and mutation-testing proved it: deleting
   * the generator's morphlex import (a ReferenceError on every use) left a
   * markup check perfectly green. That is the vacuous-check trap the module
   * header describes, hiding inside a row that looked specific.
   *
   * A real morph reuses the existing node, so a value the user typed survives;
   * the innerHTML fallback rebuilds the subtree and destroys both. Measured
   * directly against morphlex in jsdom before being relied on here.
   */
  morph: {
    code: 'morph #t to "<input id=\'keep\'>"',
    setup: d => {
      t(d).innerHTML = "<input id='keep'>";
      const input = d.getElementById('keep') as HTMLInputElement;
      input.value = 'typed';
      morphNodeBefore = input;
    },
    check: o => {
      const after = o.doc.getElementById('keep') as HTMLInputElement | null;
      return after !== null && after === morphNodeBefore && after.value === 'typed';
    },
  },
};

/**
 * A capability of a command that already has a SURFACES row — a second syntax
 * the same template must serve. Arc E step 2 absorbed four such capabilities
 * from the handwritten hybrid-complete executor into the templates, and each
 * one gets a row here so "the templates are the superset" is measured rather
 * than asserted in a commit message.
 *
 * Kept as a separate list, not merged into SURFACES, because SURFACES is
 * one-row-per-advertised-command and its completeness ratchet depends on that
 * being exactly true.
 */
interface Capability extends Surface {
  /** Unique file id for the generated bundle (SURFACES rows use the command). */
  id: string;
  /** The template the capability belongs to — what gets put in the bundle. */
  command: string;
}

/** Requests the generated bundle issued, so a `via`/`with` row can inspect them. */
const fetchCalls: Array<{ url: string; init: RequestInit | undefined }> = [];

const ATTR_NOTE = 'the attribute form; before step 2 the @ was sliced off and applied as a class';

const CAPABILITIES: Capability[] = [
  // Both directions, because a `toggle` that only ever REMOVES passes the
  // adding row and vice versa. Each also asserts no bogus class appeared —
  // that was the literal shape of the defect, not just a proxy for it.
  {
    id: 'toggle_attr_off',
    command: 'toggle',
    code: 'toggle @disabled on #t',
    setup: d => t(d).setAttribute('disabled', ''),
    check: o => !t(o.doc).hasAttribute('disabled') && !t(o.doc).classList.contains('disabled'),
  },
  {
    id: 'toggle_attr_on',
    command: 'toggle',
    code: 'toggle @disabled on #t',
    check: o => t(o.doc).hasAttribute('disabled') && !t(o.doc).classList.contains('disabled'),
  },
  {
    id: 'add_attr',
    command: 'add',
    code: 'add @hidden to #t',
    check: o => t(o.doc).hasAttribute('hidden') && !t(o.doc).classList.contains('hidden'),
  },
  {
    id: 'removeclass_attr',
    command: 'removeClass',
    code: 'remove @disabled from #t',
    setup: d => t(d).setAttribute('disabled', ''),
    check: o => !t(o.doc).hasAttribute('disabled'),
  },
  // The style-property branch. Asserted on the STYLE, and on textContent being
  // untouched: the pre-step-2 fallback treated the possessive as an element
  // reference, so a row that only checked "opacity is a number" would have been
  // satisfied by the silent no-op that left it at its initial value.
  {
    id: 'increment_style',
    command: 'increment',
    code: "increment #t's *opacity by 0.25",
    setup: d => (t(d).style.opacity = '0.5'),
    check: o => t(o.doc).style.opacity === '0.75' && t(o.doc).textContent === 'seed',
  },
  {
    id: 'decrement_style',
    command: 'decrement',
    code: "decrement #t's *opacity by 0.25",
    setup: d => (t(d).style.opacity = '0.5'),
    check: o => t(o.doc).style.opacity === '0.25' && t(o.doc).textContent === 'seed',
  },
  // `via`/`with`. The check inspects the REQUEST, not the response: the
  // pre-step-2 template dropped both and issued a plain GET, which still
  // resolved and still filled #t. A row asserting only the swapped-in body
  // would have passed against the defect — the fallback-measuring trap the
  // module header describes, here with the "fallback" being the wrong verb.
  {
    id: 'fetch_via_with',
    command: 'put',
    blocks: ['fetch'],
    code: 'fetch "/api" via POST with window.__capFetchOpts as text then put it into #t end',
    check: o =>
      fetchCalls.length === 1 &&
      fetchCalls[0].init?.method === 'POST' &&
      (fetchCalls[0].init as { headers?: Record<string, string> }).headers?.['X-Cap'] === '1' &&
      t(o.doc).innerHTML === 'FETCHED',
  },
];

const win = (): Record<string, unknown> => globalThis as unknown as Record<string, unknown>;

/**
 * Generated bundles are written here and imported. They must live inside the
 * project so vitest transforms them, and outside the `*.test.ts` glob so they
 * are not collected as suites. Removed before AND after: a crashed run must not
 * leave stray `.ts` files for the next `typecheck`.
 */
const GEN_DIR = join(__dirname, '.generated');

const runInBundle = async (
  name: string,
  surface: Surface,
  fileId: string = name
): Promise<Outcome> => {
  const gen = generateBundle({
    name: `Cap${fileId.replace(/-/g, '')}`,
    commands: [name, ...(surface.also ?? [])],
    blocks: surface.blocks ?? [],
    autoInit: false,
    parserImportPath: '../../../parser/hybrid',
  });
  expect(gen.errors, `generateBundle rejected the advertised command '${name}'`).toEqual([]);

  const file = join(GEN_DIR, `${fileId.replace(/-/g, '_')}.ts`);
  writeFileSync(file, gen.code);

  document.body.innerHTML =
    '<div id="host"></div><div id="t" class="seed">seed</div><input id="i">';
  const me = document.getElementById('host')!;
  t(document).addEventListener('foo', e =>
    (e.currentTarget as Element).setAttribute('data-got-foo', '1')
  );
  clipboardWrites.length = 0;
  consoleLines.length = 0;
  fetchCalls.length = 0;
  win().__capFetchOpts = { headers: { 'X-Cap': '1' } };
  win().fetch = async (url: string, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), init });
    return new Response('FETCHED', { status: 200 });
  };
  win().__capJs = undefined;
  win().__capCall_ran = false;
  win().__capCall = () => (win().__capCall_ran = true);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async (s: string) => void clipboardWrites.push(s) },
    configurable: true,
  });
  surface.setup?.(document, me);

  const realLog = console.log;
  console.log = (...a: unknown[]) => void consoleLines.push(a);
  try {
    const mod = await import(/* @vite-ignore */ file);
    let result: unknown;
    let error: Error | null = null;
    try {
      result = await mod.api.execute(surface.code, me);
    } catch (e) {
      error = e as Error;
    }
    return { doc: document, me, result, error };
  } finally {
    console.log = realLog;
  }
};

describe('every advertised command runs in a generated bundle', () => {
  beforeAll(() => {
    rmSync(GEN_DIR, { recursive: true, force: true });
    mkdirSync(GEN_DIR, { recursive: true });
  });
  afterAll(() => rmSync(GEN_DIR, { recursive: true, force: true }));

  it('has an executable surface for every advertised command', () => {
    // Guards the gate itself: a command added to AVAILABLE_COMMANDS without a
    // surface would otherwise be silently unmeasured rather than failing.
    expect(AVAILABLE_COMMANDS.filter(name => !SURFACES[name])).toEqual([]);
  });

  it('all 38 produce their observable effect — zero dead case labels', async () => {
    const dead: string[] = [];
    for (const name of AVAILABLE_COMMANDS) {
      const surface = SURFACES[name];
      const outcome = await runInBundle(name, surface);
      if (!surface.check(outcome)) {
        dead.push(
          `${name}${outcome.error ? ` (threw: ${String(outcome.error.message).slice(0, 60)})` : ''}`
        );
      }
    }
    // Tolerance 0, both directions. This list was 14 long before Finding 13 was
    // closed (plus `take`, which the parse-level oracle could not see at all).
    expect(dead).toEqual([]);
    expect(AVAILABLE_COMMANDS.length).toBe(38);
  }, 60000);

  it('every capability absorbed from hybrid-complete runs (Arc E step 2)', async () => {
    // The templates are now claimed to be the SUPERSET of the two AST
    // executors. This is the claim, measured. Each row failed against the
    // pre-step-2 templates and passed against hybrid-complete — the divergence
    // was measured in both copies before any of it was written, because #792
    // established that the canonical copy is sometimes the broken one.
    const dead: string[] = [];
    for (const cap of CAPABILITIES) {
      const outcome = await runInBundle(cap.command, cap, cap.id);
      if (!cap.check(outcome)) {
        dead.push(
          `${cap.id}${outcome.error ? ` (threw: ${String(outcome.error.message).slice(0, 60)})` : ''}`
        );
      }
    }
    expect(dead).toEqual([]);
  }, 60000);

  it('`wait for <event>` BLOCKS until the event — the second label runs (Arc E step 4)', async () => {
    // The row every list-shaped check was structurally blind to. `waitFor` is a
    // name the parser EMITS but not a `cmdMap` key and not an advertised
    // command, so §1 (list mirrors), §3 (labels vs surfaces) and §4 (the two
    // cmdMaps) all agreed while the template had no such case. The generated
    // bundle warned once and RESOLVED IMMEDIATELY, so every command after
    // `wait for click` in a handler ran without waiting.
    //
    // Asserting the thing the command is FOR (Finding 16): not "it returned",
    // but "it had NOT returned before the event, and had after". A check that
    // only awaited the promise passes against the broken template — that is
    // precisely how this survived.
    const gen = generateBundle({
      name: 'CapWaitFor',
      commands: ['wait'],
      blocks: [],
      autoInit: false,
      parserImportPath: '../../../parser/hybrid',
    });
    const file = join(GEN_DIR, 'waitfor_label.ts');
    writeFileSync(file, gen.code);

    document.body.innerHTML = '<div id="host"></div>';
    const me = document.getElementById('host')!;
    const mod = await import(/* @vite-ignore */ file);

    let settled = false;
    const running = mod.api.execute('wait for foo', me).then(() => (settled = true));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(settled, 'settled before the event fired — `wait for` did not wait').toBe(false);

    me.dispatchEvent(new Event('foo'));
    await running;
    expect(settled).toBe(true);
  }, 20000);

  it('a trigger-only bundle now dispatches on the named target', async () => {
    // Kept as its own case because it is the one that made Finding 13 a
    // correctness defect rather than a tidiness one: the generator reported no
    // error, emitted `case 'trigger':`, and the listener never fired. Two
    // separate bugs had to be fixed — the missing template alias AND the
    // hardcoded `to` marker that abandoned `on #t` and dispatched on `me`.
    const { doc, me } = await runInBundle('trigger', SURFACES.trigger);
    expect(t(doc).hasAttribute('data-got-foo')).toBe(true);
    expect(me.hasAttribute('data-got-foo')).toBe(false);
  }, 20000);
});

// ===========================================================================
// 3. Reachability, stated over the parse tree
// ===========================================================================

/** Every command-node name anywhere in a parse tree. */
const commandNamesIn = (node: unknown, acc: string[] = []): string[] => {
  if (!node || typeof node !== 'object') return acc;
  const n = node as { type?: string; name?: string };
  if (n.type === 'command' && typeof n.name === 'string') acc.push(n.name);
  for (const value of Object.values(node as Record<string, unknown>)) {
    if (Array.isArray(value)) value.forEach(item => commandNamesIn(item, acc));
    else if (value && typeof value === 'object') commandNamesIn(value, acc);
  }
  return acc;
};

/** `case 'x':` labels a template emits into the generated switch. */
const caseLabelsIn = (template: string): string[] =>
  [...template.matchAll(/case '([^']+)':/g)].map(m => m[1]);

/**
 * Source a template's NON-PRIMARY case labels are reachable from.
 *
 * A template usually carries one label, named for the command a user types, so
 * `SURFACES[name].code` proves the whole template reachable. `wait` is the
 * exception: `parseWait` emits `waitFor` for `wait for <event>` and `wait` for a
 * duration, and one `code` string cannot yield both. Listing the second source
 * here keeps §3 at tolerance 0 rather than allowlisting the label — the label
 * must still be PARSER-REACHABLE, just from a surface of its own.
 */
const SECONDARY_LABEL_SURFACES: Record<string, string[]> = {
  wait: ['wait for foo'],
};

describe('no template emits a case label the parser cannot produce', () => {
  it('every emitted label is a node name some surface actually yields', () => {
    // The converse of §2, and the direction that catches a label added without a
    // parse rule. `push-url`/`replace-url` used to live here as private labels
    // inside the push/replace templates — unreachable by construction, since no
    // parser emits a node by either name.
    const emittable = new Set([
      ...AVAILABLE_COMMANDS.flatMap(name =>
        commandNamesIn(new HybridParser(SURFACES[name].code).parse())
      ),
      ...Object.values(SECONDARY_LABEL_SURFACES)
        .flat()
        .flatMap(code => commandNamesIn(new HybridParser(code).parse())),
    ]);
    const dead = Object.entries(COMMAND_IMPLEMENTATIONS).flatMap(([key, template]) =>
      caseLabelsIn(template)
        .filter(label => !emittable.has(label))
        .map(label => `${key} → case '${label}'`)
    );
    expect(dead).toEqual([]);
  });

  it('an unrecognized command is still skipped silently — the mechanism to guard against', () => {
    // Unchanged and deliberately kept: the parser's unknown-command fallback
    // advances one token and returns null, with no throw and no warning. That is
    // why a dead case label is invisible without this file, and it is still true
    // for anything genuinely not a command.
    expect(commandNamesIn(new HybridParser('zzznotacommand "hi"').parse())).toEqual([]);
  });
});

// ===========================================================================
// 4. The two bundle parsers agree on their command set
// ===========================================================================

const SRC = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf-8');

/** cmdMap keys of `parser/hybrid/parser-core.ts`, read from source text. */
const coreCommandKeys = (): string[] => {
  const block = SRC('../../parser/hybrid/parser-core.ts').match(
    /private readonly cmdMap[^{]*\{([\s\S]*?)\n {2}\};/
  );
  if (!block) return [];
  return [...block[1].matchAll(/^ {4}([A-Za-z_][\w]*):/gm)].map(m => m[1]);
};

/** cmdMap keys of the embedded template, read from its source text. */
const templateCommandKeys = (): string[] => {
  const block = HYBRID_PARSER_TEMPLATE.match(/const cmdMap = \{([\s\S]*?)\n {4}\};/);
  if (!block) return [];
  return [...block[1].matchAll(/^ {6}([A-Za-z_][\w]*):/gm)].map(m => m[1]);
};

describe('parser-core and the embedded parser template dispatch the same commands', () => {
  it('the two cmdMaps are identical', () => {
    // `generateBundle()` in core imports `parser/hybrid/parser-core`, but the
    // vite-plugin's generator embeds HYBRID_PARSER_TEMPLATE instead. While the
    // two differed, the set of commands that actually ran depended on which
    // generator the user went through: the template had `empty` and no `halt`,
    // parser-core the reverse. `parser-template-drift.test.ts` compares them on
    // catch/finally only and is structurally unable to see this.
    const core = coreCommandKeys();
    const template = templateCommandKeys();
    expect(core.length, 'cmdMap regex found nothing — parser-core shape changed').toBeGreaterThan(
      30
    );
    expect(template.length, 'cmdMap regex found nothing — the template shape changed').toBe(
      core.length
    );
    expect([...template].sort()).toEqual([...core].sort());
  });

  it('every advertised command resolves to a dispatched keyword', () => {
    // Ties §1's lists to the parsers: an advertised name must be something a
    // cmdMap can dispatch, under its own spelling (`toggle`) or its alias
    // target (`push-url` → `push`, `trigger` → `send`).
    //
    // One documented exception, not a blob: `removeClass` is a NODE NAME the
    // parser emits, never a keyword a user types — `remove .x from #t` takes
    // parseRemove's class branch and yields it. It is advertised because a
    // bundle must be able to request the class-removal template separately from
    // the element-removal one. §3 is what proves it reachable.
    const DISPATCHED_UNDER_ANOTHER_KEYWORD = new Set(['removeClass']);
    const dispatched = new Set(coreCommandKeys());
    const orphans = AVAILABLE_COMMANDS.filter(
      name =>
        !dispatched.has(name) &&
        !dispatched.has(resolveCommandKey(name)) &&
        !DISPATCHED_UNDER_ANOTHER_KEYWORD.has(name)
    );
    expect(orphans).toEqual([]);
  });
});

// ===========================================================================
// 5. `isCommandKeyword` is a documented subset, not a second copy
// ===========================================================================

describe('isCommandKeyword', () => {
  it('names only commands the parser dispatches', () => {
    // It is deliberately NARROWER than cmdMap (see its doc comment): several
    // command keywords are ordinary English or JS words that also appear as
    // property names and operands, and promoting them would change expression
    // parsing. What must never happen is the reverse — a name here that the
    // parser does not dispatch would terminate an `and` chain for a command
    // that then fails to parse.
    const block = SRC('../../parser/hybrid/parser-core.ts').match(
      /isCommandKeyword\(token: Token\): boolean \{\s*const cmds = \[([\s\S]*?)\];/
    );
    expect(block, 'isCommandKeyword shape changed').not.toBeNull();
    const subset = [...block![1].matchAll(/'([^']+)'/g)].map(m => m[1]);
    expect(subset.length).toBeGreaterThan(0);
    expect(subset.filter(name => !coreCommandKeys().includes(name))).toEqual([]);
  });
});
