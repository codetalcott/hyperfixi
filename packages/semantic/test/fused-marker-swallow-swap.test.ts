/**
 * `scroll to last <.message/> in #chat` — the swallowed destination marker.
 *
 * The generated fused event pattern (`<cmd>-event-<lang>-vso`, built by
 * `generators/event-handlers-vso.ts`) hardwires a REQUIRED `{patient}` slot
 * ahead of its optional destination group. `scrollSchema` declares no patient
 * role, so on a corpus surface like `bei klick scrollen zu letzte <.message/>
 * in #chat` that required slot lands on the destination MARKER (`zu`). The
 * marker is a keyword whose `normalized` form is its role CONCEPT, so
 * `tokenToSemanticValue` produced `literal="destination"` — the parse kept the
 * verb, reported a destination, and left the real one
 * (`letzte <.message/> in #chat`) unconsumed.
 *
 * Which languages this hits is a tokenizer accident, not a grammar fact:
 * de `zu` / fr `à` / ms `ke` / th `ใน` / vi `vào` classify as KEYWORDS (→ a
 * concept literal, capture succeeds, junk wins), while it/id/pt/ru/uk markers
 * classify as PARTICLES (→ `null`, the required slot fails, the fused pattern
 * never matches and those languages take the two-pattern route). es escapes for
 * a third reason: its marker `a` is a particle AND an `ENGLISH_NOISE_WORD`, so
 * `skipNoiseWords` steps over it before the positional head.
 *
 * The repair already existed. The fused body walk re-parses its clause through
 * the standalone command patterns and swaps the result in — all five clause
 * slices re-parse at confidence 1.0 to exactly the en roles — and that swap
 * already heals this same junk for `go-url` (`gehen zu url "/page"`, whose
 * fused patient is the same `literal="destination"`). Two vetoes blocked scroll
 * from it, and BOTH had to go:
 *
 *   1. `preservesFused` — junk `literal` vs the re-parse's `expression` failed
 *      the same-type check. `go-url` passes only by accident: its real
 *      destination `"/page"` is a literal too.
 *   2. the strictly-more size gate — scroll's fused capture has exactly one
 *      role, so `1 > 1` is false and the repair vetoed itself. `go-url` clears
 *      it at `2 > 1` because it also carries `method`.
 *
 * A capture whose literal value IS a role-concept name can only be a swallowed
 * marker (no user writes `destination` as an argument), so both vetoes now
 * exempt it — scoped by the same no-real-`patient` condition as the fused
 * relabel, which is why every genuine patient capture below is untouched.
 *
 * MUTATION-VERIFIED: each exemption is independently load-bearing. Reverting
 * only the `preservesFused` arm reddens all five rows below (destination goes
 * back to `literal="destination"` + the unconsumed tail); reverting only the
 * size-gate filter reddens the same five. Neither is redundant.
 */

import { describe, it, expect } from 'vitest';
import { parse, parseSemantic } from '../src/index';
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

function commandNode(source: string, lang: string, action: string): CommandSemanticNode {
  const node = parse(source, lang);
  expect(node, `'${source}' (${lang}) did not parse`).not.toBeNull();
  const hits = walkCommands(node).filter(c => c.action === action);
  expect(hits.length, `'${source}' (${lang}) has no ${action} command`).toBeGreaterThan(0);
  return hits[0] as unknown as CommandSemanticNode;
}

const roleType = (n: CommandSemanticNode, role: string): string | undefined =>
  (n.roles.get(role as never) as { type?: string } | undefined)?.type;

const roleSurface = (n: CommandSemanticNode, role: string): string | undefined => {
  const v = n.roles.get(role as never) as { value?: unknown; raw?: string } | undefined;
  return v === undefined ? undefined : String(v.raw ?? v.value);
};

function unconsumedSpans(code: string, language: string): string[] {
  const node = parse(code, language);
  return (node?.diagnostics ?? []).filter(d => d.code === 'unconsumed-input').map(d => d.message);
}

const EN_ROW = 'on click scroll to last <.message/> in #chat';
const EN_DESTINATION = 'last <.message/> in #chat';

/**
 * The five `last-in-collection` corpus surfaces whose destination marker
 * tokenizes as a keyword — verbatim from a freshly `populate`d patterns.db.
 * These are the rows that were R1 role-lossy in the committed baseline.
 */
const MARKER_SWALLOW_ROWS: Array<[string, string]> = [
  ['de', 'bei klick scrollen zu letzte <.message/> in #chat'],
  ['fr', 'sur clic défiler à dernier <.message/> en #chat'],
  ['ms', 'apabila click scroll ke terakhir <.message/> dalam #chat'],
  ['th', 'เมื่อ คลิก เลื่อน ใน สุดท้าย <.message/> ใน #chat'],
  ['vi', 'khi nhấp cuộn vào cuối cùng <.message/> trong #chat'],
];

