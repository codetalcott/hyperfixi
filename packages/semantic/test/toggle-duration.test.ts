/**
 * `toggle … for <duration>` — the semantic half, and the `valueShape` lever
 * that made it shippable.
 *
 * The traditional parser learned this tail in #846; `toggleSchema.ast` has
 * declared `for: 'duration'` since Arc F, but the schema had no `duration`
 * ROLE, so the descriptor key was inert. Two prior attempts to add the role
 * were reverted, and each found a different hazard:
 *
 * 1. `required: false` (a marker-less optional slot) silently cost es/pl/vi
 *    the second toggle's positional destination on `toggle-aria-expanded` —
 *    `next .panel` became `me`. Root cause (measured, not the one first
 *    hypothesized): the uncaptured slot weighed into `scoreRoleCoverage`'s
 *    denominator, dropping `toggle-*-generated`'s confidence from 1.0 to 0.69
 *    so the same-priority hand pattern (0.82, wrong destination markers) won.
 * 2. `required: true` + `omitRoleVariants: ['duration']` was worse — es
 *    swallowed `siguiente .panel` INTO duration.
 *
 * The lever: `valueShape: 'time'` on the role, enforced in the CONFIDENCE
 * model — a shape-anchored role counts toward a pattern's score only when
 * captured, so the slot's absence carries no evidence against the pattern.
 * (A matcher-side token guard was built, probed, and removed as unfireable:
 * `expectedTypes` + the positional assembler's next-token gating already
 * refuse every constructible non-time capture. See RoleSpec.valueShape.)
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';
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

function toggleNode(source: string, lang: string): CommandSemanticNode {
  const node = parse(source, lang);
  expect(node, `'${source}' (${lang}) did not parse`).not.toBeNull();
  const toggles = walkCommands(node).filter(c => c.action === 'toggle');
  expect(toggles.length, `'${source}' (${lang}) has no toggle command`).toBeGreaterThan(0);
  return toggles[0] as unknown as CommandSemanticNode;
}

const durationOf = (n: CommandSemanticNode): string | undefined => {
  const v = n.roles.get('duration' as never) as { value?: unknown; raw?: string } | undefined;
  return v === undefined ? undefined : String(v.value ?? v.raw);
};

describe('toggle declares a shape-anchored duration role', () => {
  it('is a real schema role, so the descriptor key is no longer inert', () => {
    const duration = getSchema('toggle')?.roles.find(r => r.role === 'duration');
    expect(duration, 'toggleSchema must declare duration').toBeDefined();
    expect(duration?.required, 'plain `toggle .active` must keep parsing').toBe(false);
    expect(duration?.valueShape, 'the marker-less slot is only safe shape-anchored').toBe('time');
    expect(getSchema('toggle')?.ast?.modifiers?.['for']).toBe('duration');
  });

  it('binds `toggle .loading for 2s` in English', () => {
    expect(durationOf(toggleNode('toggle .loading for 2s', 'en'))).toBe('2s');
  });

  it('reaches the runtime as `modifiers.for`, which ToggleCommand reads', () => {
    // `parseTemporalModifiers` reads `modifiers.for`; helpers/temporal-modifiers.ts
    // implements the reversion. Before this the modifier could never be produced.
    const node = parse('toggle .loading for 2s', 'en') as CommandSemanticNode;
    const ast = buildAST(node).ast as unknown as Record<string, any>;
    expect(ast.modifiers?.for).toMatchObject({ value: '2s' });
  });

  it('leaves the duration-less forms untouched', () => {
    for (const src of ['toggle .active', 'toggle .active on #btn', 'toggle @disabled']) {
      expect(durationOf(toggleNode(src, 'en')), src).toBeUndefined();
    }
  });

  it('keeps the SOV form that a marker-less optional slot broke', () => {
    // The regression the ja/ko particles exist to prevent: with `en: 'for'`
    // alone this stopped parsing entirely (16 test failures, measured twice).
    const node = toggleNode('#button の .active を 切り替え', 'ja');
    expect(durationOf(node)).toBeUndefined();
  });
});

describe('the valueShape anchor: what the slot refuses', () => {
  /**
   * The es/pl/vi regression this exists to prevent — and which only the R1
   * role-set flip ratchet would catch. The second toggle's `a siguiente
   * .panel` must stay a positional-destination EXPRESSION; both failed shapes
   * either dropped it (destination defaulted to `me`) or swallowed it into
   * duration.
   */
  const ARIA: Array<[string, string]> = [
    ['en', 'on click toggle @aria-expanded on me toggle .open on next .panel'],
    ['es', 'en clic alternar @aria-expanded a yo entonces alternar .open a siguiente .panel'],
    ['pl', 'gdy kliknięcie przełącz @aria-expanded do ja wtedy przełącz .open do następny .panel'],
    ['vi', 'khi nhấp chuyển đổi @aria-expanded vào tôi rồi chuyển đổi .open vào tiếp theo .panel'],
  ];

  it.each(ARIA)('%s keeps the positional destination on toggle-aria-expanded', (lang, source) => {
    const toggles = walkCommands(parse(source, lang)).filter(c => c.action === 'toggle');
    expect(toggles.length, `${lang}: expected two toggles`).toBe(2);

    const signature = toggles
      .flatMap(t => [...t.roles].map(([role, v]) => `${role}:${(v as { type: string }).type}`))
      .sort();
    // One reference destination (me) and one positional EXPRESSION (`next
    // .panel`) — never two references, never a duration.
    expect(signature, `${lang}: "${source}"`).toEqual([
      'destination:expression',
      'destination:reference',
      'patient:selector',
      'patient:selector',
    ]);
  });

  it('never binds a non-time token into the duration slot', () => {
    // The omitRoleVariants failure mode: `siguiente .panel` INTO duration.
    for (const [lang, source] of ARIA) {
      for (const t of walkCommands(parse(source, lang)).filter(c => c.action === 'toggle')) {
        expect(t.roles.has('duration'), `${lang}: "${source}"`).toBe(false);
      }
    }
  });

  it('still accepts decimals and ms', () => {
    expect(durationOf(toggleNode('toggle .a for 1.5s', 'en'))).toBe('1.5s');
    expect(durationOf(toggleNode('toggle .a for 500ms', 'en'))).toBe('500ms');
  });

  it('refuses a stray non-time trailing token instead of capturing it', () => {
    // Behavior lock, not a mechanism test: today `expectedTypes: ['literal']`
    // is what refuses these (`basura` classifies as an expression). If a
    // matcher change ever lets a stray word into the slot, the runtime would
    // feed it to parseDurationStrict — this pins the OUTCOME regardless of
    // which layer refuses.
    for (const [lang, source] of [
      ['es', 'alternar .item basura'],
      ['pl', 'przełącz .item cosik'],
    ] as const) {
      const node = toggleNode(source, lang);
      expect(node.roles.has('duration' as never), `${lang}: "${source}"`).toBe(false);
    }
  });
});

