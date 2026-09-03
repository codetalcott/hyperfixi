/**
 * `take <class> from <source> for <recipient>` — the recipient role.
 *
 * `takeSchema` modelled patient + source only, so the semantic parser matched
 * `take .active from .tab-button for me` at confidence 1.0 and left `for me`
 * UNCONSUMED. The corpus row `take-class-from-siblings` is exactly that
 * surface, which made this the documented en-reference blind spot live on a
 * real row: the English reference parse itself dropped the recipient, so every
 * language matched the dropped reference and R0/R1/R3 all scored a perfect
 * 1.0. Only the `unconsumed-input` diagnostic could see it. English execution
 * was never affected — `take` is on the core parser's skipSemanticParsing list
 * — but every consumer of the semantic parse alone (multilingual bundles, the
 * bridge, translate()) silently lost the recipient in all 24 languages.
 *
 * Two constraints shape the role, and both are pinned below:
 *
 * 1. `valueShape: 'reference'` — the second shape-anchor kind (toggle's
 *    duration introduced 'time'). 23 of the 24 stored corpus surfaces carry
 *    the recipient as a BARE trailing pronoun, so the slot is marker-less
 *    almost everywhere; without the anchor an uncaptured slot weighs into
 *    `scoreRoleCoverage`'s denominator and drops plain
 *    `take .active from .tab-button` from 1.0 to ~0.69 — the toggle-es
 *    regression class.
 * 2. `expectedTypes: ['reference']` — references only. A selector-typed slot
 *    would swallow the second selector of `take .active from .a .b`.
 *
 * `source` still has NO default: bare `take .active` means "take from every
 * element currently holding it", not "take from me" (#859). Recipient has no
 * default either — the runtime already defaults it to `me`, and a schema
 * default would emit an explicit `for me` on every take.
 */

import { describe, it, expect } from 'vitest';
import { parse, parseSemantic } from '../src/index';
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

function takeNode(source: string, lang: string): CommandSemanticNode {
  const node = parse(source, lang);
  expect(node, `'${source}' (${lang}) did not parse`).not.toBeNull();
  const takes = walkCommands(node).filter(c => c.action === 'take');
  expect(takes.length, `'${source}' (${lang}) has no take command`).toBeGreaterThan(0);
  return takes[0] as unknown as CommandSemanticNode;
}

const roleValue = (n: CommandSemanticNode, role: string): string | undefined => {
  const v = n.roles.get(role as never) as { value?: unknown; raw?: string } | undefined;
  return v === undefined ? undefined : String(v.value ?? v.raw);
};

function unconsumedSpans(code: string, language: string): string[] {
  const node = parse(code, language);
  return (node?.diagnostics ?? []).filter(d => d.code === 'unconsumed-input').map(d => d.message);
}

describe('take declares a shape-anchored recipient role', () => {
  const schema = getSchema('take');

  it('is a real schema role wired to the `for` modifier the runtime reads', () => {
    const recipient = schema?.roles.find(r => r.role === 'recipient');
    expect(recipient, 'takeSchema must declare recipient').toBeDefined();
    expect(recipient?.required, 'plain `take .active` must keep parsing').toBe(false);
    expect(recipient?.valueShape, 'the marker-less slot is only safe shape-anchored').toBe(
      'reference'
    );
    expect(
      recipient?.expectedTypes,
      'references only — a selector slot swallows `take .active from .a .b`'
    ).toEqual(['reference']);
    // The AST contract key core's TakeCommand.parseInput reads (modifiers.for).
    expect(schema?.ast?.modifiers?.['for']).toBe('recipient');
  });

  it('keeps both transfer ends default-free', () => {
    // #859: a `me` default on source parsed bare `take .active` as "take from
    // me", which the runtime executed as a near-no-op. Recipient stays
    // default-free for the mirror reason — the runtime supplies `me` itself.
    const roles = schema?.roles ?? [];
    expect(roles.find(r => r.role === 'source')?.default).toBeUndefined();
    expect(roles.find(r => r.role === 'recipient')?.default).toBeUndefined();
  });
});

