/**
 * `pick characters 0 to 5 of #note` — the unit word's value TYPE.
 *
 * The expensive half of `pick-text-range` was paid across arcs 1–3: the en
 * schema remodel + range assembler, the 24-language pick vocabulary, and the
 * foreign/SOV variant patterns with the armed range fold. Both
 * canonical-validity allowlists went empty and all 24 corpus rows round-trip to
 * byte-identical English (`test/pick-command.test.ts`).
 *
 * What survived that was a single valueType divergence, and it made
 * `pick-text-range` R1 role-lossy in ALL 23 non-en languages — the largest
 * cluster in the burn-down tail, and for ar/es/pt/sw/tl the ONLY R1 miss they
 * had:
 *
 *     missing  pick.method:expression      (the en reference)
 *     captured pick.method:literal         (all 23 foreign parses)
 *
 * Every role was present, in the right slot, with the right value. Only the
 * type differed, because the two sides reach `method` down different token
 * paths: en deliberately keeps `characters` OFF its keyword list (see
 * patterns/languages/en/pick.ts — keywording it would risk this pattern's
 * identifier path), so it rides the identifier branch of
 * `tokenToSemanticValue` and lands as an EXPRESSION; all 22 foreign tokenizers
 * register it as a keyword, so it lands as a LITERAL. Role fidelity is compared
 * as `action.role:valueType`, so that asymmetry alone read as a dropped role.
 *
 * The fix is two halves, and BOTH are required:
 *
 *  A. `patterns/pick.ts` re-types unit-word captures on the `method` slot of
 *     both factories (verb-initial and SOV verb-final) via the existing
 *     `ExtractionRule.transform` hook — which runs AFTER confidence scoring, so
 *     no adoption decision can move. Conditional on the unit words only:
 *     `first`/`last`/`random` ride the same slot and are keywords in en TOO, so
 *     re-typing them would manufacture the inverse divergence (pinned below).
 *  B. the pick preservation clause in `semantic-parser.ts` compares the
 *     re-parsed `method` by SURFACE, not by type. It previously required
 *     `literal`; with A applied, that veto killed the fused re-parse swap and
 *     truncated the handler body to `on click pick characters` — the arc-3
 *     canonical-validity cluster, re-opened. B alone is unobservable (it is a
 *     strict widening); it is mutation-verified through A.
 *
 * MUTATION-VERIFIED: reverting A reddens the signature and method-type rows in
 * all 23 languages. Reverting B alone (A in place) reddens 13 of them —
 * de/es/fr/id/it/ms/pl/pt/ru/sw/th/uk/vi, the languages whose corpus row
 * routes through the fused body-walk swap — including their round-trip rows,
 * the truncation. The SOV six and ar/he/tl/zh never reach that swap and stay
 * green, which is why B alone proves nothing without A.
 */

import { describe, it, expect } from 'vitest';
import { parse, parseSemantic, render } from '../src/index';
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

function pickNode(source: string, lang: string): CommandSemanticNode {
  const node = parse(source, lang);
  expect(node, `'${source}' (${lang}) did not parse`).not.toBeNull();
  const picks = walkCommands(node).filter(c => c.action === 'pick');
  expect(picks.length, `'${source}' (${lang}) has no pick command`).toBeGreaterThan(0);
  return picks[0] as unknown as CommandSemanticNode;
}

/**
 * The `action.role:valueType` set the multilingual harness compares languages
 * by (mirrors `collectRoleSignature` in testing-framework's fidelity.ts —
 * duplicated deliberately rather than imported, so this package's tests carry
 * no cross-package dependency).
 */
function roleSignature(node: unknown): string[] {
  const acc = new Set<string>();
  const walk = (n: unknown, depth: number): void => {
    if (!n || typeof n !== 'object' || depth > 12) return;
    const o = n as Record<string, any>;
    if (typeof o.action === 'string' && o.roles instanceof Map) {
      for (const [role, value] of o.roles.entries()) {
        const kind =
          value && typeof value === 'object' && typeof value.type === 'string'
            ? value.type
            : typeof value;
        acc.add(`${o.action}.${String(role)}:${kind}`);
      }
    }
    for (const k of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      if (Array.isArray(o[k])) o[k].forEach((c: unknown) => walk(c, depth + 1));
    }
  };
  walk(node, 0);
  return [...acc].sort();
}

