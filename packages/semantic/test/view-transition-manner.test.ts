/**
 * `swap … using view transition` / `process partials in … using view transition`
 * — the `manner` role.
 *
 * `swapSchema` and `processSchema` modelled the tail not at all, so the semantic
 * parser matched both commands at confidence 1.0 and left `using view
 * transition` UNCONSUMED. English execution was never affected (`process` sits
 * on the core parser's `skipSemanticParsing` list and `swap` on
 * `SemanticIntegrationAdapter.SKIP_SEMANTIC_COMMANDS`, so the traditional parser
 * owns the tail there), but every consumer of the semantic parse alone —
 * multilingual bundles, the bridge, `translate()` — silently turned an animated
 * swap into a plain one, in all 24 languages. No corpus row exercises either
 * command, so no multilingual gate could see it; these tests are the gate.
 *
 * Three things shape the role, and all three are pinned below. Each was
 * MEASURED after a naive first version failed:
 *
 * 1. `valueShape: 'keyword'` — the third shape-anchor kind (toggle's duration
 *    introduced 'time', take's recipient 'reference'). It does double duty:
 *    it keeps the uncaptured slot out of `scoreRoleCoverage`'s denominator (the
 *    toggle-es regression class), AND it exempts the slot from the matcher's
 *    trailing-slot verb guard. Without the second half nothing captures at all:
 *    the captured word IS `transition`, which is itself a command keyword, so
 *    the guard — written for marker-less slots that could swallow the next
 *    command's verb — skipped the slot. The guard's premise is false here
 *    because the slot sits behind the required `using view` literals.
 * 2. `expectedTypes: ['literal', 'expression']` — the same word tokenizes
 *    differently per language: `transition` is a command keyword in en/fr (it is
 *    also their verb) and a bare identifier in the other 22, which types it
 *    `literal` and `expression` respectively. With `['literal']` alone only en
 *    and fr captured the tail.
 * 3. No `default` — the runtime treats PRESENCE as the request
 *    (`raw.modifiers?.viewTransition !== undefined`), so a default would run
 *    every swap and every process inside a view transition.
 *
 * The English `swap` patterns are hand-written and outrank the generated ones
 * (110–140 vs 100), so they carry the tail group explicitly
 * (`patterns/languages/en/swap.ts`); the other 23 languages get it from the
 * schema role.
 */

import { describe, it, expect } from 'vitest';
import { parse, parseSemantic, render } from '../src/index';
import { buildAST } from '../src/ast-builder/index';
import { getSchema } from '../src/generators/command-schemas';
import type { CommandSemanticNode } from '../src/types';

function walkCommands(node: unknown): Array<{ action: string; roles: Map<string, unknown> }> {
  const out: Array<{ action: string; roles: Map<string, unknown> }> = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    const rec = n as Record<string, any>;
    if (rec.kind === 'command') out.push(rec as never);
    for (const k of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      if (Array.isArray(rec[k])) rec[k].forEach(walk);
    }
  };
  walk(node);
  return out;
}

const roleValue = (n: CommandSemanticNode, role: string): string | undefined => {
  const v = n.roles.get(role as never) as { value?: unknown; raw?: string } | undefined;
  return v === undefined ? undefined : String(v.value ?? v.raw);
};

function unconsumedSpans(code: string, language: string): string[] {
  const node = parse(code, language);
  return (node?.diagnostics ?? []).filter(d => d.code === 'unconsumed-input').map(d => d.message);
}

function commandNode(source: string, lang: string, action: string): CommandSemanticNode {
  const node = parse(source, lang);
  expect(node, `'${source}' (${lang}) did not parse`).not.toBeNull();
  const hits = walkCommands(node).filter(c => c.action === action);
  expect(hits.length, `'${source}' (${lang}) has no ${action} command`).toBeGreaterThan(0);
  return hits[0] as unknown as CommandSemanticNode;
}

