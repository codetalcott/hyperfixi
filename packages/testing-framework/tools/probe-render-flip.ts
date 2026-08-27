#!/usr/bin/env npx tsx
/**
 * Corpus-flip probe: score BOTH renderers of the corpus against the English
 * reference, pair by pair, under the gates' own metrics.
 *
 * WHY THIS EXISTS
 * ---------------
 * The stored `pattern_translations` rows — the input of the 11-signal
 * multilingual ratchet — are written by @lokascript/i18n's GrammarTransformer.
 * Every runtime surface (MCP translate_code, hyperfixi.translate, core's
 * MultilingualHyperscript) renders with @lokascript/semantic's `render()`.
 * The architecture record deferred flipping the corpus to the semantic
 * renderer (and retiring the i18n one) behind a measured trigger: "reopen when
 * the renderer passes 97.0% (i18n's own clean rate)". That number was produced
 * by an ad-hoc probe that was never committed, so when the trigger fired
 * nothing reported it. This is that probe, committed.
 *
 * WHAT IT MEASURES
 * ----------------
 * For every corpus pattern whose English source parses, and every non-English
 * language with a stored row:
 *   i18n side     = parse_L(stored row)                — the gate's actual input
 *   semantic side = parse_L(render(parse_en(en), L))   — what a flip would store
 * Both are scored against the same English reference with
 *   - the render gate's STRICT signature (collectActions + collectRoleSignatureStrict,
 *     implicit roles ignored; "clean" = nothing missing), and
 *   - the multilingual ratchet's signals via scoreNodes (R0 actionRecall,
 *     multiset recall, precision, R1 roleFidelity — NON-strict, exactly what
 *     `roleLossyPatterns` in the committed baseline is built from — and R3
 *     valueRecall), plus R5 (parses at all), plus the English ROUND-TRIP:
 *     render(parse_L(candidate), 'en') equal to render(reference, 'en'). The
 *     round-trip is the cheap proxy for R2 (execution): a `put … before` that
 *     re-renders as `put … into` is role-identical and execution-different, and
 *     only this signal (and jsdom, for the 47 curated ids) can see it.
 * Optionally (--canonical) R4: render(parse_L(candidate), 'en') on the real
 * hyperscript.org engine, for the semantic side only (the foreign gate already
 * covers the stored rows).
 *
 * WHAT IT REPORTS
 * ---------------
 * Per signal, per renderer, the pass count — and the two lists that decide a
 * flip: LOSSES (i18n passes, semantic fails: each one is a tolerance-0 ratchet
 * failure the flip would cause) and GAINS (semantic passes, i18n fails: each
 * one is a baseline row the flip would clear). A flip is an upgrade when the
 * losses list is empty, or when every remaining loss is one the owner accepts
 * as a regenerated-baseline entry.
 *
 * DB dependency: needs a freshly populated patterns.db, like every other gate
 * here (`npm run populate --prefix packages/patterns-reference`).
 *
 * Usage: npx tsx tools/probe-render-flip.ts [--languages a,b] [--out file.json]
 *        [--canonical] [--show N]
 */
import { writeFileSync } from 'node:fs';
import { getAllPatterns, getTranslationsByLanguage } from '@hyperfixi/patterns-reference';
import { parseSemantic, render, type SemanticNode } from '@lokascript/semantic';
import {
  collectActions,
  collectRoleSignatureStrict,
  FIDELITY_THRESHOLD,
} from '../src/multilingual/fidelity';
// scoreNodes (arc 4) is not on the local shim; take it from the extracted module.
import { scoreNodes } from '@lokascript/semantic/fidelity';
import { RENDER_LANGUAGES } from '../src/multilingual/render-fidelity';

type Side = 'i18n' | 'semantic';

/** The signals a flip is judged on, in ratchet order. */
const SIGNALS = [
  'parse', // R5 — parses at all (tolerance 0)
  'faithful', // R0 — actionRecall = 1 (faithful→lossy flip, tolerance 0)
  'notDegenerate', // R0 — actionRecall ≥ 0.5 (tolerance 3)
  'multiset', // R0 multiset recall = 1
  'precision', // R0 precision = 1
  'role', // R1 — roleFidelity = 1, NON-strict (role-set flip, tolerance 0)
  'value', // R3 — valueRecall = 1 (or no invariant values)
  'strict', // render gate — no missing action, no missing strict role
  'roundtrip', // render(parse_L(x), 'en') === render(reference, 'en') — the R2 proxy
  'canonical', // R4 — engine accepts render-to-en (only with --canonical)
] as const;
type Signal = (typeof SIGNALS)[number];

interface SideScore {
  readonly surface: string;
  readonly parsed: boolean;
  readonly pass: Record<Signal, boolean | undefined>;
  readonly missingActions: readonly string[];
  readonly missingRoles: readonly string[];
  readonly missingStrictRoles: readonly string[];
}