const roleType = (n: CommandSemanticNode, role: string): string | undefined =>
  (n.roles.get(role as never) as { type?: string } | undefined)?.type;

const roleSurface = (n: CommandSemanticNode, role: string): string | undefined => {
  const v = n.roles.get(role as never) as { value?: unknown; raw?: string } | undefined;
  return v === undefined ? undefined : String(v.raw ?? v.value);
};

const EN_ROW = 'on click pick characters 0 to 5 of #note';

/**
 * The `pick-text-range` corpus surfaces, verbatim from a freshly `populate`d
 * patterns.db, with each language's measured `parseSemantic` confidence. The
 * confidence is pinned because `ExtractionRule.transform` runs AFTER the
 * confidence model — a fix that moved adoption scores would be a different,
 * riskier change than the one made here.
 *
 * The thirteen verb-initial rows moved 0.5556 → 0.7143 when the fused
 * event-handler generators became schema-driven. `pickSchema` declares no
 * `destination` role, and the fused pattern used to emit a `to {destination}`
 * group anyway (gated on the PROFILE having a destination marker, not on the
 * schema having the role). The slot could never be filled, so it sat in
 * `scoreRoleCoverage`'s denominator forever: 2 / (2 + 0.8 + 0.8) rather than
 * 2 / (2 + 0.8). Removing a question the command cannot answer is what raised
 * the score; the ADOPTION is unchanged, which is what this pin is really for.
 *
 * `verbFinal` marks the SOV six, which reach `pick` through the verb-final
 * factory. They are the languages that stay green under the B-only mutation.
 */
const CORPUS: Array<{ lang: string; src: string; conf: number; verbFinal?: true }> = [
  { lang: 'ar', src: 'اختر حروف 0 إلى 5 من #note عند نقر', conf: 0.75 },
  { lang: 'bn', src: '#note র অক্ষর 0 থেকে 5 কে ক্লিক এ বাছুন', conf: 0.75, verbFinal: true },
  { lang: 'de', src: 'bei klick auswählen Zeichen 0 zu 5 von #note', conf: 0.7142857142857143 },
  { lang: 'es', src: 'en clic escoger caracteres 0 a 5 de #note', conf: 0.7142857142857143 },
  { lang: 'fr', src: 'sur clic choisir caractères 0 à 5 de #note', conf: 0.7142857142857143 },
  { lang: 'he', src: 'ב לחיצה בחר את תווים 0 על 5 of #note', conf: 0.8222222222222222 },
  { lang: 'hi', src: '#note का अक्षर 0 से 5 को क्लिक पर चुनें', conf: 0.75, verbFinal: true },
  { lang: 'id', src: 'pada klik pilih karakter 0 ke 5 dari #note', conf: 0.7142857142857143 },
  { lang: 'it', src: 'su clic scegliere caratteri 0 a 5 di #note', conf: 0.7142857142857143 },
  { lang: 'ja', src: '#note の 文字 0 から 5 を クリック で 選択', conf: 0.75, verbFinal: true },
  { lang: 'ko', src: '#note 의 문자 0 부터 5 를 클릭 할 때 선택', conf: 0.75, verbFinal: true },
  { lang: 'ms', src: 'apabila click pilih aksara 0 ke 5 daripada #note', conf: 0.7142857142857143 },
  { lang: 'pl', src: 'na kliknięcie wybierz znaki 0 do 5 z #note', conf: 0.7142857142857143 },
  { lang: 'pt', src: 'em clique escolher caracteres 0 a 5 de #note', conf: 0.7142857142857143 },
  { lang: 'qu', src: '#note pa sanampa 0 kama 5 ta ñitiy pi akllay', conf: 0.75, verbFinal: true },
  { lang: 'ru', src: 'при клик выбрать символы 0 в 5 из #note', conf: 0.7142857142857143 },
  { lang: 'sw', src: 'kwenye bofya chagua herufi 0 hadi 5 ya #note', conf: 0.7142857142857143 },
  { lang: 'th', src: 'เมื่อ คลิก เลือก อักขระ 0 ถึง 5 ของ #note', conf: 0.7142857142857143 },
  { lang: 'tl', src: 'pumili karakter 0 sa 5 ng #note kapag click', conf: 0.75 },
  {
    lang: 'tr',
    src: '#note nin karakterler 0 ile 5 i tıklama de seç',
    conf: 0.75,
    verbFinal: true,
  },
  { lang: 'uk', src: 'при клік вибрати символи 0 в 5 з #note', conf: 0.7142857142857143 },
  { lang: 'vi', src: 'khi nhấp chọn ký tự 0 đến 5 của #note', conf: 0.7142857142857143 },
  { lang: 'zh', src: '当 点击 时 选取 把 字符 0 到 5 的 #note', conf: 1 },
];