describe('both schemas declare the shape-anchored manner role', () => {
  it.each(['swap', 'process'])('%s binds the tail to modifiers.viewTransition', action => {
    const schema = getSchema(action as never);
    const manner = schema?.roles.find(r => r.role === 'manner');

    expect(manner, `${action}Schema must declare manner`).toBeDefined();
    expect(manner?.required, 'the tail-less form must keep parsing').toBe(false);
    expect(manner?.valueShape, 'shape anchor is what makes the slot both free and reachable').toBe(
      'keyword'
    );
    expect(
      manner?.expectedTypes,
      '`transition` is a keyword in en/fr and an identifier in the other 22 languages'
    ).toEqual(['literal', 'expression']);
    // The AST contract key both runtimes read.
    expect(schema?.ast?.modifiers?.['viewTransition']).toBe('manner');
  });

  it('keeps the flag default-free — presence IS the request', () => {
    // A default would emit `viewTransition` on every parse, so every swap and
    // every process would animate. Same "absent means absent" rule #859 applied
    // to take's source and #864 to its recipient.
    for (const action of ['swap', 'process'] as const) {
      expect(getSchema(action)?.roles.find(r => r.role === 'manner')?.default).toBeUndefined();
    }
  });

  it('uses the English phrase as the marker in all 24 languages', () => {
    // `using view` is hyperscript-specific and has no native translation —
    // the `partials in` / `url` precedent. A language earning a real
    // translation here is a deliberate change, not a detail.
    const markers = getSchema('swap')?.roles.find(r => r.role === 'manner')?.markerOverride ?? {};
    expect(Object.keys(markers)).toHaveLength(24);
    expect(new Set(Object.values(markers))).toEqual(new Set(['using view']));
  });
});

describe('the English reference no longer drops the tail', () => {
  const EN_TAIL_FORMS: Array<[string, string]> = [
    ['process', 'process partials in it using view transition'],
    ['swap', 'swap #a with #b using view transition'],
    ['swap', 'swap innerHTML of #t with "<p>x</p>" using view transition'],
    ['swap', 'swap into #t with it using view transition'],
  ];

  it.each(EN_TAIL_FORMS)('%s captures manner on `%s`', (action, source) => {
    expect(roleValue(commandNode(source, 'en', action), 'manner')).toBe('transition');
  });

  it.each(EN_TAIL_FORMS)('%s leaves nothing unconsumed on `%s`', (_action, source) => {
    // The ONLY signal that ever saw this bug: the parse succeeded at
    // confidence 1.0 with `transition` stranded.
    expect(unconsumedSpans(source, 'en')).toEqual([]);
  });

  it.each(EN_TAIL_FORMS)('%s stays a single command on `%s`', (action, source) => {
    // A stranded `transition` is a COMMAND keyword, so an unconsumed tail is one
    // fold away from becoming a phantom second command.
    expect(walkCommands(parse(source, 'en')).map(c => c.action)).toEqual([action]);
  });

  it('reaches both runtimes as modifiers.viewTransition, with args unchanged', () => {
    // ProcessPartialsCommand.parseInput and SwapCommand.parseInput both test
    // `raw.modifiers?.viewTransition !== undefined`. Args must be identical to
    // the tail-less form: swap selects its target from args[len-2], so an extra
    // positional arg would silently re-point the swap.
    for (const [plainSrc, tailSrc] of [
      ['process partials in it', 'process partials in it using view transition'],
      ['swap #a with #b', 'swap #a with #b using view transition'],
    ] as const) {
      const plain = buildAST(parse(plainSrc, 'en') as CommandSemanticNode).ast as any;
      const tail = buildAST(parse(tailSrc, 'en') as CommandSemanticNode).ast as any;

      expect(plain.modifiers?.viewTransition, plainSrc).toBeUndefined();
      expect(tail.modifiers?.viewTransition, tailSrc).toBeDefined();
      expect(tail.args, `${tailSrc}: the tail must not become a positional arg`).toEqual(
        plain.args
      );
    }
  });
});

