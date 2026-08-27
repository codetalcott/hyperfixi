#!/usr/bin/env npx tsx
/**
 * Triage the rows the `best` corpus writer still takes from @lokascript/i18n.
 *
 * WHY THIS EXISTS
 * ---------------
 * `baselines/i18n-kept-rows.json` names WHICH (pattern, language) pairs the
 * semantic renderer still loses, and `i18n-kept-rows.test.ts` ratchets that
 * list downward — but neither says WHY a row is kept, and the choice rule
 * (`patterns-reference/src/sync/renderer-choice.ts`) folds five scores and two
 * vetoes into one boolean. This reproduces the losing side per row: what the
 * English reference is, what the semantic renderer emits, what that surface
 * re-parses to, and the FIRST signal it fails.
 *
 * The classification it prints is the queue's own vocabulary:
 *   no-reparse   — the rendered surface does not parse in its own language (R5)
 *   action-drop  — a command is missing from the re-parse (R0)
 *   role-drop    — an action kept but a role lost or mistyped (R1); an implicit
 *                  role the English reference materializes counts, which is how
 *                  the hand-crafted-pattern default gap was found
 *   value-drop   — roles intact, a language-invariant VALUE differs (R3)
 *   round-trip   — every score is 1.0 and the re-rendered English still differs
 *                  (the R2 proxy — `put … before` re-rendering as `put … into`)
 *
 * `--canonical-only` keeps the rows the owner's priority calls canonical:
 * `code_examples.engine = 'both'` (engine-verified by `verify-engines.ts`) and
 * not one of our own showcase behaviors.
 *
 * DB dependency: a freshly populated patterns.db, like every gate here
 * (`npm run populate --prefix packages/patterns-reference`).
 *
 * Usage: npx tsx tools/triage-i18n-kept-rows.ts [--canonical-only] [--summary]
 *                                               [--pattern <id>] [--language <code>]
 */
import { getAllPatterns, getTranslationsByLanguage } from '@hyperfixi/patterns-reference';
import { parseSemantic, render, type SemanticNode } from '@lokascript/semantic';
import { scoreNodes } from '@lokascript/semantic/fidelity';
import { collectActions } from '../src/multilingual/fidelity';
import baseline from '../baselines/i18n-kept-rows.json';

/** Our own showcase behaviors — engine-valid, but not canonical examples. */
const SHOWCASE_BEHAVIORS: ReadonlySet<string> = new Set([
  'behavior-removable',
  'behavior-sortable',
  'behavior-draggable',
  'behavior-resizable',
]);

type Signal = 'no-reparse' | 'action-drop' | 'role-drop' | 'value-drop' | 'round-trip' | 'ok';

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

function safeRender(node: SemanticNode, language: string): string | null {
  try {
    return render(node, language);
  } catch {
    return null;
  }
}

const oneLine = (s: string | null | undefined): string => (s ?? '—').replace(/\n\s*/g, ' ⏎ ');

async function main(): Promise<void> {
  const canonicalOnly = process.argv.includes('--canonical-only');
  const summaryOnly = process.argv.includes('--summary');
  const onlyPattern = arg('--pattern');
  const onlyLanguage = arg('--language');

  const byId = new Map((await getAllPatterns({ limit: 1000 })).map(p => [p.id, p]));
  const allowed = baseline.allowedKept as Record<string, string[]>;

  const stored = new Map<string, Map<string, string>>();
  for (const language of new Set(Object.values(allowed).flat())) {
    const rows = await getTranslationsByLanguage(language, 1000);
    stored.set(language, new Map(rows.map(r => [r.codeExampleId, r.hyperscript])));
  }

  const tally = new Map<Signal, string[]>();

  for (const [id, languages] of Object.entries(allowed)) {
    if (onlyPattern && id !== onlyPattern) continue;
    const pattern = byId.get(id);
    if (!pattern) continue;
    const canonical = pattern.engine === 'both' && !SHOWCASE_BEHAVIORS.has(id);
    if (canonicalOnly && !canonical) continue;

    for (const language of languages) {
      if (onlyLanguage && language !== onlyLanguage) continue;

      const reference = safeParse(pattern.rawCode, 'en');
      if (!reference) {
        // `grammar-transform-no-reference`: semantic cannot parse the English
        // at all, so there is nothing to render from. Parser coverage, not a
        // renderer defect.
        tally.set('no-reparse', [...(tally.get('no-reparse') ?? []), `${id}[${language}] (no en)`]);
        if (!summaryOnly) console.log(`\n### ${id} [${language}] — English does not parse`);
        continue;
      }

      const referenceEn = safeRender(reference, 'en');
      const candidate = safeRender(reference, language);
      const reparsed = candidate ? safeParse(candidate, language) : null;
      const candidateEn = reparsed ? safeRender(reparsed, 'en') : null;
      const report = reparsed ? scoreNodes(reference, reparsed) : null;
      const scores = report?.scores;

      const missingActions = collectActions(reference).filter(
        a => !(reparsed ? collectActions(reparsed) : []).includes(a)
      );

      let signal: Signal = 'ok';
      if (!reparsed) signal = 'no-reparse';
      else if (missingActions.length > 0) signal = 'action-drop';
      else if (scores?.roleFidelity !== undefined && scores.roleFidelity !== 1) signal = 'role-drop';
      else if (scores?.valueRecall !== undefined && scores.valueRecall !== 1) signal = 'value-drop';
      else if (candidateEn !== referenceEn) signal = 'round-trip';

      tally.set(signal, [...(tally.get(signal) ?? []), `${id}[${language}]`]);
      if (summaryOnly) continue;

      console.log(
        `\n### ${id} [${language}] engine=${pattern.engine} canonical=${canonical} → ${signal}`
      );
      console.log(`  en      : ${oneLine(pattern.rawCode)}`);
      console.log(`  ref → en: ${oneLine(referenceEn)}`);
      console.log(`  stored  : ${oneLine(stored.get(language)?.get(id))}`);
      console.log(`  semantic: ${oneLine(candidate)}`);
      console.log(`  sem → en: ${oneLine(candidateEn)}`);
      if (scores)
        console.log(
          `  scores  : R0=${scores.actionRecall} multiset=${scores.multisetRecall} P=${scores.precision} R1=${scores.roleFidelity} R3=${scores.valueRecall}`
        );
      if (missingActions.length) console.log(`  -actions: ${missingActions.join(', ')}`);
      if (report?.missingRoles?.length) console.log(`  -roles  : ${report.missingRoles.join(', ')}`);
    }
  }

  console.log(`\n=== ${canonicalOnly ? 'canonical ' : ''}kept rows by first failing signal ===`);
  for (const [signal, rows] of [...tally].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${String(rows.length).padStart(3)}  ${signal.padEnd(12)} ${rows.join(' ')}`);
  }
}

void main();