describe('the English reference no longer drops `for me`', () => {
  it('captures the recipient on the corpus surface', () => {
    const node = takeNode('take .active from .tab-button for me', 'en');
    expect(roleValue(node, 'patient')).toBe('.active');
    expect(roleValue(node, 'source')).toBe('.tab-button');
    expect(roleValue(node, 'recipient')).toBe('me');
  });

  it('leaves nothing unconsumed — the only signal that ever saw this bug', () => {
    expect(unconsumedSpans('take .active from .tab-button for me', 'en')).toEqual([]);
  });

  it('captures it inside the event handler the corpus row actually stores', () => {
    const node = parse('on click take .active from .tab-button for me', 'en');
    const commands = walkCommands(node);
    expect(
      commands.map(c => c.action),
      'an unconsumed `for` tail used to become a phantom for-LOOP command'
    ).toEqual(['take']);
    expect(roleValue(commands[0] as never, 'recipient')).toBe('me');
    expect(unconsumedSpans('on click take .active from .tab-button for me', 'en')).toEqual([]);
  });

  it('reaches the runtime as `modifiers.for`, beside the existing `modifiers.from`', () => {
    // TakeCommand.parseInput reads modifiers.from (source) and modifiers.for
    // (recipient); both have been read since #859, but the semantic path could
    // never produce the second one.
    const node = parse('take .active from .tab-button for me', 'en') as CommandSemanticNode;
    const ast = buildAST(node).ast as unknown as Record<string, any>;
    expect(ast.modifiers?.from).toMatchObject({ value: '.tab-button' });
    // A reference lands as the identifier node the evaluator resolves —
    // `evaluator.evaluate(raw.modifiers.for)` is what TakeCommand calls.
    expect(ast.modifiers?.for).toMatchObject({ type: 'identifier', name: 'me' });
  });
});

describe('the reference anchor: what the slot refuses', () => {
  it('never swallows a trailing selector into the recipient', () => {
    // The reason expectedTypes is ['reference'] and not ['selector','reference'].
    const node = takeNode('take .active from .tab-button .other', 'en');
    expect(node.roles.has('recipient' as never)).toBe(false);
    expect(roleValue(node, 'source')).toBe('.tab-button');
  });

  it('keeps a marked reference on the source side', () => {
    const node = takeNode('take .active from me', 'en');
    expect(roleValue(node, 'source')).toBe('me');
    expect(node.roles.has('recipient' as never)).toBe(false);
  });

  it('parses the recipient without a source (the all-current-holders form)', () => {
    const node = takeNode('take .active for me', 'en');
    expect(roleValue(node, 'recipient')).toBe('me');
    expect(node.roles.has('source' as never), 'absent source is the runtime signal').toBe(false);
  });

  it('costs the recipient-less forms no confidence — the valueShape lever', () => {
    // MEASURED under mutation, not assumed: deleting `valueShape` from the
    // role drops both of these from 1.0 to 0.6923 — below the 0.7 threshold at
    // which callers adopt the semantic parse, and the same 1.0 → 0.69 number
    // toggle's duration produced. `parseSemantic` (not `parse`) is what
    // reports the score; asserting via `parse(...).confidence` reads
    // `undefined` and passes vacuously.
    for (const src of ['take .active from .tab-button', 'take .active from #parent']) {
      const result = parseSemantic(src, 'en');
      expect(result.node, src).not.toBeNull();
      expect(result.confidence, src).toBe(1);
      expect(walkCommands(result.node)[0]?.roles.has('recipient'), src).toBe(false);
    }
  });
});