describe('the corpus row binds the duration in every language', () => {
  /**
   * The `toggle-class-temporary` translations, verbatim from a freshly
   * `populate`d patterns.db — the exact strings the multilingual gate scores.
   * Every one carries the duration as an UNMARKED trailing token (bn adds its
   * `জন্য` postposition), and every one must bind it to `duration` on a single
   * `toggle` command — no phantom sibling from an unconsumed tail (the bn
   * artifact that rendered `on click toggle .loading for 2s in` and failed R4).
   */
  const STORED: Array<[string, string]> = [
    ['en', 'on click toggle .loading for 2s'],
    ['es', 'en clic alternar .loading 2s'],
    ['de', 'bei klick umschalten .loading 2s'],
    ['fr', 'sur clic basculer .loading 2s'],
    ['it', 'su clic commutare .loading 2s'],
    ['pt', 'em clique alternar .loading 2s'],
    ['ru', 'при клик переключить .loading 2s'],
    ['uk', 'при клік перемкнути .loading 2s'],
    ['pl', 'gdy kliknięcie przełącz .loading 2s'],
    ['id', 'pada klik alihkan .loading 2s'],
    ['ms', 'apabila click togol .loading 2s'],
    ['sw', 'kwenye bonyeza badilisha .loading 2s'],
    ['th', 'เมื่อ คลิก สลับ .loading 2s'],
    ['vi', 'khi nhấp chuyển đổi .loading 2s'],
    ['zh', '当 点击 时 切换 把 .loading 2s'],
    ['he', 'ב לחיצה מתג את .loading 2s'],
    ['ar', 'بدل .loading عند نقر 2s'],
    ['ja', '.loading を クリック で 切り替え 2s'],
    ['ko', '.loading 를 클릭 할 때 토글 2s'],
    ['hi', '.loading को क्लिक पर टॉगल 2s'],
    ['bn', '.loading কে ক্লিক এ টগল 2s জন্য'],
    ['tr', '.loading i tıklama de değiştir 2s'],
    ['qu', '.loading ta ñitiy pi tikray 2s'],
    ['tl', 'palitan .loading kapag click 2s'],
  ];

  it.each(STORED)('%s captures duration=2s on a single toggle', (lang, source) => {
    const node = parse(source, lang);
    expect(node, `${lang}: "${source}" did not parse`).not.toBeNull();

    const commands = walkCommands(node);
    expect(
      commands.map(c => c.action),
      `${lang}: "${source}" — unconsumed tail became a phantom command`
    ).toEqual(['toggle']);

    expect(durationOf(commands[0] as never), `${lang}: "${source}"`).toBe('2s');
  });
});