describe('the en reference this row is scored against', () => {
  it('keeps the whole positional query on `destination`', () => {
    const scroll = commandNode(EN_ROW, 'en', 'scroll');
    expect(roleType(scroll, 'destination')).toBe('expression');
    expect(roleSurface(scroll, 'destination')).toBe(EN_DESTINATION);
    expect(unconsumedSpans(EN_ROW, 'en')).toEqual([]);
  });
});

describe('the marker-swallow languages recover the destination', () => {
  it.each(MARKER_SWALLOW_ROWS)('%s parses the whole positional query', (lang, src) => {
    // The clause must stay ONE scroll command — a recovered tail becoming a
    // second phantom command would satisfy a role check but break the parse.
    const node = parse(src, lang);
    expect(walkCommands(node).map(c => c.action)).toEqual(['scroll']);

    const scroll = commandNode(src, lang, 'scroll');
    // The defect's signature: `literal="destination"`, the marker's own role
    // CONCEPT name, standing in for the destination.
    expect(roleSurface(scroll, 'destination')).not.toBe('destination');
    expect(roleType(scroll, 'destination')).toBe('expression');
    expect(roleSurface(scroll, 'destination')).toBe(EN_DESTINATION);
  });

  it.each(MARKER_SWALLOW_ROWS)('%s consumes its whole clause', (lang, src) => {
    // The only witness the defect ever had: the real destination left over as
    // a 4-token tail after the fused walk.
    expect(unconsumedSpans(src, lang)).toEqual([]);
  });

  it.each(MARKER_SWALLOW_ROWS)('%s keeps the fused match adopted (confidence)', (lang, src) => {
    // The repair is the SWAP, not a re-route: the fused pattern still wins its
    // race at the same score. `parse()` reports no confidence — `parseSemantic`
    // is the export that scores, and asserting through `parse` passes vacuously.
    const result = parseSemantic(src, lang);
    expect(result.node).not.toBeNull();
    expect(result.confidence).toBeCloseTo(0.7142857142857143, 6);
  });
});

describe('the exemption is scoped to provably-junk captures', () => {
  /**
   * `go-url` carries the identical swallowed marker, and its swap ALREADY
   * fired before this change (junk literal vs real literal `/page` passed the
   * type check; `2 > 1` cleared the size gate). Relaxing both vetoes must leave
   * it byte-identical — this is the row that proves the change is additive.
   */
  const GO_URL_ROWS: Array<[string, string]> = [
    ['en', 'on click go to url "/page"'],
    ['de', 'bei klick gehen zu url "/page"'],
    ['fr', 'sur clic aller à url "/page"'],
    ['ms', 'apabila click pergi ke url "/page"'],
    ['th', 'เมื่อ คลิก ไป ใน url "/page"'],
    ['vi', 'khi nhấp đi đến url "/page"'],
    ['es', 'en clic ir a url "/page"'],
  ];

  it.each(GO_URL_ROWS)('%s go-url keeps destination + method', (lang, src) => {
    const go = commandNode(src, lang, 'go');
    expect(roleType(go, 'destination')).toBe('literal');
    expect(roleSurface(go, 'destination')).toBe('/page');
    expect(roleSurface(go, 'method')).toBe('url');
  });

  it('es last-in-collection still escapes via the noise-word path', () => {
    // es was never lossy: its marker `a` is a particle AND an ENGLISH_NOISE_WORD.
    // It must not start depending on the exemption.
    const src = 'en clic desplazar a último <.message/> en #chat';
    const scroll = commandNode(src, 'es', 'scroll');
    expect(roleType(scroll, 'destination')).toBe('expression');
    expect(roleSurface(scroll, 'destination')).toBe(EN_DESTINATION);
  });

  it('a real patient capture on a patient-declaring schema is untouched', () => {
    // The qu verb-final safety rail. `increment` DECLARES `patient`, so the
    // no-real-patient clause makes the exemption unreachable here — the fronted
    // `#score` keeps its full superset protection.
    const inc = commandNode('#score ta ñitiy pi yapachiy 10', 'qu', 'increment');
    expect(roleType(inc, 'patient')).toBe('selector');
    expect(roleSurface(inc, 'patient')).toBe('#score');
    expect(roleSurface(inc, 'quantity')).toBe('10');
  });

  it('the verb-final route to the same pattern is unaffected', () => {
    // qu reaches `last-in-collection` through the SOV verb-anchoring fallback,
    // not the fused VSO shape — it was already faithful and must stay so.
    const src = 'qhipa <.message/> ukupi #chat man ñitiy pi kunray';
    const scroll = commandNode(src, 'qu', 'scroll');
    expect(roleType(scroll, 'destination')).toBe('expression');
    expect(roleSurface(scroll, 'destination')).toBe(EN_DESTINATION);
  });
});