interface PairResult {
  readonly id: string;
  readonly language: string;
  readonly english: string;
  readonly i18n: SideScore;
  readonly semantic: SideScore;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function safeParse(code: string, language: string): SemanticNode | null {
  try {
    return parseSemantic(code, language)?.node ?? null;
  } catch {
    return null;
  }
}

function scoreSide(
  reference: SemanticNode,
  referenceEn: string | null,
  refActions: readonly string[],
  refStrictRoles: readonly string[],
  surface: string | null,
  language: string,
  canonical: ((code: string) => string[]) | null
): SideScore {
  const none = (): Record<Signal, boolean | undefined> => ({
    parse: false,
    faithful: false,
    notDegenerate: false,
    multiset: false,
    precision: false,
    role: false,
    value: false,
    strict: false,
    roundtrip: false,
    canonical: canonical ? false : undefined,
  });
  if (surface === null) {
    return {
      surface: '',
      parsed: false,
      pass: none(),
      missingActions: refActions,
      missingRoles: [],
      missingStrictRoles: refStrictRoles,
    };
  }
  const node = safeParse(surface, language);
  if (!node) {
    return {
      surface,
      parsed: false,
      pass: none(),
      missingActions: refActions,
      missingRoles: [],
      missingStrictRoles: refStrictRoles,
    };
  }
  const report = scoreNodes(reference, node);
  const gotActions = new Set(collectActions(node));
  const gotStrict = new Set(collectRoleSignatureStrict(node));
  const missingActions = refActions.filter(a => !gotActions.has(a));
  const missingStrictRoles = refStrictRoles.filter(r => !gotStrict.has(r));
  const s = report.scores;
  let backToEn: string | null = null;
  try {
    backToEn = render(node, 'en');
  } catch {
    backToEn = null;
  }
  let canonicalPass: boolean | undefined;
  if (canonical) {
    canonicalPass = backToEn !== null && canonical(backToEn).length === 0;
  }
  return {
    surface,
    parsed: true,
    pass: {
      parse: true,
      faithful: s.actionRecall === 1,
      notDegenerate: (s.actionRecall ?? 0) >= FIDELITY_THRESHOLD,
      multiset: s.multisetRecall === 1,
      precision: s.precision === 1,
      role: s.roleFidelity === undefined || s.roleFidelity === 1,
      value: s.valueRecall === undefined || s.valueRecall === 1,
      strict: missingActions.length === 0 && missingStrictRoles.length === 0,
      roundtrip: referenceEn !== null && backToEn !== null && backToEn === referenceEn,
      canonical: canonicalPass,
    },
    missingActions,
    missingRoles: report.missingRoles,
    missingStrictRoles,
  };
}

async function main(): Promise<void> {
  const languages = (arg('--languages')?.split(',') ?? [...RENDER_LANGUAGES]).map(l => l.trim());
  const out = arg('--out');
  const show = Number(arg('--show') ?? 25);
  const wantCanonical = process.argv.includes('--canonical');

  let canonical: ((code: string) => string[]) | null = null;
  if (wantCanonical) {
    const { loadCanonicalParser } = await import('../src/multilingual/canonical-validity');
    canonical = await loadCanonicalParser();
  }

  const patterns = await getAllPatterns({ limit: 1000 });
  const stored = new Map<string, Map<string, string>>();
  for (const language of languages) {
    const rows = await getTranslationsByLanguage(language, 1000);
    stored.set(language, new Map(rows.map(r => [r.codeExampleId, r.hyperscript])));
  }

  const pairs: PairResult[] = [];
  let skippedNoReference = 0;
  let skippedNoRow = 0;

  for (const pattern of patterns) {
    const reference = safeParse(pattern.rawCode, 'en');
    if (!reference) {
      skippedNoReference++;
      continue;
    }
    const refActions = collectActions(reference);
    const refStrictRoles = collectRoleSignatureStrict(reference);
    let referenceEn: string | null = null;
    try {
      referenceEn = render(reference, 'en');
    } catch {
      referenceEn = null;
    }

    for (const language of languages) {
      const row = stored.get(language)?.get(pattern.id);
      if (row === undefined) {
        skippedNoRow++;
        continue;
      }
      let rendered: string | null;
      try {
        rendered = render(reference, language);
      } catch {
        rendered = null;
      }
      pairs.push({
        id: pattern.id,
        language,
        english: pattern.rawCode,
        i18n: scoreSide(
          reference,
          referenceEn,
          refActions,
          refStrictRoles,
          row,
          language,
          canonical
        ),
        semantic: scoreSide(
          reference,
          referenceEn,
          refActions,
          refStrictRoles,
          rendered,
          language,
          canonical
        ),
      });
    }
  }

  // ---- summary ------------------------------------------------------------
  const signals = SIGNALS.filter(s => s !== 'canonical' || wantCanonical);
  const count = (side: Side, signal: Signal) => pairs.filter(p => p[side].pass[signal]).length;
  const losses = (signal: Signal) =>
    pairs.filter(p => p.i18n.pass[signal] && !p.semantic.pass[signal]);
  const gains = (signal: Signal) =>
    pairs.filter(p => !p.i18n.pass[signal] && p.semantic.pass[signal]);
  const pct = (n: number) => `${((100 * n) / pairs.length).toFixed(2)}%`;

  console.log(
    `\ncorpus: ${patterns.length} patterns, ${pairs.length} (pattern, language) pairs over ${languages.length} languages` +
      ` — skipped ${skippedNoReference} patterns without an EN parse, ${skippedNoRow} pairs without a stored row\n`
  );
  console.log(
    'signal'.padEnd(15) +
      'i18n (stored)'.padStart(20) +
      'semantic (render)'.padStart(22) +
      'LOSSES'.padStart(9) +
      'GAINS'.padStart(8)
  );
  for (const s of signals) {
    const a = count('i18n', s);
    const b = count('semantic', s);
    console.log(
      s.padEnd(15) +
        `${a} (${pct(a)})`.padStart(20) +
        `${b} (${pct(b)})`.padStart(22) +
        String(losses(s).length).padStart(9) +
        String(gains(s).length).padStart(8)
    );
  }

  // Per-language strict clean + the two tolerance-0 ratchet signals.
  console.log(
    '\nper language: strict-clean i18n → semantic   | tolerance-0 losses: parse / faithful / role / roundtrip'
  );
  for (const language of languages) {
    const inLang = pairs.filter(p => p.language === language);
    const a = inLang.filter(p => p.i18n.pass.strict).length;
    const b = inLang.filter(p => p.semantic.pass.strict).length;
    const l = (s: Signal) => inLang.filter(p => p.i18n.pass[s] && !p.semantic.pass[s]).length;
    console.log(
      `  ${language}  ${String(a).padStart(4)} → ${String(b).padStart(4)} / ${inLang.length}` +
        `   | ${l('parse')} / ${l('faithful')} / ${l('role')} / ${l('roundtrip')}`
    );
  }

  // The decision lists.
  const ratchetSignals: Signal[] = ['parse', 'faithful', 'role', 'roundtrip'];
  const ratchetLosses = pairs.filter(p =>
    ratchetSignals.some(s => p.i18n.pass[s] && !p.semantic.pass[s])
  );
  const strictLosses = losses('strict');
  const strictGains = gains('strict');
  console.log(
    `\nTOLERANCE-0 RATCHET LOSSES a flip would cause (parse / faithful→lossy / role-set flip / round-trip≈R2): ${ratchetLosses.length}`
  );
  for (const p of ratchetLosses.slice(0, show)) {
    const why = ratchetSignals.filter(s => p.i18n.pass[s] && !p.semantic.pass[s]).join(',');
    console.log(`  [${why}] ${p.id} (${p.language})`);
    console.log(`      en:   ${p.english}`);
    console.log(`      i18n: ${p.i18n.surface}`);
    console.log(`      sem:  ${p.semantic.surface || '(render threw)'}`);
    if (!p.semantic.parsed) console.log('      → semantic render does not parse back');
    else if (p.semantic.missingActions.length)
      console.log(`      → missing actions: ${p.semantic.missingActions.join(', ')}`);
    else if (p.semantic.missingRoles.length)
      console.log(`      → missing roles: ${p.semantic.missingRoles.join(', ')}`);
  }
  if (ratchetLosses.length > show)
    console.log(`  … ${ratchetLosses.length - show} more (see --out)`);

  console.log(`\nSTRICT-CLEAN losses ${strictLosses.length} / gains ${strictGains.length}`);
  for (const p of strictGains.slice(0, show)) {
    console.log(
      `  + ${p.id} (${p.language}): i18n missing ${[...p.i18n.missingActions, ...p.i18n.missingStrictRoles].join(', ') || '(unparseable)'}`
    );
  }
  if (strictGains.length > show) console.log(`  … ${strictGains.length - show} more (see --out)`);

  if (out) {
    writeFileSync(
      out,
      JSON.stringify(
        {
          pairs: pairs.length,
          patterns: patterns.length,
          languages,
          summary: Object.fromEntries(
            signals.map(s => [
              s,
              {
                i18n: count('i18n', s),
                semantic: count('semantic', s),
                losses: losses(s).length,
                gains: gains(s).length,
              },
            ])
          ),
          ratchetLosses,
          strictLosses,
          strictGains,
          all: pairs,
        },
        null,
        2
      )
    );
    console.log(`\nwrote ${out}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