/**
 * The `take-class-from-siblings` translations, verbatim from a freshly
 * `populate`d patterns.db — the exact strings the multilingual gate scores.
 * Every one renders the recipient as a BARE trailing pronoun; only English
 * marks it (`for`).
 *
 * 23 of 24 capture, as of #874 (qu is the exception — see 3 below). The 10 that did not were the named R1 burn-down
 * tail, and the standing filing prescribed the expensive fix — retag the
 * pronoun-valued duration phrase as `recipient` in the i18n transformer, then
 * author a per-language marker particle and a `canonicalOrder` slot in each
 * profile. **None of that was needed.** The rendering was already correct in
 * all 23 languages; triage found three unrelated parse-side causes:
 *
 * 1. **it/ru/uk/vi** — `patterns/get.ts` listed the language's TAKE verb among
 *    `get`'s alternatives (it `prendere`, ru `взять`, uk `взяти`, vi `lấy`), so
 *    the standalone re-parse the fused event-handler swap performs came back as
 *    a `get`, and an action flip vetoes the swap. STANDALONE, those four
 *    returned the wrong command outright — a strictly larger bug than the role.
 * 2. **bn/hi/ja/ko/tr** — `generateSOVPatientFirstEventHandlerPattern` had no
 *    trailing recipient slot (`appendOptionalRecipient` now adds it, the
 *    `appendOptionalScope` shape).
 * 3. **qu** — NOT fixed, and deliberately so. Its canonical order fronts the
 *    source phrase (`.active ta .tab-button manta ñitiy pi hapiy noqa`), a
 *    shape no pattern covers, so qu matches nothing and the verb-anchoring
 *    fallback binds the pronoun to `destination`. A source-fronted pattern
 *    variant DOES fix it (measured: qu take + `event-from-elsewhere` both go
 *    role-faithful, two more rows gain confidence), but it then wins on qu's
 *    compound rows, where the flattened body loses its `then` connectives and
 *    `tabs-basic`/`tabs-content` stop reproducing the en DOM effect — an R2
 *    failure at tolerance 0. The blocker underneath is a renderer defect that
 *    predates this work: qu's `add .active to me` renders as `add .active` in
 *    both states, so the emitted English is only unambiguous while a `then`
 *    separates it from the preceding command. Fix the dropped destination
 *    first; the pattern variant is a few lines after that.
 *
 * Moving a language out of CAPTURED is a regression.
 */
const CAPTURED: Array<[string, string]> = [
  ['en', 'on click take .active from .tab-button for me'],
  ['ar', 'خذ .active من .tab-button عند نقر أنا'],
  ['bn', '.active কে ক্লিক এ নিন .tab-button থেকে আমি'],
  ['de', 'bei klick nehmen .active von .tab-button ich'],
  ['es', 'en clic tomar .active de .tab-button yo'],
  ['fr', 'sur clic prendre .active de .tab-button moi'],
  ['he', 'ב לחיצה קח את .active מ .tab-button אני'],
  ['hi', '.active को क्लिक पर लें .tab-button से मैं'],
  ['id', 'pada klik ambil .active dari .tab-button saya'],
  ['it', 'su clic prendere .active da .tab-button io'],
  ['ja', '.active を クリック で 取る .tab-button から 私'],
  ['ko', '.active 를 클릭 할 때 가져오다 .tab-button 에서 나'],
  ['ms', 'apabila click ambil .active dari .tab-button saya'],
  ['pl', 'gdy kliknięcie weź .active z .tab-button ja'],
  ['pt', 'em clique pegar .active de .tab-button eu'],
  ['ru', 'при клик взять .active из .tab-button я'],
  ['sw', 'kwenye bonyeza chukua .active kutoka .tab-button mimi'],
  ['th', 'เมื่อ คลิก รับ .active จาก .tab-button ฉัน'],
  ['tl', 'kumuha .active mula_sa .tab-button kapag click ako'],
  ['tr', '.active i tıklama de tut .tab-button den ben'],
  ['uk', 'при клік взяти .active з .tab-button я'],
  ['vi', 'khi nhấp lấy .active từ .tab-button tôi'],
  ['zh', '当 点击 时 拿取 把 .active 从 .tab-button 我'],
];