const ROWS = CORPUS.map(r => [r.lang, r.src] as [string, string]);

describe('the en reference this row is scored against', () => {
  it('types the unit word as an expression, via the identifier path', () => {
    const pick = pickNode(EN_ROW, 'en');
    expect(roleType(pick, 'method')).toBe('expression');
    expect(roleSurface(pick, 'method')).toBe('characters');
    expect(roleSurface(pick, 'patient')).toBe('0 to 5');
    expect(roleSurface(pick, 'source')).toBe('#note');
    expect(parseSemantic(EN_ROW, 'en').confidence).toBe(1);
  });

  it('leaves pickSchema untouched — pick extends via patterns, never the schema', () => {
    const schema = getSchema('pick');
    expect(schema?.roles.map(r => r.role)).toEqual(['patient', 'source']);
    expect(schema?.roles.some(r => r.role === 'method')).toBe(false);
  });
});

describe('every language agrees with the en role signature', () => {
  const EN_SIGNATURE = roleSignature(parse(EN_ROW, 'en'));

  it('the en signature is the one the harness compares against', () => {
    expect(EN_SIGNATURE).toEqual([
      'on.event:literal',
      'pick.method:expression',
      'pick.patient:expression',
      'pick.source:selector',
    ]);
  });

  it.each(ROWS)('%s matches it exactly', (lang, src) => {
    expect(roleSignature(parse(src, lang))).toEqual(EN_SIGNATURE);
  });

  // The mutation row for change A: without the transform the unit word is a
  // keyword-built literal in every one of these languages.
  it.each(ROWS)('%s types the unit word as an expression', (lang, src) => {
    const pick = pickNode(src, lang);
    expect(roleType(pick, 'method')).toBe('expression');
    expect(roleSurface(pick, 'method')).toBe('characters');
  });

  it.each(ROWS)('%s keeps the range and root intact', (lang, src) => {
    const pick = pickNode(src, lang);
    expect(roleSurface(pick, 'patient')).toBe('0 to 5');
    expect(roleSurface(pick, 'source')).toBe('#note');
  });
});

describe('the round trip survives the re-typing', () => {
  // The mutation row for change B. With A applied but the preservation clause
  // still type-checking, the fused re-parse swap is vetoed for the 13
  // verb-initial languages and their handler bodies truncate to
  // `on click pick characters`.
  it.each(ROWS)('%s renders back to the canonical English', (lang, src) => {
    const node = parse(src, lang);
    expect(node).not.toBeNull();
    expect(render(node as never, 'en')).toBe(EN_ROW);
  });

  it.each(ROWS)('%s keeps its adoption confidence (transform is post-scoring)', (lang, src) => {
    const expected = CORPUS.find(r => r.lang === lang)!.conf;
    const result = parseSemantic(src, lang);
    expect(result.node).not.toBeNull();
    expect(result.confidence).toBeCloseTo(expected, 10);
  });
});

describe('the re-typing is scoped to unit words', () => {
  // `first`/`last`/`random` ride the same `method` slot and ARE keywords in en,
  // so both sides already agree on `literal`. Re-typing them would manufacture
  // the inverse divergence.
  it('en count variants stay literal', () => {
    const pick = pickNode('pick first 3 of arr', 'en');
    expect(roleType(pick, 'method')).toBe('literal');
    expect(roleSurface(pick, 'method')).toBe('first');
  });

  it('foreign count variants stay literal too', () => {
    const pick = pickNode('escoger primero 3 de arr', 'es');
    expect(roleType(pick, 'method')).toBe('literal');
    expect(roleSurface(pick, 'method')).toBe('first');
  });
});