describe('the keyword anchor: what the tail-less forms cost', () => {
  it('costs the tail-less forms no confidence — the valueShape lever', () => {
    // MEASURED under mutation, not assumed: deleting `valueShape` from the role
    // drops `process partials in it` from 1.0 to 0.5556 (1 / 1.8 — the optional
    // slot weighs OPTIONAL_ROLE_WEIGHT into the denominator), below the 0.7
    // threshold at which callers adopt the semantic parse. The same mutation
    // also stops every tail form capturing at all, because the matcher's
    // trailing-slot verb guard reads the same field.
    //
    // `parseSemantic` (not `parse`) is what reports the score; asserting via
    // `parse(...).confidence` reads `undefined` and passes vacuously.
    for (const src of [
      'process partials in it',
      'swap #a with #b',
      'swap innerHTML of #t with "<p>x</p>"',
      'swap delete #t',
    ]) {
      const result = parseSemantic(src, 'en');
      expect(result.node, src).not.toBeNull();
      expect(result.confidence, src).toBe(1);
      expect(walkCommands(result.node)[0]?.roles.has('manner'), src).toBe(false);
    }
  });

  it('never captures a following command into the slot', () => {
    // The trailing-slot verb guard is exempted for this role, so this is the
    // case that proves the exemption is narrow: the guard only stops mattering
    // once `using view` has matched. Without the marker there is no slot.
    const node = commandNode('swap #a with #b', 'en', 'swap');
    expect(node.roles.has('manner' as never)).toBe(false);
  });
});

/**
 * Round-trip pins, one row per language: `render()` the English tail node into
 * each language, then parse it back.
 *
 * The split is MEASURED. A whole-corpus probe (3960 stored rows, pre vs post)
 * showed ZERO diffs anywhere in the corpus — no row exercises either command —
 * so these round-trips are the only multilingual coverage the role has. A
 * language moving from DEFERRED to CAPTURED is progress: move it up in the same
 * change. Moving one the other way is a regression.
 */
const SWAP_DEFERRED = new Set([
  // tl already loses the PATIENT on the plain form `palitan_pwesto sa #a nang #b`
  // (pre-existing, unrelated to the tail), so the tail has nothing to attach to.
  'tl',
]);

const PROCESS_DEFERRED = new Set([
  // ms mis-binds the patient to a property-path on the tail form; the plain form
  // is fine, so this is the tail's own defect, not a pre-existing one.
  'ms',
  // qu cannot parse `process` AT ALL, tail or no tail (`chay partials in rurariy`
  // fails on main too) — a pre-existing process gap, not this role's.
  'qu',
]);

const LANGS = [
  'en',
  'es',
  'pt',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'zh',
  'ar',
  'he',
  'hi',
  'bn',
  'tr',
  'ru',
  'uk',
  'pl',
  'id',
  'vi',
  'th',
  'ms',
  'tl',
  'sw',
  'qu',
] as const;

describe('the swap tail round-trips in 23 of 24 languages', () => {
  const enNode = parse('swap #a with #b using view transition', 'en') as CommandSemanticNode;

  it.each(LANGS.filter(l => !SWAP_DEFERRED.has(l)))('%s', lang => {
    const surface = render(enNode, lang as never) as string;
    const node = commandNode(surface, lang, 'swap');

    expect(roleValue(node, 'destination'), `${lang}: "${surface}" destination`).toBe('#a');
    expect(roleValue(node, 'patient'), `${lang}: "${surface}" patient`).toBe('#b');
    expect(roleValue(node, 'manner'), `${lang}: "${surface}" manner`).toBe('transition');
  });
});

describe('the process tail round-trips in 22 of 24 languages', () => {
  const enNode = parse('process partials in it using view transition', 'en') as CommandSemanticNode;

  it.each(LANGS.filter(l => !PROCESS_DEFERRED.has(l)))('%s', lang => {
    const surface = render(enNode, lang as never) as string;
    const node = commandNode(surface, lang, 'process');

    expect(roleValue(node, 'patient'), `${lang}: "${surface}" patient`).toBe('it');
    expect(roleValue(node, 'manner'), `${lang}: "${surface}" manner`).toBe('transition');
  });
});

describe('the deferred rows, pinned as measured', () => {
  it('tl loses the swap patient with or without the tail — pre-existing', () => {
    // Pinning the CURRENT state, not a desired one. If tl starts binding the
    // patient, both rows below flip and tl moves to CAPTURED above.
    const plain = commandNode('palitan_pwesto sa #a nang #b', 'tl', 'swap');
    expect(plain.roles.has('patient' as never)).toBe(false);
  });

  it('qu cannot parse the plain process form either — not this role', () => {
    expect(() => parse('chay partials in rurariy', 'qu')).toThrow();
  });
});