describe('the corpus row, in the 23 languages that capture the recipient', () => {
  it.each(CAPTURED)('%s binds recipient=me on a single take', (lang, source) => {
    const commands = walkCommands(parse(source, lang));
    expect(
      commands.map(c => c.action),
      `${lang}: "${source}" — an unconsumed tail became a phantom command`
    ).toEqual(['take']);
    const node = commands[0] as unknown as CommandSemanticNode;
    expect(roleValue(node, 'patient'), `${lang}: patient`).toBe('.active');
    expect(roleValue(node, 'source'), `${lang}: source`).toBe('.tab-button');
    expect(roleValue(node, 'recipient'), `${lang}: recipient`).toBe('me');
  });
});

describe('the three causes behind the 10, pinned directly', () => {
  it.each([
    ['it', 'prendere .active da .tab-button io'],
    ['ru', 'взять .active из .tab-button я'],
    ['uk', 'взяти .active з .tab-button я'],
    ['vi', 'lấy .active từ .tab-button tôi'],
  ])('[%s] the STANDALONE take is a take, not a get', (lang, source) => {
    // The cause behind these four, and strictly bigger than the missing role:
    // `get`'s hand-written pattern listed take's verb as an alternative, so this
    // surface came back as `get` at confidence 1.00 — which also vetoed the
    // fused event-handler re-parse swap (same-action gated) and dropped the
    // recipient in the corpus row above.
    const commands = walkCommands(parse(source, lang));
    expect(commands.map(c => c.action), `${lang}: "${source}"`).toEqual(['take']);
  });

  it.each([
    ['it', 'ottenere #input.value'],
    ['ru', 'получить #input.value'],
    ['uk', 'отримати #input.value'],
    ['vi', 'lấy giá trị #input.value'],
    ['bn', '#input.value কে পান'],
  ])('[%s] the real get verb still parses as a get (both-ways negative)', (lang, source) => {
    // The alternatives were removed, not renamed: every language's own `get`
    // surface — what the i18n transformer actually renders — must keep working.
    expect(walkCommands(parse(source, lang)).map(c => c.action), `${lang}`).toEqual(['get']);
  });

  it('qu captures the recipient — the source-fronted variant covers its canonical order', () => {
    // qu's canonical order fronts the source phrase (`.active ta .tab-button
    // manta ñitiy pi hapiy noqa`), a shape no pattern covered, so this test used
    // to pin the DEFECT: verb-anchoring bound the trailing pronoun to
    // `destination`. The `-sov-source-fronted` event-handler variant (required
    // marked source slot between patient and event) now matches it, and the
    // renderer half of the blocker — authored `to me` dropped on render — is
    // fixed via implicit-default tagging.
    const node = walkCommands(
      parse('.active ta .tab-button manta ñitiy pi hapiy noqa', 'qu')
    )[0] as unknown as CommandSemanticNode;
    expect(roleValue(node, 'patient')).toBe('.active');
    expect(roleValue(node, 'source')).toBe('.tab-button');
    expect(roleValue(node, 'recipient')).toBe('me');
    expect(node.roles.has('destination' as never)).toBe(false);
  });

  it('a failed optional group cannot corrupt an already-captured role', () => {
    // Not a take defect — a matcher one, found while probing qu and live in 90
    // shipped patterns: every `<cmd>-event-<lang>-sov` binds `destination` in
    // BOTH a pre-verb and a post-verb optional group. The trailing group
    // speculatively captures the next token into that role, fails on its marker,
    // and the rollback restored the captured KEY set but not overwritten VALUES.
    // Mutation-verified: without the value restore this returns
    // `destination="ゴミ"` — the junk tail — with the real `#panel` discarded.
    const node = walkCommands(
      parse('クリック で #panel に .active を トグル ゴミ', 'ja')
    ).find(c => c.action === 'toggle') as unknown as CommandSemanticNode;
    expect(roleValue(node, 'destination')).toBe('#panel');
    expect(roleValue(node, 'patient')).toBe('.active');
  });
});
